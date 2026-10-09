"""Local-ROM boundary controls supplement (not modify) the accepted A3 cache.

Exercise interrupted sag/recontact and staged contact flags at original callback
boundaries. Reproducible fixture writes; no modified ROM, no player physics.
"""
from pathlib import Path
import argparse, hashlib, json, sys
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--research',type=Path,required=True);ap.add_argument('--rom',type=Path,required=True);a=ap.parse_args()
sys.path.insert(0,str(a.research/'tools'))
import aqz_platform_3f as A
r=a.rom.read_bytes();assert hashlib.sha256(r).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
recs=A.placements(r);groups=[]
for rec in recs:
    q=A.lab(r,rec);rows=[]
    for u in range(900):
        # Deterministic bursts of riding, release, recontact, below and sides;
        # keep natural travel and signed speed gates active throughout.
        phase=u%31
        dx=0 if phase<20 else (-24 if phase%2 else 24)
        dy=-14 if phase<12 or 16<=phase<20 else (-60 if phase<16 else (0 if phase%2 else 24))
        vy=(-1 if phase==18 else 1792)
        x,y=q.obj16(17)+dx,q.obj16(20)+dy
        q.player(x,y,vx=123,vy=vy);q.m[0xD521]=0
        q.frame();out=A.fields(q);out['d521']=q.m[0xD521]
        rows.append(dict(input=dict(x=x,y=y,vy=vy,vx=123),output=out))
    groups.append(dict(placement=rec,rows=rows))
dest=ROOT/'verification/aqz-p2/extra-rom-controls.json';dest.parent.mkdir(exist_ok=True)
dest.write_text(json.dumps(dict(rom_sha256=hashlib.sha256(r).hexdigest(),groups=groups),indent=2)+'\n')
print('2700 original-ROM callback controls')
