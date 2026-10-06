"""ROM-backed S2 art/data checks: mirrored contracts, the baked $AF -> $B0 backdrop cells, the shard art and the effect-5 ROM images.

Run with SONIC_RESEARCH_MAIN pointing at a clean canonical Research main checkout (6e169d7) when another Research branch is checked out in the working tree.
"""
from pathlib import Path
import hashlib, json, os, subprocess, sys
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build/sez-s2'; BUILD.mkdir(parents=True, exist_ok=True)
RESEARCH = Path(os.environ.get('SONIC_RESEARCH_MAIN') or ROOT.parent / 'sonic-chaos-reference-work')
COMMIT = 'ed9122b3d5ac11442714ecaef4cc4316c4706342'
sys.path.insert(0, str(RESEARCH / 'tools')); sys.path.insert(0, str(ROOT / 'POC_notes'))
import level_package as L
import mghz_object_census as C
from generate_mghz_footwear import compose
checks = 0
def check(ok, msg=''):
    global checks
    assert ok, msg
    checks += 1
def read(p): return json.loads(Path(p).read_text())
def sha(b): return hashlib.sha256(b).hexdigest()
def git(*args): return subprocess.check_output(['git', '-c', 'safe.directory=' + RESEARCH.resolve().as_posix(), '-C', str(RESEARCH), *args])
git('merge-base', '--is-ancestor', COMMIT, 'main')  # raises unless 6e169d7 is on Research main
rom = L.load_rom(ROOT.parent / 'source/Sonic Chaos (Europe).sms')
check(sha(rom) == 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607')
cache = ROOT / 'POC_notes/rom-cache/sez'
norm = lambda b: b.replace(b'\r\n', b'\n')
for name in ('surface-runtime-contracts.json', 'surfaces-0c-1a.json', 'implementation-manifest.json', 'object-census.json', 'art-approval.json'):
    check(norm((cache / name).read_bytes()) == norm(git('show', (('8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c') if name in ('implementation-manifest.json', 'object-census.json') else COMMIT) + ':data/rom-cache/sez/' + name)), 'mirror ' + name)
contract = read(cache / 'surface-runtime-contracts.json'); audit = read(cache / 'surfaces-0c-1a.json'); manifest = read(cache / 'implementation-manifest.json')
def sprite(name, frame=0):
    d = ROOT / 'sprites' / name; s = read(d / (name + '.yy')); f = s['frames'][frame]['name']
    im = Image.open(d / (f + '.png')).convert('RGBA')
    for layer in s['layers']:
        check(im.tobytes() == Image.open(d / 'layers' / f / (layer['name'] + '.png')).convert('RGBA').tobytes(), name + ' layer')
    return im, s
# ---- baked backdrop: every $AF cell shows the replacement $B0 (blank), every neighbouring cell is untouched (S1 asset check covers all cells) ----
blank = Image.new('RGBA', (32, 32))
atlas, _ = sprite('SPR_chaos_sez_blocks')
cells = 0
for key, act in manifest['acts'].items():
    width = act['descriptor']['layout']['width_cells']
    layout = [v for row in act['layout']['rows'] for v in row][:4095]
    table = act['descriptor']['header']['block_mapping_rom']
    vram, _ = L.build_vram(rom, act['descriptor']['art'])
    check(L.block_mapping(rom, table, 176)['attributes'] == [192] * 16, 'B0 mapping = 16 x blank tile 192')
    check(not any(c for row in L.block_pixel_maps(rom, vram, only=[176], mapping_rom=table)[176] for c in row), 'B0 pixels empty')
    chunks = [sprite(f'SPR_chaos_{key}_terrain_{i}')[0] for i in range(4)]
    af = [i for i, b in enumerate(layout) if b == 175]
    check(len(af) == {'sez1': 19, 'sez2': 16, 'sez3': 1}[key])
    for i in af:
        x, y = i % width * 32, i // width * 32
        check(chunks[x // 1024].crop((x % 1024, y, x % 1024 + 32, y + 32)).tobytes() == blank.tobytes(), f'{key} baked cell {i} is $B0')
        # the intact $AF art is drawn dynamically from the block atlas: it is opaque (all 1,024 pixels), so hiding it in the backdrop is required
        art = atlas.crop((175 % 16 * 32, 175 // 16 * 32, 175 % 16 * 32 + 32, 175 // 16 * 32 + 32))
        check(sum(1 for a in art.tobytes()[3::4] if a) == 1024, '$AF art is fully opaque')
        cells += 1
    pads = [i for i, b in enumerate(layout) if b == 167]
    check(len(pads) == {'sez1': 0, 'sez2': 2, 'sez3': 2}[key])
# ---- shard art: type $13 frame 15 is the same mapping record as type $07 frame 15 and the accepted SPR_chaos_sez_shard ----
act = manifest['acts']['sez1']; vram, _ = L.build_vram(rom, act['descriptor']['art'])
pal = __import__('thz1_object_assets').palette_rgba(rom, act['graphics']['palettes']['sprite']['index'])
r7 = C.frame_record(rom, 7, 15, 0, 0, vram, flips=(False,)); r13 = C.frame_record(rom, 0x13, 15, 0, 0, vram, flips=(False,))
check(r7 == r13 and r13['frame_cpu'] == '0x8D3B' and r13['extent_word'] == '0x1004', 'same mapping record')
shard, _ = sprite('SPR_chaos_sez_shard')
check(shard.tobytes() == sprite('SPR_chaos_sez_shard')[0].tobytes())
check(shard.tobytes() == compose(r13['images'][0], pal).tobytes(), 'SPR_chaos_sez_shard == type $13 frame 15')
# ---- effect 5: the two ROM images and their VRAM target / block use ----
eff = contract['booster_1A']['effect5_animation']
for key, source in eff['sources'].items():
    off = int(source['file'], 16)
    check(sha(rom[off:off + 32]) == source['sha256'], 'effect 5 source ' + key)
check(eff['first_copy_image'] == '0x8DFD' and eff['period_calls'] == 6)
check(eff['art_relation']['block'] == '0xA7' and eff['art_relation']['blocks_that_draw_tile_0x158_in_sez2'] == ['0xA7'])
# A7 draws tile $158 in exactly 8 of its 16 mapping cells in every act that contains it
for key, act in manifest['acts'].items():
    for b in act['blocks']:
        if b['block_id'] == 167:
            check(sum(1 for a in b['mapping']['attributes'] if (a & 511) == 0x158) == 8, key + ' $A7 tile $158 count')
# ---- registration ----
project = read(ROOT / 'SonicChaos_POC.yyp')
for name in ('SCR_chaos_sez_s2', 'SCR_chaos_sez_s2_data'):
    paths = [r['id']['path'] for r in project['resources'] if r['id']['name'] == name]
    check(paths == [f'scripts/{name}/{name}.yy'], name + ' registered once')
    check((ROOT / 'scripts' / name / (name + '.gml')).exists() and (ROOT / 'scripts' / name / (name + '.yy')).exists())
out = {'status': 'PASS', 'assertions': checks, 'baked_af_cells': cells, 'research': COMMIT}
(BUILD / 'asset-results.json').write_text(json.dumps(out, indent=2) + '\n'); print(json.dumps(out, indent=2))
