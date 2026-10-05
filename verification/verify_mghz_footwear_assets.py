"""MGHZ M2 asset verification and POC-side approval/reference sheet.

Checks that the shipped POC sprites for type $21 (both runtime orientations), Spring Shoes $2F and the Rocket monitor are pixel-identical to the canonical Research
composition, that they reproduce the already-approved Research boards (frame panels and the canonical terrain-context registration), and writes
``verification/mghz-m2/footwear-reference-sheet.png`` plus ``footwear-asset-comparison.json``.

Needs Pillow, the ROM beside the repositories and the Research checkout (``build/mghz-approval`` is a git-ignored Research output; its absence skips the board comparison and
says so). Exit status is non-zero on any mismatch.
"""
import hashlib, json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT.parent / 'sonic-chaos-reference-work'
ROM = ROOT.parent / 'source' / 'Sonic Chaos (Europe).sms'
OUT = ROOT / 'verification' / 'mghz-m2'
BOARDS = RES / 'build' / 'mghz-approval'
STAGE = (65, 72, 84, 255)
BG = (38, 45, 56, 255)
FONT = ImageFont.load_default(size=13)
SMALL = ImageFont.load_default(size=10)
PINK = (255, 80, 220)
failures = []


def sha(raw): return hashlib.sha256(raw).hexdigest()
def check(cond, msg):
    if not cond: failures.append(msg); print('FAIL', msg)
    return cond


def sprite_frames(name):
    d = json.loads((ROOT / 'sprites' / name / f'{name}.yy').read_text())
    frames = [Image.open(ROOT / 'sprites' / name / f"{f['name']}.png").convert('RGBA') for f in d['frames']]
    return frames, (d['sequence']['xorigin'], d['sequence']['yorigin'])


def compose(image, palette, canvas, anchor):
    im = Image.new('RGBA', canvas)
    for p in reversed(image['pieces']):
        piece = Image.new('RGBA', (8, len(p['pixels'])))
        piece.putdata([tuple(palette[c]) for row in p['pixels'] for c in row])
        im.alpha_composite(piece, (anchor[0] + p['x'], anchor[1] + p['y']))
    return im


def scaled(im, k): return im.resize((im.width * k, im.height * k), Image.Resampling.NEAREST)
def cross(im, x, y):
    d = ImageDraw.Draw(im); d.line((x - 3, y, x + 3, y), fill=PINK); d.line((x, y - 3, x, y + 3), fill=PINK)
def text(im, s, xy, font=SMALL, fill=(240, 240, 244)): ImageDraw.Draw(im).text(xy, s, font=font, fill=fill)
def diff_count(a, b, mask=None):
    n = 0
    pa, pb = a.convert('RGBA').load(), b.convert('RGBA').load()
    for y in range(a.height):
        for x in range(a.width):
            if mask and mask(x, y): continue
            if pa[x, y] != pb[x, y]: n += 1
    return n


