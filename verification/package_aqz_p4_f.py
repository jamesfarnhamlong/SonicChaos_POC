"""Create AQZ P4 F once, with one project and byte-verified fresh extraction."""
from pathlib import Path
import hashlib,json,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'build/aqz-p4-f';NAME='SonicChaos_AQZ_P4_20261010_F';Z=ROOT.parent/'releases'/(NAME+'.zip');E=B/'extracted'/NAME
checks=json.loads((B/'full-results.json').read_text());assert len(checks)==88 and all(x['exit_code']==0 for x in checks)
raw=(B/'F-source-final/compile.log').read_bytes();log=raw.decode('utf-16' if raw.startswith(b'\xff\xfe') else 'utf-8-sig');assert 'Igor complete.' in log and 'Exception' not in log and 'IOException' not in log
assert (B/'F-source-final/compile.exit').read_text().strip()=='exit 0';assert (B/'F-source-final/output/Windows.zip').is_file();assert 'Entering main loop.' in (B/'F-source-final/launch.log').read_text(errors='replace')
assert 'AQZ DIAGNOSTIC IO SELFTEST PASS:' in (B/'F-source-final/launch.log').read_text(errors='replace')
paths=[ROOT/x for x in subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()];blocked={'.sms','.gg','.rom','.zip','.exe','.win','.pyc','.log','.tmp'};allowed={'objects','scripts','sprites','shaders','rooms','sounds','tilesets','timelines','options','notes','docs','POC_notes','verification'}
paths=sorted(set(p for p in paths if p.is_file() and p.suffix.lower() not in blocked and not set(p.relative_to(ROOT).parts)&{'build','__pycache__','.git','node_modules'} and (p.relative_to(ROOT).parts[0] in allowed or p.name=='SonicChaos_POC.yyp' or (p.parent==ROOT and p.suffix=='.md'))))
assert [p.name for p in paths if p.suffix=='.yyp']==['SonicChaos_POC.yyp'];assert not Z.exists() and not E.exists(),'Never overwrite review packages'
Z.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(Z,'w',zipfile.ZIP_DEFLATED) as z:
 for p in paths:z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(Z) as z:
 assert z.testzip() is None;assert len([n for n in z.namelist() if n.endswith('.yyp')])==1;assert all(n.startswith(NAME+'/') for n in z.namelist());z.extractall(E.parent)
for p in paths:assert p.read_bytes()==(E/p.relative_to(ROOT)).read_bytes()
report=dict(package=str(Z),sha256=hashlib.sha256(Z.read_bytes()).hexdigest(),files=len(paths),base='1b089a5fdfa31acc27c8f06866ae66f091c3d455',branch='poc/aqz-p4-boss-59-5d',research='89641f8093e62401cd81f94e6ac889422f600472',regression_commands='88/88 PASS',runtime=json.loads((B/'runtime-results.json').read_text()),assets=json.loads((B/'asset-results.json').read_text()),jump_oracle=json.loads((B/'jump-oracle-results.json').read_text()),viewport=json.loads((B/'viewport-results.json').read_text()),core_identity=json.loads((B/'core-identity-results.json').read_text()),diagnostics=json.loads((B/'diagnostic-results.json').read_text()),source_compile='PASS',source_launch='PASS main loop',fresh_compile='PENDING',fresh_launch='PENDING',Windows_acceptance='PENDING',commit='UNCOMMITTED')
report['focused_assertions']=sum(report[k]['assertions'] for k in ['runtime','assets','jump_oracle','viewport','core_identity','diagnostics'])
report['source_native_trace_io']='PASS'
(B/'package-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['package','sha256','files','regression_commands','source_compile','source_launch','commit']},indent=2));print(E/'SonicChaos_POC.yyp')
