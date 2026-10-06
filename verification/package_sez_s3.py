"""Unique S2 source ZIP, fresh extraction, provenance and honest compile reporting (never commits)."""
from pathlib import Path
import argparse, hashlib, json, re, zipfile
from package_mghz import ROOT, files
BUILD = ROOT / 'build/sez-s3'; NAME = 'SonicChaos_SEZ_Platforms_20261006_S3'
ZIP = ROOT.parent / 'releases' / (NAME + '.zip'); EXTRACT = BUILD / 'extracted' / NAME
RESEARCH = 'ed9122b3d5ac11442714ecaef4cc4316c4706342'; POC_BASE = 'baccfeefad3832db05b366d729d2c62441701d75'
def selected():
    p = set(files())
    p.update(q for q in (ROOT / 'POC_notes/rom-cache/sez').rglob('*') if q.is_file())
    for rel in ('POC_notes/generate_sez_foundation.py', 'POC_notes/generate_sez_s2.py', 'docs/sez-package-s1.md', 'docs/sez-package-s2.md', 'docs/sez-package-s3.md', 'POC_notes/generate_sez_s3.py', 'verification/verify_sez_s3.js', 'verification/run_sez_s3_checks.py', 'verification/package_sez_s3.py', 'verification/verify_sez_s1.js', 'verification/verify_sez_s2.js',
                'verification/verify_sez_assets.py', 'verification/verify_sez_s2_assets.py', 'verification/lint_sez_s2_gml.py', 'verification/run_sez_s1_checks.py', 'verification/run_sez_s2_checks.py',
                'verification/package_sez_s1.py', 'verification/package_sez_s2.py'):
        p.add(ROOT / rel)
    return sorted(q for q in p if q.is_file() and q.suffix.lower() not in {'.sms', '.gg', '.rom', '.zip', '.exe', '.dll', '.win', '.pyc', '.log', '.tmp'} and not set(q.relative_to(ROOT).parts) & {'build', '__pycache__', '.git'})
def compile_status(folder):
    p = BUILD / folder / 'compile.log'
    if not p.exists(): return {'status': 'NOT_RUN', 'gml_compilation_verified': False}
    t = p.read_text(encoding='utf-8-sig', errors='replace').replace('\x00', '')
    t2 = re.sub(r'\s', '', t)
    if 'exitedwithnon-zerostatus' in t2 and 'GMAssetCompiler.dll' in t2:
        return {'status': 'BLOCKED_BEFORE_GML', 'gml_compilation_verified': False, 'project_load_link': 'PASS' if 'SUCCESSFULLOADANDLINK' in t2.upper() else 'UNVERIFIED', 'reason': 'GMAssetCompiler.dll cannot execute (status -1)', 'log': str(p)}
    if 'Permission Error' in t and 'GMAssetCompiler.dll' in t:
        return {'status': 'BLOCKED_BEFORE_GML', 'gml_compilation_verified': False, 'project_load_link': 'PASS' if 'SUCCESSFUL LOAD AND LINK' in t else 'UNVERIFIED', 'reason': 'GMAssetCompiler.dll permission failure (status -1)', 'log': str(p)}
    return {'status': 'PASS' if 'Igor complete.' in t else 'FAILED_OR_UNVERIFIED', 'gml_compilation_verified': 'Igor complete.' in t, 'log': str(p)}
def ran(name):
    m = re.search(r'Ran (\d+) tests', (BUILD / (name + '.log')).read_text(encoding='utf-8'))
    return int(m.group(1)) if m else None
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--prepare', action='store_true'); ap.add_argument('--report', action='store_true'); args = ap.parse_args(); assert args.prepare != args.report
    results = json.loads((BUILD / 'full-results.json').read_text()); assert all(r['exit_code'] == 0 for r in results)
    for n in ('runtime-results',): assert json.loads((BUILD / (n + '.json')).read_text())['status'] == 'PASS'
    paths = selected(); assert [q.name for q in paths if q.suffix == '.yyp'] == ['SonicChaos_POC.yyp']
    if args.prepare:
        assert not ZIP.exists() and not EXTRACT.exists(), 'never overwrite acceptance packages'
        ZIP.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
            for p in paths: z.write(p, NAME + '/' + p.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(ZIP) as z:
            assert z.testzip() is None
            assert len({n.split('/')[0] for n in z.namelist()}) == 1
            assert len([n for n in z.namelist() if n.endswith('.yyp')]) == 1
            z.extractall(EXTRACT.parent)
    with zipfile.ZipFile(ZIP) as z:
        assert z.testzip() is None
        for p in paths:
            assert p.read_bytes() == z.read(NAME + '/' + p.relative_to(ROOT).as_posix())
            assert p.read_bytes() == (EXTRACT / p.relative_to(ROOT)).read_bytes()
    report = {'package': str(ZIP), 'extracted_project': str(EXTRACT / 'SonicChaos_POC.yyp'), 'sha256': hashlib.sha256(ZIP.read_bytes()).hexdigest(), 'bytes': ZIP.stat().st_size, 'files': len(paths),
              'research': RESEARCH, 'poc_base': POC_BASE, 'checks_passed': len(results), 'runtime': json.loads((BUILD / 'runtime-results.json').read_text()),
              'research_tests': {'sez_foundation': ran('research-test_sez_foundation'), 'sez_surfaces': ran('research-test_sez_surfaces'), 'sez_platform_28': ran('research-test_sez_platform_28')},
              'byte_comparison': 'PASS', 'source_compile': compile_status('source'), 'extracted_compile': compile_status('extracted-compile'), 'IDE_compile_launch': 'PENDING', 'Windows_acceptance': 'PENDING',
              'git': 'UNCOMMITTED'}
    (BUILD / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n'); print(json.dumps(report, indent=2))
if __name__ == '__main__': main()
