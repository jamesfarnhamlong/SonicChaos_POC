"""Import the reviewed Task-07 state-$11 frames into the GameMaker POC.

Input must be the deterministic output of the reference repository's
``tools/player_state_11_graphics.py``.  The importer verifies the canonical
ROM revision, palette, dimensions, origin and unscaled RGBA hashes before it
writes the sprite resource.  The ROM itself is never copied into the POC.
"""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json
import shutil
import uuid


EXPECTED_ROM = "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
EXPECTED_PALETTE = "c6715cef80884efccdc74a30c6c85023858169524ded2be963e16badb1f677e2"
RESOURCE = "SPR_chaos_player_state_11"
LAYER_ID = "11000000-0000-4000-8000-000000000000"
FRAME_IDS = {
    "0x38": "11380000-0000-4000-8000-000000000038",
    "0x39": "11390000-0000-4000-8000-000000000039",
    "0x3A": "113a0000-0000-4000-8000-00000000003a",
}
EXPECTED_RGBA = {
    "0x38": "39007e36a7ec3e9888df5919d824667da84a4c0fdbf79cca6971ba03b7976c41",
    "0x39": "22364cea9bd4190b07c28aad386f011699577e3d6fd105e851ed6980be05fc45",
    "0x3A": "da066dd9609909a66e41b12048eae0b361460a1deb1e11d2f2dd181c05f6029e",
}
KEYFRAME_NAMESPACE = uuid.UUID("56c5c9c4-60b7-4ae8-99fe-903e014706b6")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def frame_row(frame_id):
    return {"$GMSpriteFrame": "v1", "%Name": frame_id, "name": frame_id,
            "resourceType": "GMSpriteFrame", "resourceVersion": "2.0"}


def keyframe(frame_id, index):
    key_id = str(uuid.uuid5(KEYFRAME_NAMESPACE, f"{RESOURCE}:{frame_id}:{index}"))
    return {"$Keyframe<SpriteFrameKeyframe>": "", "Channels": {"0": {
        "$SpriteFrameKeyframe": "", "Id": {"name": frame_id,
        "path": f"sprites/{RESOURCE}/{RESOURCE}.yy"},
        "resourceType": "SpriteFrameKeyframe", "resourceVersion": "2.0"}},
        "Disabled": False, "id": key_id, "IsCreationKey": False,
        "Key": float(index), "Length": 1.0,
        "resourceType": "Keyframe<SpriteFrameKeyframe>",
        "resourceVersion": "2.0", "Stretch": False}


