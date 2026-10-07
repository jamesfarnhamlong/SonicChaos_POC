"""SEZ S5 importer: boss $54 + dynamic child $55 (Research eff4cecf03bfcef8638b39c0f7676abbfd32f26e).

Consumes only canonical Research blobs of the pinned commit (read with `git show`, never the working tree):
  data/rom-cache/sez/boss-54-runtime.json          (scripts, contact/arena/cycle oracles, art metadata)
  data/rom-cache/sez/boss-54-fullgame.json         (guarded whole-game fights)
  data/rom-cache/sez/implementation-manifest.json  (S5 closed status, integration constraints)
  data/rom-cache/sez/object-census.json
and the already mirrored MGHZ boss cache (the shared $12 / $34 / $0A / $0F support scripts are the same ROM code, Research docs/sez3-boss-54-audit.md).

Writes
  POC_notes/rom-cache/sez/*.json                           byte-for-byte mirrors
  scripts/SCR_chaos_sez_boss_data/*.gml                    generated numeric constants, state tables, records, extents (no ROM bytes)
  sprites/SPR_chaos_sez_boss_54 (+_flash), _55 (+_flash)   the approved UNMIRRORED compositions (SEZ sprite palette 14)
  POC_notes/rom-cache/sez/boss-54-import.json              provenance + RGBA hashes
No ROM bytes are exported; the only ROM reads are the FF 00 restart that always follows a request-state command (same decoder policy as import_mghz_boss.py) and the art.

    py -3.12 POC_notes/generate_sez_s5.py --research <research-work> --rom "<Sonic Chaos (Europe).sms>"
"""
import argparse, copy, hashlib, json, subprocess, sys, uuid
from pathlib import Path
from chaos_asset_parents import set_chaos_parent
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'eff4cecf03bfcef8638b39c0f7676abbfd32f26e'
CACHE = ROOT / 'POC_notes/rom-cache/sez'
SEZ_ROM_SHA = 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
# SAT-relative (0,0) is the object anchor.  The boss composition reaches 80 px above it and 20 px to the left.
CANVAS = (48, 96)
ANCHOR = (24, 80)
REGISTRATION = (1, 18)      # accepted terrain-relative presentation adapter (+1,+18); gameplay anchors and collision never use it
WHITE = (255, 255, 255, 255)
BOSS_FRAMES = [1, 2, 3, 4, 5, 6, 7, 8, 15, 16]
CHILD_FRAMES = [17, 18, 19]
OPERAND_BYTES = {'restart_state': 0, 'call': 2, 'velocity_8_8': 4, 'request_state': 1, 'spawn': 6,
                 'call_and_set_callback': 4, 'sound': 1, 'jump': 2, 'set_loop_counter': 1, 'loop_jump': 2}


def sha(raw): return hashlib.sha256(raw).hexdigest()
def guid(value): return str(uuid.uuid5(uuid.NAMESPACE_URL, 'sonic-chaos-sez-boss/' + value))
def num(v): return int(v, 0) if isinstance(v, str) else int(v)


