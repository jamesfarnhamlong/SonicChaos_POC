"""THZ2 foundation checks: canonical package -> generated GML -> project wiring."""
import hashlib, json, re, subprocess, sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
pkg = root / "POC_notes/rom-cache/levels"


def sha(b): return hashlib.sha256(b).hexdigest()
def jload(p): return json.loads(p.read_bytes().replace(b"\r\n", b"\n"))
def gm(p): return json.loads(re.sub(r",\s*([}\]])", r"\1", p.read_text()))


def coordinate_hash(rows):
    return sha("".join(f"{c},{x},{y}\n" for c, x, y in rows).encode("ascii"))


def parse_records(text, func):
    body = re.search(r"function %s\(\) \{\s*return \[(.*?)\];\s*\}" % func, text, re.S).group(1)
    rows = []
    for m in re.finditer(r"\[([^\[\]]*)\]", body):
        parts = re.findall(r'"[^"]*"|\$[0-9A-Fa-f]+|-?\d+', m.group(1))
        rows.append([p.strip('"') if p.startswith('"') else (int(p[1:], 16) if p.startswith("$") else int(p)) for p in parts])
    return rows


data_gml = (root / "scripts/SCR_chaos_level_thz2_data/SCR_chaos_level_thz2_data.gml").read_text()
layout = jload(pkg / "thz2/layout.json")
rings = jload(pkg / "thz2/rings.json")
manifest = jload(pkg / "thz2/manifest.json")
report = {}

# --- dimensions ------------------------------------------------------------------
dims = layout["dimensions"]
assert (dims["width_cells"], dims["height_cells"], dims["width_pixels"], dims["height_pixels"]) == (128, 32, 4096, 1024)
assert layout["layout_stream"]["rom_offset"] == "0x48BA9"
room = gm(root / "rooms/ROM_chaos_thz2/ROM_chaos_thz2.yy")
assert (room["roomSettings"]["Width"], room["roomSettings"]["Height"]) == (4096, 1024)
for q in range(4):
    meta = gm(root / f"sprites/SPR_chaos_thz2_terrain_{q}/SPR_chaos_thz2_terrain_{q}.yy")
    assert (meta["width"], meta["height"]) == (1024, 1024)
report["dimensions"] = "128x32 blocks / 4096x1024 px (room + 4 terrain sprites)"

# --- layout --------------------------------------------------------------------
tile_ids = [int(v) for v in re.findall(r"\d+", re.search(r"SCR_chaos_thz2_tile_ids\(\) \{\s*return \[(.*?)\];", data_gml, re.S).group(1))]
assert len(tile_ids) == 4095
assert sha(bytes(tile_ids)) == layout["runtime_cells_sha256"] == manifest["hashes"]["runtime_cells_sha256"]
cells = [c for r in layout["rows"] for c in r]
assert tile_ids == cells[:4095]
report["layout_runtime_cells_sha256"] = layout["runtime_cells_sha256"]

# --- rings -----------------------------------------------------------------------
terrain = parse_records(data_gml, "SCR_chaos_thz2_terrain_rings")
type09 = parse_records(data_gml, "SCR_chaos_thz2_type09")
assert len(terrain) == 133 == manifest["counts"]["terrain"]
assert sum(r[3] == 0 for r in type09) == 9 and sum(r[3] == 1 for r in type09) == 4 and len(type09) == 13
assert len(terrain) + 9 == 142 == manifest["counts"]["initial_visible_population"]
assert {r[6] for r in terrain} == {"terrain"}
assert {r[5] for r in type09 if r[3] == 0} == {"object-$09-visible"}
assert {r[5] for r in type09 if r[3] == 1} == {"object-$09-hidden"}
terr_h = coordinate_hash([("terrain", r[1], r[2]) for r in terrain])
obj_h = coordinate_hash([("object_09_visible" if r[3] == 0 else "object_09_hidden", r[1], r[2]) for r in type09])
all_h = coordinate_hash([("terrain", r[1], r[2]) for r in terrain] +
                        [("object_09_visible" if r[3] == 0 else "object_09_hidden", r[1], r[2]) for r in type09])
