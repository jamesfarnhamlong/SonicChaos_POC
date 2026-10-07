"""Rerun metadata writers in paired, disposable POC copies, never the live project.

Compare accepted writers with current writers on the same verified inputs.
All resource bytes must agree except top-level .yy parents. The candidate parents
must match the approved map. Historical writers can change accepted metadata;
those pre-existing regeneration differences are logged, never adopted.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import uuid

from verify_project_hygiene import BASELINE, METADATA_WRITERS, ROOT, read_json


def run(command, cwd, log):
    result = subprocess.run([str(v) for v in command], cwd=cwd, capture_output=True)
    log.write_bytes(result.stdout + result.stderr)
    assert result.returncode == 0, 'Generator failed: ' + str(command) + '; see ' + str(log)


def snapshot(root):
    result = {}
    for kind in ('sprites', 'scripts', 'objects', 'rooms', 'sounds', 'notes', 'timelines', 'tilesets', 'POC_notes/rom-cache'):
        for file in (root / kind).rglob('*'):
            if file.is_file():
                raw = file.read_bytes()
                result[file.relative_to(root).as_posix()] = (
                    read_json(raw) if file.suffix == '.yy' else hashlib.sha256(raw).hexdigest())
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--research', type=Path, default=ROOT.parent / 'sonic-chaos-reference-work')
    parser.add_argument('--resume', type=Path, help='Resume a recorded isolated run')
    parser.add_argument('--rom', type=Path, default=ROOT.parent / 'source/Sonic Chaos (Europe).sms')
    args = parser.parse_args()
    assert hashlib.sha256(args.rom.read_bytes()).hexdigest() == (
        'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607')
    work = args.resume or ROOT / 'build/hygiene' / ('regeneration-' + uuid.uuid4().hex[:8])
    work = work.resolve()
    work.mkdir(parents=True, exist_ok=bool(args.resume))
    print('Isolated run: ' + str(work), flush=True)
    old, new = work / 'accepted-writers', work / 'phase1-writers'
    research = work / 'sonic-chaos-reference-work'
    source = work / 'source'
    inputs = work / 'inputs'
    def checkout(commit):
        run(['git', '-C', research, 'checkout', '-B', 'main', commit], ROOT, work / 'checkout.log')
    intended = list(csv.DictReader((ROOT / 'verification/chaos_asset_parents.csv').open()))
    if not args.resume:
        archive = subprocess.check_output(['git', '-C', str(ROOT), 'archive', BASELINE])
        for destination in (old, new):
            destination.mkdir()
            with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
                tar.extractall(destination, filter='data')
        for relative in METADATA_WRITERS | {'POC_notes/chaos_asset_parents.py',
                                         'verification/chaos_asset_parents.csv', 'SonicChaos_POC.yyp'}:
            shutil.copyfile(ROOT / relative, new / relative)
        for row in intended:
            shutil.copyfile(ROOT / row['path'], new / row['path'])
        run(['git', '-c', 'safe.directory=' + args.research.resolve().as_posix(),
             'clone', '--shared', '--no-checkout', args.research, research], ROOT, work / 'clone.log')
        checkout('53e9095ae2d807be8cd67f8ed572caead09094d9')
        for family in ('gpz-enemy-approval', 'gpz51-correction', 'thz3-boss-support'):
            shutil.copytree(args.research / 'build' / family, research / 'build' / family)
        source.mkdir()
        shutil.copyfile(args.rom, source / 'Sonic Chaos (Europe).sms')
        inputs.mkdir()
        run([sys.executable, research / 'tools/thz1_object_10_graphics.py', args.rom,
             '--output', inputs / 'type10'], ROOT, work / 'type10-source.log')
        run([sys.executable, research / 'tools/player_state_11_graphics.py', args.rom,
             '--output', inputs / 'state11', '--metadata', inputs / 'state11/metadata.json'],
            ROOT, work / 'state11-source.log')
    # This verified scale-1 export is checked by the importer (ROM hash + frame hashes).
    ring = args.research / 'build/poc-type09/09'
    general = ['--research', research, '--rom', args.rom]
    jobs = [
        ('POC_notes/extract_chaos_level.py', [args.rom, '--act', 'thz2'], 'extract-thz2'),
        ('POC_notes/extract_chaos_level.py', [args.rom, '--act', 'thz3'], 'extract-thz3'),
        ('POC_notes/import_type09_graphics.py', [ring], 'type09'),
        ('POC_notes/import_type10_graphics.py', [inputs / 'type10'], 'type10'),
        ('POC_notes/import_type10_selector01.py', [args.rom, research / 'tools'], 'selector01'),
        ('POC_notes/import_type10_selector03.py', [args.rom, research / 'tools'], 'selector03'),
        ('POC_notes/import_state11_graphics.py', [inputs / 'state11'], 'state11'),
        ('POC_notes/install_thz3_boss_assets.py', [research / 'build/thz3-boss-support'], 'thz3-art'),
        ('POC_notes/register_thz3_boss_resources.py', [], 'thz3-register'),
        ('verification/make_anim_counter_data.py', [research / 'data/rom-cache/player-animation-counter.json'], 'anim-counter'),
        ('POC_notes/generate_gpz_foundation.py', general, 'gpz-foundation'),
        ('POC_notes/import_gpz_enemies.py', [], 'gpz-enemies'),
        ('POC_notes/import_gpz_boss.py', [], 'gpz-boss'),
        ('POC_notes/generate_mghz_foundation.py', general, 'mghz-foundation'),
        ('POC_notes/generate_mghz_footwear.py', general, 'mghz-footwear'),
        ('POC_notes/generate_mghz_m3.py', general, 'mghz-m3'),
        ('POC_notes/import_mghz_boss.py', general, 'mghz-boss'),
        ('POC_notes/generate_sez_foundation.py', general, 'sez-foundation'),
        ('POC_notes/generate_sez_s2.py', general, 'sez-s2'),
        ('POC_notes/generate_sez_s4.py', ['--research', research], 'sez-s4'),
        ('POC_notes/generate_sez_s5.py', general, 'sez-s5'),
    ]
    accepted = snapshot(ROOT)
    targets = {row['path']: row['parent'] for row in intended}
    results = json.loads((work / "results.json").read_text()) if args.resume else []
    completed = {r["case"] for r in results}
    for script, arguments, label in jobs:
        if label in completed:
            continue
        if label == 'mghz-boss':
            checkout('e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f')
        elif label == 'sez-foundation':
            checkout('8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c')
        elif label == 'sez-s2':
            checkout('53e9095ae2d807be8cd67f8ed572caead09094d9')
        previous = snapshot(new)
        for destination in (old, new):
            params = list(arguments)
            if label.startswith('extract-'):
                params += ['--project-root', destination, '--out', destination / 'build' / label]
            elif label in ('type09', 'type10', 'state11'):
                params += ['--project-root', destination]
            run([sys.executable, destination / script, *params], destination,
                work / (label + '-' + destination.name + '.log'))
        before, after = snapshot(old), snapshot(new)
        assert before.keys() == after.keys(), label + ': output physical paths differ'
        drift = []
        for path, value in after.items():
            original = before[path]
            if path.endswith('.yy'):
                value = dict(value); original = dict(original)
                if path in targets:
                    assert value['parent']['path'] == targets[path], label + ': parent reset: ' + path
                value.pop('parent', None); original.pop('parent', None)
                assert value == original, label + ': non-parent metadata difference: ' + path
                if path in accepted and value != {k: v for k, v in accepted[path].items() if k != 'parent'}:
                    if after[path] != previous.get(path):
                        drift.append(path)
            else:
                assert value == original, label + ': content bytes differ: ' + path
        old_project = read_json((old / 'SonicChaos_POC.yyp').read_bytes())
        new_project = read_json((new / 'SonicChaos_POC.yyp').read_bytes())
        old_project.pop('Folders'); new_project.pop('Folders')
        assert old_project == new_project, label + ': non-folder project difference'
        results.append({'generator': script, 'case': label, 'passed': True,
                        'historical_regeneration_metadata_drift': drift})
        (work / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
        print('PASS ' + label + '; accepted-writer/new-writer content equal except parents; '
              + str(len(drift)) + ' pre-existing regenerated metadata differences', flush=True)
    print(str(len(results)) + ' paired generator cases passed; report: ' + str(work / 'results.json'))


if __name__ == '__main__':
    main()
