# Youth Sports Finder — Basketball V2

SWM Pirates pilot for Greater Brisbane: discover affiliated junior basketball clubs and confirmed regular team training venues. The React/MapLibre app uses **only V2 pilot data**. Clubs awaiting training or coordinate evidence remain in the directory without a marker.

2026-11-14 result: **8 clubs, 3 with confirmed training, 8 unique training venues, 2 mapped campus fallback locations**. G-NAF remains Not Verified, so the overall status is **Partial Pass**. See [implementation result](docs/SWM-PIRATES-MVP-RESULT.md) and [input/cache/geocoder details](data/v2/README.md).

## Run locally

Use Node.js 22.12+ and Python 3.10+. Install locked project dependencies with `npm ci` (free dependencies; no global install), then:

```sh
npm run pipeline:swm
npm run dev -- --host 127.0.0.1
```

Pipeline entry: `python3 scripts/v2/run_pipeline.py --association swm-pirates`. It fetches the official SWM directory, parses the current affiliated clubs, attempts club training discovery, resolves addresses, runs the local geocoder, and generates the pilot JSON, training GeoJSON, review queue and run summary. No account, production database, paid API or deployment is involved.

```sh
# Rebuild from already collected sources without network requests
npm run pipeline:swm -- --offline
# Recheck sources instead of using the normal cache
npm run pipeline:swm -- --refresh
```

The first run requires authorized internet access. Offline rebuilding requires the private local cache from a real run; raw web pages are intentionally not distributed. Single-source failures enter the review queue. A systemic discovery failure must preserve previously usable outputs and return a failure.

## Data and map meaning

`Association → Affiliated Clubs → Regular Training Venues → Addresses → Offline Geocoding → Static JSON/GeoJSON → MapLibre`

- `scripts/v2/`: SWM adapter, cached collection, evidence processing and offline geocoder.
- `public/data/v2/`: minimized generated local frontend data; no raw pages, children’s details or full G-NAF data.
- Local caches, raw inputs and address indexes stay ignored and must never be published.
- `src/pilot.ts`, `src/App.tsx`, `src/ClubMap.tsx`: V2 search, club list and training-venue map. The app never substitutes V1 provider addresses if V2 loading fails.
- One marker represents a physical training location; shared locations show all linked clubs. Search by club, confirmed venue or suburb. A club’s venue button opens the matching marker.
- Only `confirmed_regular` / `regular_team_training` relationships may appear on the map. Competition venues, camps, administration addresses, old arrangements and unresolved candidates are excluded.
- School/campus and property coordinates are approximate locations, not basketball hall entrances. Coordinate precision and actual source links appear in the list and popup. Confirm current arrangements with the club.
- St. Philomena Seawolves retains its school-students-only restriction.

The official directory is [SWM Junior Clubs](https://www.piratesbasketball.net.au/juniorclub). Its association competition `VENUES` list is not evidence that each club trains there. Official club pages, checked dates, evidence decisions and unresolved reasons are recorded by the pipeline. Current totals and limitations are in the generated run summary.

## Geocoding and limits

G-NAF is the preferred offline address source. No paid geocoder is used. Address matching must agree on street/address, suburb, state and postcode, and distinct unresolved candidates stay ambiguous. A verified official school campus coordinate may be used as an explicitly labelled fallback; it must never be labelled G-NAF. Without a real G-NAF match run, G-NAF remains **Not Verified** and the task status remains **Partial Pass**.

[Official G-NAF entry](https://www.industry.gov.au/publications/geocoded-national-address-file-g-naf-and-administrative-boundaries-ab-data). Check licence, package size and free disk space before downloading: this task permits at most 250 MB per download and at most 1 GB extracted; larger resources need separate Owner authorization. Never commit raw G-NAF or local indexes. See the script’s `--help` for local index input options.

## Verification

```sh
npm run test:v2
npm run check
npm run lint
npm run build
```

`npm test` also runs inherited V1 checks. Some depend on private research inputs absent from this worktree; missing-input failures are not a reason to invent fixtures or restore private backups. Relevant V2 tests cover shared venues, evidence gating, list-only clubs, coordinates, source links and absence of V1 fallback. Browser UAT and independent data QA evidence are saved under `output/` and documented in the current implementation result.

Map background tiles require internet access. The pilot is incomplete and source availability can change. This is a local implementation; no Cloudflare project, publish, commit or push is performed. Scope and workflow: [AGENTS.md](AGENTS.md), [V2 Scope](docs/V2-SCOPE.md), [.codex/WORKFLOW.md](.codex/WORKFLOW.md). V1 history is retained for reference and is not the V2 acceptance standard.
