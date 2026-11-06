# Provider Link Enrichment — Round 3 Integration

## Status and authority

Approved by the owner's 2026-11-05 request in this chat. **Complete — final Pass, 2026-11-05.** Independent bounded task; TASK-007's final UAT Pass remains historical and TASK-008 is not started. All required implementation, independent QA/UAT, Main review and scoped lifecycle checks passed.

## Goal and inputs

Add compact Website / Facebook Page / Facebook Group links to the existing Provider list so parents can learn about each organisation.

- Audit inputs: `data/enrichment/provider-links-round3.json` and `provider-links-round3-report.md`.
- Provider source: `data/benchmarks/qld-geocoder/stage-b/validated.json`, unchanged.
- Preflight confirmed 54 exact IDs, no missing/unknown/duplicate IDs or name mismatches, 225 candidates, 95 Verified recommended links. Evidence: `output/workflow/2026-11-05/provider-link-enrichment/input-preflight.json`.
- Preserve 54 identities/names/addresses/geocodes; map baseline remains 25 accepted providers, 19 markers and 29 list-only providers.

## Approved implementation scope

Use exact `providerId` joins and an independent enrichment layer. Generate a small typed display module from `providers[].links[]`; do not bundle full research, candidates or evidence in the browser. Only publish links with `confidence === "Verified"`, `recommendPublicDisplay === true`, matching provider identity, safe valid HTTP(S) URL, correct link type and suitable general public purpose. Do not derive links from top-level websiteUrl/facebookUrl shortcuts.

Preserve Website subtype semantics (including institutions, associations, hosted sites and exact official unit pages). Keep Website, Facebook Page and Facebook Group distinct. Exclude personal profiles, parent-brand substitutes, generic third-party introductions, private member groups, alumni/trading/team groups, inactive sites and Probable/Unverified candidates. Facebook URL spelling alone (including profile.php/people) is not proof of a personal profile: approved organisation Page identity comes from the research link classification and evidence.

Show only available links, allow multiple types, and show Algester Hawks' Page and public Group together. New tabs require `target="_blank"` and `rel="noopener noreferrer"`. Retain the government Play On source link. Keep cards compact, accessible and usable on desktop/mobile.

No changes to map markers, popup positioning, search/range semantics, provider identities, geocoding policy or TASK-004/005/006 inputs/results. No backend, dependencies, live scraping, new data API, global configuration, deployment, publication or next-stage work. Verified means organisation-link identity, not verified junior programs.

## Required acceptance criteria

| Area | Required evidence |
| --- | --- |
| Roles | Actual custom developer, qa, uat spawn identities and loaded markers; independent results |
| Data | Exactly 54 provider IDs and 95 display links: Website 43 / Facebook Page 50 / Facebook Group 2; every provider covered |
| Eligibility | No unrecommended candidates; exact provider association; duplicates, unsafe/invalid and type-mismatched URLs handled and tested |
| Semantics | Website subtypes preserved; Algester Page+Group; schools not described as independent basketball clubs |
| Regression | Protected raw/validated data unchanged; 54/25/19/29 baseline, seven club searches and existing tests preserved |
| Automation | `npm test`, `npm run check`, `npm run lint`, `npm run build`, `git diff --check` |
| Browser | Real desktop/mobile list, link combinations, Algester, seven clubs, search/map/range/list interactions, no overlap/overflow/unclickable links; actual DOM targets/types/new-tab attributes |
| Screenshots | Generate and actually view desktop and mobile screenshots |
| Lifecycle | Main-managed server ownership/readiness; UAT browser_close actual return independently checked by Main; stop only Main-created server and confirm port/process result |

Seven baseline clubs: Algester Hawks, Cannons Southside, Runcorn Rockets, Dunk Star, River City Hornets, Rochedale Wildcats, Sunnybank Hills Hurricanes. Mapping remains accepted only for Cannons, Runcorn and Sunnybank among these seven.

Record each check as Pass / Fail / Not Verified. At most three targeted product-fix rounds. Permission/tool blockage is not a product defect and cannot be bypassed. Final Pass requires all necessary evidence.