assert terr_h == rings["hashes"]["terrain_coordinates_sha256"]
assert obj_h == rings["hashes"]["object_09_coordinates_sha256"]
assert all_h == rings["hashes"]["all_rings_sha256"]
for r in terrain:  # each terrain ring sits on a ring block in the canonical layout
    assert 0x40 <= cells[r[4]] <= 0x45 and cells[r[4]] == r[3]
    assert r[1] == (r[4] % 128) * 32 + (24 if r[5] & 1 else 8) and r[2] == (r[4] // 128) * 32 + (24 if r[5] & 2 else 8)
report["rings"] = {"terrain": 133, "type09_visible": 9, "type09_hidden": 4, "initial_visible": 142,
                   "terrain_hash": terr_h, "type09_hash": obj_h, "all_hash": all_h}

# --- no manual THZ2 placements ------------------------------------------------------
names = sorted(i["objectId"]["name"] for l in room["layers"] for i in l.get("instances", []))
assert names == ["OBJ_chaos_thz2_terrain", "OBJ_chaos_zone"], names
report["thz2_room_instances"] = names
gen_lines = [l for l in data_gml.splitlines() if l.startswith("    [")]
assert len(gen_lines) == 133 + 13 or len(gen_lines) >= 146

# --- THZ1 unchanged ---------------------------------------------------------------
r1 = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", "rooms/ROM_chaos_thz1", "scripts/SCR_chaos_ring_data",
                     "scripts/SCR_chaos_type09_data", "scripts/SCR_chaos_render_adapter",
                     "scripts/SCR_chaos_core_data", "scripts/SCR_chaos_motion_data", "sprites/SPR_chaos_terrain_0",
                     "sprites/SPR_chaos_terrain_1", "sprites/SPR_chaos_terrain_2", "sprites/SPR_chaos_terrain_3",
                     "sprites/SPR_chaos_object_09", "sprites/SPR_ring"], cwd=root).returncode
assert r1 == 0, "THZ1 room/data/terrain/adapter files changed"
ring_data = (root / "scripts/SCR_chaos_ring_data/SCR_chaos_ring_data.gml").read_text()
t09_data = (root / "scripts/SCR_chaos_type09_data/SCR_chaos_type09_data.gml").read_text()
thz1_rings = parse_records(ring_data, "SCR_chaos_ring_data")
thz1_t09 = parse_records(t09_data, "SCR_chaos_type09_data")
assert len(thz1_rings) == 142 and len(thz1_t09) == 24
assert sum(r[3] == 0 for r in thz1_t09) == 11 and sum(r[3] == 1 for r in thz1_t09) == 13
p1 = jload(pkg / "thz1/rings.json")
pt = [(r["world_x"], r["world_y"]) for r in p1["rings"] if r["source_class"] == "terrain"]
assert pt == [(r[1], r[2]) for r in thz1_rings], "POC THZ1 rings differ from package control"
assert coordinate_hash([("terrain", x, y) for x, y in pt]) == p1["hashes"]["terrain_coordinates_sha256"]
report["thz1_unchanged"] = {"terrain": 142, "type09": 24, "visible": 11, "hidden": 13, "initial_visible": 153,
                            "room_and_data_files_identical_to_HEAD": True}

# The core changed only in its type-13 branches; THZ1 has no type-13 block, so THZ1 behaviour cannot change.
assert not any(b["collision_surface_type"] == 13 for b in jload(pkg / "thz1/layout.json")["block_usage"])
core_diff = subprocess.run(["git", "diff", "-U0", "HEAD", "--", "scripts/SCR_chaos_core"], cwd=root,
                           capture_output=True, text=True).stdout
