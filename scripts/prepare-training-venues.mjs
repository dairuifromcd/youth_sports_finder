import { readFileSync, writeFileSync, mkdirSync, realpathSync, existsSync, renameSync, lstatSync,
  constants, openSync, closeSync, fstatSync, unlinkSync } from 'node:fs'
import { resolve, relative, dirname, isAbsolute, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { sha256 } from './qld-geocoder/export.mjs'
import { inputFiles, prepareDataset, candidatesFor, json } from './training-venues/prepare.mjs'
import { geocodingFor, verifyMapping } from './training-venues/validate.mjs'
import { providerDisplayLinks } from '../src/data/providerLinks.ts'

const projectRoot = realpathSync(fileURLToPath(new URL('..', import.meta.url)))
const evidenceDirectory = 'output/workflow/2026-11-06/training-venue-geocoding'
export const generatedFiles = Object.freeze(['venue-inventory.json', 'eligible-associations.json', 'addresses.csv',
  'address-mapping.json', 'address-preparation-results.json', 'venue-geocoding-results.json', 'training-venue-candidates.json'])

const within = (parent, value) => {
  const rel = relative(parent, value)
  return rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel)
}
function statIfPresent(path) {
  try { return lstatSync(path) }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

function assertDirectoryChain(root, directory) {
  if (!within(root, directory)) throw new Error('Output directory escapes the fixed project root')
  let current = root
  for (const component of relative(root, directory).split('/').filter(Boolean)) {
    current = resolve(current, component)
    const stat = statIfPresent(current)
    if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) {
      throw new Error(`Output directory contains a symlink or non-directory: ${current}`)
    }
  }
}

/** Test fixtures may supply their own isolated root; generate() always uses the actual project root. */
export function resolveOutputPlan(requestedDirectory, root = projectRoot) {
  const trustedRoot = realpathSync(root)
  // Never canonicalize the allowlist anchors: a symlink must not move its own permission boundary.
  const defaultOutput = resolve(trustedRoot, 'data/benchmarks/training-venue-geocoding')
  const isolatedTests = resolve(trustedRoot, evidenceDirectory, 'generated-tests')
  const directory = resolve(trustedRoot, requestedDirectory ?? 'data/benchmarks/training-venue-geocoding')
  if (directory !== defaultOutput && (directory === isolatedTests || !within(isolatedTests, directory))) {
    throw new Error('Output directory must be the independent training-venue benchmark or an isolated task generated-tests subdirectory')
  }
  const files = Object.fromEntries(generatedFiles.map(file => [file, { destination: resolve(directory, file),
    temporary: resolve(directory, `${file}.${process.pid}.tmp`) }]))
  function assertSafe(stagedFiles = []) {
    assertDirectoryChain(trustedRoot, directory)
    for (const [file, paths] of Object.entries(files)) {
      if (file !== basename(file) || dirname(paths.destination) !== directory || dirname(paths.temporary) !== directory) {
        throw new Error('Output files must be direct children of the selected output directory')
      }
      const destination = statIfPresent(paths.destination), temporary = statIfPresent(paths.temporary)
      if (destination && (destination.isSymbolicLink() || !destination.isFile())) {
        throw new Error(`Unsafe output target; expected a regular direct file, never a symlink: ${file}`)
      }
      if (!stagedFiles.includes(file) ? temporary !== null : !temporary?.isFile() || temporary.isSymbolicLink()) {
        throw new Error(`Unsafe or unexpected output temporary file: ${file}`)
      }
    }
  }
  assertSafe()
  return { directory, files, assertSafe,
    assertDirectory: () => assertDirectoryChain(trustedRoot, directory) }
}

function readOutputFile(plan, file) {
  plan.assertSafe()
  const descriptor = openSync(plan.files[file].destination, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    if (!fstatSync(descriptor).isFile()) throw new Error(`Output read requires a regular direct file: ${file}`)
    return readFileSync(descriptor)
  } finally { closeSync(descriptor) }
}

export function projectPath(path) {
  const target = resolve(projectRoot, path)
  let existing = target
  while (!existsSync(existing)) existing = dirname(existing)
  if (!within(projectRoot, target) || !within(projectRoot, realpathSync(existing))) throw new Error('All input/output paths must remain inside the current project, without external symlinks')
  return resolve(realpathSync(existing), relative(existing, target))
}

