"""Generate the immutable THZ2 runtime data script from the canonical level package.

Consumes only the vendored research output in POC_notes/rom-cache/levels/thz2/.
Nothing is transcribed by hand: layout cells, terrain rings and type-$09 records
(with their source class) are emitted mechanically and pinned by SHA-256.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "POC_notes/rom-cache/levels/thz2"
DEST = ROOT / "scripts/SCR_chaos_level_thz2_data/SCR_chaos_level_thz2_data.gml"
PACKAGE_COMMIT = "27a8348f3ef85078383ae2cb76bfcb9e029e38f2"
EXPECTED = {
    "layout.json": "371a8f8705da3b7ea99ab44b5fc8e69a2f70911aa963d4ba8f76b4eb5987e543",
    "rings.json": "4e840c38e15f4d9bf89a04b634071f82a58b0d7ad052d97160c3412534d92362",
    "manifest.json": "a89ad7aaa95bb1846d9c5a6e0bd407eae49b8ba27c92241e88953b5cc8cda17c",
    "objects.json": "3e2236fd810047d4544b548429ac6a492bdab6552bd301ff36af920d5a7e298b",
}


def read_pinned(name: str) -> dict:
    raw = (PKG / name).read_bytes().replace(b"\r\n", b"\n")  # newline-insensitive pin
    assert hashlib.sha256(raw).hexdigest() == EXPECTED[name], name
    return json.loads(raw)


def coordinate_hash(rows) -> str:  # identical to tools/level_package.py::coordinate_hash
    text = "".join(f"{cls},{x},{y}\n" for cls, x, y in rows)
    return hashlib.sha256(text.encode("ascii")).hexdigest()


layout = read_pinned("layout.json")
rings = read_pinned("rings.json")
manifest = read_pinned("manifest.json")
objects = read_pinned("objects.json")
type26 = [r for r in objects["records"] if r["type_id"] == "0x26"]
assert len(type26) == 10 and objects["type_counts"]["0x26"] == 10
assert sorted(r["parameter"] for r in type26) == ["0x00"] * 8 + ["0x01", "0x88"]
type28 = [r for r in objects["records"] if r["type_id"] == "0x28"]
assert len(type28) == 3 and objects["type_counts"]["0x28"] == 3
assert sorted((r["parameter"], r["aux1"]) for r in type28) == [("0x0A", "0x13"), ("0x0A", "0x19"), ("0x84", "0x00")]
type28_rows = [
    f'    [{r["index"]},{r["world_x"]},{r["world_y"]},${int(r["parameter"], 16):02X},'
    f'${int(r["aux0"], 16):02X},${int(r["aux1"], 16):02X},${int(r["rom_offset"], 16):05X},"object-$28"]'
    for r in type28]
type26_rows = [
    f'    [{r["index"]},{r["world_x"]},{r["world_y"]},${int(r["parameter"], 16):02X},'
    f'${int(r["aux0"], 16):02X},${int(r["aux1"], 16):02X},${int(r["rom_offset"], 16):05X},"object-$26"]'
    for r in type26]

dims = layout["dimensions"]
assert (dims["width_cells"], dims["height_cells"]) == (128, 32)
cells = [c for row in layout["rows"] for c in row]
assert len(cells) == 4096
runtime = cells[:4095]  # loader writes at most 4095 cells ($C001..$CFFF)
assert hashlib.sha256(bytes(runtime)).hexdigest() == layout["runtime_cells_sha256"]
assert layout["runtime_bound"]["unwritten_cell_indices"] == [4095]

terrain = [r for r in rings["rings"] if r["source_class"] == "terrain"]
visible = [r for r in rings["rings"] if r["source_class"] == "object_09_visible"]
hidden = [r for r in rings["rings"] if r["source_class"] == "object_09_hidden"]
assert (len(terrain), len(visible), len(hidden)) == (133, 9, 4)
assert coordinate_hash([(r["source_class"], r["world_x"], r["world_y"]) for r in terrain]) == \
    rings["hashes"]["terrain_coordinates_sha256"]
obj9 = [r for r in rings["rings"] if r["source_class"] != "terrain"]
assert coordinate_hash([(r["source_class"], r["world_x"], r["world_y"]) for r in obj9]) == \
    rings["hashes"]["object_09_coordinates_sha256"]
assert coordinate_hash([(r["source_class"], r["world_x"], r["world_y"]) for r in rings["rings"]]) == \
    rings["hashes"]["all_rings_sha256"]

QUADRANT = {"top_left": 0, "top_right": 1, "bottom_left": 2, "bottom_right": 3}
terrain_rows = []
for i, r in enumerate(terrain):
    x, y, block = r["world_x"], r["world_y"], int(r["block_id"], 16)
    cell = (y // 32) * 128 + (x // 32)
    assert cell == r["layout_cell_index"] and cells[cell] == block
    quadrant = (1 if x % 32 == 24 else 0) + (2 if y % 32 == 24 else 0)
    assert quadrant == QUADRANT[r["quadrant"]]
    terrain_rows.append(f'    [{i},{x},{y},${block:02X},{cell},{quadrant},"terrain"]')

type09_rows = []
for r in obj9:
    parameter = int(r["parameter"], 16)
    assert parameter == (0 if r["source_class"] == "object_09_visible" else 1)
    cls = "object-$09-visible" if parameter == 0 else "object-$09-hidden"
    type09_rows.append(
        f'    [{r["object_index"]},{r["world_x"]},{r["world_y"]},${parameter:02X},'
        f'${int(r["rom_offset"], 16):05X},"{cls}"]')

tile_lines = []
for i in range(0, len(runtime), 32):
    tile_lines.append("        " + ",".join(str(v) for v in runtime[i:i + 32]))

start = manifest["player_start"]
text = f'''/// GENERATED FILE - do not edit by hand (POC_notes/generate_chaos_level_data.py).
/// Source: sonic-chaos-reference research/thz2-thz3-level-package @ {PACKAGE_COMMIT[:7]}
///   data/rom-cache/levels/thz2/{{layout,rings,manifest,objects}}.json
/// layout.json SHA-256 (LF-normalized):   {EXPECTED["layout.json"]}
/// rings.json SHA-256:    {EXPECTED["rings.json"]}
/// manifest.json SHA-256: {EXPECTED["manifest.json"]}
/// objects.json SHA-256:  {EXPECTED["objects.json"]}
/// THZ2 layout ROM $48BA9, 128x32 blocks (4096x1024 px), 4095 runtime cells.
function SCR_chaos_thz2_tile_ids() {{
    return [
{(","+chr(10)).join(tile_lines)}
    ];
}}

/// Terrain-derived rings. Record: [index, canonical_x, canonical_y, block, cell_index, quadrant, source_class]
function SCR_chaos_thz2_terrain_rings() {{
    return [
{(","+chr(10)).join(terrain_rows)}
    ];
}}

/// Raw type-$09 records, package order. Record: [object_index, canonical_x, canonical_y, parameter, ROM_offset, source_class]
function SCR_chaos_thz2_type09() {{
    return [
{(","+chr(10)).join(type09_rows)}
    ];
}}

/// Canonical type-$26 records (raw parameter/aux). Record: [object_index, canonical_x, canonical_y, parameter, aux0, aux1, ROM_offset, source_class]
function SCR_chaos_thz2_type26() {{
    return [
{(","+chr(10)).join(type26_rows)}
    ];
}}

/// Canonical type-$28 records (raw parameter/aux). Record: [object_index, canonical_x, canonical_y, parameter, aux0, aux1, ROM_offset, source_class]
function SCR_chaos_thz2_type28() {{
    return [
{(","+chr(10)).join(type28_rows)}
    ];
}}

/// Loader $4E57 start words: RAM $D511 (x) and $D514 (y); field meanings are UNRESOLVED; values are raw, no offset.
function SCR_chaos_thz2_start() {{ return [{start["ram_d511"]},{start["ram_d514"]}]; }}
function SCR_chaos_thz2_width() {{ return {dims["width_pixels"]}; }}
function SCR_chaos_thz2_height() {{ return {dims["height_pixels"]}; }}
function SCR_chaos_thz2_layout_sha() {{ return "{layout["runtime_cells_sha256"]}"; }}
function SCR_chaos_thz2_terrain_hash() {{ return "{rings["hashes"]["terrain_coordinates_sha256"]}"; }}
function SCR_chaos_thz2_type09_hash() {{ return "{rings["hashes"]["object_09_coordinates_sha256"]}"; }}
function SCR_chaos_thz2_all_rings_hash() {{ return "{rings["hashes"]["all_rings_sha256"]}"; }}
'''
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_bytes(text.encode("utf-8"))
print(f"THZ2: {len(runtime)} cells, {len(terrain_rows)} terrain, {len(type09_rows)} type-09 -> {DEST}")
