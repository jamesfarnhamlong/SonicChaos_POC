"""Check captures produced by the excluded native E diagnostic project."""
from pathlib import Path
import argparse,json,os,shutil
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--captures',type=Path,default=Path(os.environ['LOCALAPPDATA'])/'SonicChaos_POC');args=ap.parse_args()
out=ROOT/'build/aqz-p1/F-native/captures';out.mkdir(parents=True,exist_ok=True)
checks=0
def eq(a,b,why=''):
 global checks
 assert a==b,(why,a,b)
 checks+=1
def read(mode):
 src=args.captures/('player-audit-'+mode+'.jsonl');shutil.copy2(src,out/src.name)
 return [json.loads(l) for l in src.read_text().splitlines()]
j=json.loads((ROOT/'POC_notes/rom-cache/player-spring-airborne.json').read_text())
oracle=next(s for s in j['aqz_chains']['scenarios'] if s['id']=='aqz3_natural_run')
native=read('aqz-natural');rows=[r for r in native if r['kind']=='update'];eq(len(rows),500)
for i,r in enumerate(rows[:480]):
 c=r['core'];a=r['animation']
 values=[i+1,c['state'],c['next'],c['d503'],a['frame'],a['counter'],int(c['x']//1),int(c['y']//1),round(c['vx']*256),round(c['vy']*256),max(0,c['d448']),r['facing'],(c['bg']>>1)&1]
 for k,v in enumerate(values):eq(v,oracle['rows'][i][k],f'native update {i+1} {oracle["columns"][k]}')
 if a['active'] and a['state']==c['state']:
  eq(r['sprite'],'SPR_chaos_aqz_player_frame_%02X'%int(a['frame']));eq(r['image_index'],0);eq(r['image_speed'],0)
for mode,launch in [('weak',-5),('boss255',-4)]:
 capture=read(mode);updates=[r for r in capture if r['kind']=='update'];eq(len(updates),120)
 if mode=='weak':contact=next(r['after'] for r in capture if r.get('call')=='chaos_spring26_launch' and r['after']['vy']==-5)
 else:contact=next(r['core'] for r in capture if r['kind']=='contact-result-2')
 eq([contact['next'],contact['vy'],contact['d448'],contact['d503']],[11,launch,0,1])
 spring=[r for r in updates if r['core']['state']==11]
 for r in spring:
  a=r['animation'];eq(28<=a['frame']<=33,True);eq(r['sprite'],'SPR_chaos_player_frame_%02X'%int(a['frame']));eq(r['image_speed'],0)
 eq(any(r['core']['state']==14 and r['sprite'].startswith('SPR_chaos_player_frame_0') for r in updates),True)
for mode,want,posture in [('horizontal9',7,0),('horizontal14',9,2)]:
 capture=read(mode);contact=next(r for r in capture if r.get('call')=='SCR_cc_spring' and r.get('cp_kind')==1)
 eq([contact['after']['next'],contact['after']['d503']],[9,2])
 update=next(r for r in capture if r['kind']=='update' and r['update']==contact['update'])
 eq([update['core']['next'],update['core']['d503']],[want,posture])
result={'status':'PASS','assertions':checks,'native_updates':980,'oracle_updates':480,'oracle_numeric_values':6240,'oracle_mismatches':0,'weak_launch':-5,'thz3_launch':-4,'mapped_spring_phase':'after player','visual_acceptance':'PENDING WINDOWS'}
(ROOT/'verification/aqz-p1/followup-f-native-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
