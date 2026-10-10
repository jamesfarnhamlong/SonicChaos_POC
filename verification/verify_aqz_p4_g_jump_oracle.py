"""Replay every contact from real unpinned one-jump episodes through ROM $AAB5."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT.parent/'sonic-chaos-reference-work/tools'))
from aqz59_runtime import Lab,S
r=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes();assert hashlib.sha256(r).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
rows=json.loads((ROOT/'build/aqz-p4-g/jump-contact-inputs.json').read_text());checks=0
for n,row in enumerate(rows):
 a=row['before'];s=a['s'];k=a['k'];q=Lab(r);q.prepare(89,s['state'],s['frame'],s['xu']//256,s['yu']//256);o,m=q.o,q.m
 for key,off in [('requested',2),('angle',10),('counter',30),('cooldown',31),('hp',38)]:m[S+off]=s[key]
 o.word(S+22,s['vx']);o.word(S+24,s['vy']);m[S+16]=s['xu']&255;m[S+19]=s['yu']&255
 o.position(k['xu']//256,k['yu']//256);m[0xD510]=k['xu']&255;m[0xD513]=k['yu']&255
 m[0xD501]=k['state'];m[0xD502]=k['next'];m[0xD503]=k['move'];m[0xD522]=k['contacts'];m[0xD523]=k['bg']&15;m[0xD51A]=(k['xu']//256-1727)&255;m[0xD52C]=9 if k['state']==15 else 8
 o.word(0xD516,k['vx']);o.word(0xD518,k['vy']);q.call(0xAAB5)
 actual=dict(hp=m[S+38],cooldown=m[S+31],vx=((o.word(0xD516)+32768)&65535)-32768,vy=((o.word(0xD518)+32768)&65535)-32768,next=m[0xD502])
 assert actual==row['after'],(n,actual,row['after']);checks+=len(actual)
report=dict(status='PASS',contacts=len(rows),assertions=checks,rom_sha256=hashlib.sha256(r).hexdigest());(ROOT/'build/aqz-p4-g/jump-oracle-results.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
