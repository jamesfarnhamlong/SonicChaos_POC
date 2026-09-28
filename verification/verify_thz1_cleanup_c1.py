"""Minimal block-$47 checks for THZ1 Cleanup C1."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
cells = [(3328, 256), (3360, 256), (3392, 256), (3424, 256)]
layout = json.loads((ROOT / "POC_notes/rom-cache/layout-interactions.json").read_text())
assert [(row["x"], row["y"]) for row in layout["terrain"] if row["block_id"] == 71] == cells

def rgba_hash(path):
    return hashlib.sha256(Image.open(path).convert("RGBA").tobytes()).hexdigest()

assert rgba_hash(ROOT / "sprites/SPR_chaos_block_47/47000000-0000-4000-8000-000000000047.png") == \
    "ec9e7afdafe3b1494082e1900e271643a651b19755cf23904211a3ecb42b4e3d"
assert rgba_hash(ROOT / "sprites/SPR_chaos_block_46/46000000-0000-4000-8000-000000000046.png") == \
    "9b153467cc1f12e2e938356e1303538b8fee9e5fd742bf95dd5d47ca13b58c70"

adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
break47 = adapter.split("function SCR_chaos_block47_step", 1)[1].split(
    "function SCR_chaos_object_floor_project", 1)[0]
assert adapter.index("SCR_chaos_block47_step(cp_p)") < adapter.index("SCR_cc_tick(cp_c)")
for token in ("global.chaosTileIds[1128+cp_slot] = 70", "global.ring += 10",
              "cp_c.vy = -1088", "OBJ_chaos_object_0F_transient"):
    assert token in break47, token
assert "cp_c.vx =" not in break47
assert "cp_c.move & 2" in break47 and "cp_c.vx < 0 ? 3 : 0" in break47

core = (ROOT / "scripts/SCR_chaos_core/SCR_chaos_core.gml").read_text()
assert "(cp_kind == 22 && cp_s.tile != 71)" in core
terrain_draw = (ROOT / "objects/OBJ_chaos_terrain_3/Draw_0.gml").read_text()
assert "SPR_chaos_block_46 : SPR_chaos_block_47" in terrain_draw
terrain_obj = json.loads((ROOT / "objects/OBJ_chaos_terrain_3/OBJ_chaos_terrain_3.yy").read_text())
assert any(event["eventType"] == 8 for event in terrain_obj["eventList"])

project = json.loads((ROOT / "SonicChaos_POC.yyp").read_text())
resources = {row["id"]["name"] for row in project["resources"]}
for name in ("SPR_chaos_block_46", "SPR_chaos_block_47", "OBJ_chaos_object_0F_transient"):
    assert name in resources
hud = (ROOT / "objects/OBJ_chaos_controls/Draw_0.gml").read_text()
assert '"THZ1 CLEANUP C1.2"' in hud
print("THZ1 Cleanup C1 block-$47 checks passed")
