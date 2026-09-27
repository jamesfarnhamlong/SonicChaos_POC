"""Install reviewed Task 08 caches and exact ROM-derived POC 19 graphics."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path

from PIL import Image

ROM_SHA256 = "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
RESEARCH_COMMIT = "ab3a41fe5e32c9efd4aae61a80d3931403a141e3"


def gm_json(path: Path) -> dict:
    return json.loads(re.sub(r",\s*([}\]])", r"\1", path.read_text()))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_sprite(project: Path, name: str, frames: list[Image.Image],
                 frame_names: list[str], layer_name: str,
                 origin: tuple[int, int], parent: str) -> list[dict]:
    sprite_dir = project / "sprites" / name
    sprite_dir.mkdir(parents=True, exist_ok=True)
    assets = []
    for frame_name, image in zip(frame_names, frames):
        root_png = sprite_dir / f"{frame_name}.png"
        layer_png = sprite_dir / "layers" / frame_name / f"{layer_name}.png"
        layer_png.parent.mkdir(parents=True, exist_ok=True)
        image.save(root_png, optimize=True)
        image.save(layer_png, optimize=True)
        assert root_png.read_bytes() == layer_png.read_bytes()
        assets.append({"frame": frame_name,
                       "rgba_sha256": hashlib.sha256(image.tobytes()).hexdigest(),
                       "root_png": root_png.relative_to(project).as_posix(),
                       "layer_png": layer_png.relative_to(project).as_posix(),
                       "png_sha256": sha256(root_png)})

    width, height = frames[0].size
    metadata = {
        "$GMSprite": "v2", "%Name": name, "bboxMode": 0,
        "bbox_bottom": height - 1, "bbox_left": 0, "bbox_right": width - 1,
        "bbox_top": 0, "collisionKind": 1, "collisionTolerance": 0,
        "DynamicTexturePage": False, "edgeFiltering": False, "For3D": False,
        "frames": [{"$GMSpriteFrame": "v1", "%Name": frame, "name": frame,
                    "resourceType": "GMSpriteFrame", "resourceVersion": "2.0"}
                   for frame in frame_names],
        "gridX": 0, "gridY": 0, "height": height, "HTile": False,
        "layers": [{"$GMImageLayer": "", "%Name": layer_name, "blendMode": 0,
                    "displayName": "default", "isLocked": False, "name": layer_name,
                    "opacity": 100.0, "resourceType": "GMImageLayer",
                    "resourceVersion": "2.0", "visible": True}],
        "name": name, "nineSlice": None, "origin": 9,
        "parent": {"name": parent.split("/")[-1].replace(".yy", ""), "path": parent},
        "preMultiplyAlpha": False, "resourceType": "GMSprite", "resourceVersion": "2.0",
        "sequence": {"$GMSequence": "v1", "%Name": name, "autoRecord": True,
            "backdropHeight": 1080, "backdropImageOpacity": 0.5, "backdropImagePath": "",
            "backdropWidth": 1920, "backdropXOffset": 0.0, "backdropYOffset": 0.0,
            "events": {"$KeyframeStore<MessageEventKeyframe>": "", "Keyframes": [],
                       "resourceType": "KeyframeStore", "resourceVersion": "2.0"},
            "eventStubScript": None, "eventToFunction": {}, "length": float(len(frames)),
            "lockOrigin": False,
            "moments": {"$KeyframeStore<MomentsEventKeyframe>": "", "Keyframes": [],
                        "resourceType": "KeyframeStore", "resourceVersion": "2.0"},
            "name": name, "playback": 1, "playbackSpeed": 1.0, "playbackSpeedType": 1,
            "resourceType": "GMSequence", "resourceVersion": "2.0", "showBackdrop": True,
            "showBackdropImage": False, "timeUnits": 1,
            "tracks": [{"$GMSpriteFramesTrack": "", "builtinName": 0, "events": [],
                "inheritsTrackColour": True, "interpolation": 1, "isCreationTrack": False,
                "keyframes": {"$KeyframeStore<SpriteFrameKeyframe>": "", "Keyframes": [
                    {"$Keyframe<SpriteFrameKeyframe>": "",
                     "Channels": {"0": {"$SpriteFrameKeyframe": "",
                         "Id": {"name": name, "path": f"sprites/{name}/{name}.yy"},
                         "resourceType": "SpriteFrameKeyframe", "resourceVersion": "2.0"}},
                     "Disabled": False, "id": frame, "IsCreationKey": False,
                     "Key": float(index), "Length": 1.0,
                     "resourceType": "Keyframe<SpriteFrameKeyframe>",
                     "resourceVersion": "2.0", "Stretch": False}
                    for index, frame in enumerate(frame_names)],
                    "resourceType": "KeyframeStore", "resourceVersion": "2.0"},
                "modifiers": [], "name": "frames", "resourceType": "SpriteFramesTrack",
                "resourceVersion": "2.0", "spriteId": None, "trackColour": 0,
                "tracks": [], "traits": 0}],
            "visibleRange": None, "volume": 1.0,
            "xorigin": origin[0], "yorigin": origin[1]},
        "swatchColours": None, "swfPrecision": 2.525,
        "textureGroupId": {"name": "Default", "path": "texturegroups/Default"},
        "type": 0, "VTile": False, "width": width}
    (sprite_dir / f"{name}.yy").write_text(json.dumps(metadata, separators=(",", ":")) + "\n")
    return assets


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rom", type=Path)
    parser.add_argument("research", type=Path)
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    project = args.project_root.resolve()
    rom = args.rom.read_bytes()
    assert hashlib.sha256(rom).hexdigest() == ROM_SHA256
    assert (args.research / ".git").exists()

    research_cache = args.research / "data" / "rom-cache" / "thz1"
    cache = project / "POC_notes" / "rom-cache"
    copied = {}
    for name in ("object-09.json", "poc-coverage.json", "final-runtime-closure.json"):
        source = research_cache / name
        payload = source.read_bytes()
        data = json.loads(payload)
        assert data["rom_sha256"] == ROM_SHA256
        target = cache / name
        target.write_bytes(payload)
        copied[name] = {"bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}

    object09 = json.loads((cache / "object-09.json").read_text())
    assert len(object09["placements"]) == 24
    rows = [f"        [{row['index']},{row['world_x']},{row['world_y']},${int(row['parameter'], 16):02X}]"
            for row in object09["placements"]]
    script_dir = project / "scripts" / "SCR_chaos_task08_data"
    script_dir.mkdir(parents=True, exist_ok=True)
    (script_dir / "SCR_chaos_task08_data.gml").write_text(
        "// Generated from reviewed data/rom-cache/thz1/object-09.json.\n"
        "function SCR_chaos_type09_placements() {\n"
        "    return [\n" + ",\n".join(rows) + "\n    ];\n}\n\n"
        "function SCR_chaos_type09_create_all() {\n"
        "    var cp_rows = SCR_chaos_type09_placements();\n"
        "    for (var cp_i = 0; cp_i < array_length(cp_rows); cp_i++) {\n"
        "        var cp_row = cp_rows[cp_i];\n"
        "        var cp_o = instance_create_depth(cp_row[1],cp_row[2],-20,OBJ_chaos_object_09);\n"
        "        cp_o.chaosRecordIndex = cp_row[0];\n"
        "        cp_o.chaosParameter = cp_row[3];\n"
        "    }\n"
        "}\n")
    (script_dir / "SCR_chaos_task08_data.yy").write_text(json.dumps({
        "$GMScript": "v1", "%Name": "SCR_chaos_task08_data", "isCompatibility": False,
        "isDnD": False, "name": "SCR_chaos_task08_data",
        "parent": {"name": "Data", "path": "folders/Scripts/Data.yy"},
        "resourceType": "GMScript", "resourceVersion": "2.0"}, separators=(",", ":")) + "\n")

    spec = importlib.util.spec_from_file_location(
        "task08_assets", args.research / "tools" / "thz1_object_assets.py")
    assets = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(assets)
    graphics_map = json.loads((research_cache / "graphics-map.json").read_text())
    vram, _ = assets.build_vram(rom, graphics_map)
    palette = assets.thz1_sprite_palette(rom)
    mapping = assets.object_mapping(rom, 0x09)
    pointers = assets.mapping_frame_pointers(rom, mapping["mapping_cpu"])

    type09_frames = []
    type09_rgba = []
    for frame_index in range(1, 7):
        frame = assets.parse_frame_record(rom, pointers[frame_index])
        canvas = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        for piece in frame["pieces"]:
            tile_id = piece["tile_offset"] & 0xFF
            pixels = assets.tile_pixels(vram, tile_id) + assets.tile_pixels(vram, tile_id + 1)
            for py, row in enumerate(pixels):
                for px, colour in enumerate(row):
                    if colour:
                        canvas.putpixel((piece["relative_x"] + 8 + px,
                                         piece["relative_y"] + 16 + py), palette[colour])
        type09_frames.append(canvas)
        type09_rgba.append(hashlib.sha256(canvas.tobytes()).hexdigest())
    type09_names = [f"0900000{i}-0000-4000-8000-00000000000{i}" for i in range(1, 7)]
    type09_assets = write_sprite(project, "SPR_chaos_object_09", type09_frames,
        type09_names, "09000000-0000-4000-8000-000000000000", (8, 16),
        "folders/Sprites/Badniks.yy")

    def word(pos: int) -> int:
        return rom[pos] | (rom[pos + 1] << 8)

    def decompress(pos: int) -> list[bytes]:
        count = word(pos + 2)
        flags = pos + word(pos + 4)
        source = pos + 6
        result = []
        for tile_index in range(count):
            mode = (rom[flags + tile_index // 4] >> (2 * (tile_index % 4))) & 3
            tile = bytearray(32)
            if mode == 1:
                tile[:] = rom[source:source + 32]
                source += 32
            elif mode in (2, 3):
                mask = int.from_bytes(rom[source:source + 4], "little")
                source += 4
                for i in range(32):
                    if mask >> i & 1:
                        tile[i] = rom[source]
                        source += 1
                if mode == 3:
                    for i in range(0, 14, 2):
                        for k in (0, 1, 16, 17):
                            tile[i + k + 2] ^= tile[i + k]
            result.append(bytes(tile))
        return result

    tiles = decompress(0x40F9E)
    palettes = []
    for selector in (0x15, 0x06):
        start = 0x3B64D + selector * 16
        palettes.append([((value & 3) * 85, ((value >> 2) & 3) * 85,
                          ((value >> 4) & 3) * 85, 255)
                         for value in rom[start:start + 16]])

    def render_block(block_id: int) -> Image.Image:
        image = Image.new("RGBA", (32, 32), palettes[0][0])
        mapping_rom = 0x44000 + word(0x44000 + block_id * 2) - 0x8000
        for piece in range(16):
            attribute = word(mapping_rom + piece * 2)
            tile_index = (attribute & 511) - 192
            if not 0 <= tile_index < len(tiles):
                continue
            indexed = assets.decode_mode4_tile(tiles[tile_index])
            for py in range(8):
                for px in range(8):
                    sx = 7 - px if attribute & 0x0200 else px
                    sy = 7 - py if attribute & 0x0400 else py
                    colour = indexed[sy][sx]
                    selected = 1 if (attribute & 0x0800 and colour) else 0
                    image.putpixel(((piece % 4) * 8 + px, (piece // 4) * 8 + py),
                                   palettes[selected][colour])
        return image

    block47 = render_block(0x47)
    assert hashlib.sha256(block47.tobytes()).hexdigest() == \
        "ec9e7afdafe3b1494082e1900e271643a651b19755cf23904211a3ecb42b4e3d"
    block46 = render_block(0x46)
    block46_assets = write_sprite(project, "SPR_chaos_block_46", [block46],
        ["46000000-0000-4000-8000-000000000046"],
        "46000000-0000-4000-8000-000000000000", (0, 0),
        "folders/Sprites.yy")

    report = {"format": 1, "rom_sha256": ROM_SHA256,
        "research_commit": RESEARCH_COMMIT, "copied_caches": copied,
        "type_09": {"mapping_cpu": f"0x{mapping['mapping_cpu']:04X}",
                    "frames": [1, 2, 3, 4, 5, 6], "rgba_sha256": type09_rgba,
                    "assets": type09_assets},
        "block_47_rgba_sha256": hashlib.sha256(block47.tobytes()).hexdigest(),
        "block_46_rgba_sha256": hashlib.sha256(block46.tobytes()).hexdigest(),
        "block_46_assets": block46_assets}
    report_path = cache / "poc19-task08-assets.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")

    manifest_path = cache / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for name, metadata in copied.items():
        manifest["files"][name] = metadata
    manifest["files"][report_path.name] = {"bytes": report_path.stat().st_size,
        "sha256": sha256(report_path)}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"type_09_frames": 6, "block_47_hash": report["block_47_rgba_sha256"],
                      "copied_caches": list(copied)}, indent=2))


if __name__ == "__main__":
    main()
