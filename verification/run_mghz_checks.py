"""Bounded M1 acceptance batch, shared regression controls included."""
from pathlib import Path
import sys,subprocess,json
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/mghz-m1';BUILD.mkdir(parents=True,exist_ok=True)
nodes=['verify_mghz','verify_mghz_closure','verify_mghz_platform_crush','verify_lost_rings','verify_terrain_ring_probe','verify_ring_proximity','verify_spring_interaction','verify_platform_spike','verify_attack_posture','verify_death_boundary','verify_viewport_adapter','verify_thz2_breakable','verify_thz2_loops_twist','verify_gpz_foundation','verify_gpz_closure','verify_gpz_presentation','verify_gpz_enemies','verify_gpz_boss','verify_thz3_boss','verify_thz_closure','verify_debug_select','verify_act_completion']
commands=[['node',f'verification/{n}.js']for n in nodes]+[[sys.executable,'verification/verify_mghz_assets.py'],['git','diff','--check']]
results=[]
for cmd in commands:
    r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True);name=Path(cmd[1]).stem
    (BUILD/(name+'.log')).write_text(r.stdout+r.stderr)
    results.append({'command':cmd,'exit_code':r.returncode});print(('PASS 'if r.returncode==0 else 'FAIL ')+name,flush=True)
    if r.returncode:print((r.stdout+r.stderr)[-2400:])
(BUILD/'focused-results.json').write_text(json.dumps(results,indent=2)+'\n');sys.exit(any(r['exit_code']for r in results))
