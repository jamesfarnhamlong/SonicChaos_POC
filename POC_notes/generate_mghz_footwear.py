"""MGHZ M2 art importer: type $21 (both runtime orientations), Spring Shoes $2F (frames 1..4) and the Rocket monitor (type $10 selector 4).

Pixels come from the canonical Research code paths used by the approved boards (mghz_object_census.frame_record / mghz_art_approval); every composed
frame is checked against the approved ``art-approval.json`` hashes before it is written. Nothing here is substitute art.

    py -3 POC_notes/generate_mghz_footwear.py --research <research-work> --rom "<Sonic Chaos (Europe).sms>"
"""
import argparse, copy, hashlib, json, sys, uuid
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANVAS = (64, 64)
ANCHOR = (32, 32)          # canvas pixel of the SAT-relative (0,0)
REGISTRATION = (1, 18)     # accepted terrain-relative presentation of SAT-relative pixels (Research REGISTRATION)


def sha(raw): return hashlib.sha256(raw).hexdigest()
def guid(value): return str(uuid.uuid5(uuid.NAMESPACE_URL, 'sonic-chaos-mghz-footwear/' + value))
def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def compose(image, palette):
    """Same compositing as mghz_art_previews.composed(): pieces drawn in reverse order, colour index 0 transparent."""
    im = Image.new('RGBA', CANVAS)
    for p in reversed(image['pieces']):
        piece = Image.new('RGBA', (8, len(p['pixels'])))
        piece.putdata([tuple(palette[c]) for row in p['pixels'] for c in row])
        im.alpha_composite(piece, (ANCHOR[0] + p['x'], ANCHOR[1] + p['y']))
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--research', type=Path, required=True)
    ap.add_argument('--rom', type=Path, required=True)
    args = ap.parse_args()
    sys.path.insert(0, str(args.research / 'tools'))
    import level_package as L
    import thz1_object_assets as G
    import thz1_object_10_graphics as M
    import mghz_object_census as C
    rom = L.load_rom(args.rom)
    approval = json.loads((ROOT / 'POC_notes/rom-cache/mghz/art-approval.json').read_text())
    assert sha(rom) == approval['rom_sha256']
    recs = C.decode_records(rom)
    acts = {k: C.vram_for_act(rom, i) for i, k in enumerate(recs)}
    a1 = acts['mghz1']
    d = a1['descriptor']
    bg = G.palette_rgba(rom, d['palette']['background_index'])
    pal = G.palette_rgba(rom, d['palette']['sprite_index'])
    vram = bytes(a1['vram'])
    project_path = ROOT / 'SonicChaos_POC.yyp'
    project = json.loads(project_path.read_text())
    assets = []

    def register(kind, name):
        p = f'{kind}/{name}/{name}.yy'
        if not any(r['id']['path'] == p for r in project['resources']):
            project['resources'].append({'id': {'name': name, 'path': p}})

    def sprite(name, images, origin):
        template = json.loads((ROOT / 'sprites/SPR_chaos_platform/SPR_chaos_platform.yy').read_text())
        template['name'] = template['%Name'] = name
        seq = template['sequence']; seq['name'] = seq['%Name'] = name
        template['width'], template['height'] = images[0].size
        template['bbox_left'] = template['bbox_top'] = 0
        template['bbox_right'], template['bbox_bottom'] = images[0].width - 1, images[0].height - 1
        seq['xorigin'], seq['yorigin'] = origin
        seq['length'] = float(len(images))
        layer = guid(name + '/layer')
        template['layers'][0]['name'] = template['layers'][0]['%Name'] = layer
        base_key = copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0])
        keys = []; template['frames'] = []
        dest = ROOT / 'sprites' / name
        for i, image in enumerate(images):
            frame = guid(name + '/' + str(i))
            (dest / 'layers' / frame).mkdir(parents=True, exist_ok=True)
            image.save(dest / (frame + '.png'))
            image.save(dest / 'layers' / frame / (layer + '.png'))
            template['frames'].append({'$GMSpriteFrame': 'v1', '%Name': frame, 'name': frame, 'resourceType': 'GMSpriteFrame', 'resourceVersion': '2.0'})
            key = copy.deepcopy(base_key); key['id'] = guid(name + '/key/' + str(i)); key['Key'] = float(i)
            key['Channels']['0']['Id'] = {'name': frame, 'path': f'sprites/{name}/{name}.yy'}; keys.append(key)
            assets.append({'resource': name, 'frame': i, 'rgba_sha256': sha(image.tobytes())})
        seq['tracks'][0]['keyframes']['Keyframes'] = keys
        dump(dest / (name + '.yy'), template); register('sprites', name)

    # Origin so that drawing at the canonical anchor reproduces the approved registration (+1, +18) with no per-object offset.
    origin = (ANCHOR[0] - REGISTRATION[0], ANCHOR[1] - REGISTRATION[1])

    def check(t, frame, mirror, image):
        want = approval['subjects'][f'0x{t:02X}']['frame_hashes'][str(frame)][1 if mirror else 0]
        assert image['composed_index_sha256'] == want, (t, frame, mirror)

    # --- type $21: frames 1,2 in both runtime orientations. Sprite frames: 0,1 = bit4 0; 2,3 = bit4 1.
    images = []
    for mirror in (False, True):
        for f in (1, 2):
            rec = C.frame_record(rom, 0x21, f, 0x7C, 0x8E, vram, flips=(False, True))
            image = rec['images'][1 if mirror else 0]
            check(0x21, f, mirror, image)
            images.append(compose(image, pal))
    sprite('SPR_chaos_mghz_object_21', images, origin)
    # --- type $2F: mapping frames 1..4 (1,2 pickup on the ground; 3,4 attached), unmirrored only.
    images = []
    for f in (1, 2, 3, 4):
        rec = C.frame_record(rom, 0x2F, f, 0xAC, 0xAC, vram, flips=(False,))
        check(0x2F, f, False, rec['images'][0])
        images.append(compose(rec['images'][0], pal))
    sprite('SPR_chaos_mghz_spring_shoes', images, origin)
    # --- type $10 selector 4 (Rocket Shoes monitor), the same construction as the accepted MGHZ selector 1/2/6 resources.
    def monitor(selector):
        sources = [M.pointer(rom, table, selector) for table in M.PLAYER_TYPES['0x01']]
        dynamic = bytearray(vram)
        for source, (dest, n) in zip(sources, M.DESTINATIONS):
            p = int(source['source_rom'], 16); dynamic[dest:dest + n * 32] = rom[p:p + n * 32]
        out = []; mapping = G.object_mapping(rom, 0x10)
        for f in M.MAPPING_FRAMES:
            w, h, rgba, _ = G.render_frame(dynamic, G.parse_frame_record(rom, L.u16(rom, mapping['mapping_rom'] + f * 2)), 0, scale=1, margin=4, palette=pal)
            out.append(Image.frombytes('RGBA', (w, h), rgba))
        return out
    # Self-check of the construction: selector 2 must reproduce the shipped M1 resource byte for byte.
    shipped = sorted((ROOT / 'sprites/SPR_chaos_mghz_monitor_02').glob('*.png'))
    ref = json.loads((ROOT / 'POC_notes/rom-cache/mghz/generated-assets.json').read_text())['assets']
    want = [a['rgba_sha256'] for a in ref if a['resource'] == 'SPR_chaos_mghz_monitor_02']
    got = [sha(i.tobytes()) for i in monitor(2)]
    assert got == want, 'monitor construction does not reproduce the accepted selector-2 resource'
    sprite('SPR_chaos_mghz_monitor_04', monitor(4), (16, 28))
    dump(project_path, project)
    cache = ROOT / 'POC_notes/rom-cache/mghz'
    dump(cache / 'footwear-assets.json', {'research_inputs': {'foundation_art': 'ac04dfe4d3d7aedea394948811da67eba83782bd', 'footwear_audit': '150977e'},
        'rom_sha256': sha(rom), 'registration': list(REGISTRATION), 'canvas': list(CANVAS), 'anchor': list(ANCHOR),
        'approved_frame_hashes_checked': {k: approval['subjects'][k]['frame_hashes'] for k in ('0x21', '0x2F')}, 'assets': assets})
    print('ok', len(assets), 'frames')


if __name__ == '__main__':
    main()
