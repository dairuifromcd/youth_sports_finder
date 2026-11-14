import { constants, lstatSync, openSync, closeSync, readFileSync, writeFileSync, fstatSync, mkdirSync,
  renameSync, unlinkSync, fsyncSync } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'
import { sha256 } from '../qld-geocoder/export.mjs'

export const formalNames = Object.freeze(['venue-inventory.json', 'eligible-associations.json', 'addresses.csv',
  'address-mapping.json', 'address-preparation-results.json', 'venue-geocoding-results.json', 'training-venue-candidates.json'])
const stat = path => { try { return lstatSync(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error } }
function chain(root, path) {
  const rel = relative(root, path)
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Output path escapes fixed project root')
  let current = root
  for (const part of rel.split('/').filter(Boolean)) {
    current = resolve(current, part)
    const info = stat(current)
    if (info?.isSymbolicLink() || (current !== path && info && !info.isDirectory())) throw new Error('Unsafe symlink or output directory chain')
  }
}
function direct(root, path, missing = false) {
  chain(root, path)
  const info = stat(path)
  if (!info && missing) return null
  if (!info?.isFile() || info.nlink !== 1) throw new Error('Output target must be a direct unshared regular file (no symlink/hardlink)')
  return info
}
export function readProductionFile(root, path) {
  const before = direct(root, path), fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const actual = fstatSync(fd)
    if (!actual.isFile() || actual.nlink !== 1 || actual.ino !== before.ino || actual.dev !== before.dev) throw new Error('Output target changed during read')
    return readFileSync(fd)
  } finally { closeSync(fd) }
}
export function productionOutputPlan(root) {
  const directory = resolve(root, 'data/benchmarks/training-venue-geocoding')
  const recovery = resolve(root, 'output/workflow/2026-11-13/training-venue-coverage-phase2c/recovery')
  const active = resolve(recovery, 'ACTIVE.json')
  const files = Object.fromEntries(formalNames.map(name => [name, resolve(directory, name)]))
  const assertSafe = () => {
    chain(root, directory); chain(root, recovery)
    for (const path of Object.values(files)) direct(root, path, true)
    if (stat(active)) throw new Error('Incomplete production transaction: restore recorded original snapshots before retrying; no output written')
  }
  assertSafe()
  return { root, directory, recovery, active, files, assertSafe }
}
function exclusiveWrite(root, path, bytes) {
  chain(root, path)
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
  try { writeFileSync(fd, bytes); fsyncSync(fd) } finally { closeSync(fd) }
}

/** Stage all files; journal original hashes/bytes before rename. Roll back any
 * replacement failure. A crash or incomplete rollback leaves ACTIVE.json and
 * blocks every later check/write instead of treating mixed state as production.
 * The rename hook is only for isolated failure-injection tests, never CLI input. */
export function writeProductionOutputs(root, outputs, { check = false, replace = renameSync } = {}) {
  const plan = productionOutputPlan(root)
  if (Object.keys(outputs).join('\n') !== formalNames.join('\n') || Object.values(outputs).some(x => typeof x !== 'string')) throw new Error('Incomplete or unexpected formal output allowlist')
  const original = Object.fromEntries(formalNames.map(name => [name, stat(plan.files[name]) ? readProductionFile(root, plan.files[name]) : null]))
  const changed = formalNames.filter(name => !original[name]?.equals(Buffer.from(outputs[name])))
  if (check) {
    if (changed.length) throw new Error(`Generated production files stale: ${changed.join(', ')}`)
    return { mode: 'check', changedFiles: [], hashes: Object.fromEntries(formalNames.map(n => [n, sha256(outputs[n])])) }
  }
  if (!changed.length) return { mode: 'generate', changedFiles: [], hashes: Object.fromEntries(formalNames.map(n => [n, sha256(outputs[n])])) }
  plan.assertSafe()
  mkdirSync(plan.directory, { recursive: true }); mkdirSync(plan.recovery, { recursive: true })
  plan.assertSafe()
  // Exclusive active journal is also the writer lock. Keep completed recovery
  // evidence; no old transaction or snapshot is overwritten.
  exclusiveWrite(root, plan.active, JSON.stringify({ phase: 'preparing', pid: process.pid }) + '\n')
  const transaction = resolve(plan.recovery, `transaction-${process.pid}-${Date.now()}`)
  const staged = [], replaced = []
  let journalComplete = false, success = false, rollbackComplete = false
  try {
    chain(root, transaction); mkdirSync(transaction, { recursive: false, mode: 0o700 })
    const journal = { schemaVersion: 1, status: 'original snapshots retained for recovery', directory: plan.directory, files: [] }
    for (const name of changed) {
      const backup = resolve(transaction, `${name}.before`), temporary = resolve(plan.directory, `${name}.${process.pid}.phase2c.tmp`)
      if (original[name]) exclusiveWrite(root, backup, original[name])
      exclusiveWrite(root, temporary, outputs[name]); staged.push(temporary)
      journal.files.push({ name, destination: plan.files[name], backup: original[name] ? backup : null, temporary,
        beforeSha256: original[name] ? sha256(original[name]) : null, afterSha256: sha256(outputs[name]) })
    }
    exclusiveWrite(root, resolve(transaction, 'journal.json'), JSON.stringify(journal, null, 2) + '\n')
    // Update ACTIVE only by replacing our own direct unshared regular file.
    direct(root, plan.active)
    const activeReady = resolve(transaction, 'active-ready.json')
    exclusiveWrite(root, activeReady, JSON.stringify({ journal: resolve(transaction, 'journal.json') }, null, 2) + '\n')
    renameSync(activeReady, plan.active); journalComplete = true
    for (const name of changed) {
      chain(root, plan.directory)
      const current = stat(plan.files[name]) ? readProductionFile(root, plan.files[name]) : null
      if (original[name] ? !current?.equals(original[name]) : current !== null) throw new Error('Output changed after preflight; refusing replacement')
      const temporary = resolve(plan.directory, `${name}.${process.pid}.phase2c.tmp`)
      direct(root, temporary)
      replace(temporary, plan.files[name]); replaced.push(name)
    }
    success = true
  } catch (error) {
    const rollbackErrors = []
    for (const name of [...replaced].reverse()) {
      try {
        direct(root, plan.files[name])
        if (!readProductionFile(root, plan.files[name]).equals(Buffer.from(outputs[name]))) throw new Error('Output changed externally during rollback')
        if (original[name]) {
          const restore = resolve(transaction, `${name}.restore`)
          exclusiveWrite(root, restore, original[name]); renameSync(restore, plan.files[name])
        } else unlinkSync(plan.files[name])
      } catch (rollbackError) { rollbackErrors.push(`${name}: ${rollbackError.message}`) }
    }
    rollbackComplete = rollbackErrors.length === 0
    throw new Error(`Production transaction failed: ${error.message}; ${rollbackComplete ? 'original bytes restored' : `rollback incomplete; ACTIVE journal retained: ${rollbackErrors.join('; ')}`}`)
  } finally {
    // Never touch an unexpected link while cleaning up.
    for (const path of staged) if (stat(path)) { direct(root, path); unlinkSync(path) }
    if (success || rollbackComplete) {
      direct(root, plan.active)
      renameSync(plan.active, resolve(transaction, success ? 'completed.json' : journalComplete ? 'rolled-back.json' : 'aborted.json'))
    }
  }
  return { mode: 'generate', changedFiles: changed, recoveryTransaction: transaction,
    hashes: Object.fromEntries(formalNames.map(n => [n, sha256(outputs[n])])) }
}
