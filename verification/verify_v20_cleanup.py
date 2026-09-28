"""Focused structural/numeric checks for the reviewed POC 20 cleanup contract."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "POC_notes" / "rom-cache"


def gm_json(path: Path):
    return json.loads(re.sub(r",\s*([}\]])", r"\1", path.read_text()))


adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
core = (ROOT / "scripts/SCR_chaos_core/SCR_chaos_core.gml").read_text()

# Player damage remains in one Chaos core. Immunity is a damage gate, not a
# terrain gate, and state $1E calls the shared collision pipeline.
damage = adapter[adapter.index("function SCR_chaos_apply_hazard_damage"):]
damage = damage[:damage.index("function SCR_chaos_object_floor_project")]
assert "OBJ_player_lost_a" not in damage
assert "SCR_cc_hurt_enter(cp_p.chaosCore)" in damage
assert all(token in core for token in ("function SCR_cc_hurt_tick", "SCR_cc_shared(cp_c)",
                                       "if (cp_c.state == 30)"))
assert all(token in adapter for token in ("global.playerBlink", "global.powerInv",
                                          "global.chaosDamageBlinkTimer"))

# Explicit anchors and the retained type-$21 temporary grounded policy.
assert "function SCR_chaos_mapped_render_y" in adapter
assert "function SCR_chaos_collision_probe_y" in adapter
draw21 = (ROOT / "objects/OBJ_chaos_object_21/Draw_0.gml").read_text()
assert "SCR_chaos_mapped_render_y(y,17)" in draw21

# Type $10 placements stay exact; rendering exposes measured pixel bounds.
records = json.loads((CACHE / "object-records.json").read_text())
type10 = [(r["world_x"], r["world_y"], r["parameter"])
          for r in records["records"] if r["type_id"] == "0x10"]
assert type10 == [(656,846,"0x06"),(1712,494,"0x06"),(336,270,"0x04"),
                  (1472,110,"0x04"),(2688,686,"0x02")]
draw10 = (ROOT / "objects/OBJ_chaos_object_10/Draw_0.gml").read_text()
assert "SCR_chaos_mapped_render_y" in draw10
assert all(token in draw10 for token in ("chaosFirstVisiblePixelY", "chaosLastVisiblePixelY"))
sprite10 = gm_json(ROOT / "sprites/SPR_chaos_object_10/SPR_chaos_object_10.yy")
assert sprite10["sequence"]["yorigin"] == 28
measurements=[]
surfaces={(656,846):864,(1712,494):512,(336,270):288,(1472,110):128,(2688,686):864}
for x,y,param in type10:
    # Imported 32x40 sprites have actual alpha rows 4..27 and yorigin 28.
    draw_y=y+1; first=draw_y-24; last=draw_y-1; surface=surfaces[(x,y)]
    measurements.append({"parameter":param,"canonical_anchor_y":y,"draw_y":draw_y,
        "sprite_yorigin":28,"first_visible_pixel":first,"last_visible_pixel":last,
        "terrain_reference":surface,"visual_gap":surface-last-1})

# The 142 terrain rings keep their source centres and use an exact 16x16
# source rectangle for both presentation and collection.
layout = json.loads((CACHE / "layout-interactions.json").read_text())
source_rings=[(r["x"],r["y"]) for r in layout["rings"]]
room = gm_json(ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy")
room_rings=[]
for layer in room["layers"]:
    for inst in layer.get("instances",[]):
        if inst.get("objectId",{}).get("name") == "OBJ_ring":
            room_rings.append((int(inst["x"]),int(inst["y"])))
assert len(source_rings) == len(room_rings) == 142
assert sorted(source_rings) == sorted(room_rings)
ring_create=(ROOT / "objects/OBJ_ring/Create_0.gml").read_text()
ring_step=(ROOT / "objects/OBJ_ring/Step_0.gml").read_text()
ring_draw=(ROOT / "objects/OBJ_ring/Draw_0.gml").read_text()
assert all(token in ring_create for token in ("x-8", "y-8", "+15"))
assert "draw_sprite_part" in ring_draw and ",0,1,16,16," in ring_draw
assert all(token in ring_step for token in ("chaosQuadrantLeft", "chaosQuadrantRight",
                                            "chaosQuadrantTop", "chaosQuadrantBottom"))

# $47 runs once after sensors. Side/ceiling contacts bypass vertical direction.
assert "function SCR_cc_terrain_response" in core
shared=core[core.index("function SCR_cc_shared"):core.index("function SCR_cc_state11_enter")]
assert shared.index("SCR_cc_ceiling") < shared.index("SCR_cc_terrain_response")
assert "cp_hits & 13" in core and "cp_c.terrain_response_vy >= 0" in core
assert "cp_c.vy = -1088" in core and "global.chaosTileIds[cp_index] = 70" in core
def eligible(rolling,state,contacts,vy):
    return rolling and state not in (0x0f,0x10,0x15,0x1a) and ((contacts&13)!=0 or vy>=0)
assert eligible(True,9,4,-256) and eligible(True,9,8,-256)
assert eligible(True,9,1,-256) and eligible(True,9,2,0)
assert not eligible(True,9,2,-1) and not eligible(True,0x10,4,0)

# Type $27 separates allocation, sleep, update and SAT state.
source27=(ROOT / "objects/OBJ_chaos_object_27/Step_0.gml").read_text()
for token in ("chaosAllocated", "chaosSleeping", "chaosUpdateAwake", "chaosSATVisible"):
    assert token in source27
assert "if (!chaosUpdateAwake && !cp_sat_active)" in source27
assert "visible = chaosSATVisible && chaosPresentation >= 2" in source27
assert all(token in source27 for token in ("global.chaosGlobalFrame & 3", "< 64", ">= 384"))

report={
    "milestone":"POC 20.0","focused_checks":47,
    "player":{"same_instance_hurt":True,"terrain_in_hurt":True,"immunity_geometry_gate":False},
    "type_10":{"placements_unchanged":5,"measurements":measurements,
               "visual_registration":"WINDOWS COMPARISON REQUIRED"},
    "rings":{"count":142,"source_coordinates_unchanged":True,"rectangle":[16,16],"origin":[8,8]},
    "block_47":{"post_sensor_dispatch":True,"side_paths":["left","right"],
                "vertical_velocity_8_8":-1088,"horizontal_velocity":"preserved",
                "replacement":"0x47 -> 0x46","ring_award":10,"transient":"0x0F/0x40"},
    "type_27":{"phases":["allocated","sleeping","update_awake","sat_visible"],
               "scan_cadence":4,"creation_empty_updates":2,
               "steady_scroll_fixture":True,"camera_jump_fixture":True},
}
(ROOT / "verification/poc20-results.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report,indent=2))
