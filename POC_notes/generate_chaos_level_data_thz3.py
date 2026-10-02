"""Generate the immutable THZ3 runtime data script from the canonical level package (non-boss foundation).

Consumes only the vendored research output in POC_notes/rom-cache/levels/thz3/. Nothing is transcribed by hand: layout cells, terrain rings, type-$09 records and the object census
are emitted mechanically and pinned by SHA-256. The map keeps the ROM's own row stride (width 80: the row-offset table stride equals the width), so the runtime lookup
(SCR_cc_lookup with global.chaosMapWidth = 80) reproduces the ROM addressing, including the wrap of columns past the map edge into the next row.
"""
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "POC_notes/rom-cache/levels/thz3"
DEST = ROOT / "scripts/SCR_chaos_level_thz3_data/SCR_chaos_level_thz3_data.gml"
PACKAGE_COMMIT = "28485aa550313baabcde977f407e5e573e5e252b"
EXPECTED = {
    "layout.json": "0def9f08633b54b7e410e7744ee9b1e25daf8c7917537da8ca834983804bea95",
    "rings.json": "b5dbd806fa3e95d18bccef94ba4f522ccf1e664be2c8a2c5a5d2fd5ca1177742",
    "manifest.json": "7f73168cb6b5cdf43e99b131de7ecb4eb134eaa981fa9fd87fc341a221eb62b1",
    "objects.json": "acd7843bc204c07cccec6de6d17ef76ee438c20d3523c9c45cb7d7376ac2fcd5",
    "assets.json": "40110654bd6f3fa91976230305a647bfe8b55634e630aa79dc8df2372022895b",
}


def read_pinned(name):
    raw = (PKG / name).read_bytes().replace(b"\r\n", b"\n")
    assert hashlib.sha256(raw).hexdigest() == EXPECTED[name], name
    return json.loads(raw)


def coordinate_hash(rows):
    return hashlib.sha256("".join(f"{cls},{x},{y}\n" for cls, x, y in rows).encode("ascii")).hexdigest()


layout, rings, manifest, objects = (read_pinned(n) for n in ("layout.json", "rings.json", "manifest.json", "objects.json"))
read_pinned("assets.json")
dims = layout["dimensions"]
assert (dims["width_cells"], dims["height_cells"], dims["width_pixels"], dims["height_pixels"]) == (80, 16, 2560, 512)
cells = [c for row in layout["rows"] for c in row]
assert len(cells) == 1280 and layout["runtime_bound"]["unwritten_cell_indices"] == []
assert hashlib.sha256(bytes(cells)).hexdigest() == layout["runtime_cells_sha256"]
assert objects["type_counts"] == {"0x09": 3, "0x10": 1, "0x1B": 1, "0x26": 4, "0x50": 1}
assert [r["index"] for r in objects["records"]] == list(range(1, 11))

terrain = [r for r in rings["rings"] if r["source_class"] == "terrain"]
obj9 = [r for r in rings["rings"] if r["source_class"] != "terrain"]
assert (len(terrain), len(obj9)) == (6, 3) and all(r["source_class"] == "object_09_visible" for r in obj9)
for key, rows in (("terrain_coordinates_sha256", terrain), ("object_09_coordinates_sha256", obj9), ("all_rings_sha256", rings["rings"])):
    assert coordinate_hash([(r["source_class"], r["world_x"], r["world_y"]) for r in rows]) == rings["hashes"][key], key

