"""Generate the single immutable THZ1 terrain-ring dataset from research JSON."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "sonic-chaos-reference-work/data/rom-cache/thz1/layout-interactions.json"
DEST = ROOT / "scripts/SCR_chaos_ring_data/SCR_chaos_ring_data.gml"
EXPECTED_SOURCE_SHA = "2cdec17b0eb0ea8cada58e442074ebb1b3641cde09dfb9c8e959ceacea335628"
STABLE_LAYOUT_SHA = "0d2bba656d1a2cbaf8d5545d47c1c42b40235b8f3f67f015e324c10ec92f719b"

raw = SOURCE.read_bytes()
assert hashlib.sha256(raw).hexdigest() == EXPECTED_SOURCE_SHA
rings = json.loads(raw)["rings"]
assert len(rings) == 142

records = []
for index, ring in enumerate(rings):
    x, y, block = ring["x"], ring["y"], ring["block_id"]
    assert x % 32 in (8, 24) and y % 32 in (8, 24)
    cell = (y // 32) * 128 + (x // 32)
    quadrant = (1 if x % 32 == 24 else 0) + (2 if y % 32 == 24 else 0)
    records.append(f"    [{index},{x},{y},${block:02X},{cell},{quadrant}]")

text = f'''/// GENERATED FILE - do not edit coordinates by hand.
/// Source: sonic-chaos-reference/data/rom-cache/thz1/layout-interactions.json
/// Source SHA-256: {EXPECTED_SOURCE_SHA}
/// Stable layout SHA-256: {STABLE_LAYOUT_SHA}
/// Record: [index, canonical_x, canonical_y, source_block, cell_index, quadrant]
function SCR_chaos_ring_data() {{
    return [
{",\n".join(records)}
    ];
}}

function SCR_chaos_ring_source_sha() {{ return "{EXPECTED_SOURCE_SHA}"; }}
function SCR_chaos_ring_layout_sha() {{ return "{STABLE_LAYOUT_SHA}"; }}
'''
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text(text)
print(f"generated {len(records)} canonical rings -> {DEST}")