export function generate(options = {}) {
  const inputDirectory = projectPath(options['input-dir'] ?? `${evidenceDirectory}/inputs`)
  const plan = resolveOutputPlan(options['output-dir'])
  const outputDirectory = plan.directory
  if (outputDirectory === resolve(projectRoot, 'data/benchmarks/training-venue-geocoding')) {
    throw new Error('Single-batch production generation is disabled. Use node --experimental-strip-types scripts/merge-training-venue-production.mjs [--check]; historical replay: --historical-check. Isolated historical generated-tests outputs remain supported.')
  }
  const inputBytes = inputFiles.map(([name, expectedHash]) => {
    const bytes = readFileSync(projectPath(resolve(inputDirectory, name)))
    if (sha256(bytes) !== expectedHash) throw new Error(`Input SHA-256 drift: ${name}; no output written`)
    return bytes
  })
  const inputs = inputFiles.map(([file, hash], i) => ({ file, sha256: hash, bytes: inputBytes[i].length }))
  const raw = JSON.parse(inputBytes[0]), decision = JSON.parse(inputBytes[1])
  const providerBaseline = JSON.parse(readFileSync(projectPath('data/playon/4115-basketball.json')))
  const prepared = prepareDataset(raw, decision, providerBaseline, inputs, providerDisplayLinks)
  let external = null
  if (options.results || options['result-provenance'] || options['validated-on']) {
    if (!options.results || !options['result-provenance'] || !options['validated-on']) {
      throw new Error('Result import requires --results, --result-provenance and --validated-on together')
    }
    const uploadBytes = readOutputFile(plan, 'addresses.csv')
    const mapping = JSON.parse(readOutputFile(plan, 'address-mapping.json'))
    verifyMapping(prepared, mapping, uploadBytes)
    external = { resultBytes: readFileSync(projectPath(options.results)),
      receipt: JSON.parse(readFileSync(projectPath(options['result-provenance']))), validatedOn: options['validated-on'] }
  }
  const geocoding = geocodingFor(prepared, external)
  if (!external && existsSync(plan.files['venue-geocoding-results.json'].destination) &&
      JSON.parse(readOutputFile(plan, 'venue-geocoding-results.json')).governmentResultProvenance) {
    throw new Error('Refusing to replace imported government results with Pending; supply the same genuine-result import arguments')
  }
  const outputs = {
    'venue-inventory.json': json({ schemaVersion: 1, status: 'Internal audit inventory — not approved for publication',
      asOfDate: raw.asOfDate, inputs, summary: prepared.preparation.summary, sites: prepared.inventory }),
    'eligible-associations.json': json({ schemaVersion: 1, status: 'Internal audit — not a frontend data feed', inputs,
      providers: [...prepared.context.providers.values()].map(p => ({ providerId: p.providerId, providerName: p.providerName }))
        .sort((a, b) => a.providerId < b.providerId ? -1 : 1), associations: prepared.associations }),
    'addresses.csv': prepared.csv,
    'address-mapping.json': json(prepared.mapping),
    'address-preparation-results.json': json(prepared.preparation),
    'venue-geocoding-results.json': json(geocoding),
    'training-venue-candidates.json': json(candidatesFor(prepared, geocoding)),
  }
  if (Object.keys(outputs).join('\n') !== generatedFiles.join('\n')) throw new Error('Output plan and rendered files disagree')
  // Rendering and every validation complete before any output is written.
  plan.assertSafe()
  if (options.check) {
    for (const [file, content] of Object.entries(outputs)) {
      if (readOutputFile(plan, file).toString('utf8') !== content) throw new Error(`Generated file stale: ${file}`)
    }
  } else {
    // Preserve uploaded CSV/mapping and every other byte-identical artifact without
    // rewriting it. The complete seven-file safety preflight remains mandatory.
    const changedFiles = generatedFiles.filter(file => !existsSync(plan.files[file].destination) ||
      readOutputFile(plan, file).toString('utf8') !== outputs[file])
    mkdirSync(outputDirectory, { recursive: true })
    const staged = []
    try {
      for (const file of changedFiles) {
        plan.assertDirectory()
        writeFileSync(plan.files[file].temporary, outputs[file], { flag: 'wx' })
        staged.push(plan.files[file].temporary)
      }
      // Stage every file before replacing an existing output; reject any late unsafe target.
      plan.assertSafe(changedFiles)
      for (const file of changedFiles) {
        plan.assertDirectory()
        renameSync(plan.files[file].temporary, plan.files[file].destination)
      }
    } finally {
      plan.assertDirectory()
      for (const file of staged) if (statIfPresent(file)) unlinkSync(file)
    }
  }
  return { mode: options.check ? 'check' : 'generate', outputDirectory, baseline: prepared.context.baseline,
    addressPreparation: prepared.preparation.summary, geocoding: geocoding.summary, outputs: Object.keys(outputs) }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { check: { type: 'boolean' }, 'input-dir': { type: 'string' },
      'output-dir': { type: 'string' }, results: { type: 'string' }, 'result-provenance': { type: 'string' },
      'validated-on': { type: 'string' }, help: { type: 'boolean' } } })
    if (values.help) console.log('Offline only: npm run prepare:training-venues [-- --check]\n' +
      'Optional genuine-result import: --results PROJECT_PATH --result-provenance PROJECT_PATH --validated-on YYYY-MM-DD\n' +
      'Input/output paths must stay within this project. No external request or dependency installation is performed.')
    else console.log(json(generate(values)))
  } catch (error) {
    console.error(`Training venue preparation failed: ${error.message}`)
    process.exitCode = 1
  }
}
