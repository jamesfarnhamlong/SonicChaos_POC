"""M4 batch checkpoint: boss parity/integration/widescreen oracles, M1-M3 + shared regressions, assets, lint.
Run with the bundled Python and the Research venv's site-packages on PYTHONPATH (Pillow + the Research tools for the asset checks).
"""
from pathlib import Path
import json, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build/mghz-m4'
BUILD.mkdir(parents=True, exist_ok=True)
nodes = ['verify_mghz_boss', 'verify_mghz_boss_integration', 'verify_mghz_boss_wide',
         'verify_mghz_m3', 'verify_mghz_footwear', 'capture_spring_shoes_presentation',
         'verify_mghz', 'verify_mghz_closure', 'verify_mghz_platform_crush',
         'verify_lost_rings', 'verify_terrain_ring_probe', 'verify_spring_interaction',
         'verify_platform_spike', 'verify_attack_posture', 'verify_death_boundary',
         'verify_viewport_adapter', 'verify_placement_lifecycle', 'verify_type10_step',
         'verify_type10_contact', 'verify_thz2_objects', 'verify_v185_task06',
         'verify_v186_task07', 'verify_thz2_breakable', 'verify_thz2_loops_twist',
         'verify_gpz_foundation', 'verify_gpz_closure', 'verify_gpz_presentation',
         'verify_gpz_enemies', 'verify_gpz_boss', 'verify_thz3_boss',
         'verify_thz_closure', 'verify_debug_select', 'verify_act_completion']
commands = [['node', f'verification/{n}.js'] for n in nodes]
commands += [[sys.executable, f'verification/{n}.py'] for n in
             ['verify_mghz_boss_assets', 'verify_mghz_assets', 'verify_mghz_footwear_assets', 'verify_mghz_m3_assets', 'lint_mghz_boss_gml']]
commands += [['git', 'diff', '--check']]
results = []
for cmd in commands:
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    name = Path(cmd[1]).stem if cmd[0] != 'git' else 'git-diff-check'
    (BUILD / (name + '.log')).write_text(r.stdout + r.stderr, encoding='utf-8')
    results.append({'check': name, 'exit_code': r.returncode})
    print(('PASS ' if r.returncode == 0 else 'FAIL ') + name, flush=True)
    if r.returncode:
        print((r.stdout + r.stderr)[-1800:])
(BUILD / 'full-results.json').write_text(json.dumps(results, indent=2) + '\n')


def count(log, pattern):
    """Assertion counts printed by the shipped-GML test files."""
    m = re.search(pattern, (BUILD / log).read_text(encoding='utf-8'))
    return int(m.group(1)) if m else None


focused = {'status': 'PASS' if not any(r['exit_code'] for r in results) else 'FAIL',
           'parity_256_assertions': count('verify_mghz_boss.log', r'parity so far: (\d+)'),
           'integration_assertions': count('verify_mghz_boss_integration.log', r'trajectory: (\d+) assertions'),
           'widescreen_assertions': count('verify_mghz_boss_wide.log', r'adapter: (\d+)'),
           'asset_assertions': json.loads((ROOT / 'verification/mghz-m4/asset-results.json').read_text())['assertions']}
focused['boss_total_assertions'] = sum(focused[k] for k in ('parity_256_assertions', 'integration_assertions', 'widescreen_assertions', 'asset_assertions'))
(ROOT / 'verification/mghz-m4/focused-results.json').write_text(json.dumps(focused, indent=2) + '\n')
print(json.dumps(focused))
sys.exit(any(r['exit_code'] for r in results))
