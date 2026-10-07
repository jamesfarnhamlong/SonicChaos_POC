"""Install ROM-derived type-$09 frames 1-6 into a mapped-object canvas."""
from pathlib import Path
from chaos_asset_parents import chaos_parent
from PIL import Image
import argparse, hashlib, json, shutil, uuid

EXPECTED_ROM = "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
RESOURCE = "SPR_chaos_object_09"
LAYER_ID = "09000000-0000-4000-8000-000000000000"
FRAME_IDS = [f"0900000{i}-0000-4000-8000-{i:012x}" for i in range(1, 7)]
KEYFRAME_NAMESPACE = uuid.UUID("8f0cf411-69e1-4544-bcf7-9caf583b9970")
CANVAS = (16, 16)
# Mapping relative Y is -16..-1; SMS SAT displays Y+1. Canvas top is therefore
# anchor-15, giving the mapped-object GameMaker origin below.
ORIGIN = (8, 15)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def frame_row(frame_id):
    return {"$GMSpriteFrame": "v1", "%Name": frame_id, "name": frame_id,
            "resourceType": "GMSpriteFrame", "resourceVersion": "2.0"}


def keyframe(frame_id, index):
    kid = str(uuid.uuid5(KEYFRAME_NAMESPACE, f"{RESOURCE}:{frame_id}:{index}"))
    return {"$Keyframe<SpriteFrameKeyframe>": "", "Channels": {"0": {
        "$SpriteFrameKeyframe": "", "Id": {"name": frame_id,
        "path": f"sprites/{RESOURCE}/{RESOURCE}.yy"},
        "resourceType": "SpriteFrameKeyframe", "resourceVersion": "2.0"}},
        "Disabled": False, "id": kid, "IsCreationKey": False,
        "Key": float(index), "Length": 1.0,
        "resourceType": "Keyframe<SpriteFrameKeyframe>",
        "resourceVersion": "2.0", "Stretch": False}