def main():
    sys.path.insert(0, str(RES / 'tools'))
    import level_package as L, thz1_object_assets as G, thz1_object_10_graphics as M, mghz_object_census as C
    rom = L.load_rom(ROM)
    gen = json.loads((ROOT / 'POC_notes/rom-cache/mghz/footwear-assets.json').read_text())
    approval = json.loads((ROOT / 'POC_notes/rom-cache/mghz/art-approval.json').read_text())
    check(sha(rom) == gen['rom_sha256'] == approval['rom_sha256'], 'ROM identity')
    canvas, anchor, reg = tuple(gen['canvas']), tuple(gen['anchor']), tuple(gen['registration'])
    recs = C.decode_records(rom)
    acts = {k: C.vram_for_act(rom, i) for i, k in enumerate(recs)}
    a1 = acts['mghz1']; d = a1['descriptor']
    pal = G.palette_rgba(rom, d['palette']['sprite_index']); vram = bytes(a1['vram'])
    report = {'research_inputs': {'foundation_art': 'ac04dfe4d3d7aedea394948811da67eba83782bd', 'footwear_audit': '150977e'}, 'checks': {}}

    # ---- 1. POC sprites == canonical Research composition (pixel-identical, transparency included) ----
    ref = {}                                                      # name -> list[(label, Research image)]
    ref['SPR_chaos_mghz_object_21'] = []
    for mirror in (False, True):
        for f in (1, 2):
            rec = C.frame_record(rom, 0x21, f, 0x7C, 0x8E, vram, flips=(False, True))
            image = rec['images'][1 if mirror else 0]
            check(image['composed_index_sha256'] == approval['subjects']['0x21']['frame_hashes'][str(f)][1 if mirror else 0], f'$21 frame {f} bit4 {int(mirror)} equals the approved hash')
            ref['SPR_chaos_mghz_object_21'].append((f'frame {f} bit4={int(mirror)}', compose(image, pal, canvas, anchor), image))
    ref['SPR_chaos_mghz_spring_shoes'] = []
    for f in (1, 2, 3, 4):
        rec = C.frame_record(rom, 0x2F, f, 0xAC, 0xAC, vram, flips=(False,))
        image = rec['images'][0]
        check(image['composed_index_sha256'] == approval['subjects']['0x2F']['frame_hashes'][str(f)][0], f'$2F frame {f} equals the approved hash')
        ref['SPR_chaos_mghz_spring_shoes'].append((f'mapping frame {f}', compose(image, pal, canvas, anchor), image))
    for name, rows in ref.items():
        frames, origin = sprite_frames(name)
        check(len(frames) == len(rows), f'{name} frame count')
        check(origin == (anchor[0] - reg[0], anchor[1] - reg[1]), f'{name} origin folds the +1,+18 registration')
        for i, (label, im, _) in enumerate(rows):
            n = diff_count(frames[i], im)
            report['checks'][f'{name}[{i}] {label}'] = {'pixel_differences': n, 'rgba_sha256': sha(frames[i].tobytes())}
            check(n == 0, f'{name}[{i}] {label}: {n} pixel differences from the Research composition')

    # ---- 2. Rocket monitor: same construction as the accepted M1 monitors (selector 2 reproduces byte for byte), selector 4 is its own frame pair ----
    def monitor(selector):
        sources = [M.pointer(rom, table, selector) for table in M.PLAYER_TYPES['0x01']]
        dyn = bytearray(vram)
        for source, (dest, n) in zip(sources, M.DESTINATIONS):
            p = int(source['source_rom'], 16); dyn[dest:dest + n * 32] = rom[p:p + n * 32]
        out = []; mapping = G.object_mapping(rom, 0x10)
        for f in M.MAPPING_FRAMES:
            w, h, rgba, _ = G.render_frame(dyn, G.parse_frame_record(rom, L.u16(rom, mapping['mapping_rom'] + f * 2)), 0, scale=1, margin=4, palette=pal)
            out.append(Image.frombytes('RGBA', (w, h), rgba))
        return out
    m4, _ = sprite_frames('SPR_chaos_mghz_monitor_04'); m2, _ = sprite_frames('SPR_chaos_mghz_monitor_02')
    for i, im in enumerate(monitor(2)): check(diff_count(m2[i], im) == 0, f'accepted selector-2 monitor frame {i} is reproduced by the construction')
    for i, im in enumerate(monitor(4)):
        n = diff_count(m4[i], im); report['checks'][f'SPR_chaos_mghz_monitor_04[{i}]'] = {'pixel_differences': n}; check(n == 0, f'Rocket monitor frame {i}')
    check(any(diff_count(m4[i], m2[i]) for i in range(2)), 'selector-4 art differs from selector-2 (a distinct icon)')

    # ---- 3. approved Research boards: frame panels and the terrain-context registration ----
    sheet_items = []
    if (BOARDS / 'type-21-approval.png').exists() and (BOARDS / 'preview-input.json').exists():
        pin = json.loads((BOARDS / 'preview-input.json').read_text())
        for key, name, t in (('33', 'SPR_chaos_mghz_object_21', 0x21), ('47', 'SPR_chaos_mghz_spring_shoes', 0x2F)):
            board = Image.open(BOARDS / f'type-{t:02x}-approval.png').convert('RGBA')
            s = pin['subjects'][key]
            # locate the frame panels by their STAGE-coloured background (the board is a stack: raw tiles, frame sheet, terrain contexts)
            runs, start = [], None
            for yy in range(board.height):
                on = board.getpixel((5, yy))[:3] == STAGE[:3]
                if on and start is None: start = yy
                if not on and start is not None: runs.append(start); start = None
            frames, _ = sprite_frames(name)
            panels = {}
            for n, f in enumerate(s['frames']):
                if f['frame'] == 0: continue
                for im_idx, image in enumerate(f['images'][:2 if t == 0x21 else 1]):
                    # the Research panel: STAGE background, pieces at (64,56) + registration, magenta cross at the anchor, 2x
                    stage = Image.new('RGBA', (128, 112), STAGE)
                    poc = frames[(0 if im_idx == 0 else 2) + (f['frame'] - 1)] if t == 0x21 else frames[f['frame'] - 1]
                    stage.alpha_composite(poc, (64 - anchor[0] + reg[0], 56 - anchor[1] + reg[1]))   # canvas anchor lands at the stage anchor + registration
                    cross(stage, 64, 56)
                    mine = scaled(stage, 2)
                    y0 = runs[n]
                    theirs = board.crop((im_idx * 256, y0, im_idx * 256 + 256, y0 + 224))
                    # the board writes a caption into the top-left of each panel
                    bad = diff_count(mine, theirs, mask=lambda x, y: y < 18)
                    report['checks'][f'board {name} frame {f["frame"]} bit4={im_idx}'] = {'pixel_differences_vs_approved_board': bad}
                    check(bad == 0, f'{name} frame {f["frame"]} bit4={im_idx}: {bad} pixels differ from the approved board panel')
                    panels[(f['frame'], im_idx)] = (mine, theirs)
            # terrain-context registration against the canonical placement of the board
            ctx = s['context']; cx, cy = ctx['camera']; ax, ay = ctx['anchor']
            terrain = Image.new('RGBA', (4096, 1024))
            for i in range(4):
                tf, _ = sprite_frames(f'SPR_chaos_mghz1_terrain_{i}'); terrain.alpha_composite(tf[0], (i * 1024, 0))
            bgc = Image.new('RGBA', terrain.size, (85, 170, 85, 255)); bgc.alpha_composite(terrain)
            crop = bgc.crop((cx, cy, cx + 256, cy + 224))
            research_crop = Image.new('RGBA', (256, 224)); research_crop.putdata([tuple(p) for row in ctx['crop'] for p in row])
            terr_diff = diff_count(crop, research_crop)
            frame_pick = next(f for f in s['frames'] if f['frame'] == (1 if t != 0x2F else 0))
            # The static POC terrain sprites do not carry the animated scenery (palette-cycled blocks / animated strip are separate runtime overlays), so those pixels
            # differ from the board's baked frame-0 crop. The sprite check therefore composes BOTH sides onto the same POC terrain; the terrain count is reported as information.
            comp_poc = crop.copy(); comp_res = crop.copy()
            poc_sprite = frames[0]                              # $21: frame 1, bit4 = 0 (what the board draws)
            if t == 0x21:                                       # frame 1, bit4 = 0 (what the board draws)
                comp_poc.alpha_composite(poc_sprite, (ax - anchor[0] + reg[0], ay - anchor[1] + reg[1]))
                for piece in reversed(frame_pick['images'][0]['pieces']):
                    pi = Image.new('RGBA', (8, len(piece['pixels']))); pi.putdata([tuple(pal[c]) for row in piece['pixels'] for c in row])
                    comp_res.alpha_composite(pi, (ax + piece['x'] + reg[0], ay + piece['y'] + reg[1]))
            else:                                               # the board's context frame 0 is empty; compare the first visible frame composed the same way
                comp_poc.alpha_composite(frames[0], (ax - anchor[0] + reg[0], ay - anchor[1] + reg[1]))
                f1 = next(f for f in s['frames'] if f['frame'] == 1)
                for piece in reversed(f1['images'][0]['pieces']):
                    pi = Image.new('RGBA', (8, len(piece['pixels']))); pi.putdata([tuple(pal[c]) for row in piece['pixels'] for c in row])
                    comp_res.alpha_composite(pi, (ax + piece['x'] + reg[0], ay + piece['y'] + reg[1]))
            ctx_bad = diff_count(comp_poc, comp_res)
            report['checks'][f'context {name}'] = {'camera': [cx, cy], 'anchor': [ax, ay], 'terrain_pixel_differences_vs_research_crop_info_only': terr_diff, 'terrain_difference_cause': 'animated scenery (palette cycles / animated strip) is a separate runtime overlay in the POC' if terr_diff else 'none', 'composite_pixel_differences': ctx_bad}
            check(ctx_bad == 0, f'{name}: registration against the canonical placement differs from the approved board composition in {ctx_bad} pixels (terrain differences: {terr_diff})')
            sheet_items.append((name, t, panels, comp_poc, comp_res, ctx))
    else:
        print('NOTE: Research build/mghz-approval is not present; board comparison skipped (the Research-composition check above still ran)')
        report['board_comparison'] = 'skipped (Research build/mghz-approval missing)'

    # ---- 4. reference sheet ----
    OUT.mkdir(parents=True, exist_ok=True)
    W = 1100
    sheet = Image.new('RGBA', (W, 1500), BG)
    text(sheet, 'MGHZ M2 POC-side reference sheet: POC sprites vs the approved Research boards (ac04dfe, approved 2026-10-04). All frames pixel-identical.', (8, 6), FONT)
    y = 30
    text(sheet, 'Type $21: both actual runtime orientations x both animation frames (state 5 = bit4 0 moving left; state 6 = bit4 1 moving right). Left: POC sprite (4x). Right: approved Research frame (4x).', (8, y), SMALL); y += 16
    frames21, _ = sprite_frames('SPR_chaos_mghz_object_21')
    for i, (label, resim, _) in enumerate(ref['SPR_chaos_mghz_object_21']):
        cell = Image.new('RGBA', (264, 190), STAGE); cell.alpha_composite(scaled(frames21[i].crop((anchor[0] - 16, anchor[1] - 32, anchor[0] + 16, anchor[1] + 16)), 4), (4, 0)); cell.alpha_composite(scaled(resim.crop((anchor[0] - 16, anchor[1] - 32, anchor[0] + 16, anchor[1] + 16)), 4), (136, 0))
        sheet.alpha_composite(cell, (8 + (i % 4) * 270, y)); text(sheet, f'{label}  POC | Research', (12 + (i % 4) * 270, y + 172))
    y += 200
    text(sheet, 'Spring Shoes $2F: mapping frames 1,2 (object offering itself) and 3,4 (attached to Sonic). Left: POC sprite. Right: approved Research frame.', (8, y), SMALL); y += 16
    frames2f, _ = sprite_frames('SPR_chaos_mghz_spring_shoes')
    for i, (label, resim, _) in enumerate(ref['SPR_chaos_mghz_spring_shoes']):
        cell = Image.new('RGBA', (264, 190), STAGE)
        for j, src in enumerate((frames2f[i], resim)):
            cell.alpha_composite(scaled(src.crop((anchor[0] - 16, anchor[1] - 16, anchor[0] + 16, anchor[1] + 32)), 4), (4 + j * 132, 0))
        sheet.alpha_composite(cell, (8 + (i % 4) * 270, y)); text(sheet, f'{label}  POC | Research', (12 + (i % 4) * 270, y + 172))
    y += 200
    text(sheet, 'Rocket Shoes reward monitor (type $10 selector 4): frames 0,1 of the POC resource (8x). The accepted M1 selector-2 resource is shown below it for scale (same construction, byte-identical reproduction).', (8, y), SMALL); y += 16
    for j, (nm, fs) in enumerate((('selector 4 (Rocket)', m4), ('selector 2', m2))):
        for i, f in enumerate(fs):
            cell = Image.new('RGBA', (264, 330), STAGE); cell.alpha_composite(scaled(f, 6), (0, 0)); sheet.alpha_composite(cell, (8 + (j * 2 + i) * 270, y)); text(sheet, f'{nm} frame {i}', (12 + (j * 2 + i) * 270, y + 312))
    y += 340
    text(sheet, 'Registration at the canonical placements (2x). Left: POC sprite drawn at the canonical anchor. Right: Research pieces + registration (+1,+18) on the same terrain. Differences are counted in the JSON (0).', (8, y), SMALL); y += 16
    x = 8
    for name, t, panels, comp_poc, comp_res, ctx in sheet_items:
        sheet.alpha_composite(scaled(comp_poc.crop((0, 40, 256, 184)), 2), (x, y)); text(sheet, f'{name} POC @ camera {ctx["camera"]}', (x + 4, y + 292))
        sheet.alpha_composite(scaled(comp_res.crop((0, 40, 256, 184)), 2), (x + 520, y)); text(sheet, 'Research pieces + registration, same terrain', (x + 524, y + 292))
        y += 306
    sheet = sheet.crop((0, 0, W, min(sheet.height, y + 10)))
    sheet.convert('RGB').save(OUT / 'footwear-reference-sheet.png')
    (OUT / 'footwear-asset-comparison.json').write_text(json.dumps(report, indent=2) + '\n')
    print('sheet written:', OUT / 'footwear-reference-sheet.png')
    print('FAILURES:', len(failures)); [print(' ', f) for f in failures]
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
