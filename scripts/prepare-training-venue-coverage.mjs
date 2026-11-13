import { readFileSync, writeFileSync, mkdirSync, realpathSync, lstatSync, renameSync, unlinkSync,
  openSync, closeSync, fstatSync, constants } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { prepareCoverageBatch, batchFiles } from './training-venues/coverage-batch.mjs'

export const coverageDirectory = 'output/workflow/2026-11-13/training-venue-coverage-phase2a'
const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)))
const within = (base, path) => { const rel = relative(base, path); return rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel) }
function stat(path) {
  try { return lstatSync(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
export function safeCoveragePath(projectRoot, path) {
  const destination = resolve(projectRoot, path)
  if (!within(projectRoot, destination)) throw new Error('Path escapes project')
  let current = projectRoot
  for (const component of relative(projectRoot, destination).split('/').filter(Boolean)) {
    current = resolve(current, component)
    const info = stat(current)
    if (info?.isSymbolicLink() || (current !== destination && info && !info.isDirectory())) throw new Error('Symlink or invalid path chain')
  }
  return destination
}
export function coverageOutputPlan(projectRoot, requested = `${coverageDirectory}/batch`) {
  const directory = safeCoveragePath(projectRoot, requested)
  if (directory !== resolve(projectRoot, coverageDirectory, 'batch')) throw new Error('Output must be the independent Phase 2A batch directory')
  const assertSafe = () => {
    safeCoveragePath(projectRoot, directory)
    if (stat(directory) && !stat(directory).isDirectory()) throw new Error('Output is not a directory')
    for (const file of batchFiles) {
      const path = safeCoveragePath(projectRoot, resolve(directory, file))
      if (stat(path) && (!stat(path).isFile() || stat(path).nlink !== 1)) throw new Error('Output is not a direct, unshared regular file')
    }
  }
  assertSafe()
  return { directory, assertSafe }
}
function read(projectRoot, path) {
  const destination = safeCoveragePath(projectRoot, path)
  const fd = openSync(destination, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    if (!fstatSync(fd).isFile()) throw new Error('Input is not a regular file')
    return readFileSync(fd)
  } finally { closeSync(fd) }
}
export function generateCoverage({ check = false } = {}) {
  const plan = coverageOutputPlan(root)
  const registry = read(root, `${coverageDirectory}/reviewed/registry.json`)
  const manifest = read(root, `${coverageDirectory}/reviewed/manifest.json`)
  const result = prepareCoverageBatch(registry, manifest, path => read(root, path))
  if (Object.keys(result.outputs).join('\n') !== batchFiles.join('\n')) throw new Error('Incomplete output set')
  plan.assertSafe()
  if (check) {
    for (const [name, bytes] of Object.entries(result.outputs)) {
      if (!read(root, resolve(plan.directory, name)).equals(Buffer.from(bytes))) throw new Error(`Deterministic check failed: ${name}`)
    }
  } else {
    mkdirSync(plan.directory, { recursive: true })
    plan.assertSafe()
    const staged = []
    try {
      for (const [name, bytes] of Object.entries(result.outputs)) {
        const temporary = resolve(plan.directory, `${name}.${process.pid}.tmp`)
        safeCoveragePath(root, temporary)
        writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 })
        staged.push({ temporary, destination: resolve(plan.directory, name) })
      }
      plan.assertSafe()
      for (const file of staged) {
        // Skip identical files to preserve reviewed output metadata on replay.
        if (stat(file.destination) && read(root, file.destination).equals(read(root, file.temporary))) unlinkSync(file.temporary)
        else renameSync(file.temporary, file.destination)
      }
    } finally {
      for (const file of staged) if (stat(file.temporary)) unlinkSync(file.temporary)
    }
  }
  return result.summary
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ options: { check: { type: 'boolean', default: false } }, allowPositionals: false })
    if (positionals.length) throw new Error('Unexpected arguments')
    console.log(JSON.stringify(generateCoverage(values), null, 2))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
