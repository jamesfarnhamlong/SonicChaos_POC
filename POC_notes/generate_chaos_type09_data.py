"""Generate immutable THZ1 type-$09 records from the canonical research cache."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "sonic-chaos-reference-work/data/rom-cache/thz1/object-09.json"
DEST = ROOT / "scripts/SCR_chaos_type09_data/SCR_chaos_type09_data.gml"
EXPECTED_SOURCE_SHA = "827b11bedfc0e4a8dfe3039288ace6db8cf5ddf8fb969e0b61ffaba82a1acdb3"

raw = SOURCE.read_bytes()
assert hashlib.sha256(raw).hexdigest() == EXPECTED_SOURCE_SHA
source = json.loads(raw)
placements = source["placements"]
assert source["raw_record_count"] == 24 and len(placements) == 24
assert sum(row["parameter"] == "0x00" for row in placements) == 11
assert sum(row["parameter"] == "0x01" for row in placements) == 13

records = []
for row in placements:
    parameter = int(row["parameter"], 16)
    rom_offset = int(row["rom_offset"], 16)
    records.append(
        f'    [{row["index"]},{row["world_x"]},{row["world_y"]},'
        f'${parameter:02X},${rom_offset:05X}]'
    )

text = f'''/// GENERATED FILE - do not edit coordinates by hand.
/// Source: sonic-chaos-reference/data/rom-cache/thz1/object-09.json
/// Source SHA-256: {EXPECTED_SOURCE_SHA}
/// Record: [placement_index, canonical_x, canonical_y, parameter, ROM_offset]
function SCR_chaos_type09_data() {{
    return [
{",\n".join(records)}
    ];
}}

function SCR_chaos_type09_source_sha() {{ return "{EXPECTED_SOURCE_SHA}"; }}
'''
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text(text)
print(f"generated {len(records)} canonical type-$09 records -> {DEST}")
