"""Unique source ZIP, fresh extraction, two real VM compiles; never commit."""
from pathlib import Path
import argparse,json,hashlib,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/mghz-m1'
NAME='SonicChaos_MGHZ_Foundation_20261004_M1'
ZIP=ROOT.parent/'releases'/(NAME+'.zip');EXTRACT=BUILD/'extracted'/NAME
def files():
    paths={ROOT/p for p in subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines() if (ROOT/p).is_file()}
    project=json.loads((ROOT/'SonicChaos_POC.yyp').read_text())
    for r in project['resources']:paths.update(p for p in (ROOT/r['id']['path']).parent.rglob('*')if p.is_file())
    paths.update(p for p in (ROOT/'POC_notes/rom-cache/mghz').rglob('*')if p.is_file())
    for n in ('POC_notes/generate_mghz_foundation.py','docs/mghz-package-m1.md'):
        paths.add(ROOT/n)
    paths.update(p for p in (ROOT/'verification').iterdir()if p.is_file() and ('mghz' in p.name) and p.name!='wire_mghz.py')
    paths.update(p for p in (ROOT/'verification/mghz-m1').rglob('*')if p.is_file())
    blocked={'.sms','.gg','.rom','.zip','.exe','.win','.pyc','.log','.tmp'}
    allowed={'objects','scripts','sprites','rooms','sounds','tilesets','timelines','options','notes','docs','POC_notes','verification'}
    return sorted(p for p in paths if p.exists() and p.suffix.lower() not in blocked and not set(p.relative_to(ROOT).parts)&{'build','__pycache__','.git','node_modules'} and (p.relative_to(ROOT).parts[0]in allowed or p.name=='SonicChaos_POC.yyp' or (p.parent==ROOT and p.suffix=='.md')))
def snapshot(dest):
    import shutil
    assert not dest.exists(),dest
    for p in files():q=dest/p.relative_to(ROOT);q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--prepare',action='store_true');ap.add_argument('--finish',action='store_true');a=ap.parse_args();assert a.prepare!=a.finish
    results=json.loads((BUILD/'focused-results.json').read_text());assert all(r['exit_code']==0 for r in results)
    assert json.loads((BUILD/'capture-verification.json').read_text())['status']=='PASS'
    assert all(v['status']=='PASS'for v in json.loads((BUILD/'native-oil-verification.json').read_text()))
    assert 'Igor complete.'in(BUILD/'source-compile.log').read_text()
    paths=files();assert [p.name for p in paths if p.suffix=='.yyp']==['SonicChaos_POC.yyp']
    if a.prepare:
        assert not ZIP.exists()and not EXTRACT.exists(),'Never overwrite acceptance packages'
        with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED)as z:
            for p in paths:z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(ZIP)as z:assert z.testzip()is None;z.extractall(EXTRACT.parent)
        for p in paths:assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
        print(EXTRACT/'SonicChaos_POC.yyp');return
    assert 'Igor complete.'in(BUILD/'extracted-compile.log').read_text()
    with zipfile.ZipFile(ZIP)as z:
        assert z.testzip()is None;assert len([n for n in z.namelist()if n.endswith('.yyp')])==1
        for p in paths:assert z.read(NAME+'/'+p.relative_to(ROOT).as_posix())==p.read_bytes()
    report={'zip':str(ZIP),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'files':len(paths),'base':'82ebc89d68cd0d7e4d66be54a6c9954e6e2d9fed','research':['ac04dfe4d3d7aedea394948811da67eba83782bd','7315df2b34dcb7c8909644790b1d9ef397322f09'],'focused_commands':len(results),'source_compile':'PASS','fresh_extraction_compile':'PASS','commit':'UNCOMMITTED','Windows_acceptance':'PENDING'}
    (BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
