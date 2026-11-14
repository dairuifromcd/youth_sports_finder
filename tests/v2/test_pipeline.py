import importlib.util
import json
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('pipeline', ROOT/'scripts/v2/run_pipeline.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        (ROOT/'data/v2/private').mkdir(parents=True, exist_ok=True)

    def test_directory_is_parsed_not_seeded(self):
        html = '<h2>AFFILIATED CLUBS</h2><p>New Junior Club</p><p>President: Adult</p><p>club@example.org</p><p>St. Philomena Seawolves</p><p>Basketball Convenor: Adult</p><p>*school club - St. Philomena students only</p><p>school@example.org</p><h2>FEES</h2><h2>VENUES</h2><p>Competition Arena</p>'
        clubs = p.extract_clubs(html, '2026-11-14')
        self.assertEqual([c['name'] for c in clubs], ['New Junior Club', 'St. Philomena Seawolves'])
        self.assertEqual(clubs[1]['eligibilityNote'], 'St. Philomena students only')
        self.assertEqual(clubs[0]['contactUrl'], 'mailto:club@example.org')
        self.assertEqual(clubs, p.extract_clubs(html, '2026-11-14'))
    def test_directory_missing_section_fails(self):
        with self.assertRaises(ValueError):
            p.extract_clubs('<p>VENUES</p><p>Some stadium</p>', '2026-11-14')
    def test_multiline_name_and_area_preserved(self):
        html = '<h2>AFFILIATED CLUBS</h2><p>Sunnybank Hills<br>Hurricanes</p><p>President: A</p><p>x@example.org</p><p>Cannons Southside (Calamvale area)</p><p>President: B</p><p>b@example.org</p><h2>FEES</h2>'
        clubs = p.extract_clubs(html, 'date')
        self.assertEqual(clubs[0]['name'], 'Sunnybank Hills Hurricanes')
        self.assertEqual(clubs[1]['name'], 'Cannons Southside (Calamvale area)')
    def test_gnaf_exact_and_ambiguous(self):
        header = 'address,suburb,state,postcode,longitude,latitude,gnaf_pid,source_url,release\n'
        row = '77 Symons Road,Sunnybank Hills,QLD,4109,153.055,-27.595,TEST-PID,https://data.gov.au/,synthetic-test-only\n'
        with tempfile.TemporaryDirectory(dir=ROOT/'data/v2/private') as temp:
            f = Path(temp)/'gnaf-test.csv'
            f.write_text(header + row)
            g = p.Geocoder(f)
            point, status = g.match('77 Symons Rd Sunnybank Hills QLD 4109')
            self.assertEqual(status, 'matched')
            self.assertEqual(point['precision'], 'property')
            self.assertEqual(g.match('78 Symons Road Sunnybank Hills QLD 4109')[1], 'unmatched')
            f.write_text(header + row + row.replace('153.055', '153.100'))
            self.assertEqual(p.Geocoder(f).match('77 Symons Rd Sunnybank Hills QLD 4109')[1], 'ambiguous')
    def test_official_fallback_identity_and_location_required(self):
        obj = {'features':[{'attributes':{'centre_name':'Sunnybank Hills State School','centre_code':'1889'},'geometry':{'x':153.055,'y':-27.595}}]}
        result = p.official_school_coordinates(json.dumps(obj), 'Sunnybank Hills State School', '1889', 'https://official.test', 'address')
        self.assertEqual(result['precision'], 'school_campus')
        self.assertNotEqual(result['source'], 'G-NAF')
        self.assertIsNone(p.official_school_coordinates(json.dumps(obj), 'Different school', '1889', 'https://official.test', 'address'))
        obj['features'][0]['attributes']['centre_name'] = 'Sunnybank Hills SS'
        self.assertIsNotNone(p.official_school_coordinates(json.dumps(obj), 'Sunnybank Hills State School', '1889', 'https://official.test', 'address'))
    def test_conflicting_school_address_is_not_silently_changed(self):
        school = p.SCHOOLS['Warrigal Rd State School']
        source = {'url':school[3], 'checkedAt':p.now(), 'sha256':'fixture', 'html':'314 Warrigal Road, Eight Mile Plains QLD 4113'}
        with self.assertRaisesRegex(ValueError, 'Address conflict'):
            p.corroborate_school_address(school, ['312 Warrigal Road, Eight Mile Plains QLD 4113'], source)
        school = p.SCHOOLS['Stretton State College Primary']
        source['html'] = '990 Gowan Road, Stretton QLD 4116'
        with self.assertRaisesRegex(ValueError, 'not corroborated'):
            p.corroborate_school_address(school, ['966 Gowan Road, Stretton QLD 4116'], source)
    def test_systemic_club_failure_preserves_previous_output(self):
        directory = '<h2>AFFILIATED CLUBS</h2><p>Runcorn Rockets</p><p>President: A</p><p>a@example.org</p><h2>FEES</h2>'
        class FailedClubFetcher:
            def __init__(self, *args):
                self.manifest, self.errors, self.failure_times = [], [], {}
            def get(self, url):
                if url != p.DIRECTORY:
                    raise RuntimeError('simulated all club hosts unavailable')
                return {'url':url,'checkedAt':p.now(),'sha256':'fixture','html':directory}
        with tempfile.TemporaryDirectory(dir=ROOT/'data/v2/private') as temp:
            folder = Path(temp)
            old = folder/'pilot.json'
            old.write_text('existing-approved-data')
            args = SimpleNamespace(cache=folder/'cache', output=folder, offline=True, refresh=False, gnaf_csv=None, gnaf_index=None)
            with patch.object(p, 'Fetcher', FailedClubFetcher):
                with self.assertRaisesRegex(RuntimeError, 'Systemic discovery failure'):
                    p.run(args)
            self.assertEqual(old.read_text(), 'existing-approved-data')
    def test_school_conflict_never_reaches_gnaf(self):
        directory = '<h2>AFFILIATED CLUBS</h2><p>Runcorn Rockets</p><p>President: A</p><p>a@example.org</p><h2>FEES</h2>'
        calls = []
        class FakeFetcher:
            def __init__(self, *args):
                self.manifest, self.errors, self.failure_times = [], [], {}
            def get(self, url):
                html = directory if url == p.DIRECTORY else '<p>TRAINING SCHEDULE</p><p>Monday</p><p>Warrigal Rd State School</p><p>Team: Synthetic test</p>'
                if url == p.SCHOOLS['Warrigal Rd State School'][3]:
                    html = '314 Warrigal Road, Eight Mile Plains QLD 4113'
                return {'url':url,'checkedAt':p.now(),'sha256':'fixture','html':html}
        class FakeGeocoder:
            def __init__(self, *args): pass
            def match(self, address):
                calls.append(address)
                return {'longitude':153.0,'latitude':-27.5,'source':'G-NAF','sourceUrl':'https://example.test','precision':'property'}, 'matched'
        with tempfile.TemporaryDirectory(dir=ROOT/'data/v2/private') as temp:
            folder = Path(temp)
            args = SimpleNamespace(cache=folder/'cache',output=folder,offline=True,refresh=False,gnaf_csv=None,gnaf_index=None)
            with patch.object(p, 'Fetcher', FakeFetcher), patch.object(p, 'Geocoder', FakeGeocoder), patch.object(p, 'current_summer_source', return_value=True):
                result = p.run(args)
            self.assertEqual(calls, [])
            self.assertEqual(result['mappedVenues'], 0)
            venue = json.loads((folder/'pilot.json').read_text())['venues'][0]
            self.assertTrue(venue['address'].startswith('312 '))
            self.assertIsNone(venue['coordinates'])
    def test_confirmed_non_numeric_address_supersedes_earlier_candidate(self):
        directory = '<h2>AFFILIATED CLUBS</h2><p>Algester Hawks</p><p>President: A</p><p>a@example.org</p><p>Runcorn Rockets</p><p>President: B</p><p>b@example.org</p><h2>FEES</h2>'
        class FakeFetcher:
            def __init__(self, *args):
                self.manifest, self.errors, self.failure_times = [], [], {}
            def get(self, url):
                if url == p.DIRECTORY:
                    html = directory
                elif url == p.SOURCES['Algester Hawks'][0]:
                    html = 'Club trainings at Yugumbir State School or Calamvale College'
                elif url in p.SOURCES['Runcorn Rockets']:
                    html = '<p>TRAINING SCHEDULE</p><p>Monday</p><p>Calamvale CC School Gymnasium</p><p>Team: Synthetic test</p>'
                else:
                    raise RuntimeError('Official address unavailable in this synthetic test')
                return {'url':url,'checkedAt':p.now(),'sha256':'fixture','html':html}
        with tempfile.TemporaryDirectory(dir=ROOT/'data/v2/private') as temp:
            folder = Path(temp)
            args = SimpleNamespace(cache=folder/'cache',output=folder,offline=True,refresh=False,gnaf_csv=None,gnaf_index=None)
            with patch.object(p, 'Fetcher', FakeFetcher), patch.object(p, 'current_summer_source', return_value=True):
                p.run(args)
            pilot = json.loads((folder/'pilot.json').read_text())
            venue = next(v for v in pilot['venues'] if v['name'] == 'Calamvale Community College')
            self.assertEqual(venue['address'], 'School Access Rd, off Hamish St, Calamvale QLD 4116')
            self.assertNotIn('rawAddresses', venue)
            private = json.loads(p.private_output_path(args.output).read_text())
            venue = next(v for v in private['venues'] if v['name'] == 'Calamvale Community College')
            self.assertIn('Calamvale College (community directory)', venue['rawAddresses'])
            self.assertIn(venue['address'], venue['rawAddresses'])
            self.assertIsNone(venue['coordinates'])
    def test_viewport_coordinates_cannot_be_campus(self):
        self.assertIsNone(p.campus_coordinates('<iframe src="https://google.com/maps?ll=-27.5,153.0"></iframe>', 'https://school.test', 'address'))
    def test_historical_season_and_stale_source_never_current(self):
        self.assertFalse(p.current_summer_source({'checkedAt':p.now(), 'html':'Summer Season 2020/2021'}))
        self.assertFalse(p.current_summer_source({'checkedAt':'2020-11-14T00:00:00+00:00', 'html':'Summer Season 2026/2027'}))
    def test_offline_cache_and_timestamp(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'data/v2/private') as temp:
            url = 'https://fixture.test/page'
            key = p.hashlib.sha256(url.encode()).hexdigest()
            obj = {'url':url,'checkedAt':'2026-01-01T00:00:00+00:00','sha256':'test','html':'test'}
            (Path(temp)/(key+'.json')).write_text(json.dumps(obj))
            fetch = p.Fetcher(temp, offline=True)
            self.assertEqual(fetch.get(url)['checkedAt'], '2026-01-01T00:00:00+00:00')
            with self.assertRaises(RuntimeError):
                fetch.get('https://fixture.test/uncached')

if __name__ == '__main__':
    unittest.main()
