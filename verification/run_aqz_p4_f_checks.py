"""P4 final regression batch; accepted P1/P2/P3 plus focused boss/oracle checks."""
from pathlib import Path
import json,subprocess,sys
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'build/aqz-p4-f';B.mkdir(exist_ok=True)
import argparse
p=argparse.ArgumentParser();p.add_argument('--reuse-p1-results',action='store_true');a=p.parse_args()
if not a.reuse_p1_results:subprocess.run([sys.executable,'verification/run_aqz_p1_checks.py','--native-registration'],cwd=ROOT,check=True)
subprocess.run([sys.executable,'verification/run_aqz_p3_checks.py','--reuse-p1-results'],cwd=ROOT,check=True)
rows=json.loads((ROOT/'build/aqz-p3/full-results.json').read_text())
research=ROOT.parent/'sonic-chaos-reference-work'
for name,cmd,cwd in [
 ('verify_aqz_p4',['node','verification/verify_aqz_p4.js'],ROOT),
 ('verify_aqz_p4_f',['node','verification/verify_aqz_p4_f.js'],ROOT),
 ('verify_aqz_p4_f_diagnostics',['node','verification/verify_aqz_p4_f_diagnostics.js'],ROOT),
 ('verify_aqz_p4_f_jump_oracle',[sys.executable,'verification/verify_aqz_p4_f_jump_oracle.py'],ROOT),
 ('verify_aqz_p4_f_identity',[sys.executable,'verification/verify_aqz_p4_f_identity.py'],ROOT),
 ('verify_aqz_p4_assets',[sys.executable,'verification/verify_aqz_p4_assets.py'],ROOT),
 ('research-test_aqz59',[sys.executable,'-m','unittest','discover','-s','tests','-p','test_aqz59.py','-v'],research)]:
 r=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace');(B/(name+'.log')).write_text(r.stdout+r.stderr,encoding='utf-8');rows.append(dict(check=name,command=cmd,exit_code=r.returncode));print(('PASS ' if not r.returncode else 'FAIL ')+name,flush=True)
 if r.returncode:print((r.stdout+r.stderr)[-3000:])
import shutil
for name in ['runtime-results.json','asset-results.json']:shutil.copyfile(ROOT/'build/aqz-p4'/name,B/name)

(B/'full-results.json').write_text(json.dumps(rows,indent=2)+'\n');print(f'{sum(x["exit_code"]==0 for x in rows)}/{len(rows)} passed');sys.exit(any(x['exit_code'] for x in rows))
