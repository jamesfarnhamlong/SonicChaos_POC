"""Controlled original renderer/$4BC0 calls using accepted Research tooling; no Research edits."""
from pathlib import Path
import sys,json,hashlib,itertools
ROOT=Path(__file__).resolve().parents[1];REF=ROOT.parent/'sonic-chaos-reference-work'
sys.path.insert(0,str(REF/'tools'))
import aqz_water as W
import mapped_object_registration as R
import thz1_object_assets as A
rom=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes()
assert hashlib.sha256(rom).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
o=W.lab(rom);water=[]
for vx,vy,attack in itertools.product([767,768,769,1023,1024,1025,1279,1280,-767,-768,-769,-1023,-1024,-1025,-1279,-1280],[-768,-1,0,1,256],[0,2]):
 o.mem[0xD540:0xD940]=bytes(1024);o.position(128,600);o.mem[0xD443]=255;o.mem[0xD503]=attack;o.word(0xD516,vx);o.word(0xD518,vy);o.call(0x4BC0)
 water.append({'vx':vx,'high_signed':vx>>8,'vy_before':vy,'attack':attack,'vy_after':R.s16(o.word(0xD518))})
r=R.RenderOracle(rom);renderer=[];j=json.loads((ROOT/'POC_notes/rom-cache/player-spring-airborne.json').read_text())
for frame,face in itertools.product(sorted([int(k,16) for k in j['frames']['frames']]+[56,57,58]),[0,16]):
 result=r.render(type_id=1,frame_index=frame,obj_x=128,obj_y=100,cam_x=0,cam_y=0,flags=face,art0=0,art1=0)
 mapping=A.object_mapping(rom,1);pointers=A.mapping_frame_pointers(rom,mapping['mapping_cpu'],128);parsed=A.parse_frame_record(rom,pointers[frame])
 renderer.append({'frame':frame,'facing':face,'result':result})
summary={'evidence':'CONTROLLED ORIGINAL Z80 ROUTINE; accepted Research RenderOracle and aqz_water.lab','research':'81b82941e7f44865e0d551484bee82d28d600d43','rom_sha256':hashlib.sha256(rom).hexdigest(),'water':water,'renderer':renderer,'registration':json.loads((REF/'data/rom-cache/mapped-object-registration.json').read_text())['interpretation']}
out=ROOT/'verification/aqz-p1/followup-f-rom-controls.json';out.write_text(json.dumps(summary,indent=2)+'\n');print(len(water),'water vectors;',len(renderer),'original player renderer controls')
