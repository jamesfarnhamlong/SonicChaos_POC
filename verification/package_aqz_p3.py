"""Unique, reviewable AQZ P3 A source archive and verified fresh extraction."""
from pathlib import Path
import hashlib, json, subprocess, zipfile
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/aqz-p3'
NAME='SonicChaos_AQZ_P3_20261009_A';ZIP=ROOT.parent/'releases'/(NAME+'.zip');EXTRACT=BUILD/'extracted'/NAME
paths={ROOT/p for p in subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines() if (ROOT/p).is_file()}
for rel in ['POC_notes/generate_aqz_p3.py','docs/aqz-package-p3-a.md','verification/verify_aqz_p3.js','verification/verify_aqz_p3_assets.py','verification/run_aqz_p3_checks.py','verification/package_aqz_p3.py']:
    paths.add(ROOT/rel)
for rel in ['verification/aqz-p3','scripts/SCR_chaos_aqz_enemy','sprites/SPR_chaos_aqz_enemy_3c','sprites/SPR_chaos_aqz_enemy_3d']:
    paths.update(p for p in (ROOT/rel).rglob('*') if p.is_file())
for rel in ['enemies-3c-3d-runtime.json','enemies-3c-3d-game-checks.json','enemies-3c-3d-assets.json']:
    paths.add(ROOT/'POC_notes/rom-cache/aqz'/rel)
blocked={'.sms','.gg','.rom','.zip','.exe','.win','.pyc','.log','.tmp'}
allowed={'objects','scripts','sprites','shaders','rooms','sounds','tilesets','timelines','options','notes','docs','POC_notes','verification'}
paths=sorted(p for p in paths if p.suffix.lower() not in blocked and not set(p.relative_to(ROOT).parts)&{'build','__pycache__','.git','node_modules'} and (p.relative_to(ROOT).parts[0] in allowed or p.name=='SonicChaos_POC.yyp' or (p.parent==ROOT and p.suffix=='.md')))
assert [p.name for p in paths if p.suffix=='.yyp']==['SonicChaos_POC.yyp']
assert all(p.is_file() for p in paths)
assert not ZIP.exists() and not EXTRACT.exists(),'Never overwrite review packages'
checks=json.loads((BUILD/'full-results.json').read_text());assert len(checks)==81 and all(r['exit_code']==0 for r in checks)
log=(BUILD/'A-source-final/compile.log').read_bytes();log=log.decode('utf-16' if log.startswith(b'\xff\xfe') else 'utf-8-sig')
assert 'Igor complete.' in log and (BUILD/'A-source-final/output/Windows.zip').is_file()
ZIP.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED) as z:
    for p in paths:z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(ZIP) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.yyp')])==1
    assert all(n.startswith(NAME+'/') for n in z.namelist())
    z.extractall(EXTRACT.parent)
for p in paths:assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
report={'package':str(ZIP),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'files':len(paths),'branch':'poc/aqz-p3-enemies-3c-3d','base':'d4705ce63ddafcfcab663c5bc75da493cdd297bd','research':'89641f8093e62401cd81f94e6ac889422f600472','regression_commands':'81/81 PASS','runtime':json.loads((BUILD/'runtime-results.json').read_text()),'assets':json.loads((BUILD/'asset-results.json').read_text()),'research_original_assertions':177802,'research_natural_rows':15032,'source_compile':'PASS','source_launch':'PASS main loop; startup log retained','fresh_extraction_compile':'PENDING','fresh_extraction_launch':'PENDING','Windows_acceptance':'PENDING','commit':'UNCOMMITTED'}
(BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));print(EXTRACT/'SonicChaos_POC.yyp')
