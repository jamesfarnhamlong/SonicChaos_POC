"""Install canonical Task-05 type-$10/$05 graphics into the GameMaker POC.

Input is the deterministic output of reference tool
tools/thz1_object_10_graphics.py. The reference renderer emits 4x nearest-
neighbour audit PNGs; this importer verifies their canonical RGBA hashes,
reduces them to logical GameMaker pixels, and writes reproducible resources.
"""
from pathlib import Path
from PIL import Image
import argparse, hashlib, json, shutil, uuid

EXPECTED_ROM = "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
EXPECTED_PALETTE = "c6715cef80884efccdc74a30c6c85023858169524ded2be963e16badb1f677e2"
SELECTORS = (2, 4, 6)
TYPE10_FRAME_IDS = {
    2: ("10101010-1010-4010-8010-101010101101", "10101010-1010-4010-8010-101010101102"),
    4: ("1004000b-0000-4000-8000-00000000000b", "1004000c-0000-4000-8000-00000000000c"),
    6: ("1006000b-0000-4000-8000-00000000000b", "1006000c-0000-4000-8000-00000000000c"),
}
TYPE10_LAYER_IDS = {
    2: "10101010-1010-4010-8010-101010101100",
    4: "10040000-0000-4000-8000-000000000000",
    6: "10060000-0000-4000-8000-000000000000",
}
TYPE10_RESOURCES = {2: "SPR_chaos_object_10", 4: "SPR_chaos_object_10_04", 6: "SPR_chaos_object_10_06"}
TYPE05_RESOURCE = "SPR_chaos_object_05"
TYPE05_LAYER = "05000000-0000-4000-8000-000000000000"
TYPE05_ORIGIN = (20, 42)
TYPE05_SIZE = (40, 48)
KEYFRAME_NAMESPACE = uuid.UUID("0e1b3f5d-77b4-4a50-8b6d-1f9d9e184004")


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def logical_image(path, expected_rgba):
    source = Image.open(path).convert("RGBA")
    if sha_bytes(source.tobytes()) != expected_rgba:
        raise AssertionError((path, "canonical RGBA hash"))
    if source.width % 4 or source.height % 4:
        raise AssertionError((path, source.size))
    logical = source.resize((source.width // 4, source.height // 4), Image.Resampling.NEAREST)
    rebuilt = logical.resize(source.size, Image.Resampling.NEAREST)
    if rebuilt.tobytes() != source.tobytes():
        raise AssertionError((path, "not exact 4x nearest-neighbour data"))
    return logical


def frame_row(frame_id):
    return {"$GMSpriteFrame": "v1", "%Name": frame_id, "name": frame_id,
            "resourceType": "GMSpriteFrame", "resourceVersion": "2.0"}


def keyframe(frame_id, sprite_name, index):
    keyframe_id = str(uuid.uuid5(KEYFRAME_NAMESPACE,
                                f"{sprite_name}:{frame_id}:{index}"))
    return {"$Keyframe<SpriteFrameKeyframe>": "", "Channels": {"0": {
        "$SpriteFrameKeyframe": "", "Id": {"name": frame_id,
        "path": f"sprites/{sprite_name}/{sprite_name}.yy"},
        "resourceType": "SpriteFrameKeyframe", "resourceVersion": "2.0"}},
        "Disabled": False, "id": keyframe_id, "IsCreationKey": False,
        "Key": float(index), "Length": 1.0,
        "resourceType": "Keyframe<SpriteFrameKeyframe>",
        "resourceVersion": "2.0", "Stretch": False}


def sprite_yy(name, frame_ids, layer_id, width, height, xorigin, yorigin, bbox):
    return {
        "$GMSprite": "v2", "%Name": name, "bboxMode": 0,
        "bbox_bottom": bbox[3], "bbox_left": bbox[0], "bbox_right": bbox[2],
        "bbox_top": bbox[1], "collisionKind": 1, "collisionTolerance": 0,
        "DynamicTexturePage": False, "edgeFiltering": False, "For3D": False,
        "frames": [frame_row(x) for x in frame_ids], "gridX": 0, "gridY": 0,
        "height": height, "HTile": False,
        "layers": [{"$GMImageLayer": "", "%Name": layer_id, "blendMode": 0,
            "displayName": "default", "isLocked": False, "name": layer_id,
            "opacity": 100.0, "resourceType": "GMImageLayer",
            "resourceVersion": "2.0", "visible": True}],
        "name": name, "nineSlice": None, "origin": 9,
        "parent": {"name": "Badniks", "path": "folders/Sprites/Badniks.yy"},
        "preMultiplyAlpha": False, "resourceType": "GMSprite",
        "resourceVersion": "2.0",
        "sequence": {"$GMSequence": "v1", "%Name": name, "autoRecord": True,
            "backdropHeight": 1080, "backdropImageOpacity": 0.5,
            "backdropImagePath": "", "backdropWidth": 1920,
            "backdropXOffset": 0.0, "backdropYOffset": 0.0,
            "events": {"$KeyframeStore<MessageEventKeyframe>": "", "Keyframes": [],
                "resourceType": "KeyframeStore<MessageEventKeyframe>", "resourceVersion": "2.0"},
            "eventStubScript": None, "eventToFunction": {}, "length": float(len(frame_ids)),
            "lockOrigin": False,
            "moments": {"$KeyframeStore<MomentsEventKeyframe>": "", "Keyframes": [],
                "resourceType": "KeyframeStore<MomentsEventKeyframe>", "resourceVersion": "2.0"},
            "name": name, "playback": 1, "playbackSpeed": 0.0,
            "playbackSpeedType": 1, "resourceType": "GMSequence", "resourceVersion": "2.0",
            "showBackdrop": True, "showBackdropImage": False, "timeUnits": 1,
            "tracks": [{"$GMSpriteFramesTrack": "", "builtinName": 0, "events": [],
                "inheritsTrackColour": True, "interpolation": 1, "isCreationTrack": False,
                "keyframes": {"$KeyframeStore<SpriteFrameKeyframe>": "",
                    "Keyframes": [keyframe(x, name, i) for i, x in enumerate(frame_ids)],
                    "resourceType": "KeyframeStore<SpriteFrameKeyframe>", "resourceVersion": "2.0"},
                "modifiers": [], "name": "frames", "resourceType": "GMSpriteFramesTrack",
                "resourceVersion": "2.0", "spriteId": None, "trackColour": 0,
                "tracks": [], "traits": 0}],
            "visibleRange": None, "volume": 1.0, "xorigin": xorigin, "yorigin": yorigin},
        "swatchColours": None, "swfPrecision": 2.525,
        "textureGroupId": {"name": "Default", "path": "texturegroups/Default"},
        "type": 0, "VTile": False, "width": width,
    }


def save_frame(image, sprite_dir, frame_id, layer_id):
    root_png = sprite_dir / f"{frame_id}.png"
    layer_png = sprite_dir / "layers" / frame_id / f"{layer_id}.png"
    layer_png.parent.mkdir(parents=True, exist_ok=True)
    image.save(root_png, optimize=True)
    image.save(layer_png, optimize=True)
    if root_png.read_bytes() != layer_png.read_bytes():
        raise AssertionError(root_png)
    return root_png, layer_png


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("reference_output", type=Path)
    ap.add_argument("--project-root", type=Path, default=Path("."))
    args = ap.parse_args()
    source = args.reference_output.resolve()
    project = args.project_root.resolve()
    metadata = json.loads((source / "metadata.json").read_text())
    if metadata["rom_sha256"] != EXPECTED_ROM:
        raise ValueError("unexpected ROM revision")
    if metadata["palette"]["raw_sha256"] != EXPECTED_PALETTE:
        raise ValueError("unexpected palette")
    variants = {int(v["selector"], 16): v for v in metadata["variants"] if v["player_type"] == "0x01"}
    imported_10 = []
    for selector in SELECTORS:
        resource = TYPE10_RESOURCES[selector]
        sprite_dir = project / "sprites" / resource
        sprite_dir.mkdir(parents=True, exist_ok=True)
        layer_id = TYPE10_LAYER_IDS[selector]
        frame_ids = TYPE10_FRAME_IDS[selector]
        assets = []
        for frame_meta, frame_id in zip(variants[selector]["frames"], frame_ids):
            logical = logical_image(source / frame_meta["png"], frame_meta["rgba_sha256"])
            if logical.size != (32, 40):
                raise AssertionError((selector, logical.size))
            root_png, layer_png = save_frame(logical, sprite_dir, frame_id, layer_id)
            assets.append({"frame_index": frame_meta["frame_index"],
                "frame_id": frame_id, "reference_rgba_sha256": frame_meta["rgba_sha256"],
                "logical_rgba_sha256": sha_bytes(logical.tobytes()),
                "png_sha256": sha_bytes(root_png.read_bytes()),
                "root_png": root_png.relative_to(project).as_posix(),
                "layer_png": layer_png.relative_to(project).as_posix()})
        yy = sprite_yy(resource, frame_ids, layer_id, 32, 40, 16, 28, (4, 4, 27, 35))
        (sprite_dir / f"{resource}.yy").write_text(json.dumps(yy, indent=2) + "\n")
        imported_10.append({"selector": f"0x{selector:02X}", "resource": resource,
            "frames": assets})

    type05 = metadata["type_05_bounded"]
    if type05["visible_frame_count"] != 32 or type05["tile_offsets"] != ["0x20", "0x22"]:
        raise AssertionError("type 0x05 metadata")
    resource = TYPE05_RESOURCE
    sprite_dir = project / "sprites" / resource
    sprite_dir.mkdir(parents=True, exist_ok=True)
    frame_ids = [f"050000{i:02x}-0000-4000-8000-{i:012x}" for i in range(1, 33)]
    imported_05 = []
    for frame_meta, frame_id in zip(type05["frames"], frame_ids):
        logical = logical_image(source / f"type-05-frame-{int(frame_meta['frame_index'],16):02X}.png",
                                frame_meta["rgba_sha256"])
        if logical.size != (16, 24):
            raise AssertionError(logical.size)
        piece = logical.crop((4, 4, 12, 20))
        canvas = Image.new("RGBA", TYPE05_SIZE, (0, 0, 0, 0))
        bounds = frame_meta["bounds"]
        position = (TYPE05_ORIGIN[0] + bounds["min_x"], TYPE05_ORIGIN[1] + bounds["min_y"])
        canvas.alpha_composite(piece, position)
        root_png, layer_png = save_frame(canvas, sprite_dir, frame_id, TYPE05_LAYER)
        imported_05.append({"frame_index": frame_meta["frame_index"], "frame_id": frame_id,
            "tile_offsets": frame_meta["tile_offsets"], "bounds": bounds,
            "reference_rgba_sha256": frame_meta["rgba_sha256"],
            "logical_piece_rgba_sha256": sha_bytes(piece.tobytes()),
            "canvas_rgba_sha256": sha_bytes(canvas.tobytes()),
            "png_sha256": sha_bytes(root_png.read_bytes()),
            "root_png": root_png.relative_to(project).as_posix(),
            "layer_png": layer_png.relative_to(project).as_posix()})
    yy = sprite_yy(resource, frame_ids, TYPE05_LAYER, TYPE05_SIZE[0], TYPE05_SIZE[1],
                   TYPE05_ORIGIN[0], TYPE05_ORIGIN[1], (1, 1, 39, 47))
    (sprite_dir / f"{resource}.yy").write_text(json.dumps(yy, indent=2) + "\n")

    cache = project / "POC_notes" / "rom-cache"
    canonical = cache / "object-10-graphics.json"
    shutil.copyfile(source / "metadata.json", canonical)
    poc_assets = {"format": 1, "rom_sha256": EXPECTED_ROM,
        "source_tool": "sonic-chaos-reference/tools/thz1_object_10_graphics.py",
        "palette_raw_sha256": EXPECTED_PALETTE,
        "type_10": imported_10,
        "type_05": {"resource": TYPE05_RESOURCE, "frame_count": 32,
            "tile_offsets": ["0x20", "0x22"], "canvas": list(TYPE05_SIZE),
            "origin": list(TYPE05_ORIGIN),
            "anchor": "POC bounded presentation adapter: follows active player; exact original special-render anchor unresolved",
            "frames": imported_05}}
    poc_path = cache / "object-10-poc-assets.json"
    poc_path.write_text(json.dumps(poc_assets, indent=2) + "\n")

    # The legacy object-sprite manifest owns the existing selector-$02 paths.
    legacy_path = cache / "thz1-object-sprites.json"
    legacy = json.loads(legacy_path.read_text())
    by_frame = {row["frame_index"]: row for row in imported_10[0]["frames"]}
    for asset in legacy["assets"]:
        if asset["type_id"] == "0x10":
            asset["sha256"] = by_frame[asset["mapping_frame"]]["png_sha256"]
    legacy_path.write_text(json.dumps(legacy, indent=2) + "\n")

    manifest_path = cache / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for path in (canonical, poc_path, legacy_path):
        raw = path.read_bytes()
        manifest["files"][path.name] = {"sha256": sha_bytes(raw), "bytes": len(raw)}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"type_10_resources": TYPE10_RESOURCES,
        "type_05_resource": TYPE05_RESOURCE, "type_05_frames": 32,
        "manifest": str(poc_path)}, indent=2))


if __name__ == "__main__":
    main()
