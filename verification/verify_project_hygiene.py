"""Check approved virtual parents and the accepted POC's non-parent invariants.

Run from any directory. --generated-root checks an isolated importer output copy.
No reference-search result is interpreted as asset liveness.
"""
import argparse
import collections
import csv
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '6320fbf92fc29c42c49cc553174f744fd39260a9'
PHASE2_BASELINE = '7119b8f81848d853abd5ad735c1b9b6103796a5a'
METADATA_WRITERS = {
    'POC_notes/extract_chaos_level.py',
    'POC_notes/generate_gpz_foundation.py',
    'POC_notes/generate_mghz_footwear.py',
    'POC_notes/generate_sez_s2.py', 'POC_notes/generate_sez_s4.py',
    'POC_notes/generate_sez_s5.py', 'POC_notes/import_gpz_boss.py',
    'POC_notes/import_gpz_enemies.py', 'POC_notes/import_mghz_boss.py',
    'POC_notes/import_state11_graphics.py', 'POC_notes/import_type09_graphics.py',
    'POC_notes/import_type10_graphics.py', 'POC_notes/install_thz3_boss_assets.py',
    'POC_notes/register_thz3_boss_resources.py',
    'verification/make_anim_counter_data.py',
}
HYGIENE_TOOLING = {
    'verification/verify_terrain_ring_probe.js',
    'verification/verify_spring_interaction.js',
    'verification/verify_platform_spike.js',
    'verification/verify_project_hygiene.py',
    'verification/verify_hygiene_regeneration.py',
    'verification/asset_parent_invariant.js',
    'verification/chaos_asset_parents.csv',
    'POC_notes/chaos_asset_parents.py',
    'docs/gamemaker-hygiene-phase1.md',
}


def read_json(raw):
    if isinstance(raw, bytes):
        raw = raw.decode('utf-8-sig')
    return json.loads(re.sub(r',\s*([}\]])', r'\1', raw))


def git(*args):
    return subprocess.check_output(['git', '-c', 'core.safecrlf=false', '-C', str(ROOT), *args])


