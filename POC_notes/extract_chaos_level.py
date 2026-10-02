"""Render a THZ act's terrain from the canonical level package + the ROM.

Same composition rules as extract_chaos.py (the accepted THZ1 renderer), but the
layout comes from the level package instead of a hand-located stream:

* spring-class blocks (collision surface types 9/10/20 -> THZ1 blocks $30,$31,$33,$36,$38)
  inherit the surrounding backdrop instead of exposing the transparent plane;
* ring blocks $40-$45 are drawn as backdrop only (rings come from ring data).

`--act thz1 --out DIR` is the control run: it must reproduce the accepted THZ1
terrain quadrants byte for byte. `--act thz2 --project-root DIR` installs the four
THZ2 terrain sprites.
"""
from pathlib import Path
from PIL import Image
from collections import Counter
import argparse, hashlib, json, re, struct, uuid

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("rom", type=Path)
parser.add_argument("--act", choices=("thz1", "thz2", "thz3"), required=True)
parser.add_argument("--out", type=Path, default=Path("extracted"))
parser.add_argument("--project-root", type=Path)
args = parser.parse_args()
ROM = args.rom.read_bytes()
assert hashlib.sha256(ROM).hexdigest() == "eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607"
args.out.mkdir(parents=True, exist_ok=True)
PKG = ROOT / "POC_notes/rom-cache/levels" / args.act


def word(p): return struct.unpack_from('<H', ROM, p)[0]


