"""Meaningful S1 batch: focused SEZ checks, accepted shared/control regressions, Research oracle."""
from pathlib import Path
import argparse,ast,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/sez-s1';BUILD.mkdir(parents=True,exist_ok=True)
# Reuse the accepted M4 regression command inventory, without its reporting writes.
tree=ast.parse((ROOT/'verification/run_mghz_boss_checks.py').read_text())
nodes=next(ast.literal_eval(n.value)for n in tree.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='nodes'for t in n.targets))
commands=[(['node',f'verification/{n}.js'],ROOT)for n in ['verify_sez_s1']+nodes]
commands += [([sys.executable,f'verification/{n}.py'],ROOT)for n in ['verify_sez_assets','verify_mghz_boss_assets','verify_mghz_assets','verify_mghz_footwear_assets','verify_mghz_m3_assets','lint_mghz_boss_gml']]
commands += [([sys.executable,'-m','unittest','discover','-s','tests','-p','test_sez_foundation.py','-v'],ROOT.parent/'sonic-chaos-reference-work'),(['git','diff','--check'],ROOT)]
ap=argparse.ArgumentParser();ap.add_argument('--retry-failed',action='store_true');args=ap.parse_args()
previous=json.loads((BUILD/'full-results.json').read_text())if args.retry_failed else []
if args.retry_failed:
    failed={r['check']for r in previous if r['exit_code']}
    commands=[(cmd,cwd)for cmd,cwd in commands if (Path(cmd[1]).stem if cmd[1]!='-m'else 'research-sez')in failed]
results=[]
for cmd,cwd in commands:
    name=Path(cmd[1]).stem if cmd[1]!='-m'else 'research-sez'
    r=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace')
    (BUILD/(name+'.log')).write_text(r.stdout+r.stderr,encoding='utf-8')
    results.append({'check':name,'command':cmd,'exit_code':r.returncode})
    print(('PASS 'if r.returncode==0 else 'FAIL ')+name,flush=True)
    if r.returncode:print((r.stdout+r.stderr)[-2200:],flush=True)
if args.retry_failed:
    retry={r['check']:r for r in results}
    results=[retry.get(r['check'],r)for r in previous]
(BUILD/'full-results.json').write_text(json.dumps(results,indent=2)+'\n')
print(f'{sum(r["exit_code"]==0 for r in results)}/{len(results)} commands passed')
sys.exit(any(r['exit_code']for r in results))
