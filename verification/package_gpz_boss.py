"""Create one package E ZIP, freshly extract it, compile, then verify/report it.

Tracked files plus explicit milestone files only; old untracked diagnostics stay
outside. Run --prepare before extracted compile; --finish requires both compiles.
"""
import argparse,json,hashlib,re,subprocess,zipfile,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NAME='SonicChaos_GPZ3_Boss_51_20261003_E2'
BUILD=ROOT/'build/gpz-boss-e2'
EXTRACT=BUILD/'extracted'/NAME
ZIP=ROOT.parent/'releases'/(NAME+'.zip')
def read(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text(encoding='utf-8-sig')))
def files():
    tracked=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
    paths={ROOT/p for p in tracked if (ROOT/p).is_file()}
    for folder in ['objects/OBJ_chaos_object_51','scripts/SCR_chaos_gpz_boss','scripts/SCR_chaos_gpz_boss_data','verification/gpz-boss']:
        paths.update(p for p in (ROOT/folder).rglob('*') if p.is_file())
    for f in ['POC_notes/import_gpz_boss.py','docs/gpz3-boss-e.md','docs/gpz3-boss-e1.md','docs/gpz3-boss-e2.md','verification/verify_gpz_boss_e1.js','verification/verify_gpz_boss.js','verification/verify_gpz_boss_clear.js',
              'verification/capture_gpz_boss_camera.py','verification/verify_gpz_boss_camera.js','verification/verify_gpz_boss_camera_capture.py',
              'verification/verify_gpz_boss_assets.py','verification/preview_gpz_boss.py','verification/run_gpz_boss_checks.py','verification/package_gpz_boss.py']:
        paths.add(ROOT/f)
    paths.update((ROOT/'POC_notes/rom-cache/gpz').glob('boss-51-*.json'))
    blocked={'.sms','.gg','.rom','.zip','.exe','.win','.pyc','.log','.tmp'}
    paths={p for p in paths if p.suffix.lower() not in blocked and not set(p.relative_to(ROOT).parts)&{'build','__pycache__','.git','node_modules'}}
    allowed={'objects','scripts','sprites','rooms','sounds','tilesets','timelines','options','notes','docs','POC_notes','verification'}
    return sorted(p for p in paths if p.relative_to(ROOT).parts[0] in allowed or p.name=='SonicChaos_POC.yyp' or (p.parent==ROOT and p.suffix=='.md'))
def main():
    a=argparse.ArgumentParser();a.add_argument('--prepare',action='store_true');a.add_argument('--finish',action='store_true');a=a.parse_args()
    assert a.prepare != a.finish
    results=read(BUILD/'focused-results.json');assert len(results)==27 and all(v['exit_code']==0 for v in results)
    assert 'Igor complete.' in (BUILD/'source-compile.log').read_text()
    paths=files();project=read(ROOT/'SonicChaos_POC.yyp')
    assert [p.name for p in paths if p.suffix=='.yyp']==['SonicChaos_POC.yyp']
    for v in project['resources']:
        p=ROOT/v['id']['path'];assert p in paths,p
        d=read(p)
        if d.get('resourceType')=='GMSprite':
            for f in d['frames']:
                assert p.parent/(f['name']+'.png') in paths
                for layer in d['layers']:assert p.parent/'layers'/f['name']/(layer['name']+'.png') in paths
    if a.prepare:
        assert not EXTRACT.exists() and not ZIP.exists(),'Never overwrite a prior package'
        ZIP.parent.mkdir(exist_ok=True)
        with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED) as z:
            for p in paths:z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(ZIP) as z:
            assert z.testzip() is None
            z.extractall(EXTRACT.parent)
        for p in paths:assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
        (BUILD/'package-files.json').write_text(json.dumps([p.relative_to(ROOT).as_posix() for p in paths],indent=2)+'\n')
        print('Fresh extracted project:',EXTRACT/'SonicChaos_POC.yyp');return
    assert 'Igor complete.' in (BUILD/'extracted-compile.log').read_text()
    assert read(BUILD/'package-files.json')==[p.relative_to(ROOT).as_posix() for p in paths]
    for p in paths:assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes(),p
    with zipfile.ZipFile(ZIP) as z:
        assert z.testzip() is None
        assert len([n for n in z.namelist() if n.endswith('.yyp')])==1
        for p in paths:assert z.read(NAME+'/'+p.relative_to(ROOT).as_posix())==p.read_bytes()
    report={'zip':str(ZIP),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'files':len(paths),'resources':len(project['resources']),
            'research_commit':'44e0714d16185f213ab1b73822c67e50546ce3f6','accepted_base':'84c3e108177bca06b490c5857307e02147cb2901',
            'focused_commands':len(results),'source_compile':'PASS','extracted_compile':'PASS','windows_acceptance':'E core PASSED; E.1 gameplay accepted; E.2 presentation PENDING','commit':'UNCOMMITTED',
            'results_boundary':'Shared completion overlay; numeric MGHZ1 handoff. ROM results / playable MGHZ1 deferred.'}
    (BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
