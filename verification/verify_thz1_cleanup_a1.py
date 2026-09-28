"""Small architectural regression checks for THZ1 Cleanup A1."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
core = (ROOT / "scripts/SCR_chaos_core/SCR_chaos_core.gml").read_text()
controls = (ROOT / "objects/OBJ_chaos_controls/Step_0.gml").read_text()
hud = (ROOT / "objects/OBJ_chaos_controls/Draw_0.gml").read_text()

damage = adapter.split("function SCR_chaos_apply_hazard_damage", 1)[1].split(
    "function SCR_chaos_object_floor_project", 1)[0]
sample = adapter.split("function SCR_chaos_sample_damage", 1)[1]
hurt = core.split("function SCR_cc_hurt_tick", 1)[1].split(
    "function SCR_cc_state11_tick", 1)[0]
shared = core.split("function SCR_cc_shared", 1)[1].split(
    "function SCR_cc_state11_enter", 1)[0]

assert "OBJ_player_lost_a" not in damage + sample
assert "instance_change(OBJ_player_death,true)" in damage
assert "SCR_cc_hurt_enter(cp_p.chaosCore)" in damage
assert "global.powerShield = false" in damage and "global.ring = 0" in damage
assert "global.chaosDamageBlinkTimer = 90" in damage
assert "SCR_cc_shared(cp_c)" in hurt
assert "if (cp_c.state == 30)" in core and "hurt_ticks:0" in core
assert "hurt_ticks = 30" in core
for terrain_stage in ("SCR_cc_x", "SCR_cc_y", "SCR_cc_floor", "SCR_cc_sides", "SCR_cc_ceiling", "SCR_cc_merge"):
    assert terrain_stage in shared, terrain_stage
assert "playerBlink" not in core
assert "chaosDamageBlinkTimer" in controls
assert '"THZ1 CLEANUP A1"' in hud

print("THZ1 Cleanup A1 architecture checks passed")
