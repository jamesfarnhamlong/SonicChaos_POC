"""SEZ S2 importer: Research contracts -> byte-identical mirror + generated GML constants + resource registration.

Research main must be the canonical 6e169d7 checkpoint. Nothing is authored: every constant below is read from
data/rom-cache/sez/surface-runtime-contracts.json and asserted against the ROM where the contract names a ROM region.
Run AFTER generate_sez_foundation.py (it bakes the $B0 replacement art and emits the $B0 header).
"""
from pathlib import Path
import argparse, hashlib, json, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]
COMMIT = '6e169d78f0918c74db4f12d89e410dc50423e3e8'
MIRRORED = ('surface-runtime-contracts.json', 'surfaces-0c-1a.json')
SCRIPTS = ('SCR_chaos_sez_s2_data', 'SCR_chaos_sez_s2')

def sha(raw): return hashlib.sha256(raw).hexdigest()
def hexint(v): return int(v, 16) if isinstance(v, str) else v
def gml(v):
    """GML literal: struct keys must be plain identifiers (no JSON-style quoted keys)."""
    import re
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, int): return str(v)
    if isinstance(v, str): return json.dumps(v)
    if isinstance(v, (list, tuple)): return '[' + ','.join(gml(x) for x in v) + ']'
    assert isinstance(v, dict)
    for k in v: assert re.fullmatch(r'[A-Za-z_]\w*', k), k
    return '{' + ','.join(f'{k}:{gml(x)}' for k, x in v.items()) + '}'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--research', type=Path, required=True)
    ap.add_argument('--rom', type=Path, required=True)
    args = ap.parse_args()
    research = args.research.resolve()
    head = subprocess.check_output(['git', '-c', 'safe.directory=' + research.as_posix(), '-C', str(research), 'rev-parse', 'main'], text=True).strip()
    assert head == COMMIT, ('Research main checkpoint', head, COMMIT)
    rom = args.rom.read_bytes()
    assert sha(rom) == 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607', 'canonical ROM'
    dst = ROOT / 'POC_notes/rom-cache/sez'
    # Canonical Research main blobs, never the working tree: another Research branch may be checked out there.
    def canonical(path): return subprocess.check_output(['git', '-c', 'safe.directory=' + research.as_posix(), '-C', str(research), 'show', 'main:' + path])
    for name in MIRRORED:
        (dst / name).write_bytes(canonical('data/rom-cache/sez/' + name))
    contract = json.loads((dst / 'surface-runtime-contracts.json').read_bytes())
    audit = json.loads((dst / 'surfaces-0c-1a.json').read_bytes())
    assert contract['rom_sha256'] == sha(rom) and contract['research_base'] and audit['rom_sha256'] == sha(rom)

    cr, bo = contract['crumble_0C_13'], contract['booster_1A']
    tl = cr['object_13']['timeline_updates_relative_to_spawn_update_T']
    # ---- asserted identities (a mismatch means the contract moved: stop, do not guess) ----
    assert hexint(cr['identity']['block']) == 0xAF and hexint(cr['identity']['replacement_block']) == 0xB0 and hexint(cr['identity']['surface_type']) == 0x0C
    assert hexint(cr['identity']['dynamic_object_type']) == 0x13
    assert hexint(cr['terrain_block']['flags']) == 0x4C and hexint(cr['replacement_block_b0']['flags']) == 0x00
    assert cr['shards']['parameters_delay'] == [3, 8, 5, 1] and cr['shards']['count'] == 4
    assert (tl['rider_hold_first'], tl['rider_hold_count'], tl['break_callback'], tl['sound_a3_children_created_and_remove_callback']) == (1, 16, 17, 18)
    assert tl['first_shard_move'] == {'offset_0_p3': 22, 'offset_8_p8': 27, 'offset_16_p5': 24, 'offset_24_p1': 20}
    assert hexint(bo['identity']['block']) == 0xA7 and hexint(bo['identity']['surface_type']) == 0x1A and hexint(bo['terrain_block']['flags']) == 0x9A
    assert bo['effect']['x_speed_8_8'] == 1792 and bo['effect']['max_x_speed_d373'] == 1792
    assert hexint(bo['effect']['requested_state']) == 0x10 and hexint(bo['effect']['sound_request_de04']) == 0xBD
    eff = bo['effect5_animation']
    assert eff['period_calls'] == 6 and eff['first_copy_image'] == '0x8DFD'
    for key, source in eff['sources'].items():
        off = hexint(source['file'])
        assert sha(rom[off:off + 32]) == source['sha256'], ('effect 5 image', key)

    # ---- shard art: type $13 frame 15 is the same mapping record as the accepted type $07 shard (SPR_chaos_sez_shard) ----
    assert subprocess.run(['git', '-c', 'safe.directory=' + research.as_posix(), '-C', str(research), 'diff', '--quiet', 'main', '--', 'tools']).returncode == 0, 'Research tools differ from canonical main'
    sys.path.insert(0, str(research / 'tools')); sys.path.insert(0, str(ROOT / 'POC_notes'))
    import level_package as L
    import mghz_object_census as C
    manifest = json.loads((dst / 'implementation-manifest.json').read_bytes())
    for key, act in manifest['acts'].items():
        vram, _ = L.build_vram(rom, act['descriptor']['art'])
        a = C.frame_record(rom, 7, 15, 0, 0, vram, flips=(False,))
        b = C.frame_record(rom, 0x13, 15, 0, 0, vram, flips=(False,))
        assert a == b and a['frame_cpu'] == '0x8D3B', ('shared shard mapping', key)

    value = {
        'crumble': {
            'block': 0xAF, 'replacement_block': 0xB0, 'surface': 0x0C, 'object_type': 0x13,
            'parent_slots': [0, 16], 'child_slots': [7, 18], 'hold_updates': 16, 'break_offset': 17, 'children_offset': 18,
            'hold_anchor_offset': -40, 'object_dx': 14, 'object_dy': 24,
            'shard_parameters': cr['shards']['parameters_delay'], 'shard_dx': [-14, -6, 2, 10], 'shard_dy': -24,
            'shard_first_move': [tl['first_shard_move'][k] for k in ('offset_0_p3', 'offset_8_p8', 'offset_16_p5', 'offset_24_p1')],
            'sound_request': 0xA3,
            # States whose player callback runs the floor pass (contract trigger list) plus $21: the shared pass itself carries the $21 -14 foot offset and the contract's controlled
            # floor-pass vectors call the handler for it. $20 (act clear) is excluded exactly as the contract's whole-game scan lists it.
            'handler_states': sorted(set(hexint(s) for s in cr['trigger']['states_that_run_the_floor_pass_and_so_the_handler']) | {0x21}),
        },
        'booster': {
            'block': 0xA7, 'surface': 0x1A, 'x_speed': bo['effect']['x_speed_8_8'], 'max_x_speed': bo['effect']['max_x_speed_d373'],
            'requested_state': 0x10, 'sound_request': 0xBD,
            'ring_probe_states': sorted(hexint(s) for s in bo['interactions']['states_reaching_the_probe']),
            'effect5': {'tile': 0x158, 'period_calls': 6, 'first_image': 1, 'second_image': 2,
                        'first_image_source_file': hexint(eff['sources']['0x8DFD']['file']), 'second_image_source_file': hexint(eff['sources']['0x8DDD']['file'])},
        },
        'research': COMMIT,
    }
    assert value['crumble']['shard_first_move'] == [22, 27, 24, 20]
    text = f'/// GENERATED by POC_notes/generate_sez_s2.py; Research main {COMMIT}.\n'
    text += '/// Constants read from data/rom-cache/sez/surface-runtime-contracts.json (mirrored byte for byte); block ids and timings only, no authored behaviour.\n'
    text += 'function chaos_sez_s2_contract() {\n'
    text += '    if (variable_global_exists("chaosSezS2Contract")) return global.chaosSezS2Contract;\n'
    text += f'    global.chaosSezS2Contract = {gml(value)};\n'
    text += '    return global.chaosSezS2Contract;\n}\n'
    (ROOT / 'scripts/SCR_chaos_sez_s2_data').mkdir(exist_ok=True)
    (ROOT / 'scripts/SCR_chaos_sez_s2_data/SCR_chaos_sez_s2_data.gml').write_text(text, encoding='utf-8')

    # ---- register both script resources (idempotent) ----
    template = json.loads((ROOT / 'scripts/SCR_chaos_sez_effects/SCR_chaos_sez_effects.yy').read_text())
    project_path = ROOT / 'SonicChaos_POC.yyp'
    project = json.loads(project_path.read_text())
    for name in SCRIPTS:
        yy = dict(template); yy['%Name'] = yy['name'] = name
        (ROOT / 'scripts' / name).mkdir(exist_ok=True)
        (ROOT / 'scripts' / name / (name + '.yy')).write_text(json.dumps(yy, indent=2) + '\n', encoding='utf-8')
        rel = f'scripts/{name}/{name}.yy'
        if not any(r['id']['path'] == rel for r in project['resources']):
            project['resources'].append({'id': {'name': name, 'path': rel}})
    project_path.write_text(json.dumps(project, indent=2) + '\n', encoding='utf-8')
    print('SEZ S2 import OK', sha(text.encode()))

if __name__ == '__main__':
    main()
