"""Independent ROM composition checks for the MGHZ3 boss package + a verification PNG made from the SHIPPED sprites.

Not a gameplay screenshot and not a new approval board: the art was approved on 2026-10-04 (Research art-approval.json, frames 0..6/11..15).
Every shipped frame is recomposed from the verified local ROM through Research's own tools and must be byte-identical (zero pixel differences).
"""
import hashlib, json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT.parent / 'sonic-chaos-reference-work'
sys.path.insert(0, str(RES / 'tools'))
import level_package as L
import mghz_object_census as C
import thz1_object_assets as G
import thz1_type18_dynamic_graphics as D

OUT = ROOT / 'verification/mghz-m4'
OUT.mkdir(parents=True, exist_ok=True)
checks = 0
CANVAS, ANCHOR, REG = (64, 96), (32, 64), (1, 18)


def check(a, b, name):
    global checks
    assert a == b, name
    checks += 1


def sprite(name):
    meta = json.loads((ROOT / f'sprites/{name}/{name}.yy').read_text())
    return [Image.open(ROOT / f'sprites/{name}/{f["name"]}.png').convert('RGBA') for f in meta['frames']], (meta['sequence']['xorigin'], meta['sequence']['yorigin']), meta


def compose(image, palette, canvas=CANVAS, anchor=ANCHOR):
    im = Image.new('RGBA', canvas)
    for p in reversed(image['pieces']):
        tile = Image.new('RGBA', (8, len(p['pixels'])))
        tile.putdata([tuple(palette[c]) if c else (0, 0, 0, 0) for row in p['pixels'] for c in row])
        im.alpha_composite(tile, (anchor[0] + p['x'], anchor[1] + p['y']))
    return im


def opaque(im, origin):
    """Opaque pixels as {(x, y): rgba} in SAT-relative + registration coordinates (canvas-independent)."""
    out = {}
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]:
                out[(x - origin[0], y - origin[1])] = px[x, y]
    return out


rom = L.load_rom(ROOT.parent / 'source/Sonic Chaos (Europe).sms')
rom_sha = hashlib.sha256(rom).hexdigest()
cache = ROOT / 'POC_notes/rom-cache/mghz'
imp = json.loads((cache / 'boss-56-import.json').read_text())
approval = json.loads((cache / 'art-approval.json').read_text())
check(rom_sha, imp['rom_sha256'], 'ROM SHA256')
check(rom_sha, approval['rom_sha256'], 'approval ROM SHA256')
for n in ('boss-56-runtime', 'boss-56-fullgame', 'boss-56-implementation-manifest'):
    check((cache / f'{n}.json').read_bytes(), (RES / f'data/rom-cache/mghz/{n}.json').read_bytes(), f'{n} byte-exact Research mirror')
check(imp['research_commit'], 'e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f', 'Research commit')

a3 = C.vram_for_act(rom, 2)
dyn_cpu, dyn = D.dynamic_list_for_selector(rom, 0x16)
vram = bytearray(a3['vram'])
D.apply_dynamic_entries(vram, rom, dyn)
vram = bytes(vram)
pal15 = G.palette_rgba(rom, 15)
flash = [tuple(c) for c in pal15]
flash[13] = flash[14] = (255, 255, 255, 255)
check(sorted(i for i in range(16) if G.palette_rgba(rom, 9)[i] != pal15[i]), [13, 14, 15], 'palette 15 differs from palette 9 only at 13/14/15')

