"""SEZ S3 importer: mirror Research data/rom-cache/sez/platform-28-runtime.json byte for byte (from the pinned commit) and assert the contract identities the runtime relies on."""
from pathlib import Path
import argparse, hashlib, json, subprocess
ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'ed9122b3d5ac11442714ecaef4cc4316c4706342'
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--research', type=Path, required=True); args = ap.parse_args()
    r = args.research.resolve(); g = ['git', '-c', 'safe.directory=' + r.as_posix(), '-C', str(r)]
    assert subprocess.check_output(g + ['rev-parse', 'main'], text=True).strip() == COMMIT, 'Research main checkpoint'
    blob = subprocess.check_output(g + ['show', COMMIT + ':data/rom-cache/sez/platform-28-runtime.json'])
    d = json.loads(blob)
    assert d['rom_sha256'] == 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607' and d['research_base'].startswith('6e169d7')
    c = d['contract']; s7, s5 = c['state7'], c['state5']
    assert s7['parameter'] == 134 and s7['state'] == 7 and s7['initial_velocity_8_8'] == [256, 0] and s7['trigger']['y_inclusive'] == [-16, 24]
    assert s7['lifecycle']['own_delete']['x_abs_gte'] == 640 and s7['lifecycle']['own_delete']['y_abs_gte'] == 672
    assert s5['parameters'] == [4, 132] and s5['no_sag_parameter'] == 4 and s5['sag_offsets'][:9] == [1, 2, 3, 4, 5, 6, 7, 8, 8]
    assert [(p['act'], p['parameter'], p['aux1']) for p in d['placements'] if p['parameter'] in ('0x86', '0x04')] == [('sez1', '0x04', '0x6A'), ('sez1', '0x86', '0x18'), ('sez1', '0x86', '0x30'), ('sez2', '0x86', '0x1C')]
    (ROOT / 'POC_notes/rom-cache/sez/platform-28-runtime.json').write_bytes(blob)
    print('SEZ S3 import OK', hashlib.sha256(blob).hexdigest())
if __name__ == '__main__': main()
