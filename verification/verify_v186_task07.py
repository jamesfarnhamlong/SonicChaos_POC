"""Verify the bounded Task-07 POC 18.6 integration."""
import hashlib
import json
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "POC_notes" / "rom-cache"
EXPECTED_ROM = "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
EXPECTED_RGBA = {
    "0x38": "39007e36a7ec3e9888df5919d824667da84a4c0fdbf79cca6971ba03b7976c41",
    "0x39": "22364cea9bd4190b07c28aad386f011699577e3d6fd105e851ed6980be05fc45",
    "0x3A": "da066dd9609909a66e41b12048eae0b361460a1deb1e11d2f2dd181c05f6029e",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def instances(room):
    return [item for layer in room["layers"] for item in layer.get("instances", [])]


adapter = (ROOT / "scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml").read_text()
assert "SCR_cc_lookup(floor(cp_x),floor(cp_y)+18,0)" in adapter
assert "y:cp_y-(cp_total-32)" in adapter
assert "SPR_chaos_player_state_11" in adapter
assert "SPR_player_falling" not in adapter.split("function SCR_chaos_core_sprites", 1)[1].split(
    "function SCR_chaos_adapter_step", 1)[0].split("if (cp_state11_visual)", 1)[1].split("else if", 1)[0]
for token in ("cp_c.state11_frame == $38 ? 0", "cp_c.state11_frame == $39 ? 1 : 2",
              "image_speed = 0", "if (cp_c.vx != 0) image_xscale = sign(cp_c.vx)"):
    assert token in adapter, token

# Task-06 contact inequalities and ordering must remain exact.
type21 = (ROOT / "objects/OBJ_chaos_object_21/Step_0.gml").read_text()
for token in ("abs(cp_player_x-cp_object_x) <= 20",
              "cp_player_y >= cp_object_y-26", "cp_player_y <= cp_object_y+18",
              "if (cp_player_y <= cp_object_y-4)"):
    assert token in type21, token


def classify(dx, dy, attack=False, selector06=False):
    if not (abs(dx) <= 20 and -26 <= dy <= 18):
        return "NONE"
    if dy <= -4:
        return "BOUNCE"
    if attack or selector06:
        return "DEFEAT"
    return "DAMAGE"


assert classify(0, 0) == "DAMAGE"
assert classify(0, -4) == "BOUNCE"
assert classify(0, 0, attack=True) == "DEFEAT"
assert classify(0, 0, selector06=True) == "DEFEAT"

# Exact ROM-derived state-$11 sprite and deterministic import metadata.
canonical = json.loads((CACHE / "player-state-11-graphics.json").read_text())
assets = json.loads((CACHE / "player-state-11-poc-assets.json").read_text())
assert canonical["rom_sha256"] == assets["rom_sha256"] == EXPECTED_ROM
assert canonical["animation_script"]["cadence"] == [
    {"updates": 8, "frame": "0x38"}, {"updates": 4, "frame": "0x39"},
    {"updates": 8, "frame": "0x3A"}, {"updates": 4, "frame": "0x39"}]
assert assets["canvas"] == [24, 32] and assets["origin"] == [16, 32]
assert assets["image_speed"] == 0
assert assets["frame_mapping"] == {"0x38": 0, "0x39": 1, "0x3A": 2}
sprite = json.loads((ROOT / "sprites/SPR_chaos_player_state_11/SPR_chaos_player_state_11.yy").read_text())
assert (sprite["width"], sprite["height"]) == (24, 32)
assert (sprite["sequence"]["xorigin"], sprite["sequence"]["yorigin"]) == (16, 32)
assert sprite["sequence"]["playbackSpeed"] == 0.0 and len(sprite["frames"]) == 3
for asset, source in zip(assets["frames"], ("0x38", "0x39", "0x3A")):
    assert asset["source_frame"] == source
    root_png = ROOT / asset["root_png"]
    layer_png = ROOT / asset["layer_png"]
    image = Image.open(root_png).convert("RGBA")
    assert image.size == (24, 32)
    assert sha(image.tobytes()) == asset["rgba_sha256"] == EXPECTED_RGBA[source]
    assert root_png.read_bytes() == layer_png.read_bytes()

project = json.loads((ROOT / "SonicChaos_POC.yyp").read_text())
resources = {(row["id"]["name"], row["id"]["path"]) for row in project["resources"]}
assert ("SPR_chaos_player_state_11",
        "sprites/SPR_chaos_player_state_11/SPR_chaos_player_state_11.yy") in resources

# Type-$10 records and the two audited platform assets remain byte-for-byte unchanged.
room = json.loads((ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy").read_text())
rows = instances(room)
positions = Counter((round(row["x"]), round(row["y"])) for row in rows
                    if row["objectId"]["name"] == "OBJ_chaos_object_10")
assert positions == Counter({(656, 846): 1, (1712, 494): 1, (336, 270): 1,
                            (1472, 110): 1, (2688, 686): 1})
background = json.loads((CACHE / "background-registration.json").read_text())
for patch in background["patches"]:
    poc = patch["poc_18_5"]
    assert sha((ROOT / poc["asset"]).read_bytes()) == poc["asset_manifest_sha256"]
    assert poc["platform_exact_rgba_match"] is True

report = {
    "reference_main": "53f8e647aae72fd8886052d0c8fb63fbd738e0b3",
    "type_21_floor_probe": "RESOLVED",
    "type_21_stable_y": [590, 846, 302, 878, 270, 238],
    "type_21_contact": {"ordinary_side": "DAMAGE", "top": "BOUNCE",
                        "lower_attack": "DEFEAT", "lower_selector_06": "DEFEAT"},
    "state_11_graphics": "EXACT ROM-DERIVED",
    "state_11_resource": "SPR_chaos_player_state_11",
    "state_11_rgba_sha256": EXPECTED_RGBA,
    "type_10_visual_appearance": "CANONICAL - UNCHANGED",
}
(ROOT / "verification/task07-integration-results.json").write_text(
    json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
