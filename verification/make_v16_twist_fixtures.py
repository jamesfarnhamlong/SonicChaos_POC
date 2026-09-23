"""Generate POC 16 twist fixtures by executing the original ROM."""
import json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(sys.argv[2]).resolve() / "tools"))
from rom import load, s16, SHA256
from oracle import Oracle

rom = load(sys.argv[1])

def put24(o, address, value):
    o.mem[address:address+3] = (value & 0xffffff).to_bytes(3, "little")

def snapshot(o):
    return {
        "xu": int.from_bytes(o.mem[0xd510:0xd513], "little"),
        "yu": int.from_bytes(o.mem[0xd513:0xd516], "little"),
        "vx": s16(o.word(0xd516)), "vy": s16(o.word(0xd518)),
        "angle": o.mem[0xd50a], "magnitude": o.mem[0xd50b],
        "twist_variant": o.mem[0xd538], "next": o.mem[0xd502],
    }

handlers = [[int.from_bytes(rom[0x314fd+v*56+i*2:0x314ff+v*56+i*2], "little")
             for i in range(28)] for v in range(4)]
dispatch = []
for variant, row in enumerate(handlers):
    for index, handler in enumerate(row):
        initial = {
            "xu": ((0x1200 + index*37 + variant*13) << 8) + (17+index*7)%256,
            "yu": ((0x0360 + index*11 + variant*19) << 8) + (91+index*5)%256,
            "angle": (index*29+variant*41)&255,
            "magnitude": [8,15,16,79,159,160,254][(index+variant)%7],
            "twist_variant": variant, "next": 5,
        }
        o = Oracle(rom); o.bank(2, 12)
        put24(o, 0xd510, initial["xu"]); put24(o, 0xd513, initial["yu"])
        o.mem[0xd50a] = initial["angle"]; o.mem[0xd50b] = initial["magnitude"]
        o.mem[0xd538] = variant
        o.call(handler); o.call(0x6089); o.call(0x60fb)
        dispatch.append({"variant":variant, "tile":0x58+index, "handler":handler,
                         "initial":initial, "expected":snapshot(o)})

entry = []
for level in (0,3):
    for tile in (0x58,0x59,0x5c,0x6b,0x72,0x73,0x74):
        for state in (1,5,6,9,16,26,34):
            for vx in (-1280,-769,-768,-767,-1,0,767,768,769,1279,1280):
                o = Oracle(rom)
                o.mem[0xd36b] = tile; o.mem[0xd297] = level
                o.mem[0xd501] = state; o.mem[0xd502] = state; o.word(0xd516, vx)
                o.mem[0xd50a] = 13; o.mem[0xd50b] = 29; o.mem[0xd538] = 3
                o.call(0x6e56)
                expected = snapshot(o)
                expected = {k:expected[k] for k in ("vx","angle","magnitude","twist_variant","next")}
                entry.append({"initial":{"level":level,"tile":tile,"state":state,"next":state,
                    "vx":vx,"angle":13,"magnitude":29,"twist_variant":3},
                    "expected":expected})

out = {"rom_sha256":SHA256, "dispatch":dispatch, "entry":entry}
(HERE / "twist-fixtures.json").write_text(json.dumps(out,separators=(",",":")))
print(f"Generated {len(dispatch)} dispatch and {len(entry)} entry fixtures")
