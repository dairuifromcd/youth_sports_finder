#!/usr/bin/env python3
"""Small, cached SWM adapter. Only confirmed weekly training can reach GeoJSON.

Raw pages and local G-NAF extracts remain in data/v2/private. No third-party
geocoder is used. Run with --offline to rebuild without any network access.
"""
import argparse
import csv
import hashlib
import json
import re
import sqlite3
import sys
import time
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone, timedelta
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = 'https://www.piratesbasketball.net.au/juniorclub'
ASSOCIATION = 'association-swm-pirates'
BASELINE = ['Algester Hawks', 'Cannons Southside', 'River City Hornets',
            'Rochedale Wildcats', 'Runcorn Rockets', 'Sunnybank Hills Hurricanes',
            'St. Philomena Seawolves', 'Dunk Star Basketball Club']
# Reviewed discovery entry points, not club records. Only directory-parsed
# clubs are investigated. Missing/new entries still receive a ReviewItem.
SOURCES = {
 'Algester Hawks': ['https://www.mycommunitydirectory.com.au/Queensland/Brisbane/Sport/Indoor_Sports/10847/110496/Algester_Hawks_Basketball_Club_Inc_'],
 'Cannons Southside': ['https://www.cannonsbasketball.com/'],
 'River City Hornets': ['https://www.rivercityhornets.com.au/', 'https://www.rivercityhornets.com.au/menu5.php?id=942411'],
 'Rochedale Wildcats': [DIRECTORY, 'https://rochedaleshs.eq.edu.au/SupportAndResources/FormsAndDocuments/Documents/RAS/ras-prospectus.pdf'],
 'Runcorn Rockets': ['https://www.rocketsbasketball.com.au/', 'https://www.rocketsbasketball.com.au/menu5.php?id=946871'],
 'Sunnybank Hills Hurricanes': ['https://www.sunnybankhillshurricanes.com.au/menu5.php?id=946399'],
 'St. Philomena Seawolves': ['https://stphilomena.qld.edu.au/sport/'],
 'Dunk Star Basketball Club': ['https://dunkstar.com.au/pages/contact', 'https://dunkstar.com.au/pages/2026-term3-training'],
}
SCHOOLS = {
 'Runcorn SHS Stadium': ('Runcorn State High School', '132 Hill Road, Runcorn QLD 4113', 'Runcorn', 'https://runcornshs.eq.edu.au/our-school/contact-us', 'https://runcornshs.eq.edu.au/our-school/maps-and-transport'),
 'Sunnybank Hills State School': ('Sunnybank Hills State School', '77 Symons Road, Sunnybank Hills QLD 4109', 'Sunnybank Hills', 'https://sunnybankhillsss.eq.edu.au/our-school/contact-us', 'https://sunnybankhillsss.eq.edu.au/our-school/maps-and-transport'),
 'Calamvale CC School Gymnasium': ('Calamvale Community College', '11 Hamish Street, Calamvale QLD 4116', 'Calamvale', 'https://calamvalecomcoll.eq.edu.au/our-school/contact-us', 'https://calamvalecomcoll.eq.edu.au/our-school/maps-and-transport'),
 'Stretton State College Primary': ('Stretton State College Junior Campus', '966 Gowan Road, Stretton QLD 4116', 'Stretton', 'https://strettonsc.eq.edu.au/our-school/contact-us', 'https://strettonsc.eq.edu.au/our-school/maps-and-transport'),
 'Warrigal Rd State School': ('Warrigal Road State School', '314 Warrigal Road, Eight Mile Plains QLD 4113', 'Eight Mile Plains', 'https://warrigalroadss.eq.edu.au/our-school/contact-us', 'https://warrigalroadss.eq.edu.au/our-school/maps-and-transport'),
}
SCHOOL_CODES = {'Sunnybank Hills State School': '1889', 'Runcorn State High School': '2167'}
# Explicit government naming aliases, bound to a reviewed centre code.
SCHOOL_API_NAMES = {'1889': {'Sunnybank Hills State School', 'Sunnybank Hills SS'},
                    '2167': {'Runcorn State High School', 'Runcorn SHS'}}
COORDINATE_ATTRIBUTION = '© State of Queensland (Department of Education; Non-State Schools Accreditation Board) 2026. CC BY 4.0. School locations have not been independently verified by the data publisher; campus fallback, not hall or entrance.'

