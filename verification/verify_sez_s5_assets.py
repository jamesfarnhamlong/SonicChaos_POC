"""ROM-backed S5 art/data checks: mirrored Research contracts, the approved unmirrored boss / child compositions (+ command-7 flash variants), registration, project resources.
SONIC_RESEARCH_MAIN = clean Research checkout (main at eff4cec). Run with the codex Python 3.12 runtime (z80 extension) and Research tools on PYTHONPATH."""
from pathlib import Path
import hashlib, json, os, subprocess, sys
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build/sez-s5'; BUILD.mkdir(parents=True, exist_ok=True)
RESEARCH = Path(os.environ.get('SONIC_RESEARCH_MAIN') or ROOT.parent / 'sonic-chaos-reference-work')
COMMIT = 'eff4cecf03bfcef8638b39c0f7676abbfd32f26e'
sys.path.insert(0, str(RESEARCH / 'tools')); sys.path.insert(0, str(ROOT / 'POC_notes'))
import level_package as L
import thz1_object_assets as G
import thz1_type18_dynamic_graphics as D
import sez_object_census as C
import generate_sez_s5 as S5
checks = 0
def check(ok, msg=''):
    global checks
    assert ok, msg
    checks += 1
def read(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def sha(b): return hashlib.sha256(b).hexdigest()
def git(*a): return subprocess.check_output(['git', '-c', 'safe.directory=' + RESEARCH.resolve().as_posix(), '-C', str(RESEARCH), *a])
check(subprocess.run(['git', '-c', 'safe.directory=' + RESEARCH.resolve().as_posix(), '-C', str(RESEARCH), 'merge-base', '--is-ancestor', COMMIT, 'main']).returncode == 0, 'eff4cec on Research main')
norm = lambda b: b.replace(b'\r\n', b'\n')
cache = ROOT / 'POC_notes/rom-cache/sez'
for n in ('boss-54-safe-zone.json', 'boss-54-stationary-sweep.json'):
    check(norm((cache / n).read_bytes()) == norm(git('show', '53e9095ae2d807be8cd67f8ed572caead09094d9:data/rom-cache/sez/' + n)), 'mirror ' + n)
for n in ('boss-54-runtime.json', 'boss-54-fullgame.json', 'implementation-manifest.json', 'object-census.json', 'art-approval.json', 'enemies-20-23-runtime.json', 'platform-28-runtime.json', 'surface-runtime-contracts.json', 'surfaces-0c-1a.json'):
    check(norm((cache / n).read_bytes()) == norm(git('show', COMMIT + ':data/rom-cache/sez/' + n)), 'mirror ' + n)
rom = L.load_rom(ROOT.parent / 'source/Sonic Chaos (Europe).sms')
check(sha(rom) == 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607')
runtime = read(cache / 'boss-54-runtime.json'); approval = read(cache / 'art-approval.json'); imp = read(cache / 'boss-54-import.json')
check(runtime['rom_sha256'] == sha(rom) == imp['rom_sha256'])
vram = bytearray(C.vram_for_act(rom, 2)['vram']); cpu, dyn = D.dynamic_list_for_selector(rom, 21); D.apply_dynamic_entries(vram, rom, dyn); vram = bytes(vram)
pal = G.palette_rgba(rom, 14); flash = [tuple(c) for c in pal]; flash[13] = flash[14] = S5.WHITE
approved = approval['subjects']['0x54']['frame_hashes']
def sprite(name, origin=None):
    d = ROOT / 'sprites' / name; s = read(d / (name + '.yy')); out = []
    for fr in s['frames']:
        im = Image.open(d / (fr['name'] + '.png')).convert('RGBA')
        for layer in s['layers']: check(im.tobytes() == Image.open(d / 'layers' / fr['name'] / (layer['name'] + '.png')).convert('RGBA').tobytes(), name + ' layer')
        out.append(im)
    check([s['sequence']['xorigin'], s['sequence']['yorigin']] == (origin or [S5.ANCHOR[0] - S5.REGISTRATION[0], S5.ANCHOR[1] - S5.REGISTRATION[1]]), name + ' origin carries the +(1,18) registration')
    return out
for name, frames, palette in (('SPR_chaos_sez_boss_54', S5.BOSS_FRAMES, pal), ('SPR_chaos_sez_boss_54_flash', S5.BOSS_FRAMES, flash), ('SPR_chaos_sez_boss_55', S5.CHILD_FRAMES, pal), ('SPR_chaos_sez_boss_55_flash', S5.CHILD_FRAMES, flash)):
    got = sprite(name); check(len(got) == len(frames))
    for im, f in zip(got, frames):
        rec = C.C.frame_record(rom, 84, f, 0, 0, vram, flips=(False,)); image = rec['images'][0]
        check(image['composed_index_sha256'] == approved[str(f)][0], f'approved unmirrored composition frame {f}')
        check(im.tobytes() == S5.compose(image, palette).tobytes(), f'{name} frame {f} equals the approved composition')
got = sprite('SPR_chaos_sez_boss_poof'); check(len(got) == 3)
for im, f in zip(got, (7, 8, 9)): check(im.tobytes() == S5.compose(C.C.frame_record(rom, 0x0F, f, 0, 0, vram, flips=(False,))['images'][0], pal).tobytes(), f'boss poof frame {f}')
for rec in imp['assets']:
    check(sha(sprite(rec['resource'])[rec['sprite_frame']].tobytes()) == rec['rgba_sha256'], 'import hash ' + rec['resource'])
# shared support sprites keep their accepted registration
for name in ('SPR_chaos_sez_puff', 'SPR_chaos_sez_sparkle'): sprite(name, [31, 14])
project = read(ROOT / 'SonicChaos_POC.yyp'); paths = [r['id']['path'] for r in project['resources']]
for rel in ('scripts/SCR_chaos_sez_boss/SCR_chaos_sez_boss.yy', 'scripts/SCR_chaos_sez_boss_data/SCR_chaos_sez_boss_data.yy', 'sprites/SPR_chaos_sez_boss_54/SPR_chaos_sez_boss_54.yy', 'sprites/SPR_chaos_sez_boss_54_flash/SPR_chaos_sez_boss_54_flash.yy', 'sprites/SPR_chaos_sez_boss_55/SPR_chaos_sez_boss_55.yy', 'sprites/SPR_chaos_sez_boss_55_flash/SPR_chaos_sez_boss_55_flash.yy', 'sprites/SPR_chaos_sez_boss_poof/SPR_chaos_sez_boss_poof.yy'):
    check(paths.count(rel) == 1 and (ROOT / rel).exists(), rel)
out = {'status': 'PASS', 'assertions': checks, 'research': COMMIT}
(BUILD / 'asset-results.json').write_text(json.dumps(out, indent=2) + '\n'); print(json.dumps(out))
