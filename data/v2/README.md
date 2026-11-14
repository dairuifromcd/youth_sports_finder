# SWM pilot inputs and exports

`private/cache/` contains bounded raw HTTP responses and failed-source metadata,
keyed by URL SHA-256. It is ignored by Git and is not a frontend asset. Successful
and failed requests expire after seven days; `--refresh` bypasses that cache.
`--offline` reuses original collection times and performs no HTTP requests.
Current-season confirmation additionally expires after 30 days and outside the
stated October–March summer season. Refresh before relying on older results.

The frontend reads only `public/data/v2/pilot.json`; `venues.geojson`,
`review.json`, and `summary.json` are derived alongside it. No raw pages, team
lists, children’s names, or source datasets are exported. Static exports are for
local review; this task does not authorize publication.

The adapter parses the Association’s actual affiliated-club section. The eight
expected names are only a coverage comparison. Reviewed discovery URLs and
school-name aliases are adapter configuration, not manufactured club records.
Unrecognised clubs remain visible and enter review. Competition-only lists,
undated auxiliary sources, mixed training/game venues, and historical terms do
not become confirmed weekly training.

G-NAF is an optional, offline exact-address input. Use an appropriately licensed
project-local CSV with columns:

```text
address,suburb,state,postcode,longitude,latitude,gnaf_pid,source_url,release
```

`address` is the street portion; the matcher joins it with suburb, state and
postcode. `--gnaf-csv data/v2/private/your-extract.csv --gnaf-index
data/v2/private/gnaf.sqlite` builds a local SQLite index. Supply only the index
on later runs. Conflicting point candidates remain ambiguous; school aliases
require physical-address corroboration before either G-NAF or campus fallback.
No dataset is downloaded by the adapter. Unit-test coordinates are synthetic
and never establish real G-NAF verification.

Government campus fallback uses Queensland Department of Education school
locations, with explicit centre-code/name binding and official school physical
address checks. Attribution and CC BY 4.0 information are retained in the
export. These locations are campus points, not hall entrances; the publisher
has not independently verified their positional accuracy.

## Public repository export review

The commit/push review introduced an allowlisted public projection. Full evidence,
raw address transformations, source attempts, contacts, error details and input
hash manifests are saved only in ignored `private/runs/output-*/pilot.json`.
Public evidence contains source/date/status metadata; public review reasons are
short neutral categories. Public summaries omit operational manifests/errors.
Standalone GeoJSON also retains the government attribution and precision notice.
Source club/association pages do not grant a blanket open-content licence: only
independently expressed organization/venue facts and source links are exported,
not HTML, prose, photographs, logos, schedules or team/player lists. Government
school point data is reused under its stated CC BY 4.0 licence with attribution.