def check(root, baseline, compare_baseline=True, phase2=False):
    expected = list(csv.DictReader((ROOT / 'verification/chaos_asset_parents.csv')
                                  .open(encoding='utf-8')))
    assert len(expected) == 390, 'Phase 1 must contain exactly 390 resources'
    assert len({r['name'].casefold() for r in expected}) == 390
    assert len({r['path'].casefold() for r in expected}) == 390
    targets = {r['path']: r for r in expected}
    change_targets = targets
    if phase2:
        retained = list(csv.DictReader((root / 'verification/retained_character_parents.csv')
                                      .open(encoding='utf-8')))
        assert len(retained) == 71, 'Phase 2 must contain exactly 71 sprites'
        assert len({r['name'].casefold() for r in retained}) == 71
        assert len({r['path'].casefold() for r in retained}) == 71
        assert collections.Counter(r['parent'].rsplit('/', 1)[1] for r in retained) == {
            'Knuckles.yy': 30, 'Tails.yy': 29, 'Super Sonic.yy': 12}
        for row in retained:
            assert row['name'].startswith(('SPR_knuckles_', 'SPR_tails_', 'SPR_sonic_super_'))
            assert row['parent'].startswith('folders/Sprites/Characters/Future-Retained/')
        change_targets = {r['path']: r for r in retained}
    project = read_json((root / 'SonicChaos_POC.yyp').read_bytes())
    folders = project['Folders']
    folder_paths = {f['folderPath']: f for f in folders}
    assert len(folder_paths) == len(folders), 'duplicate virtual folder paths'
    resources = project['resources']
    for field in ('name', 'path'):
        values = [r['id'][field].casefold() for r in resources]
        assert len(values) == len(set(values)), 'duplicate registered ' + field
    assert set(targets) <= {r['id']['path'] for r in resources}
    assert set(change_targets) <= {r['id']['path'] for r in resources}
    types = collections.Counter()
    for entry in resources:
        resource = entry['id']; path = resource['path']; file = root / path
        assert file.is_file(), 'missing registered resource: ' + path
        value = read_json(file.read_bytes())
        assert value['name'] == resource['name'], 'registered name mismatch: ' + path
        parent = value['parent']
        assert parent['path'] in folder_paths, 'missing virtual parent: ' + path
        assert parent['name'] == folder_paths[parent['path']]['name'], path
        if path in targets:
            intended = targets[path]['parent']
            assert '/Sonic Chaos/' in intended, 'unapproved Phase 1 folder: ' + path
            assert parent['path'] == intended, 'wrong approved parent: ' + path
            types[value['resourceType']] += 1
        if phase2 and path in change_targets:
            assert value['resourceType'] == 'GMSprite', 'retained resource is not a sprite'
            assert parent['path'] == change_targets[path]['parent'], 'wrong retained parent: ' + path
    if compare_baseline:
        original = read_json(git('show', baseline + ':SonicChaos_POC.yyp'))
        before = dict(original); after = dict(project)
        before.pop('Folders'); after.pop('Folders')
        assert before == after, '.yyp changed outside Folders'
        assert all(f in folders for f in original['Folders']), 'legacy folder changed/removed'
        baseline_paths = set(git('ls-tree', '-r', '--name-only', baseline)
                             .decode().splitlines())
        resource_roots = {r['id']['path'].split('/')[0] for r in resources}
        physical_before = {p for p in baseline_paths if p.split('/')[0] in resource_roots}
        physical_after = {f.relative_to(root).as_posix() for kind in resource_roots
                          for f in (root / kind).rglob('*') if f.is_file()}
        assert physical_before == physical_after, 'physical resource file paths changed'
        changed = set(git('diff', '--name-only', baseline).decode().splitlines())
        changed_resources = set()
        allowed_tooling = ({'verification/verify_project_hygiene.py',
                            'verification/retained_character_parents.csv',
                            'verification/hygiene_phase2_folder_review.csv',
                            'docs/gamemaker-hygiene-phase2.md'} if phase2
                           else METADATA_WRITERS | HYGIENE_TOOLING)
        for path in changed:
            if path == 'SonicChaos_POC.yyp' or path in allowed_tooling:
                continue
            assert path in change_targets, 'unexpected tracked change: ' + path
            old = read_json(git('show', baseline + ':' + path))
            new = read_json((root / path).read_bytes())
            assert old['parent']['path'] != new['parent']['path'], 'parent unchanged: ' + path
            old.pop('parent'); new.pop('parent')
            assert old == new, 'resource changed outside parent: ' + path
            changed_resources.add(path)
        assert changed_resources == set(change_targets), 'migration set differs from approved scope'
        if phase2:
            assert git('show', baseline + ':verification/chaos_asset_parents.csv') == (
                root / 'verification/chaos_asset_parents.csv').read_bytes().replace(b'\r\n', b'\n'), (
                    'Phase 1 Chaos parent authority changed')
    print('PASS: registrations, names, paths, parents; ' + str(dict(types)))
    if compare_baseline:
        print('PASS: accepted baseline invariants, ' + str(len(change_targets)) + ' parent-only resource changes; '
              '.yyp Folders-only; physical resource file set identical')
    if phase2:
        print('PASS: 71 retained sprites (Knuckles 30, Tails 29, Super Sonic 12); '
              'Phase 1 Chaos hierarchy unchanged')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', help='Default: accepted Phase 1 for a Phase 2 project')
    parser.add_argument('--generated-root', type=Path,
                        help='Check isolated regenerated project parents; no baseline diff')
    args = parser.parse_args()
    root = args.generated_root or ROOT
    phase2 = (root / 'verification/retained_character_parents.csv').exists()
    baseline = args.baseline or (PHASE2_BASELINE if phase2 else BASELINE)
    check(root, baseline, not args.generated_root, phase2)


if __name__ == '__main__':
    main()
