"""Unique S1 source ZIP, fresh extraction, provenance and honest compile reporting."""
from pathlib import Path
import argparse,hashlib,json,zipfile
from package_mghz import ROOT,files
BUILD=ROOT/'build/sez-s1';NAME='SonicChaos_SEZ_Foundation_20261005_S1R'
ZIP=ROOT.parent/'releases'/(NAME+'.zip');EXTRACT=BUILD/'extracted'/NAME
def selected():
    p=set(files())
    p.update(q for q in (ROOT/'POC_notes/rom-cache/sez').rglob('*')if q.is_file())
    for rel in ('POC_notes/generate_sez_foundation.py','docs/sez-package-s1.md','verification/verify_sez_s1.js','verification/verify_sez_assets.py','verification/run_sez_s1_checks.py','verification/package_sez_s1.py'):
        p.add(ROOT/rel)
    return sorted(q for q in p if q.is_file()and q.suffix.lower()not in{'.sms','.gg','.rom','.zip','.exe','.dll','.win','.pyc','.log','.tmp'}and not set(q.relative_to(ROOT).parts)&{'build','__pycache__','.git'})
def compile_status(folder):
    p=BUILD/folder/'compile.log'
    if not p.exists():return {'status':'NOT_RUN','gml_compilation_verified':False}
    t=p.read_text(encoding='utf-8-sig',errors='replace')
    if 'Permission Error' in t and 'GMAssetCompiler.dll' in t:
        return {'status':'BLOCKED_BEFORE_GML','gml_compilation_verified':False,'project_load_link':'PASS'if'SUCCESSFUL LOAD AND LINK'in t else'UNVERIFIED','reason':'GMAssetCompiler.dll permission failure (status -1)','log':str(p)}
    return {'status':'PASS'if'Igor complete.'in t else'FAILED_OR_UNVERIFIED','gml_compilation_verified':'Igor complete.'in t,'log':str(p)}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--prepare',action='store_true');ap.add_argument('--report',action='store_true');args=ap.parse_args();assert args.prepare!=args.report
    results=json.loads((BUILD/'full-results.json').read_text());assert all(r['exit_code']==0 for r in results)
    for n in ('runtime-results','asset-results'):assert json.loads((BUILD/(n+'.json')).read_text())['status']=='PASS'
    paths=selected();assert[q.name for q in paths if q.suffix=='.yyp']==['SonicChaos_POC.yyp']
    if args.prepare:
        assert not ZIP.exists()and not EXTRACT.exists(),'never overwrite acceptance packages'
        ZIP.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED)as z:
            for p in paths:z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
        with zipfile.ZipFile(ZIP)as z:
            assert z.testzip()is None
            assert len({n.split('/')[0]for n in z.namelist()})==1
            assert len([n for n in z.namelist()if n.endswith('.yyp')])==1
            z.extractall(EXTRACT.parent)
    with zipfile.ZipFile(ZIP)as z:
        assert z.testzip()is None
        for p in paths:
            assert p.read_bytes()==z.read(NAME+'/'+p.relative_to(ROOT).as_posix())
            assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
    report={'package':str(ZIP),'extracted_project':str(EXTRACT/'SonicChaos_POC.yyp'),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'bytes':ZIP.stat().st_size,'files':len(paths),'research':'a20082675cdfc25289b9dd7fe49440c55877c14d','poc_base':'472c7b97644b15f0785653653f30020d34eb63a7','checks_passed':len(results),'runtime':json.loads((BUILD/'runtime-results.json').read_text()),'assets':json.loads((BUILD/'asset-results.json').read_text()),'research_tests':34,'research_counted_checks':15938,'byte_comparison':'PASS','source_compile':compile_status('source'),'extracted_compile':compile_status('extracted-compile'),'IDE_compile_launch':'PENDING','Windows_acceptance':'PENDING','git':'UNCOMMITTED','Research_discrepancies':[]}
    (BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