def school_query(code):
    from urllib.parse import urlencode
    # Official service catalog: layer 4 Primary; layer 5 Junior Secondary.
    layer = '5' if code == '2167' else '4'
    return 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Society/SchoolsAndSchoolCatchments/MapServer/' + layer + '/query?' + urlencode({
        'where': "centre_code='" + code + "'", 'outFields': 'centre_name,centre_code,source,data_currency,disclaimer', 'outSR': 4326, 'f': 'pjson'})

def official_school_coordinates(raw, name, code, source_url, address):
    obj = json.loads(raw)
    rows = obj.get('features', [])
    if len(rows) != 1:
        return None
    row = rows[0]
    a, p = row.get('attributes', {}), row.get('geometry', {})
    allowed = {normalize(n) for n in SCHOOL_API_NAMES.get(code, {name})}
    if normalize(name) not in allowed or normalize(a.get('centre_name', '')) not in allowed or str(a.get('centre_code', '')) != code:
        return None
    lon, lat = p.get('x'), p.get('y')
    if not isinstance(lon, (int, float)) or not isinstance(lat, (int, float)) or not (138 < lon < 154 and -29.2 < lat < -9):
        return None
    return {'longitude': lon, 'latitude': lat, 'source': 'Queensland Department of Education school location (campus fallback)',
            'sourceUrl': source_url, 'precision': 'school_campus', 'matchedAddress': address,
            'centreCode': code, 'dataCurrency': a.get('data_currency'), 'publisherSource': a.get('source'),
            'disclaimer': a.get('disclaimer'), 'attribution': COORDINATE_ATTRIBUTION}

def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')

def stable(kind, value):
    return kind + '-' + hashlib.sha256(normalize(value).encode()).hexdigest()[:16]

def normalize(value):
    value = unescape(value).replace('\u200b', '').replace('\xa0', ' ')
    value = re.sub(r'\b(rd|st)\b', lambda m: {'rd': 'road', 'st': 'street'}[m[1]], value.lower())
    return re.sub(r'[^a-z0-9]+', ' ', value).strip()

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.parts, self.links, self.frames = [], [], []
        self.skip = 0
        self.feed(html)
        self.text = re.sub(r'[ \t\r\f\v]+', ' ', unescape(''.join(self.parts))).replace('\u200b', '')
        self.lines = [s.strip() for s in self.text.splitlines() if s.strip()]
        self.text = '\n'.join(self.lines)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'):
            self.skip += 1
        if tag in ('p', 'div', 'h1', 'h2', 'h3', 'li', 'tr', 'td', 'br'):
            self.parts.append('\n')
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag == 'iframe' and a.get('src'):
            self.frames.append(unescape(a['src']))
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
        if tag in ('p', 'div', 'h1', 'h2', 'h3', 'li', 'tr', 'td'):
            self.parts.append('\n')
    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

class Fetcher:
    def __init__(self, cache, offline=False, refresh=False):
        self.cache, self.offline, self.refresh = Path(cache), offline, refresh
        self.cache.mkdir(parents=True, exist_ok=True)
        self.manifest, self.errors, self.robots = [], [], {}
        self.failure_times = {}
        self.last_request = 0
    def get(self, url):
        key = hashlib.sha256(url.encode()).hexdigest()
        failure = self.cache / (key + '.error.json')
        if failure.exists() and not self.refresh:
            obj = json.loads(failure.read_text())
            age = datetime.now(timezone.utc) - datetime.fromisoformat(obj['checkedAt'])
            if self.offline or age < timedelta(days=7):
                self.errors.append(obj)
                self.failure_times[url] = obj['checkedAt']
                raise RuntimeError(obj['reason'])
        try:
            return self._get(url)
        except Exception as exc:
            if not self.offline:
                obj = {'url': url, 'checkedAt': now(), 'reason': str(exc)}
                failure.write_text(json.dumps(obj, ensure_ascii=False))
                self.errors.append(obj)
                self.failure_times[url] = obj['checkedAt']
            raise
    def _get(self, url):
        key = hashlib.sha256(url.encode()).hexdigest()
        file = self.cache / (key + '.json')
        if file.exists() and not self.refresh:
            obj = json.loads(file.read_text())
            age = datetime.now(timezone.utc) - datetime.fromisoformat(obj['checkedAt'])
            if self.offline or age < timedelta(days=7):
                self.manifest.append({k: obj[k] for k in ('url', 'checkedAt', 'sha256')})
                return obj
        if self.offline:
            raise RuntimeError('Offline cache miss: ' + url)
        if url.lower().endswith('.pdf'):
            raise RuntimeError('PDF evidence requires manual text review; no automatic training inference')
        # Never authenticate or attempt to circumvent Facebook access controls.
        if 'facebook.com' in url:
            raise RuntimeError('Facebook not fetched: no login or access-control bypass; public page requires review')
        from urllib.parse import urlsplit
        p = urlsplit(url)
        origin = p.scheme + '://' + p.netloc
        if origin not in self.robots:
            robot = urllib.robotparser.RobotFileParser()
            try:
                with urllib.request.urlopen(origin + '/robots.txt', timeout=15) as r:
                    robot.parse(r.read(512_000).decode('utf-8', errors='replace').splitlines())
                self.robots[origin] = robot
            except Exception:
                self.robots[origin] = None
        robot = self.robots[origin]
        if robot and not robot.can_fetch('YouthSportsFinder', url):
            raise RuntimeError('robots.txt disallows: ' + url)
        delay = max(1.0, (robot.crawl_delay('YouthSportsFinder') or 0) if robot else 0)
        time.sleep(max(0, delay - (time.monotonic() - self.last_request)))
        req = urllib.request.Request(url, headers={'User-Agent': 'YouthSportsFinder/2.0 (public organisation training-venue research)'})
        self.last_request = time.monotonic()
        with urllib.request.urlopen(req, timeout=25) as r:
            raw = r.read(5_000_001)
            if len(raw) > 5_000_000:
                raise RuntimeError('Page exceeds 5 MB cap')
            html = raw.decode('utf-8', errors='replace')
        obj = {'url': url, 'checkedAt': now(), 'sha256': hashlib.sha256(raw).hexdigest(), 'html': html}
        file.write_text(json.dumps(obj, ensure_ascii=False))
        failure = self.cache / (key + '.error.json')
        if failure.exists():
            failure.unlink()
        self.manifest.append({k: obj[k] for k in ('url', 'checkedAt', 'sha256')})
        return obj