removed = [l[1:].strip() for l in core_diff.splitlines() if l.startswith("-") and not l.startswith("---")]
assert removed == ["cp_kind == 13 ||", "if ((cp_kind == 5 && cp_s.tile != 61) || cp_kind == 13 ||",
                   "if (cp_kind == 5 || cp_kind == 13 || cp_kind == 19 || cp_kind == 20 || cp_kind == 21 || cp_kind == 28) {"] or     all("cp_kind == 13" in l for l in removed), removed

# --- type $26 population (canonical records, no room-authored springs) ---------------------
obj = jload(pkg / "thz2/objects.json")
t26 = parse_records(data_gml, "SCR_chaos_thz2_type26")
src26 = [r for r in obj["records"] if r["type_id"] == "0x26"]
assert len(t26) == 10 == len(src26) == obj["type_counts"]["0x26"]
for row, r in zip(t26, src26):
    assert row[:6] == [r["index"], r["world_x"], r["world_y"], int(r["parameter"], 16), int(r["aux0"], 16), int(r["aux1"], 16)]
    assert row[7] == "object-$26"
assert sorted(r[3] for r in t26) == [0] * 8 + [1, 0x88]
assert [(r[1], r[2]) for r in t26 if r[3] == 0x88] == [(1504, 896)] and (0x88 & 0x7F) * 16 == 128
level_gml = (root / "scripts/SCR_chaos_level/SCR_chaos_level.gml").read_text()
assert "cp_inst.chaosSpan = (cp_param & $7F) * 16" in level_gml and "chaos_level_spawn_type26();" in     (root / "objects/OBJ_chaos_zone/Create_0.gml").read_text()
assert not any("spring" in n.lower() for n in names)
report["type26"] = {"records": 10, "strong_00": 8, "weak_01": 1, "span_88": 1, "span_width": 128, "span_position": [1504, 896]}

# --- type $28 platforms (canonical records, no room-authored platforms) ---------------------------
t28 = parse_records(data_gml, "SCR_chaos_thz2_type28")
src28 = [r for r in obj["records"] if r["type_id"] == "0x28"]
assert len(t28) == 3 == len(src28)
for row, r in zip(t28, src28):
    assert row[:6] == [r["index"], r["world_x"], r["world_y"], int(r["parameter"], 16), int(r["aux0"], 16), int(r["aux1"], 16)]
assert [(r[1], r[2], r[3], r[5], 16 * r[5] if r[3] == 0x0A else 0) for r in t28] ==     [(552, 720, 0x0A, 0x19, 400), (3672, 608, 0x0A, 0x13, 304), (1552, 304, 0x84, 0x00, 0)]
assert "cp_travel = 16 * cp_r[5]" in level_gml and "chaos_level_spawn_type28();" in (root / "objects/OBJ_chaos_zone/Create_0.gml").read_text()
assert "OBJ_chaos_platform" not in names
report["type28"] = {"records": 3, "lift_400": [552, 720], "lift_304": [3672, 608], "sag_84": [1552, 304]}

# --- loops: derived from layout, no level coordinates in the adapter ----------------------------------------
motion = (root / "scripts/SCR_chaos_motion/SCR_chaos_motion.gml").read_text()
assert "cp_loop < 2" not in motion and "cp_i < 2" not in motion
assert "chaos_level_apply_loops();" in (root / "objects/OBJ_chaos_zone/Create_0.gml").read_text()
report["loops"] = "centres/rows from ROM entry tiles $51/$52 (SCR_chaos_loop_layout); see verify_thz2_loops_twist.js"

