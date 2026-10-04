"""Validate real GameMaker renderer captures and per-update handoff traces."""
import argparse,json,shutil,hashlib
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/gpz-boss-e2';OUT=ROOT/'verification/gpz-boss'
ap=argparse.ArgumentParser();ap.add_argument('--import-capture',action='store_true');args=ap.parse_args()
names=['baseline','updated','baseline-approach','updated-approach']
if args.import_capture:
    for n in names:shutil.copy2(BUILD/(n+'-runtime-trace.json'),OUT/('e2-'+n+'-runtime-trace.json'))
    for n in ['baseline','updated']:shutil.copy2(BUILD/(n+'-640x360.png'),OUT/('e2-'+n+'-640x360.png'))
summary={}
for n in names:
    rows=json.loads((OUT/('e2-'+n+'-runtime-trace.json')).read_text());assert len(rows)==1000
    assert all(r['viewport']==[348,196] for r in rows)
    changes=[r for i,r in enumerate(rows) if i==0 or r['camera_mode']!=rows[i-1]['camera_mode']]
    jumps=[(max(abs(r['camera_left']-rows[i-1]['camera_left']),abs(r['camera_top']-rows[i-1]['camera_top'])),r['update']) for i,r in enumerate(rows) if i and r['active']]
    fight=[r for r in rows if r['camera_mode']==3]
    assert fight[-1]['camera_left']==1571
    assert fight[-1]['camera_top']==(112 if n.startswith('updated') else 96)
    assert next(r for r in rows if r['active'])['boss_world'][0]==1856
    assert fight[-1]['fight_target'][0]==1571
    clear=next(r for r in rows if r['clear'])
    assert clear['limits'][1:]==[1920,96]
    if n=='updated-approach':assert max(jumps)[0]<=4
    summary[n]={'first_mapped_activation':next(r for r in rows if r['active'])['update'],
                'mode_changes':changes,'largest_active_camera_step':list(max(jumps)),
                'clear_update':clear['update'],'settled_fight':[1571,fight[-1]['camera_top']],
                'fight_screen_x_range':[min(r['sonic_screen'][0] for r in fight),max(r['sonic_screen'][0] for r in fight)]}
assert summary['baseline-approach']['first_mapped_activation']==summary['updated-approach']['first_mapped_activation']
assert summary['baseline-approach']['clear_update']==summary['updated-approach']['clear_update']
for n in ['baseline','updated']:
    p=OUT/('e2-'+n+'-640x360.png');assert Image.open(p).size==(640,360)
    summary[n]['screenshot_sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
summary['capture_policy']='Actual GameMaker2026.0.0.23 application_surface, logical348x196, displayed640x360; isolated initial placement/final-health fixture; no shipping capture hooks.'
summary['floor_strip']={'old_logical':4,'new_logical':20,'new_displayed':20*360/196,'world_floor_art_registration':288,'canonical_controller_floor':270}
if args.import_capture:(OUT/'e2-camera-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
else:assert json.loads((OUT/'e2-camera-summary.json').read_text())==summary
print('GPZ E.2 real runtime: native logical/display sizes, activation, pan/ready/clear/release traces, <=4 wide camera steps and PNG capture PASS')
