"""Bounded acceptance batch for GPZ boss package E.2."""
from pathlib import Path
import subprocess,json,sys,shutil
ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'build/gpz-boss-e2'
BUILD.mkdir(parents=True,exist_ok=True)
tests=[
 ['node','verification/verify_gpz_boss_camera.js'],
 [sys.executable,'verification/verify_gpz_boss_camera_capture.py'],
 ['node','verification/verify_gpz_boss_e1.js'],
 ['node','verification/verify_gpz_boss.js'],
 ['node','verification/verify_gpz_boss_clear.js'],
 [sys.executable,'verification/verify_gpz_boss_assets.py'],
 [sys.executable,'verification/preview_gpz_boss.py'],
 ['node','verification/verify_gpz_enemies.js'],
 [sys.executable,'verification/verify_gpz_enemy_assets.py'],
 ['node','verification/verify_attack_posture.js'],
 ['node','verification/verify_viewport_adapter.js'],
 ['node','verification/verify_gpz_closure.js'],
 ['node','verification/verify_thz_closure.js'],
 ['node','verification/verify_gpz_foundation.js'],
 ['node','verification/verify_gpz_presentation.js'],
 [sys.executable,'verification/verify_gpz_presentation.py'],
 [sys.executable,'verification/verify_gpz_assets.py','--research',str(ROOT.parent/'sonic-chaos-reference-work'),'--rom',str(ROOT.parent/'source/Sonic Chaos (Europe).sms')],
 [sys.executable,'verification/verify_bee_composition.py'],
 ['node','verification/verify_terrain_ring_probe.js'],
 ['node','verification/verify_ring_proximity.js'],
 ['node','verification/verify_thz2_loops_twist.js'],
 ['node','verification/verify_thz3_boss.js'],
 ['node','verification/verify_thz3_boss_render.js'],
 ['node','verification/verify_thz3_boss_clear.js'],
 ['node','verification/verify_type27_contact.js'],
 ['node','verification/verify_debug_select.js'],
 ['git','diff','--check']]
results=[]
for cmd in tests:
    result=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
    name=Path(cmd[1]).stem
    (BUILD/(name+'.log')).write_text(result.stdout+result.stderr)
    results.append({'command':cmd,'exit_code':result.returncode})
    print(('PASS ' if result.returncode==0 else 'FAIL ')+name,flush=True)
    if result.returncode: print((result.stdout+result.stderr)[-2400:])
(BUILD/'focused-results.json').write_text(json.dumps(results,indent=2)+'\n')
sys.exit(any(r['exit_code'] for r in results))
