"""Minimal presentation-only checks for THZ1 Cleanup B1."""
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OBJECT = ROOT / "objects/OBJ_chaos_object_21"

create = (OBJECT / "Create_0.gml").read_bytes()
step = (OBJECT / "Step_0.gml").read_bytes()
assert hashlib.sha256(create).hexdigest() == "4fb1d383cdeab56a1755ba9c0adfb5b3f2aa882d4d265a94e16cfb34d77bd7e6"
assert hashlib.sha256(step).hexdigest() == "ddc90c850f9cbc8d400bb02ad12ae0fa596b2ae9c30b8e891f50933232643d04"  # pin updated: Sonic 8x24 extents ($21 reach dx +-19, dy -26..+24)

draw = (OBJECT / "Draw_0.gml").read_text()
assert "chaos_render_offset_y($21)" in draw
assert "y =" not in draw and "y +=" not in draw
obj = json.loads((OBJECT / "OBJ_chaos_object_21.yy").read_text())
assert any(event["eventType"] == 8 and event["eventNum"] == 0 for event in obj["eventList"])

metadata = json.loads((ROOT / "POC_notes/rom-cache/object-21.json").read_text())
room = json.loads((ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy").read_text())
expected = Counter((row["world_x"], row["world_y"]) for row in metadata["placements"])
actual = Counter((round(row["x"]), round(row["y"]))
                 for layer in room["layers"] for row in layer.get("instances", [])
                 if row["objectId"]["name"] == "OBJ_chaos_object_21")
assert actual == expected

adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
floor = adapter.split("function SCR_chaos_object_floor_project", 1)[1].split(
    "function SCR_chaos_type21_top_bounce", 1)[0]
assert "floor(cp_y)+18" in floor
assert "SCR_cc_hurt_enter(cp_p.chaosCore)" in adapter
assert "OBJ_player_lost_a" not in adapter

print("THZ1 Cleanup B1 presentation checks passed")
