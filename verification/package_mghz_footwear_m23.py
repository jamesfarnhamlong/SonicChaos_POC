"""Unique M2 source ZIP + fresh extraction byte comparison. Never commits. Compile logs are recorded when present; their absence is written into the report."""
from pathlib import Path
import json, hashlib, zipfile, sys
from package_mghz import ROOT, files
BUILD = ROOT / 'build/mghz-m2'
NAME = 'SonicChaos_MGHZ_Footwear_20261005_M2_3'
ZIP = ROOT.parent / 'releases' / (NAME + '.zip'); EXTRACT = BUILD / 'extracted' / NAME
paths = set(files())
paths.update(ROOT / p for p in ('docs/mghz-package-m2.md', 'POC_notes/generate_mghz_footwear.py', 'POC_notes/rom-cache/powerup-shoes.json', 'POC_notes/rom-cache/spring-shoes-presentation.json', 'verification/capture_spring_shoes_presentation.js', 'verification/compile_mghz_m2.ps1'))
paths.update(p for p in (ROOT / 'verification/mghz-m2').rglob('*') if p.is_file())
paths.update(p for p in (ROOT / 'POC_notes/rom-cache/mghz').rglob('*') if p.is_file())
paths = sorted(p for p in paths if p.exists() and p.suffix.lower() not in {'.pyc', '.log', '.zip', '.sms'})
assert [p.name for p in paths if p.suffix == '.yyp'] == ['SonicChaos_POC.yyp']
assert not any('gpz-windows-b' in p.name or 'gpz-asset-diagnosis' in p.name for p in paths), 'unrelated untracked GPZ diagnostics must not ship'
assert all(r['exit_code'] == 0 for r in json.loads((BUILD / 'focused-results.json').read_text()))
assert not ZIP.exists() and not EXTRACT.exists(), 'Never overwrite acceptance packages'
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in paths: z.write(p, NAME + '/' + p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(ZIP) as z:
    assert z.testzip() is None and len([n for n in z.namelist() if n.endswith('.yyp')]) == 1
    z.extractall(EXTRACT.parent)
for p in paths: assert p.read_bytes() == (EXTRACT / p.relative_to(ROOT)).read_bytes()
def compiled(log): return log.exists() and 'Igor complete.' in log.read_text() and 'Permission Error' not in log.read_text()
report = {'zip': str(ZIP), 'sha256': hashlib.sha256(ZIP.read_bytes()).hexdigest(), 'files': len(paths), 'base': 'd1986b3354cefe12feb0a5256af3de99c821b4b7',
          'source_compile': 'PASS' if compiled(BUILD / 'src/compile.log') else 'NOT RUN here: compile source and fresh ZIP in the GameMaker IDE',
          'fresh_extraction_compile': 'PASS' if compiled(BUILD / 'extracted/compile.log') else 'NOT RUN here: GameMaker IDE'}
(BUILD / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n'); print(json.dumps(report, indent=2)); print(EXTRACT / 'SonicChaos_POC.yyp')
