"""Install the type-$10 selector-$03 graphics (THZ2 parameter $03) into the GameMaker POC.

Uses the reference tool tools/thz1_object_10_graphics.py exactly as import_type10_graphics.py does for selectors
$02/$04/$06 (same 4x nearest-neighbour audit renders, same canonical RGBA hash check, same sprite layout). Only the new
sprite SPR_chaos_object_10_03 and its manifest are written; the accepted 02/04/06 resources are not touched.

python POC_notes/import_type10_selector03.py ROM REFERENCE_TOOLS_DIR
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, sys, tempfile

ROOT = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument("rom", type=Path)
ap.add_argument("reference_tools", type=Path)
args = ap.parse_args()


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sys.path.insert(0, str(args.reference_tools))
ref = load(args.reference_tools / "thz1_object_10_graphics.py", "thz1_object_10_graphics")
imp = load(ROOT / "POC_notes/import_type10_graphics.py", "import_type10_graphics")
rom = args.rom.read_bytes()
ref.SELECTORS = (0x03,)
out = Path(tempfile.mkdtemp())
meta = ref.build_metadata(rom, out)
assert meta["rom_sha256"] == imp.EXPECTED_ROM
assert meta["palette"]["raw_sha256"] == imp.EXPECTED_PALETTE
variant = next(v for v in meta["variants"] if v["selector"] == "0x03" and v["player_type"] == "0x01")

RESOURCE = "SPR_chaos_object_10_03"
FRAME_IDS = ("1003000b-0000-4000-8000-00000000000b", "1003000c-0000-4000-8000-00000000000c")
LAYER_ID = "10030000-0000-4000-8000-000000000000"
sprite_dir = ROOT / "sprites" / RESOURCE
sprite_dir.mkdir(parents=True, exist_ok=True)
assets = []
for frame_meta, frame_id in zip(variant["frames"], FRAME_IDS):
    logical = imp.logical_image(out / frame_meta["png"], frame_meta["rgba_sha256"])
    assert logical.size == (32, 40)
    root_png, layer_png = imp.save_frame(logical, sprite_dir, frame_id, LAYER_ID)
    assets.append({"frame_index": frame_meta["frame_index"], "frame_id": frame_id,
        "reference_rgba_sha256": frame_meta["rgba_sha256"], "logical_rgba_sha256": imp.sha_bytes(logical.tobytes()),
        "png_sha256": imp.sha_bytes(root_png.read_bytes()),
        "root_png": root_png.relative_to(ROOT).as_posix(), "layer_png": layer_png.relative_to(ROOT).as_posix()})
yy = imp.sprite_yy(RESOURCE, FRAME_IDS, LAYER_ID, 32, 40, 16, 28, (4, 4, 27, 35))
(sprite_dir / f"{RESOURCE}.yy").write_text(json.dumps(yy, indent=2) + "\n")
manifest = {"format": 1, "rom_sha256": meta["rom_sha256"], "selector": "0x03", "player_type": "0x01",
    "generator": "POC_notes/import_type10_selector03.py", "resource": RESOURCE,
    "sources": [{k: s[k] for k in ("source_cpu", "source_rom", "byte_count", "vram_destination", "tile_bytes_sha256")}
                for s in variant["streams"]],
    "frames": assets}
dest = ROOT / "POC_notes/rom-cache/levels/thz2/object-10-selector-03.json"
dest.write_text(json.dumps(manifest, indent=2) + "\n")
print("installed", RESOURCE, [a["reference_rgba_sha256"][:12] for a in assets])
