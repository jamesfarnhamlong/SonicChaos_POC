"""Extract positively identified THZ enemy tile art from the checked SMS ROM.

This caches native 8x8 tiles and inspection atlases only. It does not guess sprite
mappings, frame composition, object anchors, or collision bounds.
"""
import argparse, hashlib, json, struct
from pathlib import Path
from PIL import Image

EXPECTED_SHA256 = "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
ASSETS = (
    ("flying_enemy_right", 0x255A0, "Object $21 uses the airborne patrol routine; THZ loads this labelled art."),
    ("flying_enemy_left", 0x25690, "Opposite-facing tile set paired with the same object $21 routine."),
    ("motobug", 0x25AB0, "Object $27 initializes with ground velocity and uses the THZ motobug art."),
)
PALETTE_OFFSET = 0x3B79D

def word(data, pos):
    return struct.unpack_from("<H", data, pos)[0]

def decompress(data, pos):
    count = word(data, pos + 2)
    flags = pos + word(data, pos + 4)
    source = pos + 6
    tiles = []
    for tile_index in range(count):
        mode = (data[flags + tile_index // 4] >> (2 * (tile_index % 4))) & 3
        tile = bytearray(32)
        if mode == 1:
            tile[:] = data[source:source + 32]
            source += 32
        elif mode in (2, 3):
            mask = int.from_bytes(data[source:source + 4], "little")
            source += 4
            for i in range(32):
                if (mask >> i) & 1:
                    tile[i] = data[source]
                    source += 1
            if mode == 3:
                for i in range(0, 14, 2):
                    for k in (0, 1, 16, 17):
                        tile[i + k + 2] ^= tile[i + k]
        tiles.append(bytes(tile))
    return tiles, source, flags + (count + 3) // 4

def palette(data):
    out = []
    for value in data[PALETTE_OFFSET:PALETTE_OFFSET + 16]:
        out.append(((value & 3) * 85, ((value >> 2) & 3) * 85,
                    ((value >> 4) & 3) * 85, 0 if len(out) == 0 else 255))
    return out

def render_tile(raw, colors):
    image = Image.new("RGBA", (8, 8))
    pixels = []
    for y in range(8):
        for x in range(8):
            index = sum(((raw[y * 4 + plane] >> (7 - x)) & 1) << plane for plane in range(4))
            pixels.append(colors[index])
    image.putdata(pixels)
    return image

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rom", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/rom-cache/thz1/enemy-art"))
    args = parser.parse_args()
    data = args.rom.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError("ROM hash differs; art offsets are revision-specific")
    args.output.mkdir(parents=True, exist_ok=True)
    colors = palette(data)
    manifest = {"rom_sha256": digest, "palette_offset": f"0x{PALETTE_OFFSET:05X}",
        "scope": "Native decompressed tiles only; frame mappings remain unclaimed.", "assets": []}
    for name, offset, linkage in ASSETS:
        tiles, data_end, flags_end = decompress(data, offset)
        width = 8 * len(tiles)
        atlas = Image.new("RGBA", (width, 8), (0, 0, 0, 0))
        for i, raw in enumerate(tiles):
            atlas.paste(render_tile(raw, colors), (i * 8, 0))
        native = args.output / f"{name}-tiles.png"
        preview = args.output / f"{name}-preview.png"
        atlas.save(native)
        atlas.resize((width * 4, 32), Image.Resampling.NEAREST).save(preview)
        manifest["assets"].append({"name": name, "rom_offset": f"0x{offset:05X}",
            "tile_count": len(tiles), "native_png": native.name, "preview_png": preview.name,
            "compressed_data_end": f"0x{data_end:05X}", "flags_end": f"0x{flags_end:05X}",
            "object_linkage": linkage})
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"assets": len(manifest["assets"]),
        "tiles": sum(a["tile_count"] for a in manifest["assets"])}, indent=2))

if __name__ == "__main__":
    main()

