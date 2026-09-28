"""POC 20.0A active-project provenance and resource/event wiring audit."""
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def gm(path): return json.loads(re.sub(r",\s*([}\]])",r"\1",path.read_text()))

project=gm(ROOT/'SonicChaos_POC.yyp')
resources={row['id']['name']:row['id']['path'] for row in project['resources']}
expected={
 'SCR_chaos_core':'scripts/SCR_chaos_core/SCR_chaos_core.yy',
 'SCR_chaos_adapter':'scripts/SCR_chaos_adapter/SCR_chaos_adapter.yy',
 'OBJ_chaos_controls':'objects/OBJ_chaos_controls/OBJ_chaos_controls.yy',
 'OBJ_chaos_object_10':'objects/OBJ_chaos_object_10/OBJ_chaos_object_10.yy',
 'OBJ_chaos_object_21':'objects/OBJ_chaos_object_21/OBJ_chaos_object_21.yy',
 'OBJ_chaos_object_27':'objects/OBJ_chaos_object_27/OBJ_chaos_object_27.yy',
 'OBJ_ring':'objects/OBJ_ring/OBJ_ring.yy'}
assert all(resources.get(k)==v for k,v in expected.items())
assert len(resources)==len(set(resources))

required_events={
 'OBJ_chaos_controls':{(0,0),(3,0),(3,1),(8,0)},
 'OBJ_chaos_object_10':{(0,0),(3,0),(8,0)},
 'OBJ_chaos_object_21':{(0,0),(3,0),(8,0)},
 'OBJ_chaos_object_27':{(0,0),(1,0),(3,0)},
 'OBJ_ring':{(0,0),(1,0),(3,0),(8,0)}}
for name,wanted in required_events.items():
    obj=gm(ROOT/resources[name])
    events={(e['eventType'],e['eventNum']) for e in obj['eventList']}
    assert wanted <= events,(name,wanted-events)
    for event_type,event_num in wanted:
        suffix={0:'Create',1:'Destroy',3:'Step',8:'Draw'}[event_type]
        assert (ROOT/resources[name]).parent/f'{suffix}_{event_num}.gml' in (ROOT/resources[name]).parent.glob('*.gml')

basenames=['SCR_chaos_core.gml','SCR_chaos_adapter.gml','OBJ_chaos_controls.yy',
 'OBJ_chaos_object_10.yy','OBJ_chaos_object_21.yy','OBJ_chaos_object_27.yy','OBJ_ring.yy']
duplicates={name:[str(p.relative_to(ROOT)) for p in ROOT.rglob(name)] for name in basenames}
assert all(len(paths)==1 for paths in duplicates.values()),duplicates

draw=(ROOT/'objects/OBJ_chaos_controls/Draw_0.gml').read_text()
assert 'THZ POC 20.0A' in draw and 'BUILD: POC20-A TASK09' in draw
adapter=(ROOT/'scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml').read_text()
damage=adapter[adapter.index('function SCR_chaos_apply_hazard_damage'):
               adapter.index('function SCR_chaos_object_floor_project')]
assert 'OBJ_player_lost_a' not in damage
report={'build':'POC 20.0A','project':'SonicChaos_POC.yyp','resources':expected,
 'event_wiring':{k:sorted([list(x) for x in v]) for k,v in required_events.items()},
 'duplicate_active_resources':False,'ordinary_chaos_damage_uses_lost_a':False,
 'ring_draw_event_was_missing_before_20.0A':True}
(ROOT/'verification/poc200a-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
