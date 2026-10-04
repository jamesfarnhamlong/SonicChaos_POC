"""Create the lost-ring package ZIP, freshly extract it, compile, then verify/report it (--prepare, then --finish after the extracted compile)."""
import argparse,json,hashlib,re,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NAME='SonicChaos_LostRings_Scatter_20261004_A'
BUILD=ROOT/'build/lost-rings'
EXTRACT=BUILD/'extracted'/NAME
ZIP=ROOT.parent/'releases'/(NAME+'.zip')
def read(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text(encoding='utf-8-sig')))
def files():
    tracked=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
    paths={ROOT/p for p in tracked if (ROOT/p).is_file()}
    paths.update(p for p in (ROOT/'scripts/SCR_chaos_lost_ring').rglob('*') if p.is_file())
    paths.update(p for p in (ROOT/'objects/OBJ_chaos_zone').rglob('*') if p.is_file())
    for f in ['docs/lost-ring-scatter.md','POC_notes/rom-cache/player-hurt-ring-scatter.json','verification/verify_lost_rings.js','verification/run_lost_ring_checks.py','verification/package_lost_rings.py']:
        paths.add(ROOT/f)
    blocked={'.sms','.gg','.rom','.zip','.exe','.win','.pyc','.log','.tmp'}
    paths={p for p in paths if p.suffix.lower() not in blocked and not set(p.relative_to(ROOT).parts)&{'build','__pycache__','.git','node_modules'}}
    allowed={'objects','scripts','sprites','rooms','sounds','tilesets','timelines','options','notes','docs','POC_notes','verification'}
    return sorted(p for p in paths if p.relative_to(ROOT).parts[0] in allowed or p.name=='SonicChaos_POC.yyp' or (p.parent==ROOT and p.suffix=='.md'))
def main():
    a=argparse.ArgumentParser();a.add_argument('--prepare',action='store_true');a.add_argument('--finish',action='store_true');a=a.parse_args()
    assert a.prepare!=a.finish
    results=read(BUILD/'focused-results.json');assert len(results)==18 and all(v['exit_code']==0 for v in results)
    assert 'Igor complete.' in (BUILD/'source-compile.log').read_text()
    paths=files();project=read(ROOT/'SonicChaos_POC.yyp')
    assert [p.name for p in paths if p.suffix=='.yyp']==['SonicChaos_POC.yyp']
    for v in project['resources']:
        p=ROOT/v['id']['path'];assert p in paths,p
    if a.prepare:
        assert not EXTRACT.exists() and not ZIP.exists(),'Never overwrite a prior package'
        ZIP.parent.mkdir(exist_ok=True)
        with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED) as z:
            for p in paths:z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(ZIP) as z:
            assert z.testzip() is None
            z.extractall(EXTRACT.parent)
        for p in paths:assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
        print('Fresh extracted project:',EXTRACT/'SonicChaos_POC.yyp');return
    assert 'Igor complete.' in (BUILD/'extracted-compile.log').read_text()
    with zipfile.ZipFile(ZIP) as z:
        assert z.testzip() is None and len([n for n in z.namelist() if n.endswith('.yyp')])==1
        for p in paths:assert z.read(NAME+'/'+p.relative_to(ROOT).as_posix())==p.read_bytes()
    report={'zip':str(ZIP),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'files':len(paths),'research_commit':'399f95bf03d3054d7f88ef6693eb935fc0c1ea13',
            'accepted_base':'d4be0c2127de85cc25207b3ae07e8a7acc475c4c','focused_commands':len(results),'source_compile':'PASS','extracted_compile':'PASS','commit':'UNCOMMITTED','windows_acceptance':'ACCEPTED (Package A)'}
    (BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
