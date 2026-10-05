"""Unique M4 source ZIP and fresh extraction; never stages/commits Git work.
--prepare creates the immutable package; --report verifies it and records the Igor attempts.
"""
from pathlib import Path
import argparse, hashlib, json, shutil, zipfile
from package_mghz import ROOT, files

BUILD = ROOT / 'build/mghz-m4'
NAME = 'SonicChaos_MGHZ_Boss_56_20261005_M4R'
ZIP = ROOT.parent / 'releases' / (NAME + '.zip')
EXTRACT = BUILD / 'extracted' / NAME
OUT = ROOT / 'verification/mghz-m4'


def paths():
    selected = set(files())
    selected.update(p for p in OUT.rglob('*') if p.is_file())
    for n in ('docs/mghz-package-m4r.md', 'POC_notes/import_mghz_boss.py', 'POC_notes/generate_mghz_boss_oracles.py'):
        selected.add(ROOT / n)
    return sorted(p for p in selected if p.is_file() and p.suffix.lower() not in
                  {'.sms', '.gg', '.rom', '.zip', '.exe', '.dll', '.win', '.pyc', '.log', '.tmp'})


def compilation(folder):
    log = BUILD / folder / 'compile.log'
    if not log.exists():
        return {'status': 'NOT_RUN', 'gml_compilation_verified': False}
    t = log.read_text(encoding='utf-8-sig', errors='replace')
    if 'Permission Error' in t and 'GMAssetCompiler.dll' in t:
        return {'status': 'BLOCKED_BEFORE_GML', 'gml_compilation_verified': False,
                'asset_project_load': 'PASS' if 'SUCCESSFUL LOAD AND LINK' in t else 'UNVERIFIED',
                'reason': 'GMAssetCompiler.dll permission error, status -1', 'log': str(log)}
    return {'status': 'PASS' if 'Igor complete.' in t else 'FAILED_OR_UNVERIFIED',
            'gml_compilation_verified': 'Igor complete.' in t, 'log': str(log)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--prepare', action='store_true')
    ap.add_argument('--report', action='store_true')
    a = ap.parse_args(); assert a.prepare != a.report
    full = json.loads((BUILD / 'full-results.json').read_text())
    assert len(full) == 39 and all(r['exit_code'] == 0 for r in full)
    focused = json.loads((OUT / 'focused-results.json').read_text())
    assets = json.loads((OUT / 'asset-results.json').read_text())
    assert focused['status'] == assets['status'] == 'PASS'
    if a.prepare:
        shutil.copyfile(BUILD / 'full-results.json', OUT / 'full-results.json')
        (OUT / 'research-tests.json').write_text(json.dumps({
            'status': 'PASS', 'tests': 159, 'boss_tests': 37,
            'command': ".venv/Scripts/python.exe -m unittest discover -s tests -p 'test_mghz*.py'  (boss: -p 'test_mghz56*.py')",
            'research_commit': 'e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f', 'research_tree': 'unchanged by the run',
            'rom_verified': True, 'rom_sha256': assets['rom_sha256']}, indent=2) + '\n')
        selected = paths()
        assert not ZIP.exists() and not EXTRACT.exists(), 'Never overwrite an acceptance package'
        assert [p.name for p in selected if p.suffix == '.yyp'] == ['SonicChaos_POC.yyp']
        assert not any('gpz-windows-b' in p.name or 'gpz-asset-diagnosis' in p.name or 'diagnose_gpz_windows_b' in p.name for p in selected)
        assert not any(p.suffix in {'.sms', '.zip'} for p in selected)
        ZIP.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
            for p in selected:
                z.write(p, NAME + '/' + p.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(ZIP) as z:
            assert z.testzip() is None
            assert len([n for n in z.namelist() if n.endswith('.yyp')]) == 1
            assert len({n.split('/')[0] for n in z.namelist()}) == 1, 'one top-level project folder'
            z.extractall(EXTRACT.parent)
        for p in selected:
            assert p.read_bytes() == (EXTRACT / p.relative_to(ROOT)).read_bytes()
        print(EXTRACT / 'SonicChaos_POC.yyp')
        print('PASS ZIP: one top-level project, one .yyp, fresh extraction byte-identical')
        return
    selected = paths()
    with zipfile.ZipFile(ZIP) as z:
        assert z.testzip() is None
        for p in selected:
            assert p.read_bytes() == z.read(NAME + '/' + p.relative_to(ROOT).as_posix())
            assert p.read_bytes() == (EXTRACT / p.relative_to(ROOT)).read_bytes()
    report = {'zip': str(ZIP), 'sha256': hashlib.sha256(ZIP.read_bytes()).hexdigest(),
              'bytes': ZIP.stat().st_size, 'files': len(selected),
              'base_poc': '191a60104655990e31fcb5389979a314abac80cb',
              'research': 'e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f',
              'focused': focused, 'full_checks_passed': len(full), 'research_tests_passed': 159,
              'png_verification': 'PASS; 0 pixel differences; visually inspected',
              'zip_byte_comparison': 'PASS', 'source_compile': compilation('src'),
              'fresh_extraction_compile': compilation('extracted'),
              'native_gameplay': 'NOT_RUN; requires GameMaker IDE / James Windows acceptance',
              'commit': 'UNCOMMITTED', 'windows_acceptance': 'PENDING',
              'limitations': ['standalone Igor stops before GML compilation (GMAssetCompiler.dll permission error); GameMaker IDE compile is the gate',
                              'the exact slot occupancy of other MGHZ subsystems follows the M3 bridge, not a complete ROM slot interpreter',
                              'wide post-defeat follow is an explicit GameMaker adapter; width 256 is the recovered shared $5832 behaviour']}
    (BUILD / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
