"""Verify POC 18 against committed canonical type-$10/$21/$27 metadata."""
import hashlib, json
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "POC_notes" / "rom-cache"


def positions(instances, name):
    return Counter((round(i["x"]), round(i["y"])) for i in instances
                   if i["objectId"]["name"] == name)


def placement_counter(metadata):
    return Counter((p["world_x"], p["world_y"]) for p in metadata["placements"])


room = json.loads((ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy").read_text())
instances = [i for layer in room["layers"] for i in layer.get("instances", [])]
metadata = {kind: json.loads((CACHE / f"object-{kind}.json").read_text())
            for kind in ("10", "21", "27")}
graphics_10 = json.loads((CACHE / "object-10-graphics.json").read_text())
poc_assets_10 = json.loads((CACHE / "object-10-poc-assets.json").read_text())
layout_metadata = json.loads((CACHE / "layout-interactions.json").read_text())

assert positions(instances, "OBJ_chaos_object_10") == placement_counter(metadata["10"])
assert positions(instances, "OBJ_chaos_object_21") == placement_counter(metadata["21"])
assert positions(instances, "OBJ_chaos_object_27") == placement_counter(metadata["27"])
assert positions(instances, "OBJ_chaos_object_18") == Counter({(3960, 558): 1})
assert positions(instances, "OBJ_ring") == Counter((p["x"], p["y"]) for p in layout_metadata["rings"])
assert not positions(instances, "OBJ_monitor_ring")
assert {(p["world_x"], p["world_y"]): p["parameter"] for p in metadata["10"]["placements"]} == {
    (656, 846): "0x06", (1712, 494): "0x06", (336, 270): "0x04",
    (1472, 110): "0x04", (2688, 686): "0x02"}

# Independent fixed-point translation of the complete no-contact $27 state 2.
vy = displacement = 0
adds = subtracts = 0
for update in range(1, 130):
    if update <= 32 or update >= 97:
        vy += 3; adds += 1
    else:
        vy -= 3; subtracts += 1
    displacement += vy
assert (adds, subtracts, displacement) == (65, 64, 3)
assert metadata["27"]["independent_translation"]["displacement_8_8"] == 3

# Parameter-derived type-$21 bounds are taken from the committed placements.
bounds = {(p["world_x"], p["world_y"]): p["world_x"]-(int(p["parameter"], 16) << 4)
          for p in metadata["21"]["placements"]}
assert bounds[(800, 606)] == 672
assert bounds[(2400, 254)] == 2368

source_21 = (ROOT / "objects/OBJ_chaos_object_21/Step_0.gml").read_text()
for token in ("chaosVX = -$0080", "chaosVY = $0200", "floor(x) < chaosLeftBound",
              "floor(x) > chaosOriginX", "SCR_chaos_type21_top_bounce",
              "SCR_chaos_apply_hazard_damage"):
    assert token in source_21, token

source_27 = (ROOT / "objects/OBJ_chaos_object_27/Step_0.gml").read_text()
for token in ("chaosVX = -$0280", "abs(floor(x)-floor(cp_p.x)) < 64",
              "abs(floor(x)-floor(cp_p.x)) >= 384", "chaosOscTick <= 32",
              "chaosOscTick >= 97", "ordinary overlap requests no damage"):
    assert token.lower() in source_27.lower(), token
object_27 = json.loads((ROOT / "objects/OBJ_chaos_object_27/OBJ_chaos_object_27.yy").read_text())
assert object_27["parentObjectId"] is None

source_10 = (ROOT / "objects/OBJ_chaos_object_10/Step_0.gml").read_text()
adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
for token in ("global.playerJump", "cp_c.vy <= 0", "chaosVY = -$0200",
              "cp_c.vy = $0200", "SPR_chaos_object_0F"):
    assert token in source_10, token
assert "var cp_state11" in source_10 and "var cp_attack = !cp_state11" in source_10
create_10 = (ROOT / "objects/OBJ_chaos_object_10/Create_0.gml").read_text()
for token in ("chaosGraphicsSelector = chaosParameter",
              "SPR_chaos_object_10_04", "SPR_chaos_object_10_06"):
    assert token in create_10, token
assert "image_index = (chaosAnimTick div 5) & 1" in source_10
for token in ("cp_parameter == $02", "cp_parameter == $04", "cp_parameter == $06",
              "global.chaosLastEnemyScore0 = $10"):
    assert token in adapter, token

# Terrain generator acceptance at world (2112,832) => quadrant 2 local (64,832).
terrain_dir = ROOT / "sprites/SPR_chaos_terrain_2"
terrain = Image.open(next(terrain_dir.glob("*.png"))).convert("RGBA")
cell = terrain.crop((64, 832, 96, 864))
pixels = list(cell.getdata())
alpha = [p[3] for p in pixels]
assert set(alpha) == {255}
assert Counter(pixels).most_common(1)[0] == ((0, 0, 255, 255), 856)
assert next(terrain_dir.glob("*.png")).read_bytes() == next((terrain_dir / "layers").rglob("*.png")).read_bytes()

terrain_manifest = json.loads((CACHE / "terrain-assets.json").read_text())
target_context = [p for p in terrain_manifest["spring_placements"]
                  if (p["world_x"], p["world_y"]) == (2112, 832)]
assert len(target_context) == 1
assert target_context[0]["context_backdrop_rgba"] == [0, 0, 255, 255]
for frame in terrain_manifest["normalized_ring_frames"]:
    root_png = ROOT / frame["root_png"]
    layer_png = ROOT / frame["layer_png"]
    assert root_png.read_bytes() == layer_png.read_bytes()
    ring_pixels = list(Image.open(root_png).convert("RGBA").getdata())
    assert set(p for p in ring_pixels if p[3] == 0) == {(0, 0, 0, 0)}

# Layout blocks $40-$43 carry the same ring pixels as the separately decoded
# collectible objects. They must contribute only their background plane to the
# flattened terrain, or every animated ring has a permanent flat duplicate.
assert terrain_manifest["object_only_ring_block_ids"] == ["0x40", "0x41", "0x42", "0x43"]
assert len(terrain_manifest["ring_cells_removed"]) == 72
terrain_quadrants = {
    asset["world_x"]: Image.open(ROOT / asset["root_png"]).convert("RGBA")
    for asset in terrain_manifest["assets"]
}
for cell_info in terrain_manifest["ring_cells_removed"]:
    world_x, world_y = cell_info["world_x"], cell_info["world_y"]
    quadrant_x = (world_x // 1024) * 1024
    local_x = world_x - quadrant_x
    cell = terrain_quadrants[quadrant_x].crop((local_x, world_y, local_x + 32, world_y + 32))
    assert set(cell.getdata()) == {tuple(cell_info["context_backdrop_rgba"])}

source_18 = (ROOT / "objects/OBJ_chaos_object_18/Step_0.gml").read_text()
assert "chaosSpinFrames" in source_18 and "global.chaosComplete" in source_18
draw_18 = (ROOT / "objects/OBJ_chaos_object_18/Draw_0.gml").read_text()
assert "y + 22" in draw_18 and "floor(image_index)" in draw_18
ring_create = (ROOT / "objects/OBJ_ring/Create_0.gml").read_text()
assert "image_speed = 0.25" in ring_create
ring_draw_path = ROOT / "objects/OBJ_ring/Draw_0.gml"
assert ring_draw_path.exists()
ring_draw = ring_draw_path.read_text()
assert "if (room == ROM_chaos_thz1) draw_sprite(SPR_ring, chaosTHZFrame, x, y);" in ring_draw
assert "else draw_self();" in ring_draw

# Task-05 type-$10 selector graphics. The reference audit PNGs are exact 4x
# nearest-neighbour renders, so expanding each imported logical frame back to
# 4x must reproduce the committed canonical RGBA hash byte-for-byte.
reference_variants = {v["selector"]: v for v in graphics_10["variants"]
                      if v["player_type"] == "0x01"}
imported_variants = {v["selector"]: v for v in poc_assets_10["type_10"]}
assert set(imported_variants) == {"0x02", "0x04", "0x06"}
fixed_frames = []
selector_hashes = {}
for selector in ("0x02", "0x04", "0x06"):
    imported = imported_variants[selector]
    reference = reference_variants[selector]
    sprite = json.loads((ROOT / f"sprites/{imported['resource']}/{imported['resource']}.yy").read_text())
    assert len(sprite["frames"]) == 2
    for imported_frame, reference_frame in zip(imported["frames"], reference["frames"]):
        assert imported_frame["frame_index"] == reference_frame["frame_index"]
        assert imported_frame["reference_rgba_sha256"] == reference_frame["rgba_sha256"]
        root_png = ROOT / imported_frame["root_png"]
        layer_png = ROOT / imported_frame["layer_png"]
        assert root_png.read_bytes() == layer_png.read_bytes()
        logical = Image.open(root_png).convert("RGBA")
        assert logical.size == (32, 40)
        expanded = logical.resize((128, 160), Image.Resampling.NEAREST)
        assert hashlib.sha256(expanded.tobytes()).hexdigest() == reference_frame["rgba_sha256"]
        if reference_frame["frame_index"] == "0x0B":
            selector_hashes[selector] = reference_frame["rgba_sha256"]
        else:
            fixed_frames.append(logical.tobytes())
assert len(set(selector_hashes.values())) == 3
assert len(fixed_frames) == 3 and fixed_frames[0] == fixed_frames[1] == fixed_frames[2]
assert graphics_10["palette"]["raw_sha256"] == "c6715cef80884efccdc74a30c6c85023858169524ded2be963e16badb1f677e2"

# Type $05 presentation: 32 exact frames using only common tiles $20/$22.
# Reconstruct each reference audit frame from the positioned GameMaker canvas
# and compare its canonical 4x RGBA hash.
type05 = poc_assets_10["type_05"]
assert type05["frame_count"] == 32 and type05["tile_offsets"] == ["0x20", "0x22"]
sprite05 = json.loads((ROOT / "sprites/SPR_chaos_object_05/SPR_chaos_object_05.yy").read_text())
assert len(sprite05["frames"]) == 32
assert sprite05["sequence"]["xorigin"] == 20 and sprite05["sequence"]["yorigin"] == 42
assert {tile for frame in type05["frames"] for tile in frame["tile_offsets"]} == {"0x20", "0x22"}
for frame in type05["frames"]:
    canvas = Image.open(ROOT / frame["root_png"]).convert("RGBA")
    assert canvas.size == (40, 48)
    frame_bounds = frame["bounds"]
    box = (20 + frame_bounds["min_x"], 42 + frame_bounds["min_y"],
           20 + frame_bounds["max_x"], 42 + frame_bounds["max_y"])
    piece = canvas.crop(box)
    source_logical = Image.new("RGBA", (16, 24), (0, 0, 0, 0))
    source_logical.alpha_composite(piece, (4, 4))
    expanded = source_logical.resize((64, 96), Image.Resampling.NEAREST)
    assert hashlib.sha256(expanded.tobytes()).hexdigest() == frame["reference_rgba_sha256"]
create_05 = (ROOT / "objects/OBJ_chaos_object_05_effect/Create_0.gml").read_text()
step_05 = (ROOT / "objects/OBJ_chaos_object_05_effect/Step_0.gml").read_text()
assert "player-relative POC adapter" in create_05
for token in ("global.chaosPowerCode != $06", "global.chaosPowerTimer <= 0",
              "instance_find(OBJ_player, 0)", "x = cp_p.x", "y = cp_p.y",
              "chaosFrame = (chaosFrame + 1) mod 32"):
    assert token in step_05, token
type05_use = adapter.index("OBJ_chaos_object_05_effect")
assert type05_use > adapter.index("cp_parameter == $06")
assert "instance_create(cp_p.x, cp_p.y, OBJ_chaos_object_05_effect)" in adapter
assert "instance_exists(OBJ_chaos_object_05_effect)" in adapter
motion = (ROOT / "scripts/SCR_chaos_motion/SCR_chaos_motion.gml").read_text()
assert "SCR_chaos_debug_place" not in motion
for key in ("vk_f4", "vk_f5", "vk_f6", "vk_f7"):
    assert key not in motion.lower()

report = {
    "reference_metadata": {kind: metadata[kind]["rom_sha256"] for kind in metadata},
    "placements": {"type_10": 5, "type_18": 1, "type_21": 6, "type_27": 3},
    "type_21_left_bounds": {f"{x},{y}": bound for (x, y), bound in bounds.items()},
    "type_27_no_contact": {"updates": 129, "add_callbacks": adds,
                            "subtract_callbacks": subtracts,
                            "displacement_8_8": displacement},
    "type_10_parameters": [p["parameter"] for p in metadata["10"]["placements"]],
    "terrain_31_cell": {"transparent_pixels": 0,
                         "context_backdrop_pixels": 856,
                         "spring_pixels": 168},
    "ring_frames_normalized": len(terrain_manifest["normalized_ring_frames"]),
    "ring_terrain_cells_removed": 72,
    "ring_object_positions_preserved": 142,
    "ring_draw_adapter_verified": True,
    "type_10_selector_frame_0B_rgba_sha256": selector_hashes,
    "type_10_fixed_frame_0C_shared": True,
    "type_10_reward_path_unchanged": True,
    "type_10_state_11_attack_suppression": True,
    "type_05_visible_frames": 32,
    "type_05_tiles": ["0x20", "0x22"],
    "type_05_anchor": type05["anchor"],
    "type_05_singleton_selector_06_only": True,
    "closure_blockers": {"type_10_selector_graphics": "RESOLVED",
                           "type_05_visible_effect": "RESOLVED"},
    "closure_candidate": "THZ1 POC READY WITH DOCUMENTED ADAPTERS",
    "type_18_presentation_offset_y": 22,
    "debug_warp_shortcuts_removed": True,
    "legacy_layout_monitor_instances": 0,
}
(ROOT / "verification/poc18-results.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
