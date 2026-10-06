"""ROM-backed S4 art/data checks: mirrored enemy contract, the three approved enemy sprites (frames 1/2), registration. SONIC_RESEARCH_MAIN = clean Research checkout."""
from pathlib import Path
import hashlib, json, os, subprocess, sys
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build/sez-s4'; BUILD.mkdir(parents=True, exist_ok=True)
RESEARCH = Path(os.environ.get('SONIC_RESEARCH_MAIN') or ROOT.parent / 'sonic-chaos-reference-work')
COMMIT = '8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c'
sys.path.insert(0, str(RESEARCH / 'tools')); sys.path.insert(0, str(ROOT / 'POC_notes'))
import level_package as L
import sez_art_approval as A
from generate_mghz_footwear import compose, ANCHOR, REGISTRATION
checks = 0
def check(ok, msg=''):
    global checks
    assert ok, msg
    checks += 1
def read(p): return json.loads(Path(p).read_text())
def sha(b): return hashlib.sha256(b).hexdigest()
def git(*a): return subprocess.check_output(['git', '-c', 'safe.directory=' + RESEARCH.resolve().as_posix(), '-C', str(RESEARCH), *a])
git('merge-base', '--is-ancestor', COMMIT, 'main')
norm = lambda b: b.replace(b'\r\n', b'\n')
cache = ROOT / 'POC_notes/rom-cache/sez'
for n in ('enemies-20-23-runtime.json', 'platform-28-runtime.json', 'implementation-manifest.json', 'object-census.json', 'art-approval.json', 'surface-runtime-contracts.json', 'surfaces-0c-1a.json'):
    check(norm((cache / n).read_bytes()) == norm(git('show', ('eff4cecf03bfcef8638b39c0f7676abbfd32f26e' if n in ('implementation-manifest.json', 'object-census.json') else COMMIT) + ':data/rom-cache/sez/' + n)), 'mirror ' + n)
rom = L.load_rom(ROOT.parent / 'source/Sonic Chaos (Europe).sms')
check(sha(rom) == 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607')
approval = read(cache / 'art-approval.json'); full = A.build(rom)
check(A.manifest_for(full) == approval, 'approval recomputed')
origin = (ANCHOR[0] - REGISTRATION[0], ANCHOR[1] - REGISTRATION[1])
def sprite(name):
    d = ROOT / 'sprites' / name; s = read(d / (name + '.yy')); out = []
    for i, fr in enumerate(s['frames']):
        im = Image.open(d / (fr['name'] + '.png')).convert('RGBA')
        for layer in s['layers']: check(im.tobytes() == Image.open(d / 'layers' / fr['name'] / (layer['name'] + '.png')).convert('RGBA').tobytes(), name + ' layer')
        out.append(im)
    check([s['sequence']['xorigin'], s['sequence']['yorigin']] == list(origin), name + ' origin')
    return out
for t, name, idx, mirrored in ((0x20, 'enemy_20', 0, True), (0x20, 'enemy_20_conv', 1, False), (0x23, 'enemy_23', 0, False)):
    subject = full['subjects'][str(t)]
    frames = [f for f in subject['frames'] if f['frame'] != 0]
    got = sprite('SPR_chaos_sez_' + name)
    check(len(got) == 2 and [f['frame'] for f in frames] == [1, 2])
    pal = subject['palette']
    for im, f in zip(got, frames):
        check(im.tobytes() == compose(f['images'][idx], pal).tobytes(), f'{name} frame {f["frame"]} equals the approved composition')
        check(bool(f['images'][idx]['mirror']) == mirrored, 'bit4 composition: $20 runtime = bit4=1 image, conversion frame / $23 = unmirrored')
    check(subject['palette_index'] == 8)
check([hex(b).upper().replace('X','x') if isinstance(b,int) else b for b in full['subjects']['32']['bases']] == ['0xA4', '0xA4'] and [hex(b).upper().replace('X','x') if isinstance(b,int) else b for b in full['subjects']['35']['bases']] == ['0x86', '0x86'], 'canonical art bases = aux bytes')
# the placement aux bytes ARE the art bases (+$08/09)
d = read(cache / 'enemies-20-23-runtime.json')
check({(p['type_id'], p['aux0'], p['aux1']) for p in d['placements']} == {('0x20', '0xA4', '0xA4'), ('0x23', '0x86', '0x86')})
project = read(ROOT / 'SonicChaos_POC.yyp')
for rel in ('scripts/SCR_chaos_sez_enemy/SCR_chaos_sez_enemy.yy', 'sprites/SPR_chaos_sez_enemy_20/SPR_chaos_sez_enemy_20.yy', 'sprites/SPR_chaos_sez_enemy_20_conv/SPR_chaos_sez_enemy_20_conv.yy', 'sprites/SPR_chaos_sez_enemy_23/SPR_chaos_sez_enemy_23.yy'):
    check([r['id']['path'] for r in project['resources']].count(rel) == 1 and (ROOT / rel).exists(), rel)
for rec in read(cache / 'generated-assets.json')['assets']:
    if rec['resource'].startswith('SPR_chaos_sez_enemy'):
        check(sha(sprite(rec['resource'])[rec['frame']].tobytes()) == rec['rgba_sha256'], 'generated hash ' + rec['resource'])
out = {'status': 'PASS', 'assertions': checks, 'research': COMMIT}
(BUILD / 'asset-results.json').write_text(json.dumps(out, indent=2) + '\n'); print(json.dumps(out))