def decompress(p):  # identical to extract_chaos.py
    n = word(p + 2); flags = p + word(p + 4); src = p + 6; tiles = []
    for t in range(n):
        mode = (ROM[flags + t // 4] >> (2 * (t % 4))) & 3
        b = bytearray(32)
        if mode == 1: b[:] = ROM[src:src + 32]; src += 32
        elif mode in (2, 3):
            mask = int.from_bytes(ROM[src:src + 4], 'little'); src += 4
            for i in range(32):
                if mask >> i & 1: b[i] = ROM[src]; src += 1
            if mode == 3:
                for i in range(0, 14, 2):
                    for k in (0, 1, 16, 17): b[i + k + 2] ^= b[i + k]
        tiles.append(bytes(b))
    return tiles


layout = json.loads((PKG / "layout.json").read_bytes())
cells = [c for row in layout["rows"] for c in row]
STRIDE = layout["dimensions"]["width_cells"]  # ROM row stride = map width (128 / 128 / 80)
assert len(cells) == STRIDE * layout["dimensions"]["height_cells"]
out = cells[:4095]  # loader bound: cell 4095 is never written -> stays backdrop (THZ3 has 1280 cells: unaffected)
surface = {int(b["block_id"], 16): b["collision_surface_type"] for b in layout["block_usage"]}
SPRING_BLOCK_IDS = {b for b, t in surface.items() if t in (9, 10, 20)}
RING_BLOCK_IDS = {0x40, 0x41, 0x42, 0x43, 0x44, 0x45}

pal = [((v & 3) * 85, ((v >> 2) & 3) * 85, ((v >> 4) & 3) * 85, 255) for v in ROM[0x3b79d:0x3b79d + 16]]
tiles = decompress(0x40f9e)
imgs = []
for t in tiles:
    im = Image.new('RGBA', (8, 8))
    im.putdata([pal[sum(((t[y * 4 + b] >> (7 - x)) & 1) << b for b in range(4))] for y in range(8) for x in range(8)])
    imgs.append(im)
blocks = []
for i in range(256):
    im = Image.new('RGBA', (32, 32), pal[0])
    for j in range(16):
        attr = word(0x44000 + (word(0x44000 + i * 2) - 0x8000) + j * 2); idx = (attr & 511) - 192
        if idx < 0 or idx >= len(imgs): continue
        tile = imgs[idx]
        if attr & 512: tile = tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if attr & 1024: tile = tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        im.paste(tile, ((j % 4) * 8, (j // 4) * 8))
    blocks.append(im)

W, H = layout["dimensions"]["width_pixels"], layout["dimensions"]["height_pixels"]
im = Image.new('RGBA', (W, H), pal[0])
for i, v in enumerate(out):
    if v < len(blocks): im.paste(blocks[v], ((i % STRIDE) * 32, (i // STRIDE) * 32))


def boundary_of(x, y):
    boundary = []
    if y > 0: boundary.extend(im.crop((x, y - 1, x + 32, y)).getdata())
    if y + 32 < im.height: boundary.extend(im.crop((x, y + 32, x + 32, y + 33)).getdata())
    if x > 0: boundary.extend(im.crop((x - 1, y, x, y + 32)).getdata())
    if x + 32 < im.width: boundary.extend(im.crop((x + 32, y, x + 33, y + 32)).getdata())
    return boundary


spring_context = []
for i, v in enumerate(out):
    if v not in SPRING_BLOCK_IDS: continue
    x = (i % STRIDE) * 32; y = (i // STRIDE) * 32
    backdrop = Counter(p for p in boundary_of(x, y) if p[3]).most_common(1)[0][0]
    block = blocks[v].copy()
    transparent_colour = Counter(block.getdata()).most_common(1)[0][0]
    block.putdata([backdrop if p == transparent_colour else p for p in block.getdata()])
    im.paste(block, (x, y))
    spring_context.append({'block_id': f'0x{v:02X}', 'world_x': x, 'world_y': y,
        'transparent_plane_rgba': list(transparent_colour), 'context_backdrop_rgba': list(backdrop)})

ring_cell_context = []
for i, v in enumerate(out):
    if v not in RING_BLOCK_IDS: continue
    x = (i % STRIDE) * 32; y = (i // STRIDE) * 32
    boundary = boundary_of(x, y)
    transparent_colour = Counter(blocks[v].getdata()).most_common(1)[0][0]
    matching = [p for p in boundary if p == transparent_colour]
    backdrop = transparent_colour if matching else Counter(p for p in boundary if p[3]).most_common(1)[0][0]
    im.paste(Image.new('RGBA', (32, 32), backdrop), (x, y))
    ring_cell_context.append({'block_id': f'0x{v:02X}', 'world_x': x, 'world_y': y,
        'transparent_plane_rgba': list(transparent_colour), 'context_backdrop_rgba': list(backdrop)})

im.save(args.out / f'{args.act}-map.png')
quadrants = [im.crop((q * 1024, 0, (q + 1) * 1024, 1024)) for q in range(-(-W // 1024))]   # THZ3 (2560x512): 3 sprites, the unused area is transparent
hashes = []
for q, quad in enumerate(quadrants):
    quad.save(args.out / f'{args.act}-terrain-{q}.png', optimize=True)
    hashes.append(hashlib.sha256((args.out / f'{args.act}-terrain-{q}.png').read_bytes()).hexdigest())
print(args.act, 'quadrant sha256', hashes)
print('spring-class blocks', sorted(hex(b) for b in SPRING_BLOCK_IDS), 'placed', len(spring_context),
      'ring cells stripped', len(ring_cell_context))


def gm_json(path): return json.loads(re.sub(r',\s*([}\]])', r'\1', path.read_text()))


if args.project_root:
    project = args.project_root.resolve()
    template_dir = project / 'sprites/SPR_chaos_terrain_0'
    template = (template_dir / 'SPR_chaos_terrain_0.yy').read_text()
    meta0 = gm_json(template_dir / 'SPR_chaos_terrain_0.yy')
    old_frame = meta0['frames'][0]['name']; old_layer = meta0['layers'][0]['name']
    old_key = re.search(r'"id": "([0-9a-f-]{36})"', template).group(1)
    assets = []
    for q, quad in enumerate(quadrants):
        name = f'SPR_chaos_{args.act}_terrain_{q}'
        seed = uuid.UUID('6f0c2a52-6a6c-4c8e-9d8e-7a3c1f4b9e10')
        frame = str(uuid.uuid5(seed, name + '/frame')); layer = str(uuid.uuid5(seed, name + '/layer'))
        key = str(uuid.uuid5(seed, name + '/key'))
        text = template.replace('SPR_chaos_terrain_0', name).replace(old_frame, frame) \
            .replace(old_layer, layer).replace(old_key, key)
        sprite_dir = project / 'sprites' / name
        (sprite_dir / 'layers' / frame).mkdir(parents=True, exist_ok=True)
        (sprite_dir / f'{name}.yy').write_bytes(text.encode())
        root_png = sprite_dir / f'{frame}.png'; layer_png = sprite_dir / 'layers' / frame / f'{layer}.png'
        quad.save(root_png, optimize=True); quad.save(layer_png, optimize=True)
        raw = root_png.read_bytes(); assert raw == layer_png.read_bytes()
        assets.append({'sprite': name, 'world_x': q * 1024, 'width': 1024, 'height': 1024,
            'root_png': root_png.relative_to(project).as_posix(), 'layer_png': layer_png.relative_to(project).as_posix(),
            'sha256': hashlib.sha256(raw).hexdigest()})
    # Break-replacement block art (type-13 handler $7898 writes block $9D): one opaque 32x32 overlay sprite.
    replacement_assets = []
    if args.act == 'thz2':   # THZ3 reuses SPR_chaos_thz2_block_9d (same block art)
        tmpl_dir = project / 'sprites/SPR_chaos_block_46'
        tmpl = (tmpl_dir / 'SPR_chaos_block_46.yy').read_text()
        seed = uuid.UUID('6f0c2a52-6a6c-4c8e-9d8e-7a3c1f4b9e10')
        for block in (0x9D,):
            name = f'SPR_chaos_thz2_block_{block:02x}'
            frame = str(uuid.uuid5(seed, name + '/frame')); layer = str(uuid.uuid5(seed, name + '/layer'))
            text = (tmpl.replace('SPR_chaos_block_46', name).replace('46000000-0000-4000-8000-000000000046', frame)
                    .replace('46000000-0000-4000-8000-000000000000', layer))
            sprite_dir = project / 'sprites' / name
            (sprite_dir / 'layers' / frame).mkdir(parents=True, exist_ok=True)
            (sprite_dir / f'{name}.yy').write_bytes(text.encode())
            root_png = sprite_dir / f'{frame}.png'; layer_png = sprite_dir / 'layers' / frame / f'{layer}.png'
            blocks[block].save(root_png, optimize=True); blocks[block].save(layer_png, optimize=True)
            raw = root_png.read_bytes(); assert raw == layer_png.read_bytes()
            replacement_assets.append({'sprite': name, 'block_id': f'0x{block:02X}', 'width': 32, 'height': 32,
                'root_png': root_png.relative_to(project).as_posix(), 'layer_png': layer_png.relative_to(project).as_posix(),
                'sha256': hashlib.sha256(raw).hexdigest(),
                'rule': 'ROM handler $7898 writes block $9D; overlay drawn over broken cells'})
    manifest = {'format': 1, 'act': args.act, 'replacement_blocks': replacement_assets, 'rom_sha256': hashlib.sha256(ROM).hexdigest(),
        'generator': 'POC_notes/extract_chaos_level.py',
        'layout_runtime_cells_sha256': hashlib.sha256(bytes(out)).hexdigest(),
        'context_composited_spring_block_ids': [f'0x{x:02X}' for x in sorted(SPRING_BLOCK_IDS)],
        'spring_class_rule': 'collision surface type 9/10/20 (reproduces THZ1 $30,$31,$33,$36,$38)',
        'object_only_ring_block_ids': [f'0x{x:02X}' for x in sorted(RING_BLOCK_IDS)],
        'spring_placements': spring_context, 'ring_cells_removed': ring_cell_context, 'assets': assets}
    (PKG / 'terrain-assets.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('installed', [a['sprite'] for a in assets])
