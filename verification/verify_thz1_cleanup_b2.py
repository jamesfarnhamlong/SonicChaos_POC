"""Minimal presentation-only checks for THZ1 Cleanup B2."""
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OBJECT = ROOT / "objects/OBJ_chaos_object_10"

assert hashlib.sha256((OBJECT / "Create_0.gml").read_bytes()).hexdigest() == \
    "aa49d57d2496f8476764f0a907b9754cf92c52b0a24954355abe64abf311c541"
assert hashlib.sha256((OBJECT / "Step_0.gml").read_bytes()).hexdigest() == \
    "b85245ed5032bbea5d94d1ce51c7497947776274a7c787cd1fce1fd7f78434f3"  # pin updated: shared viewport lifecycle (placement scan + bands); earlier 72211408...; Sonic 8x24 extents in the box call; earlier: 6056a53a...; updated for the shared type-$10 contact fix (README_THZ2_FOUNDATION.md); previously 13d03485...

draw = (OBJECT / "Draw_0.gml").read_text()
assert "if (chaosConsumed) { draw_self(); exit; }" in draw
assert "chaos_render_offset_y($10)" in draw
assert "y =" not in draw and "y +=" not in draw
obj = json.loads((OBJECT / "OBJ_chaos_object_10.yy").read_text())
assert any(event["eventType"] == 8 and event["eventNum"] == 0 for event in obj["eventList"])

metadata = json.loads((ROOT / "POC_notes/rom-cache/object-10.json").read_text())
expected = Counter((row["world_x"], row["world_y"], row["parameter"])
                   for row in metadata["placements"])
room = json.loads((ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy").read_text())
actual_xy = Counter((round(row["x"]), round(row["y"]))
                    for layer in room["layers"] for row in layer.get("instances", [])
                    if row["objectId"]["name"] == "OBJ_chaos_object_10")
assert actual_xy == Counter((x, y) for x, y, _ in expected.elements())
assert {parameter for _, _, parameter in expected} == {"0x02", "0x04", "0x06"}

type21_draw = (ROOT / "objects/OBJ_chaos_object_21/Draw_0.gml").read_text()
assert "chaos_render_offset_y($21)" in type21_draw
adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
assert "SCR_cc_hurt_enter(cp_p.chaosCore)" in adapter
assert "OBJ_player_lost_a" not in adapter
hud = (ROOT / "objects/OBJ_chaos_controls/Draw_0.gml").read_text()
assert '"THZ1 CLEANUP RING LAYER"' not in hud

print("THZ1 Cleanup B2 presentation checks passed")