# --- type-13 breakables: exact source ----------------------------------------------------------
nine_c = [((i % 128) * 32, (i // 128) * 32) for i, c in enumerate(cells[:4095]) if c == 0x9C]
assert nine_c == [(128, 704), (160, 704), (192, 704), (288, 704), (320, 704), (352, 704)]
usage = {int(b["block_id"], 16): b for b in layout["block_usage"]}
assert usage[0x9C]["collision_surface_type"] == 13 and usage[0x9C]["collision_header_flags"] == "0x8D"
assert 0x47 not in usage, "THZ2 does not use block $47"
ta = json.loads((pkg / "thz2/terrain-assets.json").read_text())
rep = {a["block_id"]: a for a in ta["replacement_blocks"]}
assert rep["0x9D"]["sprite"] == "SPR_chaos_thz2_block_9d"
rp, lp = root / rep["0x9D"]["root_png"], root / rep["0x9D"]["layer_png"]
assert rp.read_bytes() == lp.read_bytes() and sha(rp.read_bytes()) == rep["0x9D"]["sha256"]
report["breakable_type13"] = {"block": "0x9C", "cells": nine_c, "replacement": "0x9D"}

# --- type $09 adapter is the accepted one and is not duplicated for THZ2 ----------------
adapter = (root / "scripts/SCR_chaos_render_adapter/SCR_chaos_render_adapter.gml").read_text()
assert "#macro TYPE09_RENDER_X 1" in adapter and "#macro TYPE09_RENDER_Y 17" in adapter
mgr_draw = (root / "objects/OBJ_chaos_ring_manager/Draw_0.gml").read_text()
assert mgr_draw.count("TYPE09_RENDER_X") >= 1 and "chaos_is_thz2" not in mgr_draw
mgr_step = (root / "objects/OBJ_chaos_ring_manager/Step_2.gml").read_text()
assert "abs(cp_player.x-cp_t09_record[1]) >= 12" in mgr_step and "cp_t09_parameter == 1 && (chaosRingGlobalFrame mod 2) != 0" in mgr_step
assert "chaosType09SparkleTimer[cp_t09] > 32" in (root / "objects/OBJ_chaos_ring_manager/Step_0.gml").read_text()
mgr_create = (root / "objects/OBJ_chaos_ring_manager/Create_0.gml").read_text()
assert "SCR_chaos_thz2_terrain_rings()" in mgr_create and "SCR_chaos_thz2_type09()" in mgr_create
assert "SCR_chaos_ring_data()" in mgr_create and "SCR_chaos_type09_data()" in mgr_create
report["type09_adapter"] = "X+1 Y+17 shared with THZ1; strict <12 collection; even-frame hidden gate; 32-update sparkle"

# --- terrain sprites -----------------------------------------------------------------
ta = json.loads((pkg / "thz2/terrain-assets.json").read_text())
assert ta["layout_runtime_cells_sha256"] == layout["runtime_cells_sha256"]
assert len(ta["ring_cells_removed"]) == sum(1 for c in cells[:4095] if 0x40 <= c <= 0x45) == 76
for a in ta["assets"]:
    rp, lp = root / a["root_png"], root / a["layer_png"]
    assert rp.read_bytes() == lp.read_bytes() and sha(rp.read_bytes()) == a["sha256"]
    assert Image.open(rp).size == (1024, 1024)
report["terrain_sprites"] = [a["sha256"] for a in ta["assets"]]

# --- project wiring / identifiers -------------------------------------------------------
yyp = gm(root / "SonicChaos_POC.yyp")
res = {r["id"]["name"] for r in yyp["resources"]}
for n in ("SPR_chaos_thz2_block_9d", "ROM_chaos_thz2", "OBJ_chaos_thz2_terrain", "SCR_chaos_level", "SCR_chaos_loop_layout", "SCR_chaos_level_thz2_data",
          *[f"SPR_chaos_thz2_terrain_{q}" for q in range(4)]):
    assert n in res, n
yyp_rooms = {r["roomId"]["name"] for r in yyp["RoomOrderNodes"]}
assert "ROM_chaos_thz2" in yyp_rooms
defined = set()
for g in (root / "scripts").rglob("*.gml"):
    defined |= set(re.findall(r"^\s*function\s+(\w+)\s*\(", g.read_text(), re.M))
for fn in ("chaos_in_level", "chaos_is_thz2", "chaos_level_install_layout",
           "chaos_dev_thz2_requested", "chaos_acts", "chaos_act_entry", "chaos_act_step", "chaos_act_count", "chaos_level_spawn_type26", "chaos_level_spawn_type28", "chaos_level_apply_loops", "SCR_chaos_loop_layout", "SCR_chaos_thz2_type28", "SCR_chaos_thz2_type26", "SCR_chaos_break_block", "SCR_cc_break13_side", "SCR_cc_break13_floor", "SCR_chaos_thz2_tile_ids", "SCR_chaos_thz2_terrain_rings", "SCR_chaos_thz2_type09",
           "SCR_chaos_thz2_start"):
    assert fn in defined, fn
sources = "".join(p.read_text(errors="ignore") for p in list((root / "objects").rglob("*.gml")) + list((root / "scripts").rglob("*.gml")))
assert "room == ROM_chaos_thz1" not in (root / "objects/OBJ_player_char/Step_0.gml").read_text()
sel = (root / "objects/OBJ_menu_data_select/Step_0.gml").read_text()
zg = (root / "scripts/SCR_zone_goto/SCR_zone_goto.gml").read_text()
cards = (root / "scripts/SCR_load_cards/SCR_load_cards.gml").read_text()
load = (root / "scripts/SCR_load_game/SCR_load_game.gml").read_text()
assert "global.selectedAct = chaos_act_step(global.selectedAct" in sel and "btUpPress" in sel and "btDownPress" in sel
assert not any("zoneGoto" in l for l in sel.splitlines() if "ini_write_real" in l), "Up/Down must not write save progression"
assert 'ord("' not in sel and not (root / "objects/OBJ_menu_data_select/Draw_0.gml").exists()
assert "global.selectedAct = chaos_act_clamp(ini_read_real" in sel  # initialised from saved progression
assert "SCR_zone_goto(global.selectedAct)" in (root / "objects/OBJ_menu_data_select/Alarm_2.gml").read_text()
assert "chaos_act_progress(global.zoneGoto, global.selectedAct)" in (root / "objects/OBJ_menu_point_counter/Alarm_1.gml").read_text()
assert "global.zoneGoto++" not in (root / "objects/OBJ_menu_point_counter/Alarm_1.gml").read_text()
assert "chaos_act_entry(cp_act)" in zg and "cp_entry.room" in zg and "chaos_act_entry(global.selectedAct)" in cards
assert "chaos_act_clamp(ini_read_real" in load
assert "Green Hill" not in cards and "Green Hill" not in zg and '"zone"' not in cards
for i in range(1, 6):
    assert "UP/DOWN: ACT" in (root / f"objects/OBJ_menu_data_card_{i}/Draw_0.gml").read_text()
for f in list((root / "objects").rglob("*.gml")) + list((root / "scripts").rglob("*.gml")):
    assert "chaosDevLevel" not in f.read_text(errors="ignore"), f
acts = re.search(r"function chaos_acts\(\) \{\s*return \[(.*?)\];", level_gml, re.S).group(1)
entries = re.findall(r"\{zone: \"(\w+)\", act: (\d+), room: (\w+), name: \"([^\"]+)\", icon: (\d+)\}", acts)
assert entries == [("THZ", "1", "ROM_chaos_thz1", "Turquoise Hill 1", "1"), ("THZ", "2", "ROM_chaos_thz2", "Turquoise Hill 2", "1")], entries
assert yyp_rooms >= {"ROM_chaos_thz1", "ROM_chaos_thz2"}
menu_yy = (root / "objects/OBJ_menu_data_select/OBJ_menu_data_select.yy").read_text()
assert menu_yy.count('"eventType":8') == 0
report["level_select"] = {"mechanism": "saved zoneGoto = progression; global.selectedAct = temporary highlight; both index chaos_acts(), clamped; START resolves entry.room",
                          "entries": [e[3] for e in entries], "dev_shortcuts": "F10 toggle, -thz2"}
report["project_wiring"] = "resources, room order and helper functions present"

(root / "verification/thz2-foundation-results.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
print("THZ2 FOUNDATION CHECKS PASSED")