QUADRANT = {"top_left": 0, "top_right": 1, "bottom_left": 2, "bottom_right": 3}
terrain_rows = []
for i, r in enumerate(terrain):
    x, y, block = r["world_x"], r["world_y"], int(r["block_id"], 16)
    cell = (y // 32) * 80 + (x // 32)
    assert cell == r["layout_cell_index"] and cells[cell] == block
    quadrant = (1 if x % 32 == 24 else 0) + (2 if y % 32 == 24 else 0)
    assert quadrant == QUADRANT[r["quadrant"]]
    terrain_rows.append(f'    [{i},{x},{y},${block:02X},{cell},{quadrant},"terrain"]')
type09_rows = [f'    [{r["object_index"]},{r["world_x"]},{r["world_y"]},${int(r["parameter"], 16):02X},${int(r["rom_offset"], 16):05X},"object-$09-visible"]' for r in obj9]
object_rows = [
    f'    [{r["index"]},{r["world_x"]},{r["world_y"]},${int(r["type_id"], 16):02X},${int(r["flags"], 16):02X},'
    f'${int(r["parameter"], 16):02X},${int(r["aux0"], 16):02X},${int(r["aux1"], 16):02X},${int(r["rom_offset"], 16):05X},"object-${int(r["type_id"], 16):02X}"]'
    for r in objects["records"]]
# The ROM loader writes 1,280 cells; the rest of $C001..$CFFF is not initialised by it (RAM content UNRESOLVED). The POC pads with the empty block $FE.
padded = cells + [254] * (4096 - len(cells))
tile_lines = ["        " + ",".join(str(v) for v in padded[i:i + 32]) for i in range(0, 4096, 32)]
start = manifest["player_start"]
NL = chr(10)
text = f'''/// GENERATED FILE - do not edit by hand (POC_notes/generate_chaos_level_data_thz3.py).
/// Source: sonic-chaos-reference Research main @ {PACKAGE_COMMIT[:7]}  data/rom-cache/levels/thz3/{{layout,rings,manifest,objects,assets}}.json
/// layout.json SHA-256 (LF-normalized): {EXPECTED["layout.json"]}
/// rings.json SHA-256:    {EXPECTED["rings.json"]}
/// manifest.json SHA-256: {EXPECTED["manifest.json"]}
/// objects.json SHA-256:  {EXPECTED["objects.json"]}
/// THZ3 layout ROM $49815, 80x16 blocks (2560x512 px), 1,280 runtime cells at the ROM row stride 80 (the array is padded to 4096 with the empty block $FE: UNRESOLVED RAM content).
function SCR_chaos_thz3_tile_ids() {{
    return [
{("," + NL).join(tile_lines)}
    ];
}}

/// Terrain-derived rings. Record: [index, canonical_x, canonical_y, block, cell_index (row * 80 + column), quadrant, source_class]
function SCR_chaos_thz3_terrain_rings() {{
    return [
{("," + NL).join(terrain_rows)}
    ];
}}

/// Raw type-$09 records, package order. Record: [object_index, canonical_x, canonical_y, parameter, ROM_offset, source_class]
function SCR_chaos_thz3_type09() {{
    return [
{("," + NL).join(type09_rows)}
    ];
}}

/// Canonical THZ3 object census: all 10 raw records in package order (the type $50 boss and its support objects are NOT instantiated by the loader).
/// Record: [object_index, canonical_x, canonical_y, type, flags, parameter, aux0, aux1, ROM_offset, source_class]
function SCR_chaos_thz3_objects() {{
    return [
{("," + NL).join(object_rows)}
    ];
}}

/// Loader $4E57 start words: RAM $D511 (x) and $D514 (y); field meanings are UNRESOLVED; values are raw, no offset.
function SCR_chaos_thz3_start() {{ return [{start["ram_d511"]},{start["ram_d514"]}]; }}
function SCR_chaos_thz3_map_width() {{ return {dims["width_cells"]}; }}
function SCR_chaos_thz3_width() {{ return {dims["width_pixels"]}; }}
function SCR_chaos_thz3_height() {{ return {dims["height_pixels"]}; }}
function SCR_chaos_thz3_layout_sha() {{ return "{layout["runtime_cells_sha256"]}"; }}
function SCR_chaos_thz3_terrain_hash() {{ return "{rings["hashes"]["terrain_coordinates_sha256"]}"; }}
function SCR_chaos_thz3_type09_hash() {{ return "{rings["hashes"]["object_09_coordinates_sha256"]}"; }}
function SCR_chaos_thz3_all_rings_hash() {{ return "{rings["hashes"]["all_rings_sha256"]}"; }}
'''
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_bytes(text.encode("utf-8"))
print(f"THZ3: {len(cells)} cells, {len(terrain_rows)} terrain, {len(type09_rows)} type-09, {len(object_rows)} objects -> {DEST}")
