"""Import only approved, unmirrored $24/$2E frames; lock Research hashes.
Run with --research and --rom. ROM is local-only and never packaged.
"""
import argparse, copy, hashlib, json, shutil, sys
from pathlib import Path
from generate_mghz_footwear import compose, guid, dump, ROOT, ANCHOR, REGISTRATION


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--research', type=Path, required=True)
    ap.add_argument('--rom', type=Path, required=True)
    args = ap.parse_args()
    sys.path.insert(0, str(args.research / 'tools'))
    import level_package as L
    import thz1_object_assets as G
    import mghz_object_census as C
    rom = L.load_rom(args.rom)
    approval = json.loads((ROOT / 'POC_notes/rom-cache/mghz/art-approval.json').read_text())
    assert hashlib.sha256(rom).hexdigest() == approval['rom_sha256']
    act = C.vram_for_act(rom, 0)
    pal = G.palette_rgba(rom, act['descriptor']['palette']['sprite_index'])
    project_path = ROOT / 'SonicChaos_POC.yyp'
    project = json.loads(project_path.read_text())
    assets = []
    for typ, base, frames in ((0x24, 0xA0, range(4)), (0x2E, 0x72, range(5))):
        name = f'SPR_chaos_mghz_object_{typ:02X}'
        template = json.loads((ROOT / 'sprites/SPR_chaos_platform/SPR_chaos_platform.yy').read_text())
        template['name'] = template['%Name'] = name
        seq = template['sequence']; seq['name'] = seq['%Name'] = name
        template.update(width=64, height=64, bbox_left=0, bbox_top=0, bbox_right=63, bbox_bottom=63)
        seq['xorigin'], seq['yorigin'] = ANCHOR[0]-REGISTRATION[0], ANCHOR[1]-REGISTRATION[1]
        seq['length'] = float(len(frames))
        layer = guid(name + '/layer')
        template['layers'][0]['name'] = template['layers'][0]['%Name'] = layer
        key_template = copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0])
        keys = []; template['frames'] = []
        dest = ROOT / 'sprites' / name
        for f in frames:
            decoded = C.frame_record(rom, typ, f, base, base, bytes(act['vram']), flips=(False,))['images'][0]
            want = approval['subjects'][f'0x{typ:02X}']['frame_hashes'][str(f)][0]
            assert decoded['composed_index_sha256'] == want
            im = compose(decoded, pal)
            frame = guid(name + '/' + str(f))
            (dest / 'layers' / frame).mkdir(parents=True, exist_ok=True)
            im.save(dest / (frame + '.png')); im.save(dest / 'layers' / frame / (layer + '.png'))
            template['frames'].append({'$GMSpriteFrame':'v1','%Name':frame,'name':frame,'resourceType':'GMSpriteFrame','resourceVersion':'2.0'})
            key = copy.deepcopy(key_template); key['id'] = guid(name + '/key/' + str(f)); key['Key'] = float(f)
            key['Channels']['0']['Id'] = {'name':frame,'path':f'sprites/{name}/{name}.yy'}; keys.append(key)
            assets.append({'resource':name,'frame':f,'rgba_sha256':hashlib.sha256(im.tobytes()).hexdigest(),'approved_index_sha256':want})
        seq['tracks'][0]['keyframes']['Keyframes'] = keys
        dump(dest / (name + '.yy'), template)
        p = f'sprites/{name}/{name}.yy'
        if not any(r['id']['path'] == p for r in project['resources']): project['resources'].append({'id':{'name':name,'path':p}})
    name = 'SCR_chaos_mghz_m3'
    script = json.loads((ROOT / 'scripts/SCR_chaos_mghz_effects/SCR_chaos_mghz_effects.yy').read_text())
    script['name'] = script['%Name'] = name
    dump(ROOT / f'scripts/{name}/{name}.yy', script)
    p = f'scripts/{name}/{name}.yy'
    if not any(r['id']['path'] == p for r in project['resources']): project['resources'].append({'id':{'name':name,'path':p}})
    dump(project_path, project)
    shutil.copyfile(args.research / 'data/rom-cache/mghz/object-24-2e.json', ROOT / 'POC_notes/rom-cache/mghz/object-24-2e.json')
    dump(ROOT / 'POC_notes/rom-cache/mghz/m3-assets.json', {'rom_sha256':approval['rom_sha256'],'research':'7ba4d8a7bfb7f8164462fbf50db05c4b63cec0fe','frames':assets})
    print('PASS: 9 approved unmirrored frames; byte-exact canonical fixture mirrored')


if __name__ == '__main__': main()