def current_summer_source(source):
    """Do not keep a historical season current forever, even in offline mode."""
    checked = datetime.fromisoformat(source['checkedAt'])
    today = datetime.now(timezone.utc)
    if today - checked > timedelta(days=30):
        return False
    for year, end in re.findall(r'(20\d{2})\s*/\s*(20\d{2}|\d{2})', Page(source['html']).text):
        y, e = int(year), int(end) if len(end) == 4 else int(year[:2] + end)
        if e == y + 1 and datetime(y, 10, 1, tzinfo=timezone.utc) <= today < datetime(e, 4, 1, tzinfo=timezone.utc):
            return True
    return False

def corroborate_school_address(school, raw_addresses, source):
    """A reviewed school alias never licenses silently changing a house number."""
    proposed = school[1]
    expected_number = re.match(r'\d+', proposed)
    for raw in raw_addresses:
        number = re.match(r'\d+', raw)
        if number and expected_number and number[0] != expected_number[0]:
            raise ValueError('Address conflict: club says ' + raw + '; proposed school address is ' + proposed)
    if normalize(proposed) not in normalize(Page(source['html']).text):
        raise ValueError('School address not corroborated by official contact page: ' + proposed)
    return {'rawAddresses': sorted(set(raw_addresses)), 'resolvedAddress': proposed,
            'sourceUrl': source['url'], 'checkedAt': source['checkedAt'], 'contentHash': source['sha256'],
            'basis': 'Reviewed school-name alias plus official physical address corroboration; numeric conflicts rejected'}

def extract_clubs(html, checked_at):
    page = Page(html)
    # SWM rich-text adapter: the affiliated section contains one heading/name
    # followed by a President/Convenor and organisation contact. The unrelated
    # VENUES competition section is explicitly outside this parser.
    text = page.text
    start = text.upper().find('AFFILIATED CLUBS')
    if start < 0:
        raise ValueError('Association structure changed: AFFILIATED CLUBS missing')
    section = text[start + len('AFFILIATED CLUBS'):]
    section = re.split(r'\bFEES\b', section, maxsplit=1, flags=re.I)[0]
    records = []
    blocks = re.split(r'(?i)(?:President|Basketball Convenor)\s*:', section)
    # Each block before an office heading ends with the next club name. Strip
    # prior official/contact lines; preserve the displayed name and area note.
    for i, block in enumerate(blocks[:-1]):
        lines = [s.strip() for s in block.splitlines() if s.strip()]
        if not lines:
            continue
        candidates = []
        for line in reversed(lines):
            if '@' in line or 'students only' in line.lower() or line.startswith('*'):
                break
            candidates.insert(0, line)
            if re.search(r'Hawks|Cannons|Hornets|Wildcats|Rockets|Sunnybank|Philomena|Dunk|Club', line, re.I):
                break
        name = ' '.join(candidates).strip()
        if not name or len(name) > 120:
            raise ValueError('Unrecognised affiliated club block')
        following = blocks[i + 1]
        emails = re.findall(r'[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}', following)
        club = {'id': stable('club', ASSOCIATION + ' ' + re.sub(r'\s*\([^)]*\)', '', name)),
                'name': name, 'associationId': ASSOCIATION, 'sourceUrl': DIRECTORY,
                'checkedAt': checked_at, 'collectedAt': checked_at,
                'contactUrl': 'mailto:' + emails[0] if emails else DIRECTORY,
                'eligibilityNote': 'St. Philomena students only' if 'students only' in following.lower() else None}
        if not any(c['id'] == club['id'] for c in records):
            records.append(club)
    if not records:
        raise ValueError('No clubs parsed; refusing to replace previous output')
    return records

