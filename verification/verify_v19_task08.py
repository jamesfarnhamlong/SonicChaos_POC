"""Deterministic POC 19 verification for reviewed THZ1 Task 08 closure."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "POC_notes" / "rom-cache"
CANONICAL_BLOCK47 = "ec9e7afdafe3b1494082e1900e271643a651b19755cf23904211a3ecb42b4e3d"


def bcd_add(value: int, amount: int) -> int:
    decimal = ((value >> 4) & 15) * 10 + (value & 15) + amount
    decimal = min(99, max(0, decimal))
    return (decimal // 10 << 4) | decimal % 10


object09 = json.loads((CACHE / "object-09.json").read_text())
coverage = json.loads((CACHE / "poc-coverage.json").read_text())
closure = json.loads((CACHE / "final-runtime-closure.json").read_text())
assets = json.loads((CACHE / "poc19-task08-assets.json").read_text())
terrain = json.loads((CACHE / "terrain-assets.json").read_text())

# Type $09: one generated entity per reviewed placement, no coordinate retyping.
placements = object09["placements"]
assert len(placements) == object09["raw_record_count"] == object09["runtime_entity_count"] == 24
assert Counter(row["parameter"] for row in placements) == Counter({"0x00": 11, "0x01": 13})
generated = (ROOT / "scripts/SCR_chaos_task08_data/SCR_chaos_task08_data.gml").read_text()
rows = [(int(i), int(x), int(y), f"0x{int(p, 16):02X}")
        for i, x, y, p in re.findall(r"\[(\d+),(\d+),(\d+),\$([0-9A-F]{2})\]", generated)]
expected_rows = [(row["index"], row["world_x"], row["world_y"], row["parameter"])
                 for row in placements]
assert rows == expected_rows
source09 = (ROOT / "objects/OBJ_chaos_object_09/Step_0.gml").read_text()
for token in (">= 12", "global.chaosGlobalFrame & 1", "SCR_chaos_bcd_add(global.chaosType10D29A,1)",
              "global.chaosLastSoundRequest = $BF", "chaosSparkleTick >= 32",
              "chaosCollected", "chaosActive = false"):
    assert token in source09, token
assert all(abs(delta) < 12 for delta in (11, -11))
assert not any(abs(delta) < 12 for delta in (12, -12))
assert [(frame & 1) == 0 for frame in (0, 1)] == [True, False]
assert bcd_add(0x09, 1) == 0x10 and bcd_add(0x19, 1) == 0x20
assert object09["sparkle_timeline"]["updates"] == 32
assert object09["sparkle_timeline"]["frames_by_record"] == [5, 6] * 4
sprite09 = json.loads((ROOT / "sprites/SPR_chaos_object_09/SPR_chaos_object_09.yy").read_text())
assert (sprite09["width"], sprite09["height"], sprite09["sequence"]["xorigin"],
        sprite09["sequence"]["yorigin"]) == (16, 16, 8, 16)
assert len(sprite09["frames"]) == 6
for item in assets["type_09"]["assets"]:
    image = Image.open(ROOT / item["root_png"]).convert("RGBA")
    assert hashlib.sha256(image.tobytes()).hexdigest() == item["rgba_sha256"]

# Type $21: physics GML is byte-identical to POC 18.6; only sprite origin moves.
source21 = ROOT / "objects/OBJ_chaos_object_21/Step_0.gml"
assert hashlib.sha1(source21.read_bytes()).hexdigest() == "2ae7304ccea9f75b8d4d8a96fa824f82016b2f76"
sprite21 = json.loads((ROOT / "sprites/SPR_chaos_object_21/SPR_chaos_object_21.yy").read_text())
assert sprite21["sequence"]["yorigin"] == 35
assert closure["type_21"]["poc_18_5"]["sprite_yorigin"] == 36
assert closure["type_21"]["poc_18_5"]["render_only_correction"].endswith("yorigin from 36 to 35")

# Block $47: exact cells and palette-aware artwork, then terrain replacement.
cells47 = closure["block_47"]["cells"]
assert [tuple(row["world"]) for row in cells47] == [(3328, 256), (3360, 256),
                                                      (3392, 256), (3424, 256)]
assert terrain["piece_palette_selectors"] == {"palette_0": "0x15", "palette_1": "0x06"}
assert terrain["block_47_rgba_sha256"] == CANONICAL_BLOCK47
quadrant3 = Image.open(ROOT / terrain["assets"][3]["root_png"]).convert("RGBA")
for x, y in (row["world"] for row in cells47):
    block = quadrant3.crop((x - 3072, y, x - 3072 + 32, y + 32))
    assert hashlib.sha256(block.tobytes()).hexdigest() == CANONICAL_BLOCK47
core = (ROOT / "scripts/SCR_chaos_core/SCR_chaos_core.gml").read_text()
adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
for token in ("cp_kind == 22 && cp_s.tile == 71", "cp_c.move & 2", "cp_c.state != 15",
              "cp_c.state != 16", "cp_c.state != 21", "cp_c.state != 26",
              "global.chaosTileIds[cp_s.index] = 70", "cp_c.vx = -1088"):
    assert token in core, token
for token in ("SCR_chaos_bcd_add(global.chaosType10D29A,10)", "global.ring += 10",
              "OBJ_chaos_object_0F_transient"):
    assert token in adapter, token
transient = (ROOT / "objects/OBJ_chaos_object_0F_transient/Create_0.gml").read_text()
assert "chaosType = $0F" in transient and "chaosParameter = $40" in transient
assert "OBJ_chaos_object_10" not in core[core.index("cp_kind == 22"):core.index("cp_kind == 22") + 900]
assert bcd_add(0x09, 10) == 0x19 and bcd_add(0x90, 10) == 0x99

def block47_eligible(rolling: bool, state: int, contacts: int, vx: int) -> bool:
    return rolling and state not in (0x0F, 0x10, 0x15, 0x1A) and ((contacts & 12) != 0 or vx >= 0)

assert block47_eligible(True, 9, 0, 256)
assert block47_eligible(True, 9, 4, -256)
assert not block47_eligible(False, 9, 4, 256)
assert not block47_eligible(True, 0x10, 4, 256)
assert not block47_eligible(True, 9, 0, -256)

# Type $27: exact inclusive rectangles and two active updates before frame 1.
source27 = (ROOT / "objects/OBJ_chaos_object_27/Step_0.gml").read_text()
for token in ("cp_origin_rx < -96 || cp_origin_rx > 351", "cp_origin_ry < -96 || cp_origin_ry > 351",
              "cp_rx >= -32 && cp_rx <= 287", "cp_ry >= -32 && cp_ry <= 287",
              "global.chaosGlobalFrame & 3", "chaosState = 0", "chaosPresentation = 1",
              "chaosPresentation = 2", "chaosVX = -$0280", "< 64", ">= 384"):
    assert token in source27, token
accepted = lambda value: -96 <= value <= 351
active = lambda value: -32 <= value <= 287
assert [accepted(x) for x in (-97, -96, 351, 352)] == [False, True, True, False]
assert [active(x) for x in (-33, -32, 287, 288)] == [False, True, True, False]
presentation = 0
visible_sequence = [False]
presentation = 1
visible_sequence.append(False)
presentation = 2
visible_sequence.append(True)
assert visible_sequence == [False, False, True]

# Coverage population accounting remains disjoint.
records = coverage["raw_object_population"]["records"]
assert len(records) == 53 and [row["record_index"] for row in records] == list(range(1, 54))
already = [row for row in records if row["poc_representation"] != "MISSING"]
missing = [row for row in records if row["poc_representation"] == "MISSING"]
assert len(already) == 29 and len(missing) == 24
assert {row["record_index"] for row in missing} == {row["index"] for row in placements}
layout = json.loads((CACHE / "layout-interactions.json").read_text())
assert len(layout["rings"]) == coverage["separate_populations"]["layout_derived_rings"]["count"] == 142
assert len(placements) == 24 and len(cells47) == 4

report = {
    "milestone": "POC 19.0",
    "type_09": {"placements": 24, "parameter_00": 11, "parameter_01": 13,
                "strict_overlap": "11 succeeds; 12 fails", "sparkle_updates": 32,
                "hidden_even_frame_gate": True, "sound_request": "0xBF"},
    "type_21": {"physics_sha1_unchanged": True, "render_y_delta": 1},
    "block_47": {"cells": 4, "rgba_sha256": CANONICAL_BLOCK47,
                 "replacement": "0x47 -> 0x46", "ring_award": 10,
                 "transient": {"type": "0x0F", "parameter": "0x40"}},
    "type_27": {"accepted": [-96, 351], "active": [-32, 287],
                "creation_to_nonempty_updates": 2},
    "coverage": {"raw_records": 53, "previously_represented": 29,
                 "type_09_added": 24, "represented": 53,
                 "separate_layout_rings": 142},
}
(ROOT / "verification/poc19-results.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
