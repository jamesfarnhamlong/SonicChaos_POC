"""Verify mapped-object presentation policy is separate from canonical geometry."""
from __future__ import annotations

import hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT.parent / "sonic-chaos-reference-work" / "data" / "rom-cache" / "thz1"

EXPECTED_OBJECT_HASHES = {
    "0x09": "64c12ac542c4151a83d55d2a411299e08df60aa870a50dd06c8609ec7d39c261",
    "0x10": "9df1d95ccc05b18f46e7b03100e2b23d09fbe4d3803742b035938a709956f81d",
    "0x18": "7a0c38e155b8ee99249278db1590431a2939d6546b798e7a9e73f7aae2e4fa23",
    "0x1B": "c851c2d8550e8c72a7931094d6fb45cceb089257a80f8497dc4f752d4f9c3473",
    "0x21": "4343eb48dc5453b4405f437d074f4696df809a488ed7b97d9b5c69de56807525",
    "0x26": "b0996be231a58f4b0d4adfb140390cf5152b2cc0ab35112cce78c5553210c358",
    "0x27": "5cfcf8996ffbc901fcb206a99929ce6136a4d038e4418c8fa0ef58a39efeda2f",
    "0x28": "9ec59ab1535c75efb46db8682638a84fdb0d1d3e7da987de1c7de83b6de6f812",
}
EXPECTED_TERRAIN_RING_HASH = "f6bea411d58267a028ff0cfdc93ac37c1b3b32e6221b31e11dfe75f668db652a"

def digest(rows):
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest()

census = json.loads((RESEARCH / "object-census.json").read_text())
objects = {o["type_id"]: o for o in census["objects"]}
actual_hashes = {}
for type_id, expected in EXPECTED_OBJECT_HASHES.items():
    rows = [(r["world_x"], r["world_y"], r["flags"], r["parameter"], r["aux0"], r["aux1"])
            for r in objects[type_id]["records"]]
    actual_hashes[type_id] = digest(rows)
    assert actual_hashes[type_id] == expected, type_id

layout = json.loads((RESEARCH / "layout-interactions.json").read_text())
terrain_rows = [(r["x"], r["y"], r["block_id"]) for r in layout["rings"]]
assert len(terrain_rows) == 142
assert digest(terrain_rows) == EXPECTED_TERRAIN_RING_HASH

adapter_path = ROOT / "scripts" / "SCR_chaos_render_adapter" / "SCR_chaos_render_adapter.gml"
adapter = adapter_path.read_text()
for token in ("#macro TYPE09_RENDER_X 1", "#macro TYPE09_RENDER_Y 17", "#macro TYPE10_RENDER_Y_ADAPTER 18",
              "#macro TYPE18_RENDER_Y_ADAPTER 22", "#macro TYPE21_RENDER_Y_ADAPTER 18",
              "function chaos_render_offset_x", "function chaos_render_offset_y"):
    assert token in adapter, token
assert not re.search(r"\b(2880|3124|3367|656|1712|800|1248)\b", adapter)

draw09 = (ROOT / "objects/OBJ_chaos_ring_manager/Draw_0.gml").read_text()
draw10 = (ROOT / "objects/OBJ_chaos_object_10/Draw_0.gml").read_text()
draw18 = (ROOT / "objects/OBJ_chaos_object_18/Draw_0.gml").read_text()
draw21 = (ROOT / "objects/OBJ_chaos_object_21/Draw_0.gml").read_text()
assert "cp_t09_draw_y = cp_t09_canonical_y+TYPE09_RENDER_Y" in draw09
assert "cp_t09_draw_x-cp_cam_x,cp_t09_draw_y-cp_cam_y" in draw09
assert draw09.count("draw_sprite(SPR_chaos_object_09") == 1
assert "chaos_render_offset_y($10)" in draw10 and "y+18" not in draw10
assert "chaos_render_offset_y($18)" in draw18 and "y + 22" not in draw18
assert "chaos_render_offset_y($21)" in draw21 and "y+18" not in draw21

# Presentation API is legal only in Draw events and in its own definition.
for path in ROOT.rglob("*.gml"):
    if path == adapter_path or path.name.startswith("Draw_") or ".codex-build" in path.parts:
        continue
    assert "chaos_render_offset_" not in path.read_text(), path

type09 = json.loads((RESEARCH / "object-09.json").read_text())
assert type09["parameter_counts"] == {"0x00": 11, "0x01": 13}
assert len([r for r in type09["placements"] if r["parameter"] == "0x00"]) == 11
assert len([r for r in type09["placements"] if r["parameter"] == "0x01"]) == 13

ring_data = (ROOT / "scripts/SCR_chaos_ring_data/SCR_chaos_ring_data.gml").read_text()
assert "2cdec17b0eb0ea8cada58e442074ebb1b3641cde09dfb9c8e959ceacea335628" in ring_data
assert "0d2bba656d1a2cbaf8d5545d47c1c42b40235b8f3f67f015e324c10ec92f719b" in ring_data

doc = (ROOT / "docs/thz1-presentation-adapters.md").read_text(encoding="utf-8")
for type_id in ("$09", "$10", "$18", "$1B", "$21", "$26", "$27", "$28"):
    assert type_id in doc
assert "Terrain-derived rings remain a separate" in doc

project = json.loads((ROOT / "SonicChaos_POC.yyp").read_text())
assert any(r["id"]["name"] == "SCR_chaos_render_adapter" for r in project["resources"])

report = {
    "object_coordinate_hashes": actual_hashes,
    "terrain_ring_coordinate_hash": EXPECTED_TERRAIN_RING_HASH,
    "terrain_ring_count": 142,
    "type09_visible": 11,
    "type09_hidden": 13,
    "adapters": {"0x09": [1, 17], "0x10": [0, 18], "0x18": [0, 22], "0x21": [0, 18]},
    "unchanged_zero_offset_types": ["0x1B", "0x26", "0x27", "0x28"],
    "collision_uses_render_adapter": False,
}
(ROOT / "verification/presentation-audit-results.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