## Runtime authorisation and evidence

Owner explicitly approved this chat's scoped runtime request: `http://127.0.0.1:5183/` and its local app paths; project Vite, isolated ysf_browser, search/click/map drag+zoom/scroll/keyboard/viewport/DOM/screenshot operations. Existing map resource requests are allowed; no organisation-site/Facebook navigation or login. Effects can include temporary Chrome/Node processes, cache/logs/system temp and `/tmp/ysf-pw-sock`. Use browser_close, then stop only the Vite owned by this task; do not infer deletion of all browser temp files from a successful close. Tool approvals still apply. Project-only checks with browser Not Verified remain the fallback.

Evidence root: `output/workflow/2026-11-05/provider-link-enrichment/`. Initial working tree was already dirty; preserve previous edits. Use baseline and final SHA-256 manifests to identify the actual tested version rather than HEAD alone.

Actual role identifiers (loaded before implementation):

- developer: `/root/provider_links_developer`, `YSF-DEVELOPER-1`
- qa: `/root/provider_links_qa`, `YSF-QA-1`
- uat: `/root/provider_links_uat`, `YSF-UAT-1`

## Implementation Result

### Implementation and changed files

| File | Result |
| --- | --- |
| `scripts/generate-provider-links.mjs` (new) | Offline exact-ID conversion from research links, source-hash/schema/identity/public-purpose/URL validation, duplicate ownership protection, fixed Round 3 completeness gate and deterministic `--check` mode |
| `src/providerLinks.ts` (new) | Typed display links, preserved Website subtypes, safe HTTP(S)/Facebook type checks and exact-ID lookup with duplicate suppression |
| `src/data/providerLinks.ts` (new, generated) | 95 type/URL entries, 12,904 bytes; independent of the 720,972-byte full research file |
| `src/ProviderList.tsx` | Compact available-link row, labels, accessible organisation/new-tab names and safe `_blank` attributes; existing Play On source link retained |
| `src/styles.css` | Three local rules for wrapping, compact 32px link targets and empty link rows |
| `tests/providerLinks.test.mjs` (new) | Eleven tests for reconciliation, candidate gates, source drift, safe URL/type rules, exact identity, duplicates, semantics and generated-module synchronization |
| `package.json` | Added only `enrich:provider-links`; existing scripts/dependencies unchanged |
| This independent task document (new) | Approved scope, criteria, implementation and final handoff; no historical task overwritten |

Runtime imports only the generated display module. The generator consumes `providers[].links[]`, never top-level shortcuts. Recommended entries must also have provider relationship, general-organisation purpose, no manual-review flag and accessible public page/metadata evidence. Same-provider duplicates collapse; conflicting types and cross-provider URL ownership fail generation. Facebook `profile.php` and `/people/` paths remain eligible only as research-classified organisation Pages. Website ownership descriptions preserve school/institution/association/hosted/unit semantics.

### Data completeness and protected baseline

| Measure | Final result |
| --- | ---: |
| Original / research / display Provider IDs | 54 / 54 / 54, exact sets |
| Missing, unexpected or duplicate Provider IDs | 0 |
| Providers with at least one display link | 54 |
| Website links | 43 |
| Facebook Page links | 50 |
| Facebook Group links | 2 |
| Total display links | 95 |
| Providers with Page or Group | 51 |
| Research candidates / unrecommended candidates excluded | 225 / 130 |
| Government source links retained in live DOM | 54 |
| Providers / accepted mapped Providers / markers / list-only | 54 / 25 / 19 / 29 |

All published type/URL tuples match the recommended Verified research records. Of the unrecommended candidates, 125 unique URLs remain after deduplication and overlap with published URLs; none appear in the built JavaScript. Full research/evidence fields are absent from the browser bundle.

The 66-file task-start manifest has exactly three expected changed existing files: `ProviderList.tsx`, `styles.css`, `package.json`. All 63 other baseline files are byte-identical, including all data, geocoding pipelines/policy, map/search/popup modules, package lock and TASK-001–007 history. QA verified that removing the precise new snippets also recreates the three original hashes. The new modules and current existing files are frozen in the 70-file QA manifest; Main independently verified zero version drift.