class Geocoder:
    """Exact normalized offline G-NAF index; ambiguous points stay unresolved.

    Import a project-local, licensed CSV extract with columns address, suburb,
    state, postcode, longitude, latitude, gnaf_pid, source_url, release.
    This adapter never downloads or relabels external coordinates as G-NAF.
    """
    def __init__(self, csv_path=None, db_path=None):
        self.count = 0
        self.db = sqlite3.connect(str(db_path) if db_path else ':memory:')
        self.db.execute('CREATE TABLE IF NOT EXISTS addresses (key TEXT, data TEXT)')
        if csv_path:
            with open(csv_path, newline='') as f:
                rows = list(csv.DictReader(f))
            valid = []
            for row in rows:
                required = ['address', 'suburb', 'state', 'postcode', 'longitude', 'latitude', 'gnaf_pid', 'source_url', 'release']
                if any(not row.get(k) for k in required):
                    raise ValueError('G-NAF CSV missing required metadata')
                lon, lat = float(row['longitude']), float(row['latitude'])
                if row['state'] != 'QLD' or not (138 <= lon <= 154 and -29.2 <= lat <= -9):
                    raise ValueError('G-NAF coordinate/state outside QLD')
                key = normalize(row['address'] + ' ' + row['suburb'] + ' ' + row['state'] + ' ' + row['postcode'])
                valid.append((key, json.dumps(row)))
            with self.db:
                self.db.execute('DELETE FROM addresses')
                self.db.executemany('INSERT INTO addresses VALUES (?,?)', valid)
                self.db.execute('CREATE INDEX IF NOT EXISTS address_key ON addresses(key)')
        self.count = self.db.execute('SELECT COUNT(*) FROM addresses').fetchone()[0]
    def match(self, address):
        rows = [json.loads(row[0]) for row in self.db.execute('SELECT data FROM addresses WHERE key=?', (normalize(address),))]
        points = {(float(r['longitude']), float(r['latitude'])) for r in rows}
        if len(points) > 1:
            return None, 'ambiguous'
        if not rows:
            return None, 'unmatched'
        r = rows[0]
        return {'longitude': float(r['longitude']), 'latitude': float(r['latitude']), 'source': 'G-NAF',
                'sourceUrl': r['source_url'], 'precision': 'property', 'matchedAddress': address,
                'gnafPid': r['gnaf_pid'], 'release': r['release']}, 'matched'

def campus_coordinates(html, source_url, address):
    # Only explicit map marker coordinates in a school's own embedded map;
    # never map viewport/centre or suburb centroid values.
    candidates = set()
    for frame in Page(html).frames:
        if 'google.com/maps' not in frame and 'maps.google.' not in frame:
            continue
        for pattern in [r'[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)', r'!3d(-?\d+\.\d+)!2d(-?\d+\.\d+)']:
            for lat, lon in re.findall(pattern, frame):
                lat, lon = float(lat), float(lon)
                if 138 < lon < 154 and -29.2 < lat < -9:
                    candidates.add((lon, lat))
    if len(candidates) != 1:
        return None
    lon, lat = next(iter(candidates))
    return {'longitude': lon, 'latitude': lat, 'source': 'Official school embedded map (campus fallback)',
            'sourceUrl': source_url, 'precision': 'school_campus', 'matchedAddress': address}

