"""One reproducible source project; excludes parked diagnostics/options and build debris."""
from pathlib import Path
import hashlib,json,shutil,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'build/aqz-p1'
NAME='SonicChaos_AQZ_P1_20261009_F2'
ZIP=ROOT.parent/'releases'/(NAME+'.zip')
EXTRACT=BUILD/'extracted'/NAME
paths={ROOT/p for p in subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines() if (ROOT/p).is_file()}
project=json.loads((ROOT/'SonicChaos_POC.yyp').read_text())
for resource in project['resources']:
 paths.update(p for p in (ROOT/resource['id']['path']).parent.rglob('*') if p.is_file())
paths.update(p for p in (ROOT/'POC_notes/rom-cache/aqz').rglob('*') if p.is_file())
paths.update(ROOT/p for p in ['POC_notes/generate_aqz_foundation.py','docs/aqz-package-p1.md','verification/verify_aqz_p1.js','verification/verify_aqz_p1_integration.js','verification/verify_aqz_p1_assets.py','verification/run_aqz_p1_checks.py','verification/compile_aqz_p1.ps1','verification/package_aqz_p1.py','verification/aqz-p1/validation.json','docs/aqz-package-p1-b.md','verification/verify_aqz_p1_followup.js','verification/verify_aqz_palette_adapter.py','verification/verify_aqz_p1_c.js','verification/aqz-p1/windows-c-trace-summary.json','docs/aqz-package-p1-c.md','docs/aqz-package-p1-d.md','verification/verify_aqz_p1_d.js','verification/verify_aqz_strip_pixels.py'])
paths.update(ROOT/p for p in ['POC_notes/import_player_spring_airborne.py','POC_notes/rom-cache/player-spring-airborne.json','POC_notes/rom-cache/player-spring-airborne-poc-assets.json','docs/aqz-package-p1-e.md','verification/verify_aqz_p1_e.js','verification/verify_player_animation_assets.py','verification/audit_player_state_adapter.js','verification/prepare_player_state_native_audit.py','verification/prepare_aqz_p1_e_native.py','verification/verify_aqz_p1_e_native.py','verification/aqz-p1/followup-e-native-summary.json','verification/aqz-p1/followup-e-validation.json'])
paths.update(ROOT/p for p in ['docs/aqz-package-p1-f.md','verification/verify_aqz_p1_f.js','verification/verify_aqz_p1_f_native.py','verification/prepare_player_registration_native.py','verification/verify_player_registration_native.py','verification/capture_aqz_p1_f_rom.py','verification/aqz-p1/followup-f-rom-controls.json','verification/aqz-p1/followup-f-boss-controls.json','verification/aqz-p1/followup-f-water-cadence.json','verification/aqz-p1/followup-f-registration-controls.json','verification/aqz-p1/followup-f-native-summary.json'])
blocked={'.sms','.gg','.rom','.zip','.exe','.win','.pyc','.log','.tmp'}
allowed={'objects','scripts','sprites','shaders','rooms','sounds','tilesets','timelines','options','notes','docs','POC_notes','verification'}
paths=sorted(p for p in paths if p.exists() and p.suffix.lower() not in blocked and not set(p.relative_to(ROOT).parts)&{'build','__pycache__','.git','node_modules'} and (p.relative_to(ROOT).parts[0] in allowed or p.name=='SonicChaos_POC.yyp' or (p.parent==ROOT and p.suffix=='.md')))
assert [p.name for p in paths if p.suffix=='.yyp']==['SonicChaos_POC.yyp']
assert not ZIP.exists() and not EXTRACT.exists(), 'Never replace a review package'
assert all(r['exit_code']==0 for r in json.loads((BUILD/'full-results.json').read_text()))
assert 'Igor complete.' in (BUILD/'F-source/compile.log').read_text() and (BUILD/'F-source/output/Windows.zip').is_file()
ZIP.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED) as archive:
 for p in paths: archive.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(ZIP) as archive:
 assert archive.testzip() is None
 assert len([n for n in archive.namelist() if n.endswith('.yyp')])==1
 assert all(n.startswith(NAME+'/') for n in archive.namelist())
 archive.extractall(EXTRACT.parent)
for p in paths: assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
report={'package':str(ZIP),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'files':len(paths),'branch':'poc/aqz-p1-foundation-water','base':'5d99a38d1f439ac02cd9d3010d09f70cc57aa575','research':'81b82941e7f44865e0d551484bee82d28d600d43','full_regression':'75/75 commands PASS','focused_assertions':{'runtime':15928,'integration':70,'assets':2573,'followup':1000,'palette':174838,'followup_c':658,'followup_d':3749,'strip_pixels':885,'portable_navigation':242},'new_e_assertions':{'runtime':json.loads((BUILD/'followup-e-results.json').read_text())['assertions'],'assets':json.loads((BUILD/'player-animation-assets-results.json').read_text())['assertions'],'native':json.loads((ROOT/'verification/aqz-p1/followup-e-native-summary.json').read_text())['assertions']},'natural_replay':{'hosted_updates':480,'native_updates':480,'numeric_values_each':6240,'mismatches':0},'research_player_tests':57,'source_compile':'PASS','fresh_extraction_compile':'PENDING','Windows_acceptance':'PENDING','commit':'UNCOMMITTED'}
report['new_f_assertions']={'runtime':json.loads((BUILD/'followup-f-results.json').read_text())['assertions'],'compiled_registration':json.loads((BUILD/'followup-f-registration-results.json').read_text())['assertions'],'native':json.loads((ROOT/'verification/aqz-p1/followup-f-native-summary.json').read_text())['assertions']}
report['unresolved']=['Historical missed THZ3 tumble has no contact trace; F7 instrumentation available.','Windows visual/gameplay acceptance pending.']
(BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
print(EXTRACT/'SonicChaos_POC.yyp')