BOSS_FRAMES = [1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15]
frames_total = 0
shipped = {}
for name, pal, label in (('SPR_chaos_mghz_boss_56', pal15, 'boss/children'), ('SPR_chaos_mghz_boss_56_flash', flash, 'command-7 flash')):
    frames, origin, meta = sprite(name)
    shipped[name] = frames
    check(len(frames), len(BOSS_FRAMES), name + ' frames')
    check(origin, (ANCHOR[0] - REG[0], ANCHOR[1] - REG[1]), name + ' accepted SAT registration (+1,+18)')
    check((meta['width'], meta['height']), CANVAS, name + ' canvas')
    for i, f in enumerate(BOSS_FRAMES):
        rec = C.frame_record(rom, 0x56, f, 0, 0, vram, flips=(False,))
        decoded = rec['images'][0]
        check(decoded['composed_index_sha256'], approval['subjects']['0x56']['frame_hashes'][str(f)][0], f'{name} approved composition hash f{f}')
        check(frames[i].tobytes(), compose(decoded, pal).tobytes(), f'{name} byte-identical f{f}')
        check(hashlib.sha256(frames[i].tobytes()).hexdigest(), next(a['rgba_sha256'] for a in imp['assets'] if a['resource'] == name and a['mapping_frame'] == f), 'manifest hash')
        frames_total += 1
# the flash variant differs from the normal one only where palette entries 13/14 are used
for i in range(len(BOSS_FRAMES)):
    a, b = shipped['SPR_chaos_mghz_boss_56'][i].load(), shipped['SPR_chaos_mghz_boss_56_flash'][i].load()
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            if a[x, y] != b[x, y]:
                check(b[x, y], (255, 255, 255, 255), 'flash recolours to white only')
                check(a[x, y][:3] in (tuple(pal15[13][:3]), tuple(pal15[14][:3])), True, 'flash replaces entries 13/14 only')
for name, typ, base, frames_wanted in (('SPR_chaos_mghz_boss_puff_34', 0x34, 0x6E, [1, 2, 3, 4]), ('SPR_chaos_mghz_boss_sparkle_0A', 0x0A, 0, [5, 6])):
    frames, origin, meta = sprite(name)
    check(len(frames), len(frames_wanted), name + ' frames')
    check(origin, (ANCHOR[0] - REG[0], ANCHOR[1] - REG[1]), name + ' registration')
    for i, f in enumerate(frames_wanted):
        decoded = C.frame_record(rom, typ, f, base, base, vram, flips=(False,))['images'][0]
        check(frames[i].tobytes(), compose(decoded, pal15).tobytes(), f'{name} byte-identical f{f}')
        frames_total += 1
# boss-chain $0F poof (+(1,18) like the rest of the chain) and its relation to the accepted enemy poof resource: same pixels, different registration
accepted, accepted_origin, _ = sprite('SPR_chaos_mghz_poof')
poof, poof_origin, _ = sprite('SPR_chaos_mghz_boss_poof_0F')
check(poof_origin, (ANCHOR[0] - REG[0], ANCHOR[1] - REG[1]), 'boss poof registration')
check(len(poof), 3, 'boss poof frames')
for i, f in enumerate((7, 8, 9)):
    decoded = C.frame_record(rom, 0x0F, f, 0, 0, vram, flips=(False,))['images'][0]
    check(poof[i].tobytes(), compose(decoded, pal15).tobytes(), f'boss poof byte-identical f{f}')
    # accepted resource: origin (8,16) draws the composed SAT pixels at (x-8, y-16); the boss chain draws them at (x+SAT+1, y+SAT+18)
    a = opaque(accepted[i], accepted_origin)
    b = {(x + REG[0], y + REG[1]): v for (x, y), v in opaque(poof[i], (ANCHOR[0] - REG[0], ANCHOR[1] - REG[1])).items()}
    shift = (min(k[0] for k in a) - min(k[0] for k in b), min(k[1] for k in a) - min(k[1] for k in b))
    check({(x - shift[0], y - shift[1]): v for (x, y), v in a.items()}, b, f'accepted enemy poof f{f} has the same pixels (translated by {shift})')
    check(decoded['composed_index_sha256'], C.frame_record(rom, 0x0F, f, 0, 0, bytes(C.vram_for_act(rom, 0)['vram']), flips=(False,))['images'][0]['composed_index_sha256'], 'poof tiles shared with MGHZ1')
    frames_total += 1