def run(args):
    fetch = Fetcher(args.cache, args.offline, args.refresh)
    directory = fetch.get(DIRECTORY)  # systemic failure must not touch good output
    clubs = extract_clubs(directory['html'], directory['checkedAt'])
    geocoder = Geocoder(args.gnaf_csv, args.gnaf_index)
    venues, relations, evidence, review = {}, {}, {}, {}
    def item(club, reason, url, venue=None, status='unresolved'):
        key = stable('review', club['id'] + reason + str(venue))
        review[key] = {'id': key, 'clubId': club['id'], 'venueId': venue, 'reason': reason,
                       'sourceUrl': url, 'checkedAt': club['checkedAt'], 'status': status}
    def relation(club, name, address, suburb, source, status='confirmed_regular', note=None):
        # A reviewed alias, shared across clubs, uses one physical campus ID.
        canonical = SCHOOLS.get(name, (name, address, suburb, None, None))
        vid = stable('venue', canonical[0] + ' ' + canonical[2])
        if vid not in venues:
            venues[vid] = {'id': vid, 'name': canonical[0], 'address': address, 'suburb': canonical[2], 'rawNames': [], 'rawAddresses': [], 'coordinates': None}
        if name not in venues[vid]['rawNames']:
            venues[vid]['rawNames'].append(name)
        if address not in venues[vid]['rawAddresses']:
            venues[vid]['rawAddresses'].append(address)
        prior_confirmed = any(r['venueId'] == vid and r['evidenceStatus'] == 'confirmed_regular' for r in relations.values())
        if status == 'confirmed_regular':
            if not prior_confirmed or (re.match(r'\d+', address) and not re.match(r'\d+', venues[vid]['address'])):
                venues[vid]['address'] = address
        date_match = re.search(r'Updated\s+(\d{1,2})/(\d{1,2})/(20\d{2})', Page(source['html']).text, re.I)
        source_date = datetime(int(date_match[3]), int(date_match[2]), int(date_match[1])).date().isoformat() if date_match else None
        eid = stable('evidence', source['url'] + club['id'] + vid)
        evidence[eid] = {'id': eid, 'kind': 'training_relationship', 'sourceUrl': source['url'], 'sourceDate': source_date,
                         'checkedAt': source['checkedAt'], 'contentHash': source['sha256'], 'status': status,
                         'basis': note or 'Club official current weekly team training schedule explicitly names venue'}
        rid = stable('club-venue', club['id'] + vid)
        relations[rid] = {'id': rid, 'clubId': club['id'], 'venueId': vid, 'venueName': name,
                          'trainingAddress': address, 'activityType': 'regular_team_training', 'sourceUrl': source['url'],
                          'sourceDate': source_date, 'checkedAt': source['checkedAt'], 'evidenceStatus': status, 'evidenceId': eid,
                          'note': note}
        if status != 'confirmed_regular':
            item(club, note or 'Training relationship requires verification', source['url'], vid, status)
    read_club_sources = set()
    for club in clubs:
        for kind, basis in [('association_affiliation', 'Official SWM affiliated junior club directory'), ('junior_eligibility', 'SWM Junior Club Competition directory; school-only restriction retained where stated')]:
            eid = stable('evidence', DIRECTORY + club['id'] + kind)
            evidence[eid] = {'id': eid, 'kind': kind, 'clubId': club['id'], 'sourceUrl': DIRECTORY,
                             'checkedAt': directory['checkedAt'], 'contentHash': directory['sha256'], 'basis': basis}
        key = next((k for k in SOURCES if normalize(re.sub(r'\([^)]*\)', '', club['name'])) == normalize(k)), None)
        attempts = []
        club['discoveryAttempts'] = attempts
        club['website'] = SOURCES[key][0] if key and key not in ('Algester Hawks', 'Rochedale Wildcats') else None
        if not key:
            item(club, 'New directory club: no reviewed discovery adapter', DIRECTORY)
            continue
        for url in SOURCES[key]:
            try:
                source = fetch.get(url)
                page = Page(source['html'])
                if url != DIRECTORY:
                    read_club_sources.add(url)
                attempts.append({'sourceUrl': url, 'checkedAt': source['checkedAt'], 'outcome': 'read'})
                if key == 'Sunnybank Hills Hurricanes' and current_summer_source(source) and re.search(r'All\s+team\s+training\s+will\s+be\s+held\s+at\s+Sunnybank Hills State School', page.text, re.I):
                    relation(club, 'Sunnybank Hills State School', '77 Symons Road, Sunnybank Hills QLD 4109', 'Sunnybank Hills', source,
                             note='2026/2027 summer registration explicitly locates all team training here; confirm session with club')
                elif key == 'Runcorn Rockets' and current_summer_source(source) and 'TRAINING SCHEDULE' in page.text:
                    schedule = page.text.split('TRAINING SCHEDULE', 1)[1]
                    # Only the actual weekly table after Monday, not temporary
                    # unavailability notices above it or competition addresses.
                    schedule = schedule.split('Monday', 1)[-1]
                    for name, rawaddress, suburb in [
                      ('Calamvale CC School Gymnasium', 'School Access Rd, off Hamish St, Calamvale QLD 4116', 'Calamvale'),
                      ('Hibiscus Stadium', '90 Klumpp Road, Upper Mt Gravatt QLD 4122', 'Upper Mt Gravatt'),
                      ('Nissan Arena', '590 Mains Road, Nathan QLD 4111', 'Nathan'),
                      ('Runcorn SHS Stadium', '132 Hill Road, Runcorn QLD 4113', 'Runcorn'),
                      ('Stretton State College Primary', '966 Gowan Road, Stretton QLD 4116', 'Stretton'),
                      ('Warrigal Rd State School', '312 Warrigal Road, Eight Mile Plains QLD 4113', 'Eight Mile Plains')]:
                        if name in schedule and re.search(r'Team\s*:', schedule):
                            relation(club, name, rawaddress, suburb, source, note='2026/2027 weekly team schedule; school-event cancellations also published. Check club before visiting.')
                elif key == 'Cannons Southside' and 'Visit us when' in page.text and 'Calamvale Community College Sports Hall' in page.text:
                    relation(club, 'Calamvale CC School Gymnasium', '11 Hamish Street, Calamvale QLD 4116', 'Calamvale', source, 'candidate',
                             'Undated invitation to visit training and hall address; weekly/current-season relationship not explicit')
                elif key == 'River City Hornets' and current_summer_source(source) and 'There will be a training session each week apart from school holidays' in page.text:
                    training = re.search(r'Venues used for training are\s+([^\n]+)', page.text)
                    if training and 'Hibiscus Stadium (Mt Gravatt)' in training[1]:
                        relation(club, 'Hibiscus Stadium', 'Hibiscus Stadium, Mt Gravatt', 'Upper Mt Gravatt', source,
                                 note='2026/27 current official weekly squad and individual team training; excludes school holidays')
                    if training and 'Eagles Sports Complex (Mansfield)' in training[1]:
                        relation(club, 'Eagles Sports Complex', 'Eagles Sports Complex, Mansfield (full address unresolved)', 'Mansfield', source,
                                 note='2026/27 current official weekly squad and individual team training; full address needs official resolution')
                elif key == 'Algester Hawks' and 'Yugumbir State School' in page.text and 'trainings' in page.text:
                    relation(club, 'Yugumbir State School', 'School name only; full address not resolved', 'Regents Park', source, 'candidate',
                             'Undated community directory auxiliary evidence only; official/current-season training not verified; Facebook not accessed')
                    if 'Calamvale College' in page.text:
                        relation(club, 'Calamvale CC School Gymnasium', 'Calamvale College (community directory)', 'Calamvale', source, 'candidate',
                                 'Undated auxiliary source uses Calamvale College; identity/current training requires official verification')
                elif key == 'Dunk Star Basketball Club' and 'Regular Training & Game Venues' in page.text:
                    for name, address, suburb in [('Runcorn SHS Stadium', 'Runcorn State High School', 'Runcorn'), ('Calamvale CC School Gymnasium', 'Calamvale Community College', 'Calamvale'), ('Rochedale State High School', 'School name only', 'Rochedale'), ('Hibiscus Stadium', 'Address not resolved', 'Upper Mt Gravatt'), ('Eagles Sports Complex', 'Address not resolved', 'Mansfield')]:
                        relation(club, name, address, suburb, source, 'candidate', 'Official combined training/game venue list does not distinguish ordinary team training from competition')
                elif key == 'Dunk Star Basketball Club' and '2026 Term3 Training' in page.text:
                    item(club, 'Term 3 2026 schedule is historical at November check; Wishart/Rochedale locality alone cannot identify current venue', url, status='historical')
            except Exception as exc:
                attempts.append({'sourceUrl': url, 'checkedAt': fetch.failure_times.get(url, club['checkedAt']), 'outcome': 'unresolved', 'reason': str(exc)})
                item(club, 'Source unavailable: ' + str(exc), url)
        if not any(r['clubId'] == club['id'] and r['evidenceStatus'] == 'confirmed_regular' for r in relations.values()):
            item(club, 'No confirmed current regular team training venue extracted; contact club', SOURCES[key][-1])
    if not read_club_sources:
        raise RuntimeError('Systemic discovery failure: no club sources readable; previous output retained')
    # Address resolution and coordinate lookup are separate from the training
    # relationship. School contact page must corroborate address before fallback.
    for venue in venues.values():
        if not any(r['venueId'] == venue['id'] and r['evidenceStatus'] == 'confirmed_regular' for r in relations.values()):
            continue
        state = 'unmatched'
        school = next((s for s in SCHOOLS.values() if s[0] == venue['name']), None)
        try:
            if school:
                    addresses = [r['trainingAddress'] for r in relations.values() if r['venueId'] == venue['id'] and r['evidenceStatus'] == 'confirmed_regular']
                    contact = fetch.get(school[3])
                    resolution = corroborate_school_address(school, addresses, contact)
                    venue['address'] = resolution['resolvedAddress']
                    venue['addressResolution'] = resolution
                    venue['addressSourceUrl'] = school[3]
                    eid = stable('evidence', venue['id'] + 'address-resolution')
                    evidence[eid] = {'id': eid, 'kind': 'address_resolution', 'venueId': venue['id'], **resolution}
            # Both G-NAF and fallback are downstream of school address validation.
            coord, state = geocoder.match(venue['address'])
            venue['coordinates'] = coord
            if not coord and state != 'ambiguous' and school:
                    if venue['name'] in SCHOOL_CODES:
                        code = SCHOOL_CODES[venue['name']]
                        query = school_query(code)
                        locations = fetch.get(query)
                        venue['coordinates'] = official_school_coordinates(locations['html'], venue['name'], code, query, school[1])
                    else:
                        maps = fetch.get(school[4])
                        venue['coordinates'] = campus_coordinates(maps['html'], school[4], school[1])
        except Exception as exc:
            state = 'address_unresolved'
            venue['geocodingNote'] = str(exc)
        venue['geocodingStatus'] = state
        if not venue['coordinates']:
            for r in relations.values():
                if r['venueId'] == venue['id'] and r['evidenceStatus'] == 'confirmed_regular':
                    club = next(c for c in clubs if c['id'] == r['clubId'])
                    item(club, 'Coordinates unresolved: ' + state + '; ' + venue.get('geocodingNote', 'No verified G-NAF or campus point'), r['sourceUrl'], venue['id'])
    features = []
    for venue in venues.values():
        confirmed = [r for r in relations.values() if r['venueId'] == venue['id'] and r['evidenceStatus'] == 'confirmed_regular']
        if venue['coordinates'] and confirmed:
            p = venue['coordinates']
            features.append({'type': 'Feature', 'id': venue['id'], 'geometry': {'type': 'Point', 'coordinates': [p['longitude'], p['latitude']]},
                             'properties': {'venueId': venue['id'], 'name': venue['name'], 'address': venue['address'], 'clubIds': sorted({r['clubId'] for r in confirmed}),
                                            'coordinateSource': p['source'], 'precision': p['precision'], 'sourceUrl': p['sourceUrl']}})
    discovered = [re.sub(r'\s*\([^)]*\)', '', c['name']) for c in clubs]
    summary = {'checkedAt': max([directory['checkedAt']] + [m['checkedAt'] for m in fetch.manifest]), 'runAt': now(),
               'pipelineVersion': 'swm-v2-1', 'pipelineSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               'coordinateAttribution': COORDINATE_ATTRIBUTION,
               'associationCount': 1, 'clubCount': len(clubs), 'clubsAttempted': len(clubs),
               'clubsWithConfirmedTraining': len({r['clubId'] for r in relations.values() if r['evidenceStatus'] == 'confirmed_regular'}),
               'uniqueTrainingVenues': len({r['venueId'] for r in relations.values() if r['evidenceStatus'] == 'confirmed_regular'}),
               'gnafMatchedVenues': sum(v['coordinates'] is not None and v['coordinates']['source'] == 'G-NAF' for v in venues.values()),
               'verifiedFallbackCoordinates': sum(v['coordinates'] is not None and v['coordinates']['source'] != 'G-NAF' for v in venues.values()),
               'mappedVenues': len(features), 'reviewQueueItems': len(review),
               'gnafStatus': 'Verified' if any(v['coordinates'] and v['coordinates']['source'] == 'G-NAF' for v in venues.values()) else 'Not Verified — no usable real G-NAF match',
               'baselineMissing': sorted(set(BASELINE) - set(discovered)), 'baselineAdditional': sorted(set(discovered) - set(BASELINE)),
               'offline': args.offline, 'inputManifest': fetch.manifest, 'sourceFailures': fetch.errors,
               'limitations': ['Only confirmed current regular team training is mapped.', 'Campus/property coordinates do not identify a basketball hall entrance.', 'Some official pages are undated or inaccessible; confirm arrangements with clubs.', 'G-NAF raw data not bundled. No paid geocoding.']}
    pilot = {'associations': [{'id': ASSOCIATION, 'name': 'South West Metro Pirates Basketball Association', 'sourceUrl': DIRECTORY, 'checkedAt': directory['checkedAt']}],
             'clubs': clubs, 'venues': sorted(venues.values(), key=lambda v:v['id']), 'clubVenues': sorted(relations.values(), key=lambda r:r['id']),
             'evidence': sorted(evidence.values(), key=lambda e:e['id']), 'reviewItems': sorted(review.values(), key=lambda r:r['id']), 'summary': summary}
    validate(pilot)
    private_file = private_output_path(args.output)
    private_file.parent.mkdir(parents=True, exist_ok=True)
    private_file.write_text(json.dumps(pilot, ensure_ascii=False, indent=2) + '\n')
    pilot = public_projection(pilot)
    summary = pilot['summary']
    for feature in features:
        feature['properties']['attribution'] = COORDINATE_ATTRIBUTION
    args.output.mkdir(parents=True, exist_ok=True)
    for name, obj in [('pilot.json', pilot), ('venues.geojson', {'type':'FeatureCollection','features':features}), ('review.json',pilot['reviewItems']), ('summary.json',summary)]:
        temporary = args.output / (name + '.tmp')
        temporary.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(args.output / name)
    return summary

