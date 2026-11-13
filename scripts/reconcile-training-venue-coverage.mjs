import { readFileSync, writeFileSync, realpathSync, lstatSync, mkdirSync, openSync, closeSync, fstatSync,
  constants, renameSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { safeCoveragePath } from './prepare-training-venue-coverage.mjs'
import { loadReviewedPartialBatch, validatePartialBatch, phase2aDirectory, phase2bDirectory } from './training-venues/partial-batch-reconciliation.mjs'

const projectRoot = realpathSync(fileURLToPath(new URL('..', import.meta.url)))
const json = value => JSON.stringify(value, null, 2) + '\n'
export const partialOutputFiles = Object.freeze(['government-result-schema-audit.json', 'result-provenance-audit.json',
  'partial-batch-reconciliation.json', 'site-by-site-validation.json', 'dry-run-merge.json', 'dry-run-differences.json', 'coverage-improvement-report.md'])
const stat = path => { try { return lstatSync(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error } }
export function safePartialRead(root, path) {
  const full = safeCoveragePath(root, path), fd = openSync(full, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    if (!fstatSync(fd).isFile()) throw new Error('Input must be a direct regular file')
    return readFileSync(fd)
  } finally { closeSync(fd) }
}
export function partialOutputPlan(root, requested = phase2bDirectory) {
  const directory = safeCoveragePath(root, requested)
  if (directory !== resolve(root, phase2bDirectory)) throw new Error('Output must remain in the isolated Phase 2B directory')
  const assertSafe = () => {
    safeCoveragePath(root, directory)
    if (stat(directory) && !stat(directory).isDirectory()) throw new Error('Output must be a directory')
    for (const name of partialOutputFiles) {
      const target = safeCoveragePath(root, resolve(directory, name)), info = stat(target)
      if (info && (!info.isFile() || info.nlink !== 1)) throw new Error('Output must be an unshared direct regular file')
    }
  }
  assertSafe()
  return { directory, assertSafe }
}
export function renderPartialReports(result) {
  const { reconciliation: r, validation: v, dryRun: d, provenance: p } = result
  const table = v.sites.map(s => `| ${s.physicalSiteId} | ${s.inputIndex} | ${s.candidateCount ?? 'unknown'} | ${s.actualGeocodeType || 'none'}/${s.actualConfidence || 'none'} | ${s.proposedStatus} | ${s.unresolvedIssues.join('; ') || 'All strict checks passed; property/campus precision only'} |`).join('\n')
  return {
    'government-result-schema-audit.json': json(result.schemaAudit),
    'result-provenance-audit.json': json(p),
    'partial-batch-reconciliation.json': json(r),
    'site-by-site-validation.json': json(v),
    'dry-run-merge.json': json(d),
    'dry-run-differences.json': json({ simulationOnly: true, formalValidationExecuted: v.formalValidationExecuted,
      statusChanges: d.changes.map(c => ({ physicalSiteId: c.physicalSiteId, before: c.oldStatus, after: c.newStatus })),
      fullRecordChanges: d.changes, unchangedPhysicalSiteIds: d.sites.filter(s => !d.changes.some(c => c.physicalSiteId === s.physicalSiteId)).map(s => s.physicalSiteId) }),
    'coverage-improvement-report.md': `# Phase 2B — isolated dry-run only\n\n${v.formalValidationExecuted ? 'Strict validation executed. Independent QA result is recorded separately in qa/report.md. No production merge or frontend release occurred.' : 'BLOCKED: formal validation Not Verified. Production projection remains unchanged; no hypothetical Accepted count inferred.'}\n\nResult SHA-256: ${r.resultCsvSha256}. Submitted: ${r.summary.submitted}; returned: ${r.summary.returnedRows}; distinct InputIndex: ${r.summary.distinctInputIndices}; all17 exact mapped: ${r.summary.all17Mapped}.\n\nUnique selected candidates: ${r.summary.uniqueSelectedCandidates}; aggregate multiple-candidate inputs: ${r.summary.multipleCandidateInputs}; no match: ${r.summary.noMatchInputs}; government parsing failures: ${r.summary.governmentParsingFailures}; CSV parsing failures: ${r.summary.resultCsvParsingFailures}. Raw PC/100: ${r.summary.rawPC100}; strict new Accepted: ${v.newStrictAccepted}.\n\nActual Owner-confirmed download date: ${p.actualDownloadDate ?? 'Not Verified'}. Provenance valid: ${p.valid}. Exact datum/CRS is not declared by this CSV; existing Batch latitude/longitude degree interpretation is retained without independent CRS certification or reprojection.\n\n| Site | InputIndex | Candidates | Type/confidence | Simulated status | Reason / limit |\n| --- | ---: | ---: | --- | --- | --- |\n${table}\n\nBefore: ${JSON.stringify(d.beforeSummary)}. After: ${JSON.stringify(d.afterSummary)}. Accepted: ${d.beforeSummary.Accepted} → ${d.afterSummary.Accepted}.\n\nAdditional distinct Providers: ${d.coverage.additionalProviders.length}; additional existing eligible Associations: ${d.coverage.additionalAssociations.length}. These are set differences against existing accepted-site coverage, not the number of queried sites.\n\nAll 58 records retained; other41 unchanged: ${d.preservation.other41Unchanged}; all16 Accepted unchanged: ${d.preservation.all16AcceptedUnchanged}; original28 result records/proofs retained: ${d.preservation.original28GovernmentRowsRetained}. Full before/after fields and references are in dry-run-differences.json. The original and new batch provenances remain separately retained in dry-run-merge.json.\n\nThe isolated proof bridge replays the exact pinned Phase2A registry/manifest, original sources/campus/ordinary-training associations and all seven reviewed artifacts. It invokes the unchanged venue validator. Only the sole legacy-registry missing-chain diagnostic can be supplied by that full reviewed chain; no address mismatch, unknown building, confidence/range, candidate, conflict or PS079 exception is waived. Query readiness alone does not establish acceptance. Independent QA must review source meaning against original observations.\n\nNo hall, court, entrance, parcel equivalence, fresh source content or current training occurrence is verified. Multiple-candidate comments provide counts only; candidate detail records are absent. Blocked sites require further evidence/review and separately approved investigation; no new API query or batch submission is authorised.\n`,
  }
}
export function generatePartialDryRun({ check = false, validatedOn } = {}) {
  if (!validatedOn) throw new Error('Supply the actual validation date with --validated-on YYYY-MM-DD')
  const read = path => safePartialRead(projectRoot, path), plan = partialOutputPlan(projectRoot)
  const batch = loadReviewedPartialBatch(read), resultBytes = read(`${phase2aDirectory}/received/government-results.csv`)
  let receipt = null, receiptError = null
  try { receipt = JSON.parse(read(`${phase2aDirectory}/received/government-result-provenance.json`)) }
  catch (error) { receiptError = `Provenance unavailable: ${error.message}` }
  const result = validatePartialBatch(batch, { resultBytes, receipt, receiptError, validatedOn })
  const outputs = renderPartialReports(result)
  if (Object.keys(outputs).join('\n') !== partialOutputFiles.join('\n')) throw new Error('Incomplete isolated output set')
  plan.assertSafe()
  if (check) {
    for (const [name, value] of Object.entries(outputs)) if (!read(resolve(plan.directory, name)).equals(Buffer.from(value))) throw new Error(`Deterministic dry-run output mismatch: ${name}`)
  } else {
    mkdirSync(plan.directory, { recursive: true }); plan.assertSafe()
    const staged = []
    try {
      for (const [name, value] of Object.entries(outputs)) {
        const temporary = safeCoveragePath(projectRoot, resolve(plan.directory, `${name}.${process.pid}.tmp`))
        writeFileSync(temporary, value, { flag: 'wx', mode: 0o600 }); staged.push({ name, temporary, destination: resolve(plan.directory, name) })
      }
      plan.assertSafe()
      for (const f of staged) {
        if (stat(f.destination) && read(f.destination).equals(read(f.temporary))) unlinkSync(f.temporary)
        else renameSync(f.temporary, f.destination)
      }
    } finally { for (const f of staged) if (stat(f.temporary)) unlinkSync(f.temporary) }
  }
  return { status: result.validation.formalValidationExecuted ? 'Dry-run complete; see separate QA report' : 'Blocked — formal validation Not Verified',
    formalValidationExecuted: result.validation.formalValidationExecuted, reconciliation: result.reconciliation.summary,
    strictNewAccepted: result.validation.newStrictAccepted, projectedSummary: result.dryRun.afterSummary,
    additionalProviders: result.dryRun.coverage.additionalProviders.length, additionalAssociations: result.dryRun.coverage.additionalAssociations.length,
    productionWritePerformed: false }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { check: { type: 'boolean', default: false }, 'validated-on': { type: 'string' } }, allowPositionals: false })
    const summary = generatePartialDryRun({ check: values.check, validatedOn: values['validated-on'] })
    console.log(json(summary))
    if (!summary.formalValidationExecuted) process.exitCode = 2
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
