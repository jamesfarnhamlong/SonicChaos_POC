"""P4 B full batch; --reuse-p1-results requires a fresh completed passing P1 run."""
from pathlib import Path
import argparse,json,subprocess,sys,shutil
r=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--reuse-p1-results',action='store_true');a=p.parse_args()
if not a.reuse_p1_results:subprocess.run([sys.executable,'verification/run_aqz_p1_checks.py','--native-registration'],cwd=r,check=True)
subprocess.run([sys.executable,'verification/run_aqz_p4_checks.py'],cwd=r,check=True)
b=r/'build/aqz-p4-b';b.mkdir(exist_ok=True)
for name in ['full-results.json','runtime-results.json','asset-results.json']:
 shutil.copyfile(r/'build/aqz-p4'/name,b/name)
for f in (r/'build/aqz-p4').glob('*.log'):shutil.copyfile(f,b/f.name)
rows=json.loads((b/'full-results.json').read_text());assert len(rows)==86 and all(x['exit_code']==0 for x in rows);print('86/86 P4 B commands PASS')
