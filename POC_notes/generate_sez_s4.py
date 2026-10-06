"""SEZ S4 importer: mirror Research data/rom-cache/sez/enemies-20-23-runtime.json (pinned commit blob) and register the enemy script. Run after generate_sez_foundation.py."""
from pathlib import Path
import argparse, hashlib, json, subprocess
ROOT = Path(__file__).resolve().parents[1]
COMMIT = '8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c'
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--research', type=Path, required=True); args = ap.parse_args()
    r = args.research.resolve(); g = ['git', '-c', 'safe.directory=' + r.as_posix(), '-C', str(r)]
    assert subprocess.run(g + ['merge-base', '--is-ancestor', COMMIT, 'main']).returncode == 0, 'Research checkpoint on main'
    blob = subprocess.check_output(g + ['show', COMMIT + ':data/rom-cache/sez/enemies-20-23-runtime.json'])
    d = json.loads(blob)
    assert d['rom_sha256'] == 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607' and len(d['placements']) == 15
    assert sorted(p['type_id'] for p in d['placements']) == ['0x20'] * 7 + ['0x23'] * 8
    c = d['contract']
    assert c['0x20']['contact_extents_by_frame'] == {'0': [0, 0], '1': [7, 20], '2': [7, 20]} and c['0x23']['contact_extents_by_frame'] == {'0': [0, 0], '1': [9, 26], '2': [7, 20]}
    assert c['0x23']['rest']['contact_callbacks'] == 22 and c['0x23']['rest']['records'][:3] == [[12, 2, 'contact'], [4, 1, 'contact'], [6, 2, 'contact']]
    (ROOT / 'POC_notes/rom-cache/sez/enemies-20-23-runtime.json').write_bytes(blob)
    template = json.loads((ROOT / 'scripts/SCR_chaos_sez_effects/SCR_chaos_sez_effects.yy').read_text())
    project_path = ROOT / 'SonicChaos_POC.yyp'; project = json.loads(project_path.read_text())
    name = 'SCR_chaos_sez_enemy'
    yy = dict(template); yy['%Name'] = yy['name'] = name
    (ROOT / 'scripts' / name / (name + '.yy')).write_text(json.dumps(yy, indent=2) + '\n', encoding='utf-8')
    rel = f'scripts/{name}/{name}.yy'
    if not any(x['id']['path'] == rel for x in project['resources']): project['resources'].append({'id': {'name': name, 'path': rel}})
    project_path.write_text(json.dumps(project, indent=2) + '\n', encoding='utf-8')
    print('SEZ S4 import OK', hashlib.sha256(blob).hexdigest())
if __name__ == '__main__': main()