def dump(path, value):
    set_chaos_parent(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def compose(image, palette):
    """Same compositing as mghz_art_previews.composed(): pieces drawn in reverse order, colour index 0 transparent."""
    im = Image.new('RGBA', CANVAS)
    for p in reversed(image['pieces']):
        x, y = ANCHOR[0] + p['x'], ANCHOR[1] + p['y']
        assert 0 <= x and x + 8 <= CANVAS[0] and 0 <= y and y + len(p['pixels']) <= CANVAS[1], (p['x'], p['y'])
        piece = Image.new('RGBA', (8, len(p['pixels'])))
        piece.putdata([tuple(palette[c]) if c else (0, 0, 0, 0) for row in p['pixels'] for c in row])
        im.alpha_composite(piece, (x, y))
    return im


def record_rows(ops):
    """cache ops -> {cpu: [next_cpu, command(-1 = record), operands...]}; mirrors the $64FA script command table."""
    rows = {}
    for op in ops:
        kind = op['op']
        cpu = num(op['cpu'])
        if kind == 'loops_back':
            continue
        if kind == 'record':
            rows[cpu] = [cpu + 4, -1, num(op['duration']), num(op['frame']), num(op['callback'])]
            continue
        end = cpu + 2 + OPERAND_BYTES[kind]
        cmd = num(op.get('command', op.get('cmd')))
        if kind == 'restart_state': args = []
        elif kind == 'call': args = [num(op['target'])]
        elif kind == 'velocity_8_8': args = [num(op['x']), num(op['y'])]
        elif kind == 'request_state': args = [num(op['state'])]
        elif kind == 'spawn': args = [num(op['type']), num(op['dx']), num(op['dy']), num(op['parameter'])]
        elif kind == 'call_and_set_callback': args = [num(op['target']), num(op['callback'])]
        elif kind == 'sound': args = [num(op['sound'])]
        elif kind == 'jump': args = [num(op['target'])]
        elif kind == 'set_loop_counter': args = [num(op['count'])]
        elif kind == 'loop_jump': args = [num(op['target'])]
        else: raise ValueError(kind)
        rows[cpu] = [end, cmd] + args
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--research', type=Path, required=True)
    ap.add_argument('--rom', type=Path, required=True)
    args = ap.parse_args()
    research = args.research.resolve()
    g = ['git', '-c', 'safe.directory=' + research.as_posix(), '-C', str(research)]
    assert subprocess.run(g + ['merge-base', '--is-ancestor', COMMIT, 'main']).returncode == 0, 'Research checkpoint must be on Research main'
    sys.path.insert(0, str(research / 'tools'))
    import level_package as L
    import thz1_object_assets as G
    import thz1_type18_dynamic_graphics as D
    import sez_object_census as C
    import rom as R
    rom = L.load_rom(args.rom)
    assert sha(rom) == SEZ_ROM_SHA == R.SHA256

    # --- byte-for-byte mirrors of the pinned Research blobs -------------------------------------------------------------------------
    names = ('boss-54-runtime.json', 'boss-54-fullgame.json', 'implementation-manifest.json', 'object-census.json')
    for name in names:
        (CACHE / name).write_bytes(subprocess.check_output(g + ['show', f'{COMMIT}:data/rom-cache/sez/{name}']))
    runtime = json.loads((CACHE / 'boss-54-runtime.json').read_text(encoding='utf-8'))
    fullgame = json.loads((CACHE / 'boss-54-fullgame.json').read_text(encoding='utf-8'))
    manifest = json.loads((CACHE / 'implementation-manifest.json').read_text(encoding='utf-8'))
    assert runtime['rom_sha256'] == sha(rom) and runtime['research_base'] == '8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c'
    base = manifest['boss_runtime']['baseline']
    assert base['placement'] == [3200, 622] and base['camera_target'] == [2976, 462] and base['settled_camera'] == [2975, 462] and base['hp_initial'] == 8
    assert base['hit_cooldown_helper_calls'] == 18 and base['hp_requires_attack_bit'] is False and base['clear_requires_floor_bit1'] is True and base['next_zone_act'] == [3, 0]
    assert runtime['assertion_total'] == 448818 and fullgame['assertions'] == 134
    assert runtime['static']['placement']['world_x'] == 3200 and runtime['static']['placement']['world_y'] == 622 and runtime['static']['placement']['index'] == 5

    # --- state scripts -----------------------------------------------------------------------------------------------------------------
    tables, records = {}, {}
    for typ in (84, 85):
        sc = runtime['static']['scripts'][f'0x{typ:02X}']
        tables[typ] = [num(c) for c in sc['state_script_cpus']]
        rows = {}
        for st in sc['states']:
            assert st['cleanly_terminated']
            rows.update(record_rows(st['ops']))
        records[typ] = rows
    mghz = json.loads((ROOT / 'POC_notes/rom-cache/mghz/boss-56-runtime.json').read_text(encoding='utf-8'))
    sup = mghz['static']['support']
    for typ, key in ((18, '0x12'), (52, '0x34'), (10, '0x0A'), (15, '0x0F')):
        v = sup[key]
        rows, cpus = {}, []
        for st in v['states']:
            rows.update(record_rows(st['script']))
            cpus.append(num(st['script_cpu']))
        tables[typ], records[typ] = cpus, rows

    def rom_bytes(bank, cpu, n):
        off = bank * 0x4000 + cpu - 0x8000 if cpu >= 0x8000 else cpu
        return rom[off:off + n]
    for typ, rows in records.items():
        bank = 0x0C if typ in (18, 10, 15) else 0x1E
        for cpu, row in sorted(rows.items()):
            if row[1] == 3:       # command 3 (request state) is always followed by the FF 00 restart in the real stream
                assert rom_bytes(bank, row[0], 2) == bytes([255, 0]), (typ, hex(cpu))
                rows[row[0]] = [row[0] + 2, 0]
    for typ, rows in records.items():
        for cpu, row in rows.items():
            if row[1] in (7, 15):
                assert row[2] in rows, (typ, hex(cpu), hex(row[2]))
    assert (len(tables[84]), len(tables[85])) == (13, 4) == (runtime['static']['scripts']['0x54']['state_count'], runtime['static']['scripts']['0x55']['state_count'])
    spawns = runtime['static']['scripts']['0x54']['spawns']
    assert [(s['state'], s['type'], s['dx'], s['dy'], s['parameter']) for s in spawns] == [(4, '0x34', -8, 0, 4), (4, '0x34', 8, 0, 4), (4, '0x34', 0, -16, 4), (4, '0x34', -8, -24, 4), (4, '0x34', -8, -24, 4), (7, '0x55', -16, -36, 0)]

    # --- art ---------------------------------------------------------------------------------------------------------------------------
    vram = bytearray(C.vram_for_act(rom, 2)['vram'])
    dyn_cpu, dyn = D.dynamic_list_for_selector(rom, 21)
    D.apply_dynamic_entries(vram, rom, dyn)
    vram = bytes(vram)
    assert dyn_cpu == runtime['static']['art']['dynamic_list_cpu'] and runtime['static']['art']['dynamic_selector'] == 21 and runtime['static']['art']['palette'] == 14
    pal = G.palette_rgba(rom, 14)
    flash = [tuple(c) for c in pal]
    flash[13] = flash[14] = WHITE                       # command 7 writes CRAM 29/30 (= sprite entries 13/14) to $3F
    approved = json.loads((CACHE / 'art-approval.json').read_text(encoding='utf-8'))['subjects']['0x54']['frame_hashes']
    art = {f['frame']: f for f in runtime['static']['art']['frames']}
    extents, images = {}, {}
    for f in BOSS_FRAMES + CHILD_FRAMES:
        rec = C.C.frame_record(rom, 84, f, 0, 0, vram, flips=(False,))
        image = rec['images'][0]
        assert image['composed_index_sha256'] == approved[str(f)][0] == art[f]['images'][0]['composed_index_sha256'], f      # approved board, unmirrored only
        assert rec['extent_x_y'] == art[f]['extent_x_y'], f
        want = [(p['x'], p['y'], p['tile']) for p in art[f]['images'][0]['sat_pieces']]
        assert want == [(p['x'], p['y'], p['tile']) for p in image['pieces']], f
        extents[f] = rec['extent_x_y']
        images[f] = image
    # --- sprites ------------------------------------------------------------------------------------------------------------------------
    project_path = ROOT / 'SonicChaos_POC.yyp'
    project = json.loads(project_path.read_text(encoding='utf-8'))
    assets = []

    def register(kind, name):
        p = f'{kind}/{name}/{name}.yy'
        if not any(r['id']['path'] == p for r in project['resources']):
            project['resources'].append({'id': {'name': name, 'path': p}})

    def sprite(name, frames, source):
        template = json.loads((ROOT / 'sprites/SPR_chaos_platform/SPR_chaos_platform.yy').read_text(encoding='utf-8'))
        template['name'] = template['%Name'] = name
        seq = template['sequence']; seq['name'] = seq['%Name'] = name
        template.update(width=CANVAS[0], height=CANVAS[1], bbox_left=0, bbox_top=0, bbox_right=CANVAS[0] - 1, bbox_bottom=CANVAS[1] - 1)
        seq['xorigin'], seq['yorigin'] = ANCHOR[0] - REGISTRATION[0], ANCHOR[1] - REGISTRATION[1]
        seq['length'] = float(len(frames))
        layer = guid(name + '/layer')
        template['layers'][0]['name'] = template['layers'][0]['%Name'] = layer
        key_template = copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0])
        keys, template['frames'] = [], []
        dest = ROOT / 'sprites' / name
        if dest.exists():
            import shutil
            shutil.rmtree(dest)
        for i, (frame_no, im) in enumerate(frames):
            frame = guid(f'{name}/{i}')
            (dest / 'layers' / frame).mkdir(parents=True, exist_ok=True)
            im.save(dest / (frame + '.png')); im.save(dest / 'layers' / frame / (layer + '.png'))
            template['frames'].append({'$GMSpriteFrame': 'v1', '%Name': frame, 'name': frame, 'resourceType': 'GMSpriteFrame', 'resourceVersion': '2.0'})
            key = copy.deepcopy(key_template); key['id'] = guid(f'{name}/key/{i}'); key['Key'] = float(i)
            key['Channels']['0']['Id'] = {'name': frame, 'path': f'sprites/{name}/{name}.yy'}; keys.append(key)
            assets.append({'resource': name, 'sprite_frame': i, 'mapping_frame': frame_no, 'source': source, 'rgba_sha256': sha(im.tobytes())})
        seq['tracks'][0]['keyframes']['Keyframes'] = keys
        dump(dest / (name + '.yy'), template); register('sprites', name)
    for name, frames, label in (('SPR_chaos_sez_boss_54', BOSS_FRAMES, 'boss mapping frames 1..8, 15, 16'), ('SPR_chaos_sez_boss_55', CHILD_FRAMES, 'child mapping frames 17..19')):
        sprite(name, [(f, compose(images[f], pal)) for f in frames], f'sez3 + selector $15 loads, sprite palette 14, {label}')
        sprite(name + '_flash', [(f, compose(images[f], flash)) for f in frames], f'same, command-7 flash: palette entries 13/14 = $3F, {label}')

    poof = []
    for f in (7, 8, 9):
        poof.append((f, compose(C.C.frame_record(rom, 0x0F, f, 0, 0, vram, flips=(False,))['images'][0], pal)))
    sprite('SPR_chaos_sez_boss_poof', poof, 'type $0F frames 7..9 (shared mapping), +(1,18) registration like the rest of the boss chain (the S4 enemy poof keeps its own accepted registration)')

    # --- generated numeric data -----------------------------------------------------------------------------------------------------
    pl = runtime['static']['placement']
    init = runtime['contract']['initialization']
    assert init['combat_world'] == [3136, 430] and init['hp'] == 8 and init['vy_8_8'] == 192 and init['token'] == 5 and init['dynamic_selector'] == 21 and init['palette'] == 14
    flash_rows = runtime['lifecycle_feedback_allocator']['flash']
    white = [r['call'] for r in flash_rows if r['colors'] == [63, 63]]
    assert white == list(range(white[0], white[-1] + 1))
    final = next(m for m in fullgame['fight']['marks'] if m['event'] == 'act_loader')
    macros = [('CHAOS_54_ANCHOR_X', pl['world_x']), ('CHAOS_54_ANCHOR_Y', pl['world_y']), ('CHAOS_54_TOKEN', pl['index']),
              ('CHAOS_54_TRIGGER_X', 160), ('CHAOS_54_TRIGGER_Y', 304),
              ('CHAOS_54_COMBAT_X', init['combat_world'][0]), ('CHAOS_54_COMBAT_Y', init['combat_world'][1]), ('CHAOS_54_COMBAT_VY', init['vy_8_8']),
              ('CHAOS_54_CAMERA_X', base['camera_target'][0]), ('CHAOS_54_CAMERA_Y', base['camera_target'][1]), ('CHAOS_54_SETTLED_X', base['settled_camera'][0]),
              ('CHAOS_54_RIGHT_LIMIT', runtime['arena']['baseline']['camera_right_saved']), ('CHAOS_54_BOTTOM_INITIAL', 784), ('CHAOS_54_BOTTOM_LIMIT', base['camera_target'][1]),
              ('CHAOS_54_HP', init['hp']), ('CHAOS_54_COOLDOWN', base['hit_cooldown_helper_calls']), ('CHAOS_54_HIT_DY', 16),
              ('CHAOS_54_Y_LAND', 622), ('CHAOS_54_Y_DROP', 610), ('CHAOS_54_CHILD_Y', 626),
              ('CHAOS_54_SCREEN_ESCAPE', 208), ('CHAOS_54_SCREEN_STOP', 212), ('CHAOS_54_EDGE_ESCAPE', -48), ('CHAOS_54_EDGE_STOP', -44), ('CHAOS_54_MIRROR_ESCAPE', 48), ('CHAOS_54_MIRROR_STOP', 44),
              ('CHAOS_54_BOUNCE_DX', 96), ('CHAOS_54_BOUNCE_VX', 128), ('CHAOS_54_BOUNCE_VY', -896), ('CHAOS_54_BOUNCE_VY_THIRD', -1152), ('CHAOS_54_BOUNCE_CYCLE', 3),
              ('CHAOS_54_GRAVITY_RISE', 24), ('CHAOS_54_GRAVITY_FALL', 48), ('CHAOS_54_GRAVITY_ESCAPE', 32),
              ('CHAOS_54_CHILD_VX', -768), ('CHAOS_54_CHILD_VY', 704), ('CHAOS_54_CHILD_EX', 2), ('CHAOS_54_CHILD_EY', 4),
              ('CHAOS_54_PLAYER_CLAMP_LEFT', 16), ('CHAOS_54_PLAYER_CLAMP_RIGHT', -9), ('CHAOS_54_GUARD_LEFT', 32), ('CHAOS_54_GUARD_RIGHT', -32),
              ('CHAOS_54_LEAD_RIGHT', 104), ('CHAOS_54_LEAD_LEFT', 136), ('CHAOS_54_LEAD_SLEW', 1), ('CHAOS_54_DEADZONE', 8), ('CHAOS_54_FOLLOW_RIGHT', 7), ('CHAOS_54_FOLLOW_LEFT', -7),
              ('CHAOS_54_RIGHT_FRAME', 256), ('CHAOS_54_FLASH_FIRST', white[0]), ('CHAOS_54_FLASH_LAST', white[-1]), ('CHAOS_54_FLASH_END', white[-1] + 1), ('CHAOS_54_FLASH_SLOTS', 4),
              ('CHAOS_54_SND_ATTACK', 182), ('CHAOS_54_SND_EXPLOSION', 196), ('CHAOS_54_SND_CLEAR', 151), ('CHAOS_54_SND_MUSIC', 140)]
    text = '/// Generated by POC_notes/generate_sez_s5.py; Research ' + COMMIT + '.\n'
    text += '/// Numeric ids only (no ROM bytes): state tables/records for $54/$55 and the shared $12/$34/$0A/$0F scripts, constants of boss-54-runtime.json.\n'
    for name, value in macros:
        text += f'#macro {name} {value}\n'
    text += f"function chaos_54_destination() {{ return {{zone:{final['zone']},act:{final['act']}}}; }}\n"
    ext = {84: {f: extents[f] for f in BOSS_FRAMES}, 85: {f: extents[f] for f in CHILD_FRAMES}}
    for typ, key in ((18, '0x12'), (52, '0x34'), (10, '0x0A'), (15, '0x0F')):
        ext[typ] = {num(fr['frame']): [fr['contact_extent_x'], fr['contact_extent_y']] for fr in sup[key]['frames_reachable']}
    text += 'function chaos_54_extent(cp_type,cp_frame) { switch (cp_type) {\n'
    for typ, frames in ext.items():
        text += f'case {typ}: switch (cp_frame) {{\n'
        for f, e in sorted(frames.items()):
            text += f'case {f}: return {json.dumps(e)};\n'
        text += '} break;\n'
    text += '} return [0, 0]; }\n'
    text += 'function chaos_54_table(cp_type) { switch (cp_type) {\n'
    for typ in sorted(tables):
        text += f'case {typ}: return {json.dumps(tables[typ])};\n'
    text += '} return []; }\nfunction chaos_54_record(cp_type,cp_pc) { switch (cp_type) {\n'
    for typ in sorted(records):
        text += f'case {typ}: switch (cp_pc) {{\n'
        for pc, v in sorted(records[typ].items()):
            text += f'case {pc}: return {json.dumps(v)};\n'
        text += '} break;\n'
    text += '} return []; }\n'
    template = json.loads((ROOT / 'scripts/SCR_chaos_sez_effects/SCR_chaos_sez_effects.yy').read_text(encoding='utf-8'))
    for name in ('SCR_chaos_sez_boss_data', 'SCR_chaos_sez_boss'):
        p = ROOT / 'scripts' / name
        p.mkdir(exist_ok=True)
        if name.endswith('_data'):
            (p / (name + '.gml')).write_text(text, encoding='utf-8')
        elif not (p / (name + '.gml')).exists():
            (p / (name + '.gml')).write_text('// placeholder\n', encoding='utf-8')
        s = dict(template); s['name'] = s['%Name'] = name
        dump(p / (name + '.yy'), s); register('scripts', name)
    dump(project_path, project)
    dump(CACHE / 'boss-54-import.json', {
        'research_commit': COMMIT, 'rom_sha256': sha(rom), 'art_transformation': 'NONE (no whole-image mirror)',
        'registration': list(REGISTRATION), 'canvas': list(CANVAS), 'anchor': list(ANCHOR), 'palette_index': 14,
        'scripts': {str(k): len(v) for k, v in tables.items()}, 'records': {str(k): len(v) for k, v in records.items()},
        'approved_frame_hashes_checked': {str(f): approved[str(f)][0] for f in BOSS_FRAMES + CHILD_FRAMES},
        'extents': {str(k): v for k, v in extents.items()}, 'assets': assets,
        'allocators': 'script children $5EE1 slots 7..17 (11); HUD/bonus $5E9C slots 0..15; scheduler 19 slots (the S2 occupancy pool)'})
    print('Verified ROM + Research commit; mirrored', len(names), 'caches; generated', sum(len(v) for v in records.values()), 'script rows,', len(assets), 'sprite frames.')


if __name__ == '__main__':
    main()
