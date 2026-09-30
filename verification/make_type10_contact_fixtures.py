"""Generate ROM ground truth for the type-$10 contact classification and projection.

Runs the original overlap routine $6328 and the solid-object helper $5FA0 in the reference Oracle (a Z80 routine
harness) over a grid of player/object offsets. Usage (Python 3.10+ with z80==1.2.0):
    python verification/make_type10_contact_fixtures.py ROM REFERENCE_TOOLS_DIR
"""
import json, sys
from pathlib import Path

rom_path, tools = Path(sys.argv[1]), Path(sys.argv[2])
sys.path.insert(0, str(tools))
from rom import load
from oracle import Oracle

rom = load(rom_path)
OX, OY = 500, 500


def fresh(px, py, cam=None):
    o = Oracle(rom)
    o.bank(2, 0x0C)
    o.mem[0xD12B] = 0x0C
    o.cpu.ix = 0xD700
    o.mem[0xD700] = 0x10
    o.mem[0xD703] = 0x80           # object contact enabled (set by the type-$10 initializer)
    o.word(0xD711, OX); o.word(0xD714, OY)
    o.mem[0xD72C] = 10; o.mem[0xD72D] = 24
    o.word(0xD511, px); o.word(0xD514, py)
    o.mem[0xD52C] = 9; o.mem[0xD52D] = 18
    o.mem[0xD503] = 0; o.mem[0xD523] = 0
    o.word(0xD174, cam if cam is not None else max(0, px - 100))
    return o


grid = []
for dx in range(-26, 27):
    for dy in range(-30, 25):
        o = fresh(OX + dx, OY + dy)
        o.call(0x6328)
        grid.append([dx, dy, o.mem[0xD721] & 15])

projection = []
for dx, dy in ((0, -5), (0, 8), (2, -8), (-3, -8), (17, -8), (-17, -8), (5, 12), (-5, 12), (0, -20), (18, 0), (-18, 0), (16, 16)):
    o = fresh(OX + dx, OY + dy)
    o.call(0x5FA0)
    projection.append({"dx": dx, "dy": dy, "bits": o.mem[0xD721] & 15, "player_x": o.word(0xD511), "player_y": o.word(0xD514)})
out = {"rom_sha256": "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607",
       "object": [OX, OY], "player_extents": [9, 18], "object_extents": [10, 24],
       "grid_dx_range": [-26, 26], "grid_dy_range": [-30, 24], "grid": grid, "projection": projection,
       "bit_meaning": {"1": "player above (top)", "2": "player below (bottom)", "4": "player right of object", "8": "player left of object"}}
Path(__file__).with_name("type10-contact-fixtures.json").write_text(json.dumps(out) + "\n")
print(len(grid), "grid cases;", {b: sum(1 for g in grid if g[2] == b) for b in (0, 1, 2, 4, 8)})
