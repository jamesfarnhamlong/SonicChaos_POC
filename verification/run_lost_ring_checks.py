"""Focused acceptance batch for the recoverable lost-ring package."""
from pathlib import Path
import subprocess,json,sys
ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'build/lost-rings'
BUILD.mkdir(parents=True,exist_ok=True)
nodes=['verify_lost_rings','verify_ring_proximity','verify_terrain_ring_probe','verify_viewport_adapter','verify_platform_spike','verify_attack_posture','verify_death_boundary',
 'verify_type27_contact','verify_thz3_boss','verify_gpz_boss','verify_gpz_enemies','verify_gpz_closure','verify_thz_closure','verify_thz2_loops_twist','verify_gpz_foundation','verify_gpz_presentation','verify_debug_select']
tests=[['node',f'verification/{n}.js'] for n in nodes]+[['git','diff','--check']]
results=[]
for cmd in tests:
    r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
    name=Path(cmd[1]).stem if cmd[0]=='node' else 'diff_check'
    (BUILD/(name+'.log')).write_text(r.stdout+r.stderr)
    results.append({'command':cmd,'exit_code':r.returncode})
    print(('PASS ' if r.returncode==0 else 'FAIL ')+name,flush=True)
    if r.returncode: print((r.stdout+r.stderr)[-1500:])
(BUILD/'focused-results.json').write_text(json.dumps(results,indent=2)+'\n')
sys.exit(any(x['exit_code'] for x in results))
