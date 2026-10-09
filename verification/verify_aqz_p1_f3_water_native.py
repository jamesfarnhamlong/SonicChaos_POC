"""Compare compiled F2 movement-selector controls directly with original Z80 routines."""
from pathlib import Path
import json,os,sys,hashlib
ROOT=Path(__file__).resolve().parents[1];REF=ROOT.parent/'sonic-chaos-reference-work';sys.path.insert(0,str(REF/'tools'))
import aqz_water as W,rom as R
rom=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes();assert hashlib.sha256(rom).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
o=W.lab(rom);m=o.mem
src=Path(os.environ['LOCALAPPDATA'])/'SonicChaos_POC/F3-water-native.jsonl';raw=src.read_bytes();rows=[json.loads(l) for l in raw.decode().splitlines()];assert len(rows)==16800
out=ROOT/'verification/aqz-p1/followup-f3-water';out.mkdir(exist_ok=True);(out/'native-controls.jsonl').write_bytes(raw)
checks=0;controls={};threshold={}
def eq(a,b,label):
 global checks
 assert a==b,(label,a,b)
 checks+=1
for r in rows:
 water=255 if r['world_y']>=r['waterline'] else 0
 eq(r['water_at_input'],water,'same update classification consumed');eq(r['water_after'],water,'classification survives control');eq(r['calls_after']-r['calls_before'],1,'exactly one updater')
 eq(r['vx_before'],r['vx_at_input'],'water gate preserves X');eq(r['surface_delta'],0,'flat support');eq(r['cap'],1024,'cap unchanged')
 key=(int(r['state_at_input']),water,int(r['vx_at_input']),int(r['held']),int(r['vy_before']),r['kind'] in [2,3,4,5],int(r['cap']))
 if key not in controls:
  state,wet,vx,pad,vy,air,cap=key
  m[0xD501]=state;m[0xD443]=wet;m[0xD137]=pad;m[0xD369]=0;m[0xD523]=0;m[0xD522]=0 if air else 2;m[0xD503]=1 if air else 0;m[0xD3C0]=0
  o.position(128,int(r['world_y']));o.word(0xD174,0);o.word(0xD516,vx);o.word(0xD518,vy);o.word(0xD373,cap);o.word(0xD375,0x1234);o.word(0xD377,0x5678)
  o.call(0x4141);acc=R.s16(o.word(0xD375));o.call(0x402A);x=R.s16(o.word(0xD516));o.call(0x4097);y=R.s16(o.word(0xD518));controls[key]=(acc,x,y)
 eq((r['acceleration'],r['vx_after_control'],r['vy_after']),controls[key],'original control/X/vertical')
 k=(int(r['act']),int(r['wet']),int(r['kind']))
 if r['threshold'] and k not in threshold:threshold[k]=int(r['update'])
summary={'result':'PASS','native_updates':len(rows),'assertions':checks,'unique_original_Z80_controls':len(controls),'threshold_first_updates':{'act%d_%s_kind%d'%(a,'wet' if w else 'dry',k):v for (a,w,k),v in threshold.items()},'shipping_behavior_changed':False,'evidence':'Compiled immutable F2, synthetic flat support; actual SCR_cc_tick/shared/water/input/X/Y. Original Z80 4141/402A/4097 comparison. Fixed-state air controls are selector benches, not continuous flight.'}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
