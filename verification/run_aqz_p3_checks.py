"""AQZ P3 batch: accepted P1 inventory plus platform runtime/assets/ROM suite.

Use Research .venv Python with bundled Pillow site-packages on PYTHONPATH.
--reuse-p1-results requires a completed passing P1 run from this working tree.
"""
from pathlib import Path
import argparse, json, os, subprocess, sys
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/aqz-p3';BUILD.mkdir(exist_ok=True)
ap=argparse.ArgumentParser();ap.add_argument('--reuse-p1-results',action='store_true');a=ap.parse_args()
if not a.reuse_p1_results:subprocess.run([sys.executable,'verification/run_aqz_p1_checks.py','--native-registration'],cwd=ROOT,check=True)
results=json.loads((ROOT/'build/aqz-p1/full-results.json').read_text());assert all(r['exit_code']==0 for r in results)
research=Path(os.environ.get('SONIC_RESEARCH_MAIN') or ROOT.parent/'sonic-chaos-reference-work')
for name,cmd,cwd in [
    ('verify_aqz_p2',['node','verification/verify_aqz_p2.js'],ROOT),
    ('verify_aqz_p2_assets',[sys.executable,'verification/verify_aqz_p2_assets.py'],ROOT),
    ('verify_aqz_p3',['node','verification/verify_aqz_p3.js'],ROOT),
    ('verify_aqz_p3_assets',[sys.executable,'verification/verify_aqz_p3_assets.py'],ROOT),
    ('research-test_aqz_enemies',[sys.executable,'-m','unittest','discover','-s','tests','-p','test_aqz_enemies.py','-v'],research),
    ('research-test_aqz_platform_3f',[sys.executable,'-m','unittest','discover','-s','tests','-p','test_aqz_platform_3f.py','-v'],research)]:
    r=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace')
    (BUILD/(name+'.log')).write_text(r.stdout+r.stderr,encoding='utf-8')
    results.append({'check':name,'command':cmd,'exit_code':r.returncode});print(('PASS ' if r.returncode==0 else 'FAIL ')+name,flush=True)
    if r.returncode:print((r.stdout+r.stderr)[-2000:])
(BUILD/'full-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(f'{sum(r["exit_code"]==0 for r in results)}/{len(results)} commands passed')
sys.exit(any(r['exit_code'] for r in results))