def private_output_path(output):
    return ROOT / 'data/v2/private/runs' / stable('output', str(output.resolve())) / 'pilot.json'

def public_projection(pilot):
    """Allowlisted product facts; full operational evidence stays private."""
    def fields(obj, keys):
        return {k: obj[k] for k in keys.split() if k in obj}
    result = {
        'associations': pilot['associations'],
        'clubs': [fields(c, 'id name associationId website sourceUrl checkedAt eligibilityNote') for c in pilot['clubs']],
        'venues': [fields(v, 'id name address suburb coordinates addressSourceUrl geocodingStatus') for v in pilot['venues']],
        'clubVenues': [fields(r, 'id clubId venueId activityType sourceUrl sourceDate checkedAt evidenceStatus evidenceId') for r in pilot['clubVenues']],
        'evidence': [fields(e, 'id kind clubId venueId sourceUrl sourceDate checkedAt status') for e in pilot['evidence']],
        'reviewItems': [],
        'summary': {k: v for k, v in pilot['summary'].items() if k not in ('inputManifest', 'sourceFailures', 'pipelineSha256')},
    }
    for venue in result['venues']:
        if venue.get('coordinates'):
            venue['coordinates'] = fields(venue['coordinates'], 'longitude latitude source sourceUrl precision matchedAddress centreCode dataCurrency attribution gnafPid release')
    for item in pilot['reviewItems']:
        public = fields(item, 'id clubId venueId sourceUrl checkedAt status')
        reason = item['reason']
        public['reason'] = ('Location awaiting verification' if reason.startswith('Coordinates unresolved') else
                            'Source unavailable or requires review' if reason.startswith('Source unavailable') else
                            'Historical training information' if item['status'] == 'historical' else
                            'Current regular training requires verification')
        result['reviewItems'].append(public)
    return result