def sprite_yy():
    return {
        "$GMSprite": "v2", "%Name": RESOURCE, "bboxMode": 0,
        "bbox_bottom": 15, "bbox_left": 0, "bbox_right": 15, "bbox_top": 0,
        "collisionKind": 1, "collisionTolerance": 0, "DynamicTexturePage": False,
        "edgeFiltering": False, "For3D": False,
        "frames": [frame_row(x) for x in FRAME_IDS], "gridX": 0, "gridY": 0,
        "height": CANVAS[1], "HTile": False,
        "layers": [{"$GMImageLayer": "", "%Name": LAYER_ID, "blendMode": 0,
            "displayName": "default", "isLocked": False, "name": LAYER_ID,
            "opacity": 100.0, "resourceType": "GMImageLayer",
            "resourceVersion": "2.0", "visible": True}],
        "name": RESOURCE, "nineSlice": None, "origin": 9,
        "parent": chaos_parent(RESOURCE),
        "preMultiplyAlpha": False, "resourceType": "GMSprite", "resourceVersion": "2.0",
        "sequence": {"$GMSequence": "v1", "%Name": RESOURCE, "autoRecord": True,
            "backdropHeight": 1080, "backdropImageOpacity": 0.5,
            "backdropImagePath": "", "backdropWidth": 1920,
            "backdropXOffset": 0.0, "backdropYOffset": 0.0,
            "events": {"$KeyframeStore<MessageEventKeyframe>": "", "Keyframes": [],
                "resourceType": "KeyframeStore<MessageEventKeyframe>", "resourceVersion": "2.0"},
            "eventStubScript": None, "eventToFunction": {}, "length": 6.0,
            "lockOrigin": False,
            "moments": {"$KeyframeStore<MomentsEventKeyframe>": "", "Keyframes": [],
                "resourceType": "KeyframeStore<MomentsEventKeyframe>", "resourceVersion": "2.0"},
            "name": RESOURCE, "playback": 1, "playbackSpeed": 0.0,
            "playbackSpeedType": 1, "resourceType": "GMSequence", "resourceVersion": "2.0",
            "showBackdrop": True, "showBackdropImage": False, "timeUnits": 1,
            "tracks": [{"$GMSpriteFramesTrack": "", "builtinName": 0, "events": [],
                "inheritsTrackColour": True, "interpolation": 1, "isCreationTrack": False,
                "keyframes": {"$KeyframeStore<SpriteFrameKeyframe>": "",
                    "Keyframes": [keyframe(x, i) for i, x in enumerate(FRAME_IDS)],
                    "resourceType": "KeyframeStore<SpriteFrameKeyframe>", "resourceVersion": "2.0"},
                "modifiers": [], "name": "frames", "resourceType": "GMSpriteFramesTrack",
                "resourceVersion": "2.0", "spriteId": None, "trackColour": 0,
                "tracks": [], "traits": 0}],
            "visibleRange": None, "volume": 1.0,
            "xorigin": ORIGIN[0], "yorigin": ORIGIN[1]},
        "swatchColours": None, "swfPrecision": 2.525,
        "textureGroupId": {"name": "Default", "path": "texturegroups/Default"},
        "type": 0, "VTile": False, "width": CANVAS[0],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reference_output", type=Path,
                        help="output of tools/thz1_object_assets.py --scale 1")
    parser.add_argument("--project-root", type=Path, default=Path("."))
    args = parser.parse_args()
    source = args.reference_output.resolve()
    project = args.project_root.resolve()
    metadata = json.loads((source / "metadata.json").read_text())
    summary = json.loads((source.parent / "summary.json").read_text())
    assert summary["rom_sha256"] == EXPECTED_ROM
    assert metadata["type_id"] == "0x09"
    assert metadata["mapping_cpu"] == "0x8C71" and metadata["mapping_rom"] == "0x3CC71"
    frames = {row["frame_index"]: row for row in metadata["frames"]}
    assert all(index in frames for index in range(1, 7))

    sprite_dir = project / "sprites" / RESOURCE
    sprite_dir.mkdir(parents=True, exist_ok=True)
    assets = []
    for index, frame_id in zip(range(1, 7), FRAME_IDS):
        row = frames[index]
        bounds = row["render"]["bounds"]
        source_image = Image.open(source / row["render"]["png"]).convert("RGBA")
        # The reference preview uses a four-pixel audit margin at scale 1.
        piece = source_image.crop((4, 4, source_image.width-4, source_image.height-4))
        assert piece.size == (bounds["width"], bounds["height"])
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        # SAT Y+1 is encoded in ORIGIN rather than added to canonical anchors.
        position = (ORIGIN[0] + bounds["min_x"], ORIGIN[1] + bounds["min_y"] + 1)
        canvas.alpha_composite(piece, position)
        bbox = canvas.getbbox()
        assert bbox is not None
        nontransparent_bounds = [bbox[0], bbox[1], bbox[2]-1, bbox[3]-1]
        displayed_relative_bounds = [nontransparent_bounds[0]-ORIGIN[0],
            nontransparent_bounds[1]-ORIGIN[1], nontransparent_bounds[2]-ORIGIN[0],
            nontransparent_bounds[3]-ORIGIN[1]]
        root_png = sprite_dir / f"{frame_id}.png"
        layer_png = sprite_dir / "layers" / frame_id / f"{LAYER_ID}.png"
        layer_png.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(root_png, optimize=True)
        canvas.save(layer_png, optimize=True)
        assert root_png.read_bytes() == layer_png.read_bytes()
        assets.append({"mapping_frame": index, "frame_id": frame_id,
            "frame_cpu": row["frame_cpu"], "frame_rom": row["frame_rom"],
            "x_origin": row["x_origin"], "y_origin": row["y_origin"],
            "pieces": row["pieces"], "tile_offsets": row["tile_offsets"],
            "mapping_bounds": bounds, "canvas_position": list(position),
            "nontransparent_canvas_bounds": nontransparent_bounds,
            "displayed_relative_bounds": displayed_relative_bounds,
            "png_sha256": sha(root_png.read_bytes()),
            "rgba_sha256": sha(canvas.tobytes()),
            "root_png": root_png.relative_to(project).as_posix(),
            "layer_png": layer_png.relative_to(project).as_posix()})

    (sprite_dir / f"{RESOURCE}.yy").write_text(json.dumps(sprite_yy(), indent=2) + "\n")
    cache = project / "POC_notes" / "rom-cache"
    canonical = cache / "object-09-graphics.json"
    shutil.copyfile(source / "metadata.json", canonical)
    poc = cache / "object-09-poc-assets.json"
    poc.write_text(json.dumps({"format": 1, "rom_sha256": EXPECTED_ROM,
        "source_tool": "sonic-chaos-reference/tools/thz1_object_assets.py",
        "mapping_cpu": "0x8C71", "mapping_rom": "0x3CC71",
        "canvas": list(CANVAS), "origin": list(ORIGIN), "sat_y_plus_one": True,
        "state_1_sequence": [1, 2, 4, 3], "state_1_duration": 8,
        "state_2_sequence": [5, 6, 5, 6, 5, 6, 5, 6],
        "state_2_duration": 4, "state_2_updates": 32,
        "assets": assets}, indent=2) + "\n")
    manifest_path = cache / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for path in (canonical, poc):
        raw = path.read_bytes()
        manifest["files"][path.name] = {"sha256": sha(raw), "bytes": len(raw)}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"resource": RESOURCE, "frames": 6,
        "canvas": CANVAS, "origin": ORIGIN}, indent=2))


if __name__ == "__main__":
    main()
