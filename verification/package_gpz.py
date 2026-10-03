"""Validate and create the single GPZ foundation source package (not a game binary)."""
import hashlib
import json
from pathlib import Path
import re
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
NAME = 'SonicChaos_GPZ_THZ_Closure_20261003_C'
BUILD = ROOT / 'build/gpz-closure'
ZIP = ROOT.parent / 'releases' / (NAME + '.zip')
EXTRACT = BUILD / 'extracted' / NAME

def gm(path):
    return json.loads(re.sub(r',\s*([}\]])', r'\1', path.read_text(encoding='utf-8-sig')))

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

project = gm(ROOT / 'SonicChaos_POC.yyp')
paths = [r['id']['path'] for r in project['resources']]
assert len(paths) == len(set(paths))
for rel in paths:
    p = ROOT / rel
    assert p.is_file(), rel
    data = gm(p)
    if data.get('resourceType') == 'GMSprite':
        for frame in data['frames']:
            image = p.parent / (frame['name'] + '.png')
            assert image.is_file(), image
            for layer in data['layers']:
                assert (p.parent / 'layers' / frame['name'] / (layer['name'] + '.png')).is_file()
cache = ROOT / 'POC_notes/rom-cache/gpz'
manifest = gm(cache / 'implementation-manifest.json')
canonical = gm(ROOT.parent / 'sonic-chaos-reference-work/data/rom-cache/gpz/implementation-manifest.json')
assert manifest == canonical
for dep in manifest['dependencies']:
    value = gm(cache / Path(dep['path']).name)
    assert sha(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()) == dep['canonical_json_sha256']
assets = gm(cache / 'generated-assets.json')['assets']
for a in assets:
    p = ROOT / 'sprites' / a['resource']
    s = gm(p / (a['resource'] + '.yy'))
    frame = s['frames'][a['frame']]['name']
    im = Image.open(p / (frame + '.png')).convert('RGBA')
    assert im.size == (s['width'], s['height'])
    assert sha(im.tobytes()) == a['rgba_sha256'], a
    for layer in s['layers']:
        assert Image.open(p / 'layers' / frame / (layer['name'] + '.png')).convert('RGBA').tobytes() == im.tobytes()
results = gm(BUILD / 'focused-results.json')
assert all(r['exit_code'] == 0 for r in results)
assert gm(BUILD / 'asset-verification.json')['status'] == 'PASS'
assert gm(cache / 'decoded-block-art.json')['review_status'] == 'CANONICAL_RESEARCH_MATCH'
assert not (ROOT / 'POC_notes/gpz_asset_decode.py').exists(), 'Remove provisional mapping override'
assert 'Igor complete.' in (BUILD / 'source-compile.log').read_text()
assert not ZIP.exists(), 'Unique package already exists; do not overwrite acceptance artifacts'
assert not EXTRACT.exists(), 'Extraction must be fresh'
included = {'objects', 'scripts', 'sprites', 'rooms', 'sounds', 'tilesets', 'timelines',
            'options', 'notes', 'docs', 'POC_notes', 'verification'}
blocked_parts = {'__pycache__', '.deps', 'node_modules', '.cache', 'build', 'builds',
                 '.codex-build', 'output', 'temp', 'tmp', 'dist', 'exports'}
blocked_ext = {'.sms', '.gg', '.rom', '.zip', '.exe', '.win', '.pyc', '.log', '.tmp'}
files = []
for p in ROOT.rglob('*'):
    if not p.is_file():
        continue
    rel = p.relative_to(ROOT)
    if any(v in blocked_parts for v in rel.parts) or p.suffix.lower() in blocked_ext:
        continue
    if rel.parts[0] in included or p.name == 'SonicChaos_POC.yyp' or (len(rel.parts) == 1 and p.suffix == '.md'):
        files.append(p)
assert [p.name for p in files if p.suffix == '.yyp'] == ['SonicChaos_POC.yyp']
ZIP.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files):
        z.write(p, NAME + '/' + p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(ZIP) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.yyp')]) == 1
    z.extractall(EXTRACT.parent)
for p in files:
    assert p.read_bytes() == (EXTRACT / p.relative_to(ROOT)).read_bytes()
report = {'zip': str(ZIP), 'sha256': sha(ZIP.read_bytes()), 'extracted_project': str(EXTRACT / 'SonicChaos_POC.yyp'),
          'files': len(files), 'resources': len(paths), 'gpz_asset_frames': len(assets),
          'focused_test_scripts': len(results), 'source_compile': 'PASS', 'extracted_compile': 'PENDING',
          'research_sha': gm(ROOT / 'POC_notes/rom-cache/gpz-closure-import.json')['research_commit'],
          'art_research_sha': gm(cache / 'generated-assets.json')['research_commit'], 'mapping_override': 'REMOVED',
          'windows_acceptance': 'PENDING', 'commit': 'NOT COMMITTED'}
(BUILD / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
