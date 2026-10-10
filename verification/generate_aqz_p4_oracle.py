"""ROM-backed one-call boundary sweep for every AQZ P4 motion callback."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT.parent/'sonic-chaos-reference-work/tools'))
from aqz59_runtime import Lab,S
r=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes();assert hashlib.sha256(r).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
rows=[]
callbacks={89:[0xA9A5,0xA9E0,0xA9E1,0xA9F3,0xAA13,0xAA4D,0xAA68,0xAA6C,0xAAB5,0xAB1D,0xAB60,0xAB8D,0xABA5,0xABEB,0xABBA,0xABCB],90:[0xAC38,0xAC71,0xACE3,0xAD24],91:[0xAD3B,0xAD4D],92:[0xAD96,0xADAE,0xADBE,0xAE27,0xAE3B,0xAE5B,0xAE88,0xAEA3],93:[0xAEE9,0xAF1E]}
for typ,cbs in callbacks.items():
 for cb in cbs:
  for case in range(8):
   t=S if typ==89 else S+64;q=Lab(r,t);q.prepare(typ,9 if typ==89 else 1,2 if typ==89 else 28 if typ==90 else 11 if typ==91 else 16 if typ==92 else 24,y=237+case%4);m,o=q.m,q.o
   m[t+30]=[0,1,2,6,16,64,96,255][case];m[t+31]=[0,1,2,4,16,48,255,1][case];m[t+10]=[0,79,80,87,88,167,168,217][case] if typ==92 else 0;m[t+11]=128 if typ==92 else 1;m[t+56]=254 if case%2 else 2;m[t+48]=case;m[t+33]=1 if case%2 else 4;m[t+4]=2|(64 if case==7 else 0);m[t+52]=0;m[0xD723]=255;m[0xD724]=255
   o.word(t+22,-160 if case%2 else 160);o.word(t+24,[-1536,-256,0,256][case%4]);o.position(1856+[-28,0,28,100][case%4],237+case%4);m[0xD503]=2 if case%2 else 0
   initial=q.snap();q.call(cb);rows.append(dict(callback=cb,initial=initial,result=q.snap()))
script_rows=[]
for state in list(range(4))+list(range(5,21)):
 q=Lab(r);q.prepare(89,state,0);q.m[S+30]=6
 for u in range(1,25):
  q.call(0x64fa);script_rows.append(dict(state=state,u=u,result=q.snap()))
p=ROOT/'verification/aqz-p4/callback-oracle.json';p.parent.mkdir(exist_ok=True);p.write_text(json.dumps(dict(rom_sha256=hashlib.sha256(r).hexdigest(),research='89641f8093e62401cd81f94e6ac889422f600472',rows=rows,script_rows=script_rows),indent=2)+'\n');print(len(rows),'ROM callback cases')
