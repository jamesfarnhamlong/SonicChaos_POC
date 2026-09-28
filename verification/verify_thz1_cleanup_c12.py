"""Minimal block-$47 contact-response checks for THZ1 Cleanup C1.2."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
break47 = adapter.split("function SCR_chaos_block47_step", 1)[1].split(
    "function SCR_chaos_object_floor_project", 1)[0]

assert "cp_c.vy > 0 && cp_y+18 <= 256 && cp_next_y+18 >= 256" in break47
assert break47.index("global.chaosTileIds[1128+cp_slot] = 70") < \
    break47.index("if (cp_top_impact)")
rebound = break47.split("if (cp_top_impact)", 1)[1].split(
    "instance_create_depth", 1)[0]
assert "cp_c.vy = -1088" in rebound
assert "cp_p.chaosGrounded = false" in rebound
assert "cp_c.vx =" not in break47
assert break47.count("global.ring += 10") == 1

motion = (ROOT / "scripts/SCR_chaos_motion_data/SCR_chaos_motion_data.gml").read_text()
assert "global.chaosSourceTileIds = global.chaosTileIds" in motion
assert "array_copy(global.chaosTileIds" in motion
hud = (ROOT / "objects/OBJ_chaos_controls/Draw_0.gml").read_text()
assert '"THZ1 CLEANUP C1.2"' in hud
print("THZ1 Cleanup C1.2 contact-response checks passed")
