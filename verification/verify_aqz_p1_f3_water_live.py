"""Verify full-adapter AQZ room controls against original 4141/402A routines."""
from pathlib import Path
import os,json,sys,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT.parent/'sonic-chaos-reference-work/tools'))
import aqz_water as W,rom as R
rom=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes();assert hashlib.sha256(rom).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
o=W.lab(rom);m=o.mem;out=ROOT/'verification/aqz-p1/followup-f3-water';out.mkdir(exist_ok=True);checks=0;cache={};summary={}
def eq(a,b,label):
 global checks
 assert a==b,(label,a,b)
 checks+=1
for act in [1,2]:
 for wet in [False,True]:
  for brake in [False,True]:
   mode=f'aqz{act}-'+('wet' if wet else 'dry')+('-brake' if brake else '')
   raw=(Path(os.environ['LOCALAPPDATA'])/'SonicChaos_POC'/('F3-live-'+mode+'.jsonl')).read_bytes();rows=[json.loads(l) for l in raw.decode().splitlines()];eq(len(rows),120 if brake else 600,mode+' length');(out/(mode+'.jsonl')).write_bytes(raw)
   for i,r in enumerate(rows):
    eq(r['zone'],4,'actual core zone');eq(r['waterline'],568 if act==1 else 788,'actual controller line');eq(r['water'],255 if wet else 0,'field consumed by actual input');eq(r['final_water'],r['water'],'field survives publication');eq(bool(r['global_water']),wet,'legacy output agrees');eq(r['instance_y'],r['core_y']+r['anchor_offset'],'anchor publication');eq(r['cap'],1024,'unchanged ordinary cap');eq(r['surface_delta'],0,'flat surface');eq(r['world_y']>=r['waterline'],wet,'WORLD classification');
    if i:eq(r['updater_calls']-rows[i-1]['updater_calls'],1,'one updater per actual player update')
    key=(int(r['state']),int(r['water']),int(r['vx_before']),int(r['held']))
    if key not in cache:
     state,water,vx,pad=key;m[0xD501]=state;m[0xD443]=water;m[0xD137]=pad;m[0xD369]=0;m[0xD523]=0;o.position(128,int(r['world_y']));o.word(0xD174,0);o.word(0xD516,vx);o.word(0xD373,1024);o.word(0xD375,0);o.word(0xD377,0);o.call(0x4141);acc=R.s16(o.word(0xD375));o.call(0x402A);cache[key]=(acc,R.s16(o.word(0xD516)))
    eq((r['acceleration'],r['vx_after_control']),cache[key],'original Z80 control and integration')
   threshold=next((int(r['update']) for r in rows if r['threshold']),None)
   if not brake:eq(threshold,480 if wet else 60,'threshold cadence')
   else:eq([rows[0]['state'],rows[0]['acceleration'],rows[0]['next'],rows[1]['state'],rows[1]['acceleration']],[5,-2 if wet else -16,7,7,-4 if wet else -32],'walk-to-brake handoff')
   summary[mode]={'updates':len(rows),'first_threshold_update':threshold,'first_3_accelerations':[r['acceleration'] for r in rows[:3]],'first_3_states':[r['state'] for r in rows[:3]],'cap':1024,'water':rows[0]['water']}
result={'result':'PASS','native_full_adapter_updates':2880,'assertions':checks,'unique_original_Z80_controls':len(cache),'controls':summary,'shipping_behavior_changed':False,'scope':'Actual room, core attach zone, player Step/adapter, native tables, water controllers/publication. Empty terrain and synthetic flat support plus X retention only in excluded diagnostic copy.'}
(out/'full-adapter-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
