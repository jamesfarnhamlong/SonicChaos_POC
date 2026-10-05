"""Independent ROM composition checks + verification PNG from shipped-GML samples.
No gameplay screenshot or new approval board. Pixels/anchors are the shipped sprites.
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

OUT = ROOT / 'verification/mghz-m3'
OUT.mkdir(parents=True, exist_ok=True)
checks = 0


def check(a, b, name):
    global checks
    assert a == b, name
    checks += 1


def sprite(name):
    meta = json.loads((ROOT / f'sprites/{name}/{name}.yy').read_text())
    return [Image.open(ROOT / f'sprites/{name}/{f["name"]}.png').convert('RGBA') for f in meta['frames']], (meta['sequence']['xorigin'], meta['sequence']['yorigin'])


rom = L.load_rom(ROOT.parent / 'source/Sonic Chaos (Europe).sms')
gen = json.loads((ROOT / 'POC_notes/rom-cache/mghz/m3-assets.json').read_text())
approval = json.loads((ROOT / 'POC_notes/rom-cache/mghz/art-approval.json').read_text())
check(hashlib.sha256(rom).hexdigest(), gen['rom_sha256'], 'ROM SHA256')
check((ROOT / 'POC_notes/rom-cache/mghz/object-24-2e.json').read_bytes(), (RES / 'data/rom-cache/mghz/object-24-2e.json').read_bytes(), 'byte-exact Research fixtures')
resources = {}
for typ, base, count in [(36, 160, 4), (46, 114, 5)]:
    name = f'SPR_chaos_mghz_object_{typ:02X}'
    frames, origin = sprite(name)
    resources[typ] = (frames, origin)
    check(len(frames), count, name + ' frames')
    check(origin, (31, 14), name + ' accepted SAT registration')
    for act in [0, 1]:
        a = C.vram_for_act(rom, act)
        pal = G.palette_rgba(rom, a['descriptor']['palette']['sprite_index'])
        for f in range(count):
            decoded = C.frame_record(rom, typ, f, base, base, bytes(a['vram']), flips=(False,))['images'][0]
            want = approval['subjects'][f'0x{typ:02X}']['frame_hashes'][str(f)][0]
            check(decoded['composed_index_sha256'], want, 'approved composition hash')
            reference = Image.new('RGBA', (64, 64))
            for piece in reversed(decoded['pieces']):
                tile = Image.new('RGBA', (8, len(piece['pixels'])))
                tile.putdata([tuple(pal[p]) for row in piece['pixels'] for p in row])
                reference.alpha_composite(tile, (32 + piece['x'], 32 + piece['y']))
            check(frames[f].tobytes(), reference.tobytes(), name + ' byte-identical pixels')
            check(hashlib.sha256(frames[f].tobytes()).hexdigest(), next(r['rgba_sha256'] for r in gen['frames'] if r['resource']==name and r['frame']==f), 'asset manifest hash')
resources[15] = sprite('SPR_chaos_mghz_poof')
thz = L.build_act(rom, 'thz1', L.ACTS['thz1'])
check(C.vram_for_act(rom, 0)['vram'][36*32:46*32], thz['vram'][36*32:46*32], 'shared $0F THZ1/MGHZ VRAM')
samples = json.loads((OUT / 'runtime-samples.json').read_text())
font = ImageFont.load_default(size=14)
small = ImageFont.load_default(size=11)
sheet = Image.new('RGBA', (1024, 514), (30, 36, 45, 255))
d = ImageDraw.Draw(sheet)
d.text((18, 12), 'MGHZ M3 | Shipped sprite / GML verification | Research 7ba4d8a', font=font, fill='white')
d.text((18, 36), '$24: shake -> fall -> saved conversion frame -> shared $0F. Unmirrored approved art.', font=small, fill=(190, 205, 220))


def paste_sample(stage, sample, anchor):
    if sample['frame'] == 0:
        return
    frames, origin = resources[sample.get('type', 46)]
    frame = sample['frame']-7 if sample.get('type') == 15 and sample['frame']>=7 else sample['frame']
    # Conversion sample with frame <7 still draws the saved $24 frame.
    if sample.get('type') == 15 and sample['frame']<7:
        frames, origin = resources[36]; frame = sample['frame']
    stage.alpha_composite(frames[frame], (round(anchor[0]-origin[0]), round(anchor[1]-origin[1])))


chosen = [next(s for s in samples['hazard'] if s['pass']==p) for p in [1, 3, 17, 23, 72, 73, 80, 84]]
for i, s in enumerate(chosen):
    stage = Image.new('RGBA', (64, 64), (63, 74, 85, 255))
    paste_sample(stage, s, (32, 32))
    sheet.alpha_composite(stage.resize((112,112),Image.Resampling.NEAREST),(18+i*125,62))
    d.text((18+i*125,181), f'pass {s["pass"]} / f{s["frame"]}', font=small, fill='white')
    d.text((18+i*125,196), f'({s["x"]:.1f}, {s["y"]:.1f})', font=small, fill=(190,205,220))
d.text((18, 214), '$2E: three children. Bit 4 clear -> travel left; bit 4 set -> travel right. Same unmirrored pixels.', font=small, fill=(190,205,220))
for bit in [0,16]:
    row = 0 if bit==0 else 1
    for i, age in enumerate([0,4,8,12]):
        stage = Image.new('RGBA', (112,40), (63,74,85,255))
        for s in samples['children']:
            if s['bit']==bit and s['pass']==age:
                paste_sample(stage, s, (56+s['x']-1392,24+s['y']-780))
        sheet.alpha_composite(stage.resize((224,80),Image.Resampling.NEAREST),(18+i*250,242+row*116))
        d.text((18+i*250,328+row*116), f'bit4={1 if bit else 0}, child age {age}', font=small, fill='white')
d.text((18,484), 'Verification only. 0 pixel differences across reached frames / both acts; no new art approval required.', font=small, fill='white')
sheet.save(OUT / 'm3-verification-sheet.png')
report = {'status':'PASS','assertions':checks,'frames':9,'acts':2,'pixel_differences':0,'sheet':'m3-verification-sheet.png','rom_sha256':gen['rom_sha256']}
(OUT / 'asset-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
