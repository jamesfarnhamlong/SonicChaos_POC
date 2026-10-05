"""MGHZ3 boss $56 + children $57/$58 importer (Research badba9d085906054e4f15fa1d1a960ca2ae0abdd).

Consumes only the canonical Research caches:
  data/rom-cache/mghz/boss-56-runtime.json            (all 19 state scripts, art metadata, oracle rows)
  data/rom-cache/mghz/boss-56-fullgame.json           (emulated original controller-parked fight)
  data/rom-cache/mghz/boss-56-implementation-manifest.json

and writes
  POC_notes/rom-cache/mghz/boss-56-*.json              byte-for-byte mirrors
  scripts/SCR_chaos_mghz_boss_data/*.gml               generated numeric state tables/records + constants
  sprites/SPR_chaos_mghz_boss_*                        approved, UNMIRRORED frames (boss/children, flash variant, $34 puff, $0A sparkle)

No ROM bytes are exported.  Only the five-byte "request-state is followed by FF 00" terminator is read from the
local ROM (same decoder policy as import_gpz_boss.py).

    py -3 POC_notes/import_mghz_boss.py --research <research-work> --rom "<Sonic Chaos (Europe).sms>"
"""
import argparse, copy, hashlib, json, shutil, subprocess, sys, uuid
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f'
CACHE = ROOT / 'POC_notes/rom-cache/mghz'
# SAT-relative (0,0) sits at ANCHOR on the canvas.  The boss composition reaches 48 px above the anchor.
CANVAS = (64, 96)
ANCHOR = (32, 64)
REGISTRATION = (1, 18)     # accepted terrain-relative presentation adapter (+1,+18); gameplay anchors never use it
WHITE = (255, 255, 255, 255)
BOSS_FRAMES = [1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15]
PUFF_FRAMES = [1, 2, 3, 4]
SPARKLE_FRAMES = [5, 6]
OPERAND_BYTES = {'restart_state': 0, 'call': 2, 'velocity_8_8': 4, 'request_state': 1, 'spawn': 6,
                 'call_and_set_callback': 4, 'sound': 1, 'jump': 2, 'set_loop_counter': 1, 'loop_jump': 2}


def sha(raw): return hashlib.sha256(raw).hexdigest()
def guid(value): return str(uuid.uuid5(uuid.NAMESPACE_URL, 'sonic-chaos-mghz-boss/' + value))
def num(v): return int(v, 0) if isinstance(v, str) else int(v)


