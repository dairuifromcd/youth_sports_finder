import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir, rm, access } from 'node:fs/promises'
import { execFileSync, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { buildBatch, buildSmokeBatch, csvHeader, normalizeAddress, serializeAddressCsv, sha256, splitAddress } from '../scripts/qld-geocoder/export.mjs'

const provider = (id = 'synthetic:1', address = '12 Example Road, Test Suburb Queensland 4115') => ({
  id, name: `Synthetic Club ${id}`, activities: ['Basketball'], address, suburb: 'Test Suburb', postcode: '4115',
  source: 'qld-play-on', sourceUrl: 'https://example.invalid/playon', sourceLastChecked: '2026-09-11T00:00:00Z',
})
const baseline = providers => providers.map(row => ({ ...row, geocode: { status: 'unmatched', source: 'osm-nominatim' } }))

test('splits explicit Queensland addresses, preserving street numbers, units, ranges and street-only inputs', () => {
  for (const streetAddress of ['12 Example Road', '2A Example Road', '12-16 Example Road', 'unit 1/74 Example Street', 'Example Road']) {
    assert.deepEqual(splitAddress(provider('test', `${streetAddress}, Test Suburb Queensland 4115`)), { streetAddress, locality: 'Test Suburb 4115' })
  }
  assert.deepEqual(splitAddress({ address: '1 Example St, Test Suburb QLD' }), { streetAddress: '1 Example St', locality: 'Test Suburb' })
})

test('flags uncertain input instead of guessing, deleting address parts or inventing locality evidence', () => {
  const cases = [
    [undefined, 'missing-address'], ['', 'missing-address'], ['Example Hall', 'expected-one-street-locality-separator'],
    ['Building, 12 Example Road, Test Suburb Queensland 4115', 'expected-one-street-locality-separator'],
    ['12 Example Road, Test Suburb NSW 4115', 'unrecognized-queensland-locality'],
    ['12 Example Road, Other Suburb Queensland 4115', 'source-locality-metadata-conflict'],
    ['12 Example Road, Test Suburb Queensland 4000', 'source-locality-metadata-conflict'],
    ['12 Example Road, Test Suburb Queensland', 'source-locality-metadata-conflict'],
    ['Corner Of Example Rd and Sample Rd, Test Suburb Queensland 4115', 'intersection-needs-manual-review'],
    ['Example Hall, Test Suburb Queensland 4115', 'unrecognized-street-address'],
    ['12 Example\nRoad, Test Suburb Queensland 4115', 'control-character-in-address'],
    ['=12 Example Road, Test Suburb Queensland 4115', 'unrecognized-street-address'],
  ]
  for (const [address, reason] of cases) assert.equal(splitAddress({ ...provider('test'), address }).reason, reason, String(address))
})

test('deduplicates normalized source addresses while preserving exact addresses, provider identity and provenance', () => {
  const providers = [provider('b'), provider('a', ' 12  EXAMPLE Road , Test Suburb Queensland 4115 '), provider('c', '14 Example Road, Test Suburb Queensland 4115')]
  const { csv, mapping } = buildBatch(providers, baseline(providers))
  assert.equal(mapping.summary.totalProviders, 3)
  assert.equal(mapping.rows.length, 2)
  const shared = mapping.rows.find(row => row.providers.length === 2)
  assert.deepEqual(shared.providers.map(row => row.id), ['a', 'b'])
  for (const source of providers) {
    const mapped = mapping.rows.flatMap(row => row.providers).find(row => row.id === source.id)
    for (const field of ['id', 'name', 'address', 'suburb', 'postcode', 'source', 'sourceUrl', 'sourceLastChecked']) assert.equal(mapped[field], source[field])
    assert.equal(mapped.nominatimStatus, 'unmatched')
  }
  assert.equal(mapping.csv.sha256, sha256(csv))
  assert.equal(mapping.addressRole, 'provider-address')
  assert.doesNotMatch(JSON.stringify(mapping), /"latitude"|"longitude"/)
  const lines = csv.trim().split('\r\n')
  assert.equal(lines[0], 'Address to Validate,LOCALITY')
  for (const row of mapping.rows) {
    assert.equal(lines[row.rowNumber], `${row.streetAddress},${row.locality}`)
    assert.equal(lines[row.rowNumber].split(',').length, 2)
    assert.equal(row.addressKey, sha256(row.normalizedAddress))
  }
})

test('output is deterministic across input and baseline order; normalization preserves significant address components', () => {
  const providers = [provider('b'), provider('a', '14 Example Road, Test Suburb Queensland 4115')]
  assert.deepEqual(buildBatch(providers, baseline(providers)), buildBatch([...providers].reverse(), baseline(providers).reverse()))
  assert.equal(normalizeAddress(' １２  Example Rd ,  Test Suburb QLD 4115 '), normalizeAddress('12 example rd,Test Suburb QLD 4115'))
  assert.notEqual(normalizeAddress('1/12 Example Rd'), normalizeAddress('12 Example Rd'))
  assert.notEqual(normalizeAddress('2A Example Rd'), normalizeAddress('2 Example Rd'))
  assert.notEqual(normalizeAddress('12 Example Rd,,Test Suburb'), normalizeAddress('12 Example Rd,Test Suburb'))
})

test('manual review retains all providers, including shared and missing addresses, outside upload rows', () => {
  const providers = [provider('a', 'Example Hall'), provider('b', 'Example Hall'), { ...provider('c'), address: undefined }, provider('d')]
  const result = buildBatch(providers, baseline(providers))
  assert.deepEqual(result.mapping.summary, { totalProviders: 4, uniqueAddresses: 3, exportedAddresses: 1,
    exportedProviders: 1, manualReviewAddresses: 2, manualReviewProviders: 3 })
  assert.equal(result.csv.trim().split('\r\n').length, 2)
  const conflicting = [provider('a'), { ...provider('b'), suburb: 'Different Suburb' }]
  assert.equal(buildBatch(conflicting, baseline(conflicting)).mapping.rows.length, 0)
})

test('rejects invalid source schema and stale or mismatched TASK-005 baseline before exporting', () => {
  for (const providers of [null, {}, [], [null], [{ id: 'only-id' }], [provider(), provider()], [{ ...provider(), address: 123 }]]) {
    assert.throws(() => buildBatch(providers, []), /Expected|Duplicate/)
  }
  const providers = [provider()]
  for (const previous of [[], baseline([provider('other')]), baseline([provider('synthetic:1', '14 Example Road, Test Suburb Queensland 4115')]),
    [{ ...provider(), geocode: { status: 'matched', source: 'another-provider' } }]]) {
    assert.throws(() => buildBatch(providers, previous), /baseline/)
  }
})

test('fixed TASK-004/TASK-005 data reconcile all 54 providers without changing inputs or inventing government results', async () => {
  const source = await readFile(new URL('../data/playon/4115-basketball.json', import.meta.url), 'utf8')
  const previous = await readFile(new URL('../data/derived/4115-basketball-geocoded.json', import.meta.url), 'utf8')
  const providers = JSON.parse(source)
  const old = JSON.parse(previous)
  const { mapping } = buildBatch(providers, old)
  assert.deepEqual(mapping.summary, { totalProviders: 54, uniqueAddresses: 40, exportedAddresses: 39,
    exportedProviders: 53, manualReviewAddresses: 1, manualReviewProviders: 1 })
  assert.deepEqual(mapping.baseline.counts, { matched: 19, unmatched: 27, ambiguous: 8, error: 0, pending: 0 })
  assert.equal(mapping.manualReview[0].providers[0].name, 'Wellington Point Kings Basketball Club Inc.')
  assert.equal(mapping.manualReview[0].reason, 'intersection-needs-manual-review')
  const mappedIds = [...mapping.rows, ...mapping.manualReview].flatMap(row => row.providers.map(provider => provider.id))
  assert.deepEqual(mappedIds.sort(), providers.map(row => row.id).sort())
  assert.equal(new Set(mappedIds).size, 54)
  assert.equal(mapping.rows.find(row => row.streetAddress === '2A Ross Llewellyn Drive').providers.length, 7)
  assert.match(mapping.governmentResults, /Stage B pending/)
  assert.equal(JSON.stringify(providers, null, 2) + '\n', source)
  assert.equal(JSON.stringify(old, null, 2) + '\n', previous)
})

test('matches the official example header and emits exact safe unquoted UTF-8/CRLF bytes', async () => {
  // Official sample snapshot, not a model of the government's undocumented parser.
  const example = await readFile(new URL('./fixtures/qld-address-input-example.csv', import.meta.url))
  assert.equal(sha256(example), 'cc8aa2bdef7f32683d3cc7d10ce80c80b6523897c00ed3cf89f609439cf8ae8c')
  assert.equal(example.toString().split('\r\n')[0], csvHeader.join(','))
  assert.equal(example.includes(34), false)
  const csv = serializeAddressCsv([{ streetAddress: '31 Endiandra Street', locality: 'Algester 4115' }])
  assert.deepEqual(Buffer.from(csv, 'utf8'), Buffer.from('Address to Validate,LOCALITY\r\n31 Endiandra Street,Algester 4115\r\n', 'utf8'))
  assert.equal(Buffer.from(csv).subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false)
  assert.equal(csv.includes('"'), false)
  assert.equal(csv.replaceAll('\r\n', '').includes('\n'), false)
  // The previous valid quoted-CSV form carried optional wrappers that are no
  // longer sent. This test makes no assertion that quotes caused the live error.
  assert.notEqual(csv.split('\r\n')[1], '"31 Endiandra Street","Algester 4115"')
  assert.deepEqual(csv.trimEnd().split('\r\n').map(line => line.split(',')), [csvHeader, ['31 Endiandra Street', 'Algester 4115']])
})

test('refuses unsafe unquoted fields instead of stripping characters or falling back to quoted fields', () => {
  for (const unsafe of ['', '  ', 'Example, Road', 'Example "Road"', 'Example\rRoad', 'Example\nRoad', 'Example\tRoad', 'Example\u0000Road']) {
    assert.throws(() => serializeAddressCsv([{ streetAddress: unsafe, locality: 'Test 4115' }]), /Cannot emit safe unquoted/)
    assert.throws(() => serializeAddressCsv([{ streetAddress: '1 Example Road', locality: unsafe }]), /Cannot emit safe unquoted/)
  }
})

test('smoke rows trace to full groups and all nine provider IDs; missing cases fail explicitly', async () => {
  const source = JSON.parse(await readFile(new URL('../data/playon/4115-basketball.json', import.meta.url)))
  const previous = JSON.parse(await readFile(new URL('../data/derived/4115-basketball-geocoded.json', import.meta.url)))
  const { csv, mapping } = buildBatch(source, previous)
  const smoke = buildSmokeBatch(mapping)
  assert.equal(smoke.csv, 'Address to Validate,LOCALITY\r\n31 Endiandra Street,Algester 4115\r\n132 Hill Road,Runcorn 4113\r\n2A Ross Llewellyn Drive,Booval 4304\r\n')
  assert.equal(smoke.mapping.sha256, sha256(smoke.csv))
  assert.equal(smoke.mapping.sourceCsvSha256, sha256(csv))
  assert.deepEqual(buildSmokeBatch(buildBatch([...source].reverse(), previous.reverse()).mapping), smoke)
  assert.deepEqual(smoke.mapping.rows.map(row => row.fullRowNumber), [26, 31, 1])
  const fullLines = csv.trimEnd().split('\r\n')
  const smokeLines = smoke.csv.trimEnd().split('\r\n')
  for (const row of smoke.mapping.rows) {
    const full = mapping.rows.find(group => group.addressKey === row.addressKey)
    assert.equal(row.fullRowNumber, full.rowNumber)
    assert.deepEqual(row.providerIds, full.providers.map(provider => provider.id))
    assert.equal(smokeLines[row.rowNumber], fullLines[row.fullRowNumber])
  }
  assert.deepEqual(smoke.mapping.rows.map(row => row.providerIds.length), [1, 1, 7])
  assert.throws(() => buildSmokeBatch({ ...mapping, rows: mapping.rows.filter(row => row.rowNumber !== 26) }), /Expected exactly one smoke address group/)
  assert.throws(() => buildSmokeBatch({ ...mapping, rows: [...mapping.rows, mapping.rows[0]] }), /Expected exactly one smoke address group/)
})

test('fixed-sample CLI refuses changed coverage before writing any artifacts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qld-a2-test-'))
  try {
    await mkdir(join(directory, 'data/playon'), { recursive: true })
    await mkdir(join(directory, 'data/derived'), { recursive: true })
    const providers = [provider()]
    await writeFile(join(directory, 'data/playon/4115-basketball.json'), JSON.stringify(providers))
    await writeFile(join(directory, 'data/derived/4115-basketball-geocoded.json'), JSON.stringify(baseline(providers)))
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/benchmark-qld-geocoder.mjs', import.meta.url)), '--export'], { cwd: directory, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Fixed TASK-006 sample counts changed/)
    await assert.rejects(access(join(directory, 'data/benchmarks')), { code: 'ENOENT' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('CLI reproduces the frozen full/smoke/sidecar bytes and digests without live services', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qld-a2-reproduce-'))
  try {
    for (const path of ['data/playon/4115-basketball.json', 'data/derived/4115-basketball-geocoded.json']) {
      await mkdir(join(directory, path, '..'), { recursive: true })
      await writeFile(join(directory, path), await readFile(new URL(`../${path}`, import.meta.url)))
    }
    const command = fileURLToPath(new URL('../scripts/benchmark-qld-geocoder.mjs', import.meta.url))
    const run = () => execFileSync(process.execPath, [command, '--export'], { cwd: directory, encoding: 'utf8' })
    assert.match(run(), /Stage A2 prepared — awaiting manual compatibility test/)
    const frozen = {
      'addresses.csv': '059910473ecc46b83f262527c4d3461c2ea293e36b73f3e650aa32543c41dee1',
      'addresses-smoke.csv': 'f2aae6ffe2762596664dddd2c2a803a2b05e9279b4954fb40998a6b8f9f512cb',
      'address-mapping.json': 'cb48f8e22aa97db3805e5ac40c8f6e5a1c760f171a02a9d4f594026103c9eae6',
    }
    const bytes = {}
    for (const [name, digest] of Object.entries(frozen)) {
      const path = `data/benchmarks/qld-geocoder/${name}`
      bytes[name] = await readFile(join(directory, path))
      assert.equal(sha256(bytes[name]), digest)
      assert.deepEqual(bytes[name], await readFile(new URL(`../${path}`, import.meta.url)))
    }
    run()
    for (const name of Object.keys(frozen)) assert.deepEqual(await readFile(join(directory, 'data/benchmarks/qld-geocoder', name)), bytes[name])
    const mapping = JSON.parse(bytes['address-mapping.json'])
    assert.equal(mapping.csv.sha256, sha256(bytes['addresses.csv']))
    assert.equal(mapping.smoke.sha256, sha256(bytes['addresses-smoke.csv']))
    assert.equal(mapping.smoke.sourceCsvSha256, mapping.csv.sha256)
    const parsed = bytes['addresses.csv'].toString().trimEnd().split('\r\n').map(line => line.split(','))
    assert.deepEqual(parsed[0], ['Address to Validate', 'LOCALITY'])
    assert.equal(parsed.length, 40)
    assert.ok(parsed.every(row => row.length === 2 && row.every(field => field && !field.includes('"'))))
    for (const row of mapping.rows) assert.deepEqual(parsed[row.rowNumber], [row.streetAddress, row.locality])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
