"""Verify compiled D/E/F Draw controls; synthetic fixed anchors isolate registration."""
from pathlib import Path
import json, argparse
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser(); ap.add_argument('--capture',type=Path,default=ROOT/'build/aqz-p1/accepted-evidence/followup-f-registration-controls.json'); args=ap.parse_args()
j=json.loads(args.capture.read_text());checks=0
for label,rows in j['captures'].items():
 assert len(rows)==191;checks+=1
 for r in rows:
  assert (r['core_x'],r['core_y'],r['instance_x'],r['instance_y'],r['anchor_offset'])==(400,400,400,405,5);checks+=1
  assert r['mask']=='SPR_player_mask';checks+=1
  if label!='D':assert r['bbox']==[396,388,407,419];checks+=1
  if label=='F':
   assert (r['draw_x'],r['draw_y'])==((401,418) if r['sprite'].startswith('SPR_chaos_player_') else (400,405));checks+=1
print(f'{checks} compiled Draw registration assertions PASS; 573 frames; D legacy masks recorded, E/F fixed mask equal')
(ROOT/'build/aqz-p1/followup-f-registration-results.json').write_text(json.dumps({'assertions':checks,'frames':573,'result':'PASS'},indent=2)+'\n')
