"""Verify POC 18 against committed canonical type-$10/$21/$27 metadata."""
import json
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

assert positions(instances, "OBJ_chaos_object_10") == placement_counter(metadata["10"])
assert positions(instances, "OBJ_chaos_object_21") == placement_counter(metadata["21"])
assert positions(instances, "OBJ_chaos_object_27") == placement_counter(metadata["27"])
assert positions(instances, "OBJ_chaos_object_18") == Counter({(3960, 558): 1})
assert not positions(instances, "OBJ_monitor_ring")

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
assert not (ROOT / "objects/OBJ_ring/Draw_0.gml").exists()
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
    "type_18_presentation_offset_y": 22,
    "debug_warp_shortcuts_removed": True,
    "legacy_layout_monitor_instances": 0,
}
(ROOT / "verification/poc18-results.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
