"""Extract the ROM's 32x32 placement spawn map (bank $1C CPU $8146, ROM $70146) as ground-truth data.
Usage: python verification/make_placement_fixtures.py ROM"""
import hashlib, json, sys
from pathlib import Path
rom = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(rom).hexdigest() == "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
table = list(rom[0x70146:0x70146 + 1024])
out = {"rom_sha256": hashlib.sha256(rom).hexdigest(), "rom_offset": "0x70146", "cell_pixels": 16, "origin_relative_to_camera": -128,
       "table_sha256": hashlib.sha256(bytes(table)).hexdigest(), "table": table,
       "rule": "cell 3 never; cell 2 always; cells 0/1 only during the initial fill ($D440 == 0); lifetime $61E1: cell 3 off-range, 2 asleep, 0/1 awake"}
Path(__file__).with_name("placement-spawn-map.json").write_text(json.dumps(out) + "\n")
print(out["table_sha256"])