def dump(path, value):
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
    ap.add_argument('--allow-head', action='store_true', help='skip the exact Research commit check')
    args = ap.parse_args()
    sys.path.insert(0, str(args.research / 'tools'))
    head = subprocess.run(['git', '-C', str(args.research), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    if head != COMMIT and not args.allow_head:
        raise SystemExit(f'Research HEAD {head} is not canonical {COMMIT}')
    import level_package as L
    import thz1_object_assets as G
    import thz1_type18_dynamic_graphics as D
    import mghz_object_census as C
    import rom as R
    rom = L.load_rom(args.rom)
    approval = json.loads((ROOT / 'POC_notes/rom-cache/mghz/art-approval.json').read_text())
    assert sha(rom) == approval['rom_sha256'] == R.SHA256

    # --- byte-for-byte cache mirrors -------------------------------------------------------------------------------------------
    for name in ('boss-56-runtime', 'boss-56-fullgame', 'boss-56-implementation-manifest'):
        shutil.copyfile(args.research / f'data/rom-cache/mghz/{name}.json', CACHE / f'{name}.json')
    runtime = json.loads((CACHE / 'boss-56-runtime.json').read_text())
    fullgame = json.loads((CACHE / 'boss-56-fullgame.json').read_text())
    manifest = json.loads((CACHE / 'boss-56-implementation-manifest.json').read_text())
    assert runtime['rom_sha256'] == sha(rom)
    assert manifest['research_base'] == '7ba4d8a7bfb7f8164462fbf50db05c4b63cec0fe' and manifest['reconciliation_base'] == 'badba9d085906054e4f15fa1d1a960ca2ae0abdd'

    # --- state scripts -----------------------------------------------------------------------------------------------------------
    tables, records = {}, {}
    for typ in (86, 87, 88):
        sc = runtime['static']['scripts'][str(typ)]
        tables[typ] = sc['state_script_cpus']
        rows = {}
        for st in sc['states']:
            rows.update(record_rows(st['ops']))
        records[typ] = rows
    sup = runtime['static']['support']
    for typ, key in ((18, '0x12'), (52, '0x34'), (10, '0x0A'), (15, '0x0F')):
        v = sup[key]
        tables[typ] = None
        rows, cpus = {}, []
        for st in v['states']:
            rows.update(record_rows(st['script']))
            cpus.append(num(st['script_cpu']))
        tables[typ] = cpus
        records[typ] = rows
    # command-3 (request state) is always followed by the FF 00 restart in the real ROM stream: verify it, then add the op.
    def rom_bytes(bank, cpu, n):
        off = bank * 0x4000 + cpu - 0x8000 if cpu >= 0x8000 else cpu
        return rom[off:off + n]
    for typ, rows in records.items():
        bank = 0x0C if typ in (18, 10, 15) else 0x1E
        for cpu, row in sorted(rows.items()):
            if row[1] == 3:
                assert rom_bytes(bank, row[0], 2) == bytes([255, 0]), (typ, hex(cpu))
                rows[row[0]] = [row[0] + 2, 0]
    # every jump/loop target and every callable target of each type must be an installed row; callbacks are numeric ids only
    for typ, rows in records.items():
        for cpu, row in rows.items():
            if row[1] in (7, 15):
                assert row[2] in rows, (typ, hex(cpu), hex(row[2]))
    state_counts = {86: 13, 87: 4, 88: 2}
    for typ, count in state_counts.items():
        assert len(tables[typ]) == count == manifest['state_counts'][str(typ)]

    # --- art ---------------------------------------------------------------------------------------------------------------------
    a3 = C.vram_for_act(rom, 2)
    dyn_cpu, dyn = D.dynamic_list_for_selector(rom, 0x16)
    boss_vram = bytearray(a3['vram'])
    D.apply_dynamic_entries(boss_vram, rom, dyn)
    boss_vram = bytes(boss_vram)
    pal15 = G.palette_rgba(rom, 15)
    assert [v for v in runtime['static']['art']['palette']] == list(rom[L.PALETTE_DATA + 15 * 16:L.PALETTE_DATA + 16 * 16])
    flash = [tuple(c) for c in pal15]
    flash[13] = flash[14] = WHITE                      # command 7 writes CRAM 29/30 (= sprite entries 13/14) to $3F
    for load, got in zip(runtime['static']['art']['loads'], dyn):
        assert load['source_rom'] == got['source_rom'] and load['tile_count'] == got['tile_count']
        assert sha(rom[got['source_rom']:got['source_rom'] + got['tile_count'] * 32]) == load['source_sha256']
    project_path = ROOT / 'SonicChaos_POC.yyp'
    project = json.loads(project_path.read_text())
    assets = []

    def register(kind, name):
        p = f'{kind}/{name}/{name}.yy'
        if not any(r['id']['path'] == p for r in project['resources']):
            project['resources'].append({'id': {'name': name, 'path': p}})

    def sprite(name, images, source):
        template = json.loads((ROOT / 'sprites/SPR_chaos_platform/SPR_chaos_platform.yy').read_text())
        template['name'] = template['%Name'] = name
        seq = template['sequence']; seq['name'] = seq['%Name'] = name
        template.update(width=CANVAS[0], height=CANVAS[1], bbox_left=0, bbox_top=0, bbox_right=CANVAS[0] - 1, bbox_bottom=CANVAS[1] - 1)
        seq['xorigin'], seq['yorigin'] = ANCHOR[0] - REGISTRATION[0], ANCHOR[1] - REGISTRATION[1]
        seq['length'] = float(len(images))
        layer = guid(name + '/layer')
        template['layers'][0]['name'] = template['layers'][0]['%Name'] = layer
        key_template = copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0])
        keys, template['frames'] = [], []
        dest = ROOT / 'sprites' / name
        if dest.exists():
            shutil.rmtree(dest)
        for i, (frame_no, im) in enumerate(images):
            frame = guid(f'{name}/{i}')
            (dest / 'layers' / frame).mkdir(parents=True, exist_ok=True)
            im.save(dest / (frame + '.png')); im.save(dest / 'layers' / frame / (layer + '.png'))
            template['frames'].append({'$GMSpriteFrame': 'v1', '%Name': frame, 'name': frame, 'resourceType': 'GMSpriteFrame', 'resourceVersion': '2.0'})
            key = copy.deepcopy(key_template); key['id'] = guid(f'{name}/key/{i}'); key['Key'] = float(i)
            key['Channels']['0']['Id'] = {'name': frame, 'path': f'sprites/{name}/{name}.yy'}; keys.append(key)
            assets.append({'resource': name, 'sprite_frame': i, 'mapping_frame': frame_no, 'source': source, 'rgba_sha256': sha(im.tobytes())})
        seq['tracks'][0]['keyframes']['Keyframes'] = keys
        dump(dest / (name + '.yy'), template); register('sprites', name)

    approved = approval['subjects']['0x56']['frame_hashes']
    body, body_flash = [], []
    extents = {}
    for f in BOSS_FRAMES:
        rec = C.frame_record(rom, 0x56, f, 0, 0, boss_vram, flips=(False,))
        image = rec['images'][0]
        assert image['composed_index_sha256'] == approved[str(f)][0], f           # approved board, unmirrored only
        body.append((f, compose(image, pal15))); body_flash.append((f, compose(image, flash)))
        extents[f] = rec['extent_x_y']
    runtime_art = {fr['frame']: fr for fr in runtime['static']['art']['frames']}
    for f in BOSS_FRAMES:
        assert extents[f] == runtime_art[f]['extent_x_y'], f
        want = [(p['x'], p['y'], p['tile']) for p in runtime_art[f]['images'][0]['sat_pieces']]
        got = [(p['x'], p['y'], p['tile']) for p in C.frame_record(rom, 0x56, f, 0, 0, boss_vram, flips=(False,))['images'][0]['pieces']]
        assert want == got, f
    sprite('SPR_chaos_mghz_boss_56', body, 'mghz3 + selector $16 loads, sprite palette 15')
    sprite('SPR_chaos_mghz_boss_56_flash', body_flash, 'same, command-7 flash: palette entries 13/14 = $3F')
    support_hashes = {}
    puff = []
    for f in PUFF_FRAMES:
        image = C.frame_record(rom, 0x34, f, 0x6E, 0x6E, boss_vram, flips=(False,))['images'][0]
        puff.append((f, compose(image, pal15))); support_hashes[f'0x34/{f}'] = image['composed_index_sha256']
    sprite('SPR_chaos_mghz_boss_puff_34', puff, 'type $34 art base $6E (zone-3 table $1E:$8C98), shared explosion tiles')
    sparkle = []
    for f in SPARKLE_FRAMES:
        image = C.frame_record(rom, 0x0A, f, 0, 0, boss_vram, flips=(False,))['images'][0]
        sparkle.append((f, compose(image, pal15))); support_hashes[f'0x0A/{f}'] = image['composed_index_sha256']
    sprite('SPR_chaos_mghz_boss_sparkle_0A', sparkle, 'type $0A parameter $FF sparkle frames (shared mapping $8C71)')
    poof_hashes = {}
    poof = []
    for f in (7, 8, 9):
        image = C.frame_record(rom, 0x0F, f, 0, 0, boss_vram, flips=(False,))['images'][0]
        poof.append((f, compose(image, pal15))); poof_hashes[f] = [sha(compose(image, pal15).tobytes()), image['composed_index_sha256']]
    # The accepted enemy poof (SPR_chaos_mghz_poof) shares these pixels but is registered without the shared +(1,18) presentation term; the boss chain keeps one
    # registration for body, puffs, sparkles and smoke.
    sprite('SPR_chaos_mghz_boss_poof_0F', poof, 'type $0F frames 7..9 (shared mapping $8C71), +(1,18) registration like every other mapped object')

    # --- generated numeric data ------------------------------------------------------------------------------------------------------
    b = manifest['baseline']; pl = manifest['placement']
    cam_row = runtime['static']['trigger_camera_tables']['mghz_row']
    th = runtime['thresholds']
    sel = th['throw_selector_by_counter']
    assert len(sel) == 256 and set(sel) == {8, 9}
    text = '/// Generated by POC_notes/import_mghz_boss.py; Research ' + COMMIT + '.\n'
    text += '/// Numeric ids only (no ROM bytes): state tables/records for $56/$57/$58 and the shared $12/$34/$0A/$0F scripts.\n'
    const = {c['name']: c['canonical'] for c in manifest['constants']}
    macros = [('CHAOS_56_ANCHOR_X', pl['world_x']), ('CHAOS_56_ANCHOR_Y', pl['world_y']), ('CHAOS_56_TOKEN', pl['index']), ('CHAOS_56_TRIGGER_X', cam_row['trigger_dx_lt']), ('CHAOS_56_TRIGGER_Y', cam_row['trigger_dy_lt']),
              ('CHAOS_56_PAN_DX', cam_row['camera_x_offset']), ('CHAOS_56_PAN_DY', cam_row['camera_y_offset']),
              ('CHAOS_56_CAMERA_X', pl['world_x'] + cam_row['camera_x_offset']), ('CHAOS_56_CAMERA_Y', pl['world_y'] + cam_row['camera_y_offset']),
              ('CHAOS_56_RISE_Y', const['body vertical turn/floor']['rise_strict_lt']), ('CHAOS_56_FALL_Y', const['body vertical turn/floor']['fall_inclusive_ge']),
              ('CHAOS_56_HP', b['hp_byte_initial']), ('CHAOS_56_COOLDOWN', b['hit_cooldown_calls']), ('CHAOS_56_CLEAR_X', b['clear_world_x']),
              ('CHAOS_56_RIGHT_LIMIT', runtime['static']['act']['header']['ram_d282']),
              ('CHAOS_56_PLAYER_CLAMP_LEFT', const['player clamp']['left']), ('CHAOS_56_PLAYER_CLAMP_RIGHT', const['player clamp']['right']),
              ('CHAOS_56_GUARD_LEFT', const['solid side projection guards']['left']), ('CHAOS_56_GUARD_RIGHT', const['solid side projection guards']['right']),
              ('CHAOS_56_EARLY_X', const['projectile early removal screen X']['raw_lt']), ('CHAOS_56_EARLY_Y', const['projectile early removal screen Y']['raw_ge'])]
    cam = manifest['post_defeat_camera']
    macros += [('CHAOS_56_LEAD_RIGHT', cam['lead_right']), ('CHAOS_56_LEAD_LEFT', cam['lead_left']), ('CHAOS_56_LEAD_SLEW', cam['lead_slew']),
               ('CHAOS_56_DEADZONE', cam['deadzone_half_width']), ('CHAOS_56_FOLLOW_RIGHT', cam['max_right_step']), ('CHAOS_56_FOLLOW_LEFT', cam['max_left_step']),
               ('CHAOS_56_RESTORED_RIGHT', cam['saved_right'])]
    fb = runtime['feedback']
    snd = fb['sounds']
    white = [r['call'] for r in fb['rows'] if r['colors'] == [63, 63]]
    assert white == list(range(white[0], white[-1] + 1)) and fb['flash_command'] == 7
    macros += [('CHAOS_56_RIGHT_FRAME', 48),                       # explicit widescreen adapter: nominal boss screen X = viewWidth - 48 (equals the canonical 208 at 256)
               ('CHAOS_56_FLASH_FIRST', white[0]), ('CHAOS_56_FLASH_LAST', white[-1]), ('CHAOS_56_FLASH_END', white[-1] + 1),
               ('CHAOS_56_FLASH_SLOTS', len(runtime['contacts']['cases'][0][10]['palette_commands'])),
               ('CHAOS_56_SND_LANDING', snd['landing']), ('CHAOS_56_SND_ATTACK', snd['attack_contact']), ('CHAOS_56_SND_EXPLOSION', snd['explosion']),
               ('CHAOS_56_SND_CLEAR', snd['clear_jingle']), ('CHAOS_56_SND_DEATH', snd['grounded_below_death'])]
    for name, value in macros:
        text += f'#macro {name} {value}\n'
    final = next(m for m in fullgame['marks'] if m['name'] == 'level_load_requested_15DE')
    text += f"function chaos_56_destination() {{ return {{zone:{final['zone']},act:{final['act']}}}; }}\n"
    text += 'function chaos_56_throw_selector(cp_counter) { var cp_t = ' + json.dumps(sel) + '; return cp_t[cp_counter & 255]; }\n'
    # +$2C/+$2D (object extents) per mapping frame: boss/children from mapping $9861, support types from their own mappings
    ext = {86: {f: extents[f] for f in BOSS_FRAMES}}
    for typ, key in ((52, '0x34'), (10, '0x0A'), (15, '0x0F')):
        ext[typ] = {num(fr['frame']): [fr['contact_extent_x'], fr['contact_extent_y']] for fr in sup[key]['frames_reachable']}
    text += 'function chaos_56_extent(cp_type,cp_frame) { switch (cp_type) {\n'
    for typ, frames in ext.items():
        text += ('case 86: case 87: case 88: switch (cp_frame) {' if typ == 86 else f'case {typ}: switch (cp_frame) {{') + '\n'
        for f, e in sorted(frames.items()):
            text += f'case {f}: return {json.dumps(e)};\n'
        text += '} break;\n'
    text += '} return [0, 0]; }\n'
    text += 'function chaos_56_table(cp_type) { switch (cp_type) {\n'
    for typ in sorted(tables):
        text += f'case {typ}: return {json.dumps(tables[typ])};\n'
    text += '} return []; }\nfunction chaos_56_record(cp_type,cp_pc) { switch (cp_type) {\n'
    for typ in sorted(records):
        text += f'case {typ}: switch (cp_pc) {{\n'
        for pc, v in sorted(records[typ].items()):
            text += f'case {pc}: return {json.dumps(v)};\n'
        text += '} break;\n'
    text += '} return []; }\n'
    for name in ('SCR_chaos_mghz_boss_data', 'SCR_chaos_mghz_boss'):
        p = ROOT / 'scripts' / name
        p.mkdir(exist_ok=True)
        if name.endswith('_data'):
            (p / (name + '.gml')).write_text(text, encoding='utf-8')
        s = json.loads((ROOT / 'scripts/SCR_chaos_mghz_m3/SCR_chaos_mghz_m3.yy').read_text())
        s['name'] = s['%Name'] = name
        dump(p / (name + '.yy'), s); register('scripts', name)
    # host object: same shape as OBJ_chaos_object_51 (Create + Draw only)
    p = ROOT / 'objects/OBJ_chaos_object_56'
    p.mkdir(exist_ok=True)
    s = json.loads((ROOT / 'objects/OBJ_chaos_object_51/OBJ_chaos_object_51.yy').read_text())
    s['name'] = s['%Name'] = 'OBJ_chaos_object_56'
    dump(p / 'OBJ_chaos_object_56.yy', s); register('objects', 'OBJ_chaos_object_56')
    dump(project_path, project)
    dump(CACHE / 'boss-56-import.json', {
        'research_commit': COMMIT, 'rom_sha256': sha(rom), 'art_transformation': 'NONE (no whole-image mirror)',
        'registration': list(REGISTRATION), 'canvas': list(CANVAS), 'anchor': list(ANCHOR),
        'scripts': {str(k): len(v) for k, v in tables.items()}, 'records': {str(k): len(v) for k, v in records.items()},
        'approved_boss_frame_hashes_checked': approved, 'support_index_hashes': support_hashes,
        'poof_rgba_and_index_hashes': {str(k): v for k, v in poof_hashes.items()},
        'extents': {str(k): v for k, v in extents.items()}, 'assets': assets,
        'allocators': 'script children $5EE1 slots 7..17 (11); HUD/bonus $5E9C slots 0..15; scheduler 19 slots'})
    print('Verified ROM + Research commit; mirrored 3 caches; generated',
          sum(len(v) for v in records.values()), 'script rows,', len(assets), 'sprite frames.')


if __name__ == '__main__':
    main()