def sprite_yy(frame_ids):
    return {
        "$GMSprite": "v2", "%Name": RESOURCE, "bboxMode": 0,
        "bbox_bottom": 31, "bbox_left": 1, "bbox_right": 23,
        "bbox_top": 2, "collisionKind": 1, "collisionTolerance": 0,
        "DynamicTexturePage": False, "edgeFiltering": False, "For3D": False,
        "frames": [frame_row(x) for x in frame_ids], "gridX": 0, "gridY": 0,
        "height": 32, "HTile": False,
        "layers": [{"$GMImageLayer": "", "%Name": LAYER_ID, "blendMode": 0,
            "displayName": "default", "isLocked": False, "name": LAYER_ID,
            "opacity": 100.0, "resourceType": "GMImageLayer",
            "resourceVersion": "2.0", "visible": True}],
        "name": RESOURCE, "nineSlice": None, "origin": 9,
        "parent": {"name": "Normal", "path": "folders/Sprites/Player/Sonic/Normal.yy"},
        "preMultiplyAlpha": False, "resourceType": "GMSprite",
        "resourceVersion": "2.0",
        "sequence": {"$GMSequence": "v1", "%Name": RESOURCE, "autoRecord": True,
            "backdropHeight": 1080, "backdropImageOpacity": 0.5,
            "backdropImagePath": "", "backdropWidth": 1920,
            "backdropXOffset": 0.0, "backdropYOffset": 0.0,
            "events": {"$KeyframeStore<MessageEventKeyframe>": "", "Keyframes": [],
                "resourceType": "KeyframeStore<MessageEventKeyframe>",
                "resourceVersion": "2.0"},
            "eventStubScript": None, "eventToFunction": {},
            "length": float(len(frame_ids)), "lockOrigin": False,
            "moments": {"$KeyframeStore<MomentsEventKeyframe>": "", "Keyframes": [],
                "resourceType": "KeyframeStore<MomentsEventKeyframe>",
                "resourceVersion": "2.0"},
            "name": RESOURCE, "playback": 1, "playbackSpeed": 0.0,
            "playbackSpeedType": 1, "resourceType": "GMSequence",
            "resourceVersion": "2.0", "showBackdrop": True,
            "showBackdropImage": False, "timeUnits": 1,
            "tracks": [{"$GMSpriteFramesTrack": "", "builtinName": 0,
                "events": [], "inheritsTrackColour": True, "interpolation": 1,
                "isCreationTrack": False,
                "keyframes": {"$KeyframeStore<SpriteFrameKeyframe>": "",
                    "Keyframes": [keyframe(x, i) for i, x in enumerate(frame_ids)],
                    "resourceType": "KeyframeStore<SpriteFrameKeyframe>",
                    "resourceVersion": "2.0"},
                "modifiers": [], "name": "frames",
                "resourceType": "GMSpriteFramesTrack", "resourceVersion": "2.0",
                "spriteId": None, "trackColour": 0, "tracks": [], "traits": 0}],
            "visibleRange": None, "volume": 1.0, "xorigin": 16, "yorigin": 32},
        "swatchColours": None, "swfPrecision": 2.525,
        "textureGroupId": {"name": "Default", "path": "texturegroups/Default"},
        "type": 0, "VTile": False, "width": 24,
    }


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

    sprite_dir = project / "sprites" / RESOURCE
    sprite_dir.mkdir(parents=True, exist_ok=True)
    imported = []
    frame_ids = []
    for row in metadata["frames"]:
        source_id = row["animation_frame_index"]
        frame_id = FRAME_IDS[source_id]
        image = Image.open(source / f"frame-{int(source_id, 16):02X}.png").convert("RGBA")
        if image.size != (24, 32):
            raise AssertionError((source_id, image.size))
        rgba_hash = sha(image.tobytes())
        if rgba_hash != EXPECTED_RGBA[source_id] or rgba_hash != row["render"]["rgba_sha256"]:
            raise AssertionError((source_id, "canonical RGBA hash"))
        if (row["render"]["gamemaker_origin_x"], row["render"]["gamemaker_origin_y"]) != (16, 32):
            raise AssertionError((source_id, "origin"))
        root_png = sprite_dir / f"{frame_id}.png"
        layer_png = sprite_dir / "layers" / frame_id / f"{LAYER_ID}.png"
        layer_png.parent.mkdir(parents=True, exist_ok=True)
        image.save(root_png, optimize=True)
        image.save(layer_png, optimize=True)
        if root_png.read_bytes() != layer_png.read_bytes():
            raise AssertionError((source_id, "root/layer mismatch"))
        frame_ids.append(frame_id)
        imported.append({"source_frame": source_id, "frame_id": frame_id,
            "rgba_sha256": rgba_hash, "png_sha256": sha(root_png.read_bytes()),
            "root_png": root_png.relative_to(project).as_posix(),
            "layer_png": layer_png.relative_to(project).as_posix()})

    (sprite_dir / f"{RESOURCE}.yy").write_text(
        json.dumps(sprite_yy(frame_ids), indent=2) + "\n", encoding="utf-8")

    cache = project / "POC_notes" / "rom-cache"
    canonical = cache / "player-state-11-graphics.json"
    shutil.copyfile(source / "metadata.json", canonical)
    asset_path = cache / "player-state-11-poc-assets.json"
    asset_path.write_text(json.dumps({"format": 1, "rom_sha256": EXPECTED_ROM,
        "source_tool": "sonic-chaos-reference/tools/player_state_11_graphics.py",
        "resource": RESOURCE, "canvas": [24, 32], "origin": [16, 32],
        "image_speed": 0, "frame_mapping": {"0x38": 0, "0x39": 1, "0x3A": 2},
        "frames": imported}, indent=2) + "\n", encoding="utf-8")

    manifest_path = cache / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for path in (canonical, asset_path):
        raw = path.read_bytes()
        manifest["files"][path.name] = {"sha256": sha(raw), "bytes": len(raw)}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"resource": RESOURCE, "frames": 3,
        "rgba_sha256": EXPECTED_RGBA}, indent=2))


if __name__ == "__main__":
    main()
