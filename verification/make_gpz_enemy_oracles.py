"""Read-only original-ROM callback traces for every approved $25 placement."""
import sys,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RESEARCH=ROOT.parent/'sonic-chaos-reference-work'
sys.path.insert(0,str(RESEARCH/'tools'))
import rom as R
from oracle import Oracle
rom=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes()
assert hashlib.sha256(rom).hexdigest()=='eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
facts=json.loads((RESEARCH/'data/rom-cache/gpz/enemy-art-approval.json').read_text())
manifest=json.loads((RESEARCH/'data/rom-cache/gpz/implementation-manifest.json').read_text())
rows=[]
for act in ('gpz1','gpz2'):
    a=manifest['acts'][act]
    for p in facts['placements'][act]:
        if int(p['type_id'],16)!=37:continue
        o=Oracle(rom);m=o.mem;o.cpu.ix=0xD700;m[0xD700]=37
        m[0xC001:0xD000]=bytes(sum(a['layout']['rows'],[])[:4095]+[0]*max(0,4095-a['layout']['runtime_written_cells']))
        o.word(0xD168,a['descriptor']['header']['row_offset_table_cpu']);o.word(0xD16A,-a['descriptor']['layout']['width_cells'])
        o.word(0xD711,p['world_x']);o.word(0xD714,p['world_y']);o.word(0xD73A,p['world_x']);o.word(0xD73C,p['world_y'])
        m[0xD73F]=int(p['parameter'],16);m[0xD72C]=7;m[0xD72D]=17
        o.position(0,0);o.bank(2,12);m[0xD12B]=12;o.call(0xB535)
        timeline=[]
        for t in range(int(p['parameter'],16)*64+20):
            o.bank(2,12);m[0xD12B]=12;o.call(0xB573)
            timeline.append([o.word(0xD711)*256+m[0xD710],o.word(0xD714)*256+m[0xD713],R.s16(o.word(0xD716)),m[0xD702],m[0xD722]])
        rows.append({'act':act,'placement':p,'timeline':timeline})
out={'research_commit':'d214c60','rom_sha256':hashlib.sha256(rom).hexdigest(),'evidence':'CONTROLLED ROUTINE RESULT: $B535/$B573 on canonical GPZ layout, no contact/lifecycle','rows':rows}
(ROOT/'verification/gpz-enemies/patrol-oracles.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print('Original $25 callback traces:',len(rows),'; samples',sum(len(r['timeline']) for r in rows))
print('First row:',rows[0]['timeline'][:3])
# State engine + callback on a valid GPZ terrain route, capturing animation and direction.
from platform_spike_collision import ObjectLab
a=manifest['acts']['gpz1'];p=facts['placements']['gpz1'][0]
lab=ObjectLab(rom,37,bytes.fromhex(p['raw_bytes']),12,0);o=lab.o;m=o.mem;o.cpu.ix=0xD700
m[0xC001:0xD000]=bytes(sum(a['layout']['rows'],[])[:4095]+[0]*max(0,4095-a['layout']['runtime_written_cells']))
o.word(0xD168,a['descriptor']['header']['row_offset_table_cpu']);o.word(0xD16A,-160)
m[0xD700]=37;m[0xD701]=0;m[0xD702]=1;m[0xD710]=m[0xD713]=0
o.word(0xD711,848);o.word(0xD714,334);o.word(0xD73A,848);o.word(0xD737,704)
o.word(0xD716,-128);o.word(0xD718,512);o.position(0,0)
anim=[]
for t in range(600):
 o.bank(2,12);m[0xD12B]=12;o.call(0x64FA)
 cb=o.word(0xD70C);o.bank(2,12);m[0xD12B]=12;o.call(cb)
 anim.append([m[0xD706],m[0xD704]&16,m[0xD701],m[0xD702],o.word(0xD711)*256+m[0xD710],R.s16(o.word(0xD716)),cb])
print('Animation first:',anim[:20]);print('Animation reversal:',anim[286:293])
(ROOT/'verification/gpz-enemies/animation-oracle.json').write_text(json.dumps(anim,separators=(',',':'))+'\n')