- `validated.json` SHA-256 remains `c6650ebffda0bdd3417545e47be3782b97e6daf3763faa5d81c85bcb14de1c07`.
- Research JSON SHA-256 remains `8f16f179b82d09e697f9cc02efd92a1e35b0870a94bb0fcc4f381d8319ad2528`.
- HEAD is `1622a0191c00bbd38435de7c0758045edf690d3b`; the initially dirty tree is represented by the manifests, not HEAD alone. No commit was created.

### Actual custom roles and independent results

| Actual role / agent identifier | Loaded marker | Final responsibility result |
| --- | --- | --- |
| developer / `/root/provider_links_developer` | `YSF-DEVELOPER-1` | Pass — implementation, eleven new tests and self-check |
| qa / `/root/provider_links_qa` | `YSF-QA-1` | Pass — independent code/data/bundle audit and all automated commands |
| uat / `/root/provider_links_uat` | `YSF-UAT-1` | Pass — independent real-browser business checks, 22 screenshots actually viewed and tested-page close |
| Main / `/root` | Orchestrator | Pass — source/type/URL and live DOM reconciliation, actual command-return review, six screenshots viewed, raw close/ownership verification and owned server cleanup |

Actual custom `agent_type` spawns and returned injected markers are recorded in `role-runtime-manifest.json`; agents did not read role TOML to supply the markers. QA/UAT read-only constraints are instructions, not a technical isolation claim.

### Automated verification

Independent QA executed `npm test` (80/80, 69 existing plus 11 new), `npm run check`, `npm run lint`, `npm run build`, `git diff --check`, and `npm run enrich:provider-links -- --check`: **all Pass, exit 0**. QA additionally performed an independent audit with negative safety/identity/eligibility/duplicate cases. No test was skipped. Existing large bundle warning remains. Developer's first lint attempt found a control-regex issue, fixed before the complete successful self-check and independent QA; original attempt logs are retained. Independent QA/UAT required **zero product repair rounds** (limit three).

### Real browser and screenshot acceptance

Chrome 156 at 1440×1000, 390×844 and 390×568: **all necessary items Pass**. Full live DOM has exact 54 identities and 95 destinations/types/labels, correct `_blank` and both rel tokens, and all 54 original source links. Main independently parsed that raw return and compared every entry directly to research and validated data.

Seven real searches each return the correct card and exact available links; only Cannons, Runcorn and Sunnybank have markers among the seven. Algester Page+Group, BK Owls Website-only, Brothers Ipswich Page-only, Oakleigh Group-only and Alexandra Hills Website+Page all pass on desktop/mobile. Link hover, hit tests, native keyboard focus, final-list-item access, Runcorn map focus/selection, Booval seven-provider shared marker/last action, Enter/Space/Escape, search recovery, native pan/zoom and opt-in range filtering pass without horizontal overflow or blocked links.

Settled pilot filtering returns 25 exact mapped IDs; native drag moves Runcorn out of bounds (1→0), OFF restores 1 and clear restores 54. An earlier capture sampled during camera motion and returned 2; the raw result remains, followed by a settled real-interaction capture verifying the required 25. No product code or acceptance criterion was changed for this timing observation.

UAT generated and individually viewed **22 new PNGs (10 desktop / 12 mobile)** after closing the test page; Main separately viewed six. Key screenshots:

- [Desktop Algester Page + Group](../../output/workflow/2026-11-05/provider-link-enrichment/uat/desktop-1440x1000-AlgesterHawks.png)
- [Mobile Algester Page + Group](../../output/workflow/2026-11-05/provider-link-enrichment/uat/mobile-390x844-AlgesterHawks.png)
- [Mobile Website + Page](../../output/workflow/2026-11-05/provider-link-enrichment/uat/mobile-390x844-AlexandraHills.png)
- [Short mobile keyboard focus](../../output/workflow/2026-11-05/provider-link-enrichment/uat/mobile-390x568-Algester-keyboard.png)
- [Desktop shared popup last item](../../output/workflow/2026-11-05/provider-link-enrichment/uat/desktop-1440x1000-Booval-last.png)
- [Mobile map focus](../../output/workflow/2026-11-05/provider-link-enrichment/uat/mobile-390x844-Runcorn-map.png)

