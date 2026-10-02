"""Verify the bounded Task-06 POC 18.5 integration."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "POC_notes" / "rom-cache"
SPIKE_POINTS = {(1504, 832), (1536, 832), (2208, 832), (2240, 832)}


def instances(room):
    return [item for layer in room["layers"] for item in layer.get("instances", [])]


def positions(rows, object_name):
    return Counter((round(row["x"]), round(row["y"])) for row in rows
                   if row["objectId"]["name"] == object_name)


cache_path = CACHE / "windows-discrepancies.json"
raw_cache = cache_path.read_bytes()
assert hashlib.sha256(raw_cache).hexdigest() == \
    "2803a816680fbfbb50884f4a0664603f541dc217efa90bcfdba003a1bbe78bf1"  # canonical Research 5ae1a96 (Sonic 8x24)
cache = json.loads(raw_cache)
assert cache["rom_sha256"] == \
    "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"

room = json.loads((ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy").read_text())
room_instances = instances(room)
assert not positions(room_instances, "OBJ_CHAOS_mask_12")
layout = json.loads((CACHE / "layout-interactions.json").read_text())
assert {(row["x"], row["y"]) for row in layout["terrain"] if row["block_id"] == 0x3D} \
    == SPIKE_POINTS
assert cache["static_spikes"]["block"] == "0x3D"
assert cache["static_spikes"]["header_flags"] == "0x85"
assert cache["static_spikes"]["floor_profile"] == [16] * 32
assert cache["static_spikes"]["side_profile"] == [0x40] * 16 + [0x60] * 16

type10 = {(row["x"], row["y"], row["parameter"])
          for row in cache["type_10_vertical"]["placements"]}
assert type10 == {(656, 846, "0x06"), (1712, 494, "0x06"),
                  (336, 270, "0x04"), (1472, 110, "0x04"),
                  (2688, 686, "0x02")}

core = (ROOT / "scripts/SCR_chaos_core/SCR_chaos_core.gml").read_text()
for token in ("function SCR_cc_state11_enter", "function SCR_cc_state11_tick",
              "cp_c.vy-64", "cp_c.vy+64",
              "cp_c.vy-32", "cp_c.vy+32", "state11_camera_y+25",
              "state11_camera_y+191", "SCR_cc_shared(cp_c)",
              "if (!cp_c.state11_active) SCR_cc_fall(cp_c)",
              "cp_s.tile == 60 || cp_s.tile == 61"):
    assert token in core, token
adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
for token in ("global.chaosPowerTimer = 300", "SCR_cc_state11_enter(cp_p.chaosCore)",
              "SPR_chaos_player_state_11", "image_speed = 0",
              "SCR_chaos_cancel_state11"):
    assert token.lower() in adapter.lower(), token
type10_step = (ROOT / "objects/OBJ_chaos_object_10/Step_0.gml").read_text()
assert "var cp_attack = chaos_attack_posture(cp_c)" in type10_step
controls = (ROOT / "objects/OBJ_chaos_controls/Step_0.gml").read_text()
assert controls.count("global.chaosPowerTimer--") == 1
assert "global.chaosPowerCode == $04" in controls
assert "global.chaosLastSoundRequest = $81" in controls

type21_source = (ROOT / "objects/OBJ_chaos_object_21/Step_0.gml").read_text()
assert "bbox_" not in type21_source
for token in ("floor(cp_p.chaosCore.xu/256)", "floor(cp_p.chaosCore.yu/256)",
              "floor(chaosXU/256)", "floor(chaosYU/256)",
              "chaos_type21_resolve("):
    assert token in type21_source, token
# box and stomp order: SCR_chaos_attack.chaos_type21_resolve (attack-posture migration)
for token in ("abs(cp_px - cp_ox) > 19", "cp_py < cp_oy - 26", "cp_py > cp_oy + 24", "cp_py <= cp_oy - 4"):
    assert token in (ROOT / "scripts/SCR_chaos_attack/SCR_chaos_attack.gml").read_text(), token


def overlaps(dx, dy):
    # Sonic 8 x 24 vs object 11 x 26 (canonical Research cache): dx +-19, dy -26..+24.
    return abs(dx) <= 19 and -26 <= dy <= 24


def classify(dx, dy, attack=False, selector06=False):
    if not overlaps(dx, dy):
        return "none"
    if dy <= -4:
        return "bounce"
    if attack or selector06:
        return "defeat"
    return "damage"


assert cache["type_21_contact"]["player_extents"] == {"x": 8, "y": 24}
assert cache["type_21_contact"]["object_extents"] == {"x": 11, "y": 26}
for row in cache["type_21_contact"]["boundaries"]:
    assert overlaps(row["dx"], row["dy"]) == row["overlap"], row
assert classify(19, -4) == "bounce"
assert classify(20, -4) == "none"
assert classify(19, -3) == "damage"
assert classify(0, 24) == "damage"
assert classify(0, -3, attack=True) == "defeat"
assert classify(0, -3, selector06=True) == "defeat"
assert classify(0, -4, attack=True) == "bounce"

# Moving type-$1B: the old bounding-box step (hash-locked here by the Task 06 package) was a recovered-model mismatch and was replaced by the ROM model in the
# platform/spike milestone (SCR_chaos_spike1b, verified by verify_platform_spike.js); the shared adapter file only keeps the presentation.
assert "function SCR_chaos_spike_step" not in adapter and "function SCR_chaos_spike_draw" in adapter
assert "function chaos_spike1b_step" in (ROOT / "scripts/SCR_chaos_spike1b/SCR_chaos_spike1b.gml").read_text()

report = {
    "reference_main": "65670d29295d87d71109b1983206a74f2bbeeb6a",
    "task_06_named_commit": "479990227e48543a853cdd36f52365cb5cc1536a",
    "task_06_named_commit_is_main_ancestor": False,
    "cache_sha256": hashlib.sha256(raw_cache).hexdigest(),
    "player_state_11": "RESOLVED",
    "state_11_presentation": "EXACT ROM-DERIVED: SPR_chaos_player_state_11",
    "static_3d_spike_collision": "RESOLVED",
    "static_spike_cells": sorted([list(point) for point in SPIKE_POINTS]),
    "removed_full_cell_masks": 4,
    "type_21_anchor_contact": "RESOLVED",
    "type_10_floating": "CANONICAL - UNCHANGED",
    "moving_type_1b_unchanged": False,  # replaced by the recovered ROM model (platform/spike milestone)
    "candidate": "THZ1 POC READY WITH DOCUMENTED ADAPTERS",
}
(ROOT / "verification/task06-integration-results.json").write_text(
    json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
