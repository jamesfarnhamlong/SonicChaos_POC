"""Mirror the Research player +$07 animation-counter cache into the POC and generate the shadow-counter program table.
Usage: python verification/make_anim_counter_data.py [path-to-research player-animation-counter.json]
Writes POC_notes/rom-cache/player-animation-counter.json (trimmed mirror) and scripts/SCR_chaos_anim_counter_data/SCR_chaos_anim_counter_data.gml."""
import hashlib, json, sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
src = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / "sonic-chaos-reference-work" / "data" / "rom-cache" / "player-animation-counter.json"
raw = src.read_bytes()
d = json.loads(raw)
sha = hashlib.sha256(raw).hexdigest()

# Research lists the state-$0B FF 08 d448 path (CPU $8189: record 4, repeating) only through the fixtures 'spring_ascent_d448' / state_0b_fixture;
# the op listing ends at $8187. Completed here from that fixture + the document ("4 forever"); flagged in the mirror.
schedules = {}
for k, v in d["schedules"].items():
    prog = list(v["program"])
    if k == "0x0B":
        prog += [{"at": "0x8189", "record": 4, "completed_from": "fixture spring_ascent_d448 + docs/player-animation-counter.md section 5"},
                 {"at": "0x818D", "cmd": "FF 07", "args": "8981", "completed_from": "same"}]
    schedules[k] = prog

mirror = {"source": "sonic-chaos-reference-work data/rom-cache/player-animation-counter.json @ 90b4b05", "source_sha256": sha, "rom_sha256": d["rom_sha256"],
          "trimmed": "routines, plus07_sites and the long RLE/first-60 tables are omitted; programs, selectors, fixtures and the eligible list are kept",
          "selectors": d["selectors"], "update_order": d["update_order"], "eligible_states": d["eligible_states_static"],
          "programs": schedules, "first_40": {k: v["first_40_counter_values_by_input_set"] for k, v in d["schedules"].items()},
          "transition_fixtures": d["transition_fixtures"], "direct_write_fixtures": d["direct_write_fixtures"], "selector_sweep": d["selector_sweep"],
          "differential_fixture": d["differential_fixture"], "emulated_play": d["emulated_play"], "unresolved": d["unresolved"],
          "state_0b_fixture": d["state_0b_fixture"], "d448_audit": d["d448_audit"],
          "poc_completion_note": "The op listing of state $0B ends at $8187; the d448-set path ($8189: record 4 repeating) is completed from state_0b_fixture / docs. d448 only changes WHICH even durations load, never the parity; the POC supplies d448 = 0 and is therefore parity-faithful (not value-exact) for the terrain-ring consumer."}
(root / "POC_notes/rom-cache/player-animation-counter.json").write_text(json.dumps(mirror, indent=1) + "\n")

SEL = {0x8EE1: 1, 0x8F45: 2, 0x8F76: 3, 0x9138: 4, 0x900B: 5}
lines = ["/// GENERATED FILE - do not edit by hand (verification/make_anim_counter_data.py).",
         "/// Source: sonic-chaos-reference-work/data/rom-cache/player-animation-counter.json  SHA-256: " + sha,
         "/// Shadow of the player animation engine's TIMING only (+$07). Op = [kind, a, b]:",
         "///   0 record (a = duration)   1 FF 00 restart   2 FF 03 (a = requested state)   3 FF 05 (a = selector id 1..5)   4 FF 07 (a = target op index)",
         "///   5 FF 08 (a = alt op index, b = 1 when the carry is the d448 bit, 0 when the carry path is taken)   6 FF 0E (a = loop count)",
         "///   7 FF 0F (a = target op index)   8 no effect on the counter",
         "/// Selector ids: 1 = $8EE1 walk, 2 = $8F45 run, 3 = $8F76 roll/jump family, 4 = $9138, 5 = $900B.",
         "function SCR_chaos_anim_programs() {", "    var cp_p = array_create(31, 0);"]
for k, prog in sorted(schedules.items(), key=lambda kv: int(kv[0], 16)):
    st = int(k, 16)
    at = {int(op["at"], 16): i for i, op in enumerate(prog)}
    ops = []
    for op in prog:
        c = op.get("cmd")
        if c is None: ops.append("[0,%d,0]" % op["record"])
        elif c == "FF 00": ops.append("[1,0,0]")
        elif c == "FF 03": ops.append("[2,%d,0]" % int(op["args"], 16))
        elif c == "FF 05": ops.append("[3,%d,0]" % SEL[int(op["selector"], 16)])
        elif c == "FF 07": a = op["args"]; ops.append("[4,%d,0]" % at[int(a[2:4] + a[0:2], 16)])
        elif c == "FF 08": ops.append("[5,%d,%d]" % (at[int(op["target_if_carry"], 16)], 1 if st == 0x0B else 0))
        elif c == "FF 0E": ops.append("[6,%d,0]" % int(op["args"], 16))
        elif c == "FF 0F": ops.append("[7,%d,0]" % at[int(op["target"], 16)])
        else: ops.append("[8,0,0]")
    lines.append("    cp_p[%d] = [%s];" % (st, ",".join(ops)))
lines += ["    return cp_p;", "}",
          "/// Selector tables $8F2C (walk) and $8FE0 (roll/jump family, floor); indexed by |X speed high byte| (capped at 15; larger speeds are not reachable).",
          "function SCR_chaos_anim_selector_tables() {",
          "    return [%s, %s];" % (d["selectors"]["selector_8ee1_walk_state_05"]["table"], d["selectors"]["selector_8f76_states_09_0A_10_1B"]["table"]), "}",
          "/// Ring-probing player states (dynamic_eligibility, 26 states).",
          "function SCR_chaos_anim_probe_states() {", "    return %s;" % [int(s, 16) for s in d["eligible_states_static"]], "}", ""]
out = root / "scripts/SCR_chaos_anim_counter_data"
out.mkdir(exist_ok=True)
(out / "SCR_chaos_anim_counter_data.gml").write_text("\n".join(lines))
yy = (root / "scripts/SCR_chaos_goal/SCR_chaos_goal.yy").read_text().replace("SCR_chaos_goal", "SCR_chaos_anim_counter_data")
(out / "SCR_chaos_anim_counter_data.yy").write_text(yy)
print("ok", sha)

# ---- terrain-ring collection cache (trimmed mirror) ----
tsrc = src.parent / "terrain-ring-collection.json"
traw = tsrc.read_bytes(); t = json.loads(traw)
tm = {"source": "sonic-chaos-reference-work data/rom-cache/terrain-ring-collection.json @ 90b4b05", "source_sha256": hashlib.sha256(traw).hexdigest(), "rom_sha256": t["rom_sha256"],
      "trimmed": "routines, probe_callers, state_reach, timer/emulated tables omitted; the model, fixtures and tables the POC uses are kept (probing states: see player-animation-counter.json eligible_states)",
      "model": t["model"], "quadrant_tables": t["quadrant_tables"], "act_rings": t["act_rings"], "probe_coordinate_fixture": t["probe_coordinate_fixture"],
      "collection_fixture": t["collection_fixture"], "region_fixture": t["region_fixture"], "direction_fixture": t["direction_fixture"],
      "effects_fixture": t["effects_fixture"], "header_types": t["header_types"], "unresolved": t["unresolved"]}
(root / "POC_notes/rom-cache/terrain-ring-collection.json").write_text(json.dumps(tm, indent=1) + "\n")
print("terrain ok")
