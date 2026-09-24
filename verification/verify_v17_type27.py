"""Verify the bounded type-$27 handler contract used by POC 17.

Usage: python verify_v17_type27.py path/to/SonicChaos.sms
The original ROM handlers run in the same Z80 harness used by the reference
project. No ROM data is written to the report or source archive.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT.parent / "sonic-chaos-reference-main" / "tools"
sys.path[:0] = [str(ROOT / "verification" / ".deps"), str(REFERENCE)]

from oracle import Oracle

rom = Path(sys.argv[1]).read_bytes()


def object_27():
    oracle = Oracle(rom)
    oracle.bank(2, 30)
    oracle.cpu.ix = 0xD540
    oracle.word(0xD551, 1000)
    oracle.word(0xD554, 500)
    oracle.word(0xD511, 2000)
    oracle.word(0xD514, 900)
    return oracle


# State-zero callback $898E: ordinary parameter zero selects state 1 and -2.5 X.
o = object_27()
o.mem[0xD57F] = 0
o.call(0x898E)
initial = {
    "state": o.mem[0xD542],
    "vx_8_8": o.word(0xD556),
    "vy_8_8": o.word(0xD558),
}
assert initial == {"state": 1, "vx_8_8": 0xFD80, "vy_8_8": 0}

# $89CB is the state-two entry shared by the proximity branch and nonzero mode.
o = object_27()
o.call(0x89CB)
state_two = {
    "state": o.mem[0xD542],
    "vx_8_8": o.word(0xD556),
    "vy_8_8": o.word(0xD558),
    "counter": o.mem[0xD55E],
    "flag": o.mem[0xD55F],
}
assert state_two == {
    "state": 2, "vx_8_8": 0, "vy_8_8": 0,
    "counter": 0x80, "flag": 1,
}

acceleration = []
for handler, expected_vy in ((0x89DF, 0x0003), (0x89F3, 0xFFFD)):
    o = object_27()
    o.mem[0xD55E] = 0x80
    o.call(handler)
    row = {
        "handler": f"0x{handler:04X}",
        "vy_8_8": o.word(0xD558),
        "counter": o.mem[0xD55E],
    }
    assert row["vy_8_8"] == expected_vy
    assert row["counter"] == 0x7F
    acceleration.append(row)

# Counter zero underflows on one final update, requests state 3 and restores -2.5 X.
o = object_27()
o.mem[0xD542] = 2
o.mem[0xD55E] = 0
o.call(0x89DF)
underflow = {
    "state": o.mem[0xD542],
    "vx_8_8": o.word(0xD556),
    "vy_8_8": o.word(0xD558),
}
assert underflow == {"state": 3, "vx_8_8": 0xFD80, "vy_8_8": 0}

distance = []
for delta, removed in ((383, False), (384, True), (-383, False), (-384, True)):
    o = object_27()
    o.word(0xD511, 1000 + delta)
    o.word(0xD556, 0xFD80)
    o.call(0x8A29)
    actual = o.mem[0xD540] == 0xFE
    assert actual == removed
    distance.append({"delta": delta, "removed": actual})

source = (ROOT / "objects/OBJ_chaos_object_27/Step_0.gml").read_text()
for required in ("chaosVX = -$0280", "abs(floor(x)-floor(cp_p.x)) < 64",
                 "chaosCounter = $80", "chaosOscTick <= 32",
                 "chaosOscTick >= 97", "abs(floor(x)-floor(cp_p.x)) >= 384"):
    assert required in source, required

report = {
    "initial": initial,
    "state_two_entry": state_two,
    "acceleration_callbacks": acceleration,
    "counter_underflow": underflow,
    "distance_boundaries": distance,
    "gml_contract_checked": True,
    "limitation": "Selected original callbacks and static GML contract; not full scheduler or GameMaker runtime",
}
(ROOT / "verification/type27-results.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
print(json.dumps(report, indent=2))
