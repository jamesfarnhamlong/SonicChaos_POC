"""POC-local controlled ROM fixtures using reviewed Research's original-routine host.
Never writes Research. Does not regenerate the expensive historical caches.
"""
import argparse
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--research',type=Path,required=True);ap.add_argument('--rom',type=Path,required=True);args=ap.parse_args()
sys.path.insert(0,str(args.research/'tools'))
import platform_spike_collision as P
import rom as R
import spring_interaction as S
rom=R.load(args.rom)
out={'rom_sha256':R.SHA256,'evidence':'CONTROLLED ROUTINE RESULT; original script engine and platform callbacks','timelines':[],'surface16':[]}
for param,aux in ((0x89,0x0E),(0x89,0x0C),(0x89,0x0B),(5,0x18)):
    for riding in (False,True):
        lab=P.platform_lab(rom,param,aux);lab.reset();ox,oy=lab.obj16(0x11),lab.obj16(0x14)
        # ObjectLab initializes before positioning Sonic. $8908 can mark a mover
        # deleted against the unprovisioned player at (0,0). Restore its proven
        # type before the controlled trajectory; never execute a deleted slot.
        lab.m[P.SLOT]=0x28
        elapsed=(16-lab.m[P.SLOT+0x30])+(aux-lab.m[P.SLOT+0x37])*16
        lab.player(ox,oy-14 if riding else oy-100,vy=1792)
        rows=[]
        for update in range(16*aux*2+8):
            lab.frame()
            rows.append([update,lab.obj16(0x11),lab.obj16(0x14),R.s16(lab.obj16(0x16)),R.s16(lab.obj16(0x18)),lab.m[P.SLOT+1],lab.m[P.SLOT+2],lab.m[P.SLOT+0x31],lab.o.word(0xD511),lab.o.word(0xD514),bool(lab.m[0xD3C0])])
        out['timelines'].append({'parameter':param,'aux1':aux,'riding':riding,'origin':[ox,oy],'initial_elapsed':elapsed,'columns':['update','x','y','vx','vy','state','requested','touch_phase','player_x','player_y','supported'],'rows':rows})
lab=S.Lab(rom)
for state in range(1,35):
    for attack in (False,True):
        for vy in (-256,-1,0,1,256):
            for side in (0,4,8):
                lab.player(1000,700,vx=123,vy=vy,f3=2 if attack else 0,cur=state,req=state)
                lab.m[0xD522]=side|2;lab.m[0xD36B]=71;lab.m[0xC001]=71;lab.m[0xD29A]=0x23
                lab.o.word(0xD354,0xC001);lab.o.word(0xD358,1000);lab.o.word(0xD35A,718)
                lab.call_ix(0x6AE3)
                out['surface16'].append({'state':state,'attack':attack,'vy':vy,'bg':side|2,'after':[R.s16(lab.o.word(0xD516)),R.s16(lab.o.word(0xD518)),lab.m[0xD503],lab.m[0xD522],lab.m[0xC001],lab.m[0xD29A]]})
(ROOT/'verification/gpz-platform-oracles.json').write_text(json.dumps(out,indent=2)+'\n')
print('Generated',sum(len(t['rows']) for t in out['timelines']),'original platform updates and',len(out['surface16']),'surface16 cases')
