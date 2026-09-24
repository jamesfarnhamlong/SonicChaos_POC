"""Execute recovered POC 15 object handlers in the original ROM.

Usage: python verify_v15_objects.py path/to/SonicChaos.sms
Requires the same `z80` Python package used by the engine reference tests.
No ROM is copied into the report or POC archive.
"""
import json, sys
from pathlib import Path

here=Path(__file__).resolve().parent
reference=here.parents[1]/'sonic-chaos-reference-main'/'tools'
sys.path[:0]=[str(here/'.deps'),str(reference)]
from oracle import Oracle

rom_path=Path(sys.argv[1])
rom=rom_path.read_bytes()

def object_oracle(bank):
    o=Oracle(rom);o.bank(2,bank);o.cpu.ix=0xd540
    return o

launch=[]
for parameter,expected_vy,expected_state in [(0,0xF8A0,1),(1,0xFB00,3)]:
    o=object_oracle(30);m=o.mem
    m[0xd540]=0x26;o.word(0xd551,3568);o.word(0xd554,780)
    o.word(0xd57c,780);o.word(0xd511,3568);o.word(0xd514,750)
    o.word(0xd518,0);m[0xd522]=2;m[0xd502]=5;m[0xd57f]=parameter
    o.call(0x82AF)
    row=dict(parameter=parameter,vy=o.word(0xd518),state=m[0xd542],timer=m[0xd55e])
    assert row==dict(parameter=parameter,vy=expected_vy,state=expected_state,timer=28),row
    launch.append(row)

def trace(handler,state):
    o=object_oracle(30);m=o.mem;o.word(0xd554,780);o.word(0xd57c,780)
    m[0xd55e]=28;m[0xd542]=state;rows=[]
    for _ in range(5):
        o.call(handler);rows.append([o.word(0xd554),m[0xd542],m[0xd55e]])
    return rows

strong=trace(0x8312,1);weak=trace(0x837C,3)
assert strong==[[773,1,21],[766,1,14],[759,1,7],[752,1,0],[752,2,32]]
assert weak==[[773,3,21],[766,3,14],[759,3,7],[752,3,0],[752,4,10]]

o=object_oracle(30);m=o.mem;o.word(0xd554,752);o.word(0xd57c,780)
m[0xd54a]=7;m[0xd542]=5;retract=[]
for _ in range(4):
    o.call(0x8349);retract.append([o.word(0xd554),m[0xd542]])
assert retract==[[759,5],[766,5],[773,5],[780,7]]

o=object_oracle(12);m=o.mem;o.word(0xd554,864);o.word(0xd57c,864)
m[0xd55f]=16;m[0xd542]=1;spike_rise=[]
for _ in range(3):
    o.call(0xAC8B);spike_rise.append([o.word(0xd554),m[0xd542],m[0xd55e]])
assert spike_rise==[[858,1,0],[852,1,0],[846,2,16]]
m[0xd542]=3;spike_retract=[]
for _ in range(3):
    o.call(0xACCC);spike_retract.append([o.word(0xd554),m[0xd542],m[0xd55e]])
assert spike_retract==[[852,3,16],[858,3,16],[864,4,64]]

report=dict(object_26_launches=launch,strong_extension=strong,weak_extension=weak,
            spring_retraction=retract,spike_rise=spike_rise,
            spike_retraction=spike_retract,comparisons=30,
            limitation='Selected original handlers; not full SMS scheduler or GameMaker runtime')
out=Path(__file__).with_name('object-results.json')
out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