def validate(pilot):
    for group in ['clubs', 'venues', 'clubVenues', 'evidence', 'reviewItems']:
        ids = [o['id'] for o in pilot[group]]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate IDs in ' + group)
    clubs, venues = {c['id'] for c in pilot['clubs']}, {v['id'] for v in pilot['venues']}
    for r in pilot['clubVenues']:
        if r['clubId'] not in clubs or r['venueId'] not in venues:
            raise ValueError('Broken club/venue relationship')
    for v in pilot['venues']:
        p = v['coordinates']
        if p and not (138 <= p['longitude'] <= 154 and -29.2 <= p['latitude'] <= -9 and p['sourceUrl'] and p['precision']):
            raise ValueError('Invalid coordinates/metadata')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--association', choices=['swm-pirates'], default='swm-pirates')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--offline', action='store_true')
    mode.add_argument('--refresh', action='store_true')
    parser.add_argument('--cache', type=Path, default=ROOT/'data/v2/private/cache')
    parser.add_argument('--output', type=Path, default=ROOT/'public/data/v2')
    parser.add_argument('--gnaf-csv', type=Path)
    parser.add_argument('--gnaf-index', type=Path)
    args = parser.parse_args()
    for p in [args.cache, args.output, args.gnaf_csv, args.gnaf_index]:
        if p and not p.resolve().is_relative_to(ROOT):
            parser.error('All inputs and outputs must remain inside this V2 worktree')
    try:
        print(json.dumps(run(args), indent=2))
    except Exception as exc:
        print('Pipeline failed; previous approved output retained: ' + str(exc), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
