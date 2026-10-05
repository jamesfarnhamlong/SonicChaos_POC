"""POC-side controlled-routine fixtures for MGHZ3 boss behaviours the Research audit text and its cache do not pin down.

Runs the SAME original-Z80 Oracle/Lab Research uses (tools/mghz56_runtime.py) against the verified local ROM and records the results
(numeric rows only, no ROM bytes):

  warning_contact   $57 state-1 callback $A77F with frames 14/13 (the 24-call warning phase): damage-request geometry per posture, plus the
                    real $5DD1 scheduler path (the callback is installed by the script records and runs every call).
  select_6_or_7     $A613 (callback $A5C6): which of states 06/07 is requested after a throw, for every playerY/bodyY/vy/Y combination.

These two points differed from the original Research prose; Research e0f42f8 confirmed and corrected both: the warning phase is NOT contact-free and $A613 does not require the
non-rising Y>=430 test (it branches on the Z flag $A69F leaves behind).  The shipped GML follows the ROM.

    py -3 POC_notes/generate_mghz_boss_oracles.py --research <research-work> --rom "<Sonic Chaos (Europe).sms>"
"""
import argparse, hashlib, itertools, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--research', type=Path, required=True)
    ap.add_argument('--rom', type=Path, required=True)
    args = ap.parse_args()
    sys.path.insert(0, str(args.research / 'tools'))
    import rom as R
    import mghz56_runtime as M
    r = R.load(args.rom)
    lab = M.Lab(r)
    o, m, SLOT = lab.o, lab.m, M.SLOT
    out = {'research_commit': COMMIT, 'rom_sha256': R.SHA256, 'tool': 'POC_notes/generate_mghz_boss_oracles.py',
           'evidence': 'CONTROLLED ROUTINE RESULT (original Z80 via the Research Oracle); numeric rows only'}

    # ---- warning phase contact ------------------------------------------------------------------------------------------------------
    rows = {}
    for frame in (13, 14):
        ox, oy = M.C.G.parse_frame_record(r, M.C.frame_pointers(r, 86)[1][frame])['raw_word_1'] & 255, M.C.G.parse_frame_record(r, M.C.frame_pointers(r, 86)[1][frame])['raw_word_1'] >> 8
        for attack, hurt, inv in itertools.product((0, 2), (0, 64), (0, 128)):
            hits = []
            for dx, dy in itertools.product(range(-ox - 10, ox + 11), range(-18, 27)):
                M.prepare(lab, dx, dy, frame=frame, type_id=87, attack=attack, hurt=hurt, inv=inv)
                m[SLOT + 3] = 0; m[0xD3B0] = m[0xD520] = m[0xD521] = 0
                lab.call(0xA77F)
                hits.append(int(bool(m[0xD3B0])))
            rows[f'{frame}/{attack}/{hurt}/{inv}'] = {'extent': [ox, oy], 'hit_count': sum(hits),
                                                      'sha256': hashlib.sha256(bytes(hits)).hexdigest()}
    out['warning_contact'] = {'callback': '0xA77F = CALL $0434 -> $6328 + D3B0=FF', 'sweep': rows}
    # the scheduler path: child in its first visit, then state 1 (frames 14/13, callback $A77F), Sonic standing in the 4x16 box
    sched = []
    m[0xD540:0xDA00] = bytes(0x4C0)
    b = SLOT
    m[b] = 87; m[b + 3] = 0; m[b + 63] = 0
    o.word(b + 17, 3200); o.word(b + 20, 350)
    m[0xD500:0xD540] = bytes(64); m[0xD500] = 1; m[0xD501] = m[0xD502] = 5; m[0xD503] = 0; m[0xD52C] = 8; m[0xD52D] = 24
    o.position(3200, 350)
    for t in range(32):
        m[0xD3B0] = m[0xD520] = m[0xD521] = 0
        lab.step()
        k = next(v for v in lab.snap(t)['slots'] if v['type'] == 87)
        sched.append([t, k['state'], k['frame'], k['timer'], int(bool(m[0xD3B0]))])
    out['warning_contact']['scheduler_rows'] = sched

    # ---- $A613 --------------------------------------------------------------------------------------------------------------------------
    sel = []
    for body_y, dy, vy in itertools.product((288, 333, 429, 430, 431, 500), (-1, 0, 1), (-256, 0, 256)):
        M.prepare(lab, dx=-100, dy=0)
        m[SLOT + 2] = 6
        o.word(SLOT + 20, body_y)
        o.word(SLOT + 24, vy & 0xFFFF)
        o.position(3100, body_y + dy)
        lab.call(0xA613)
        sel.append([body_y, dy, vy, m[SLOT + 2]])
    out['select_6_or_7'] = {'callback': '0xA5C6 -> $A613', 'rows': sel}
    path = ROOT / 'POC_notes/rom-cache/mghz/boss-56-poc-oracles.json'
    path.write_text(json.dumps(out, indent=1) + '\n', encoding='utf-8')
    print('wrote', path.name, len(rows), 'warning sweeps,', len(sel), 'selector rows')


if __name__ == '__main__':
    main()