# ---- verification sheet from shipped pixels (no gameplay claim) ------------------------------------------------------------------------------------------
font = ImageFont.load_default(size=13)
small = ImageFont.load_default(size=11)
sheet = Image.new('RGBA', (1100, 770), (30, 36, 45, 255))
d = ImageDraw.Draw(sheet)
d.text((16, 10), 'MGHZ M4 | boss $56 / children $57,$58 | shipped sprites, unmirrored | Research badba9d', font=font, fill='white')
d.text((16, 30), 'Row 1: palette 15 frames 1-6, 11-15. Row 2: command-7 flash (entries 13/14 white). Row 3: $34 puff 1-4, $0A sparkle 5-6, shared $0F poof 7-9.', font=small, fill=(190, 205, 220))
for row, name in enumerate(('SPR_chaos_mghz_boss_56', 'SPR_chaos_mghz_boss_56_flash')):
    for i, im in enumerate(shipped[name]):
        sheet.alpha_composite(im.crop((0, 0, 64, 96)), (16 + i * 96, 52 + row * 100))
        d.text((16 + i * 96, 52 + row * 100 + 84), f'f{BOSS_FRAMES[i]}', font=small, fill='white')
x = 16
for name in ('SPR_chaos_mghz_boss_puff_34', 'SPR_chaos_mghz_boss_sparkle_0A', 'SPR_chaos_mghz_boss_poof_0F'):
    frames, origin, _ = sprite(name)
    for im in frames:
        sheet.alpha_composite(im.crop((0, 0, 64, 64)), (x, 258))
        x += 70
# composition at the canonical and widened locked camera (anchor = world (3269,288); camera Y 256): screen X = W-47 settled
def preview(width, ox, oy):
    im = Image.new('RGBA', (width, 192), (63, 74, 85, 255))
    pd = ImageDraw.Draw(im)
    for gx in range(0, width, 32):
        pd.line((gx, 0, gx, 191), fill=(75, 88, 102, 255))
    for gy in range(0, 192, 32):
        pd.line((0, gy, width - 1, gy), fill=(75, 88, 102, 255))
    cam_x = 3269 - (width - 48) - 1
    bx, by = 3269 - cam_x, 288 - 256
    frame = shipped['SPR_chaos_mghz_boss_56'][1]
    im.alpha_composite(frame, (bx - (ANCHOR[0] - REG[0]), by - (ANCHOR[1] - REG[1])))
    proj = shipped['SPR_chaos_mghz_boss_56'][6]
    for k in range(0, 5):
        im.alpha_composite(proj, (bx - 20 - k * 40 - (ANCHOR[0] - REG[0]), by + 24 + (k % 2) * 12 - (ANCHOR[1] - REG[1])))
    pd.rectangle((bx - 16, by - 48, bx + 15, by + 24), outline=(255, 90, 90, 255))
    pd.text((4, 4), f'width {width}: settled camera {cam_x}, boss screen X {bx} (RIGHT-47)', font=small, fill='white')
    return im
for width, pos in ((256, (16, 340)), (348, (300, 340)), (640, (16, 548))):
    sheet.alpha_composite(preview(width, 0, 0), pos)
d = ImageDraw.Draw(sheet)
d.text((16, 748), 'Verification only: SAT-relative registration (+1,+18); red box = canonical 16x48 collision extents at the unmoved world anchor. 0 pixel differences.', font=small, fill='white')
sheet.save(OUT / 'm4-verification-sheet.png')
report = {'status': 'PASS', 'assertions': checks, 'frames': frames_total, 'pixel_differences': 0, 'sheet': 'm4-verification-sheet.png', 'rom_sha256': rom_sha,
          'resources': ['SPR_chaos_mghz_boss_56', 'SPR_chaos_mghz_boss_56_flash', 'SPR_chaos_mghz_boss_puff_34', 'SPR_chaos_mghz_boss_sparkle_0A', 'SPR_chaos_mghz_boss_poof_0F']}
(OUT / 'asset-results.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