Final Console: 0 errors and 3 existing basemap-style warnings. Network: only 30 local and 132 existing basemap requests; no organisation/Facebook/discovery/geocoding calls. The 53 cancelled map-tile requests during camera changes are retained as `ERR_ABORTED`; screenshots show loaded maps. Main independently read the raw network and Console evidence.

### Browser and local server lifecycle

**Tested-page close: Pass. Owned Vite shutdown: Pass.** Main checked the actual sequence: sole initial `about:blank` → approved local navigation → final local target at 390×568 → `browser_close` returning `await page.close()` and **No open tabs**. Main read the original close return and ownership context rather than relying on UAT's conclusion. No browser was reopened.

Both prelaunch probes found port 5183 empty. Main started only this project's strict-port Vite, owned exec session `11661`, listener PID `96538`, current-project cwd; HTTP 200 was actually observed. Sandbox port/connection restrictions required approved runtime retries, recorded without bypass. After page close Main rechecked PID/cwd/port ownership and sent SIGTERM only to PID 96538. The owned session exited **143**, port 5183 had no listener and that PID had no open cwd. Stop was independently confirmed **2026-11-05 11:35:29 AEST**. No unknown Chrome/Node or pre-existing service was terminated.

Browser-close proof establishes the tested page's closure. MCP service exit, every Chrome process exit and deletion of every socket/cache/system temporary file are **Not Verified / not asserted**, outside the required scoped cleanup. Project evidence and task-local cache/temp artifacts are deliberately retained.

## Completion Handoff

**Final result: Pass.** All necessary acceptance items have evidence; there are no unresolved product defects or required Not Verified checks.

Primary evidence under `output/workflow/2026-11-05/provider-link-enrichment/`:

- [Developer report](../../output/workflow/2026-11-05/provider-link-enrichment/developer.md), self-check commands and version manifest.
- [Independent QA](../../output/workflow/2026-11-05/provider-link-enrichment/qa/report.md), `qa/commands.json`, `qa/audit.json`, `qa/tested-version.json`.
- [Independent UAT](../../output/workflow/2026-11-05/provider-link-enrichment/uat/report.md), live DOM/search/map/keyboard raw returns, screenshot review list and `uat/tested-version-search-comparison.json`.
- [Raw browser close](../../output/workflow/2026-11-05/provider-link-enrichment/uat/browser-close-raw.json), [Main close review](../../output/workflow/2026-11-05/provider-link-enrichment/main-browser-close-review.json), [owned server lifecycle](../../output/workflow/2026-11-05/provider-link-enrichment/server-lifecycle.json).
- Main independent source/DOM/visual reviews, task-start and final SHA-256 manifests.

Compared with TASK-007's final baseline, identities/addresses/geocodes, 54/25/19/29 counts, seven searches, shared-provider identities and map/list/filter interaction remain unchanged; only the approved external-link enrichment is added. Its historical final Pass is untouched.

Known data limits remain: Verified establishes organisation-link identity, not junior basketball provision, program availability or training venues. External-site freshness/reachability and anonymous Facebook access were **Not Verified**, as external navigation/login was outside this integration's approved browser scope. Physical mobile touch, other engines and exhaustive screen-reader testing were not performed. These are optional broader checks, not missing required integration acceptance.

For future approved data maintenance, retain the original audit files, review identity/purpose/freshness, regenerate with `npm run enrich:provider-links`, and run synchronization/data/UI checks. The fixed Round 3 totals intentionally require an explicit future dataset decision; do not weaken gates or add automated scraping. No dependency installation, publication, deployment, global configuration change or TASK-008 work occurred. **Stop after this task.**
