"""Unique source handoff, tracked files plus this pass; excludes diagnostics/debris."""
from pathlib import Path
import hashlib, json, subprocess, zipfile
ROOT = Path(__file__).resolve().parents[1]
NAME = 'SonicChaos_Portable_Test_Navigation_20261007_P3'
BUILD = ROOT / 'build/portable-navigation'
ZIP = ROOT.parent / 'releases' / (NAME + '.zip')
EXTRACT = BUILD / 'extracted' / NAME
paths = {ROOT / p for p in subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True).splitlines()}
paths.update(ROOT / p for p in ['docs/portable-test-navigation.md', 'verification/verify_portable_navigation.js', 'verification/package_portable_navigation.py'])
paths = sorted(p for p in paths if p.is_file() and p.suffix.lower() not in {'.sms', '.gg', '.rom', '.zip', '.exe', '.dll', '.win', '.pyc', '.log', '.tmp', '.yyz'} and not set(p.relative_to(ROOT).parts) & {'build', '__pycache__', '.git', 'node_modules'} and (p.suffix != '.yyp' or p.name == 'SonicChaos_POC.yyp'))
assert not ZIP.exists() and not EXTRACT.exists(), 'Never overwrite acceptance packages'
ZIP.parent.mkdir(exist_ok=True); BUILD.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in paths: z.write(p, NAME + '/' + p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(ZIP) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.yyp')]) == 1
    assert len({n.split('/')[0] for n in z.namelist()}) == 1
    z.extractall(EXTRACT.parent)
    for p in paths:
        assert p.read_bytes() == z.read(NAME + '/' + p.relative_to(ROOT).as_posix()) == (EXTRACT / p.relative_to(ROOT)).read_bytes()
report = dict(package=str(ZIP), sha256=hashlib.sha256(ZIP.read_bytes()).hexdigest(), files=len(paths), bytes=ZIP.stat().st_size,
              extracted_project=str(EXTRACT / 'SonicChaos_POC.yyp'), baseline='c90a0117e529dfbed7cf4b150823eaeee525972d', byte_comparison='PASS', Windows_acceptance='PENDING', git='UNCOMMITTED')
(BUILD / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
