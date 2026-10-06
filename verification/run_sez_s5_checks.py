"""SEZ S5 batch: focused S2 runtime/asset checks, the accepted S1 foundation checks, the accepted shared/control regressions and the Research oracle tests.

Environment (the Research working tree may have another branch checked out, so canonical main is read from a clean checkout):
  SONIC_RESEARCH_MAIN  clean checkout of Research main (eff4cec);  SONIC_CHAOS_ROM  the verified Europe v1.2 ROM;  PYTHONPATH  Pillow + the Research venv packages.
"""
from pathlib import Path
import argparse, ast, json, os, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]; BUILD = ROOT / 'build/sez-s5'; BUILD.mkdir(parents=True, exist_ok=True)
RESEARCH = Path(os.environ.get('SONIC_RESEARCH_MAIN') or ROOT.parent / 'sonic-chaos-reference-work')
ROM = os.environ.get('SONIC_CHAOS_ROM') or str(ROOT.parent / 'source/Sonic Chaos (Europe).sms')
# Reuse the accepted M4 regression command inventory, without its reporting writes.
tree = ast.parse((ROOT / 'verification/run_mghz_boss_checks.py').read_text())
nodes = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'nodes' for t in n.targets))
commands = [(['node', f'verification/{n}.js'], ROOT) for n in ['verify_sez_s5', 'verify_sez_s4', 'explore_sez_s4_pool', 'verify_sez_s3', 'verify_sez_s2', 'verify_sez_s1'] + nodes]
commands += [([sys.executable, f'verification/{n}.py'], ROOT) for n in ['verify_sez_assets', 'verify_sez_s5_assets', 'verify_sez_s4_assets', 'verify_sez_s2_assets', 'verify_mghz_boss_assets', 'verify_mghz_assets', 'verify_mghz_footwear_assets', 'verify_mghz_m3_assets', 'lint_mghz_boss_gml', 'lint_sez_s2_gml', 'lint_sez_s4_gml', 'lint_sez_s5_gml']]
commands += [([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_sez_foundation.py', '-v'], RESEARCH), ([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_sez_surfaces.py', '-v'], RESEARCH), ([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_sez_platform_28.py', '-v'], RESEARCH), ([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_sez_enemies_20_23.py', '-v'], RESEARCH), ([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_sez54_runtime.py', '-v'], RESEARCH), ([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_sez54_safe_zone.py', '-v'], RESEARCH), (['git', 'diff', '--check'], ROOT)]
ap = argparse.ArgumentParser(); ap.add_argument('--retry-failed', action='store_true'); args = ap.parse_args()
def name_of(cmd):
    if cmd[1] == '-m': return 'research-' + cmd[-2].replace('.py', '')
    return Path(cmd[1]).stem if cmd[0] != 'git' else 'git-diff-check'
previous = json.loads((BUILD / 'full-results.json').read_text()) if args.retry_failed else []
if args.retry_failed:
    failed = {r['check'] for r in previous if r['exit_code']}
    commands = [(cmd, cwd) for cmd, cwd in commands if name_of(cmd) in failed]
results = []
env = dict(os.environ, SONIC_RESEARCH_MAIN=str(RESEARCH), SONIC_CHAOS_ROM=ROM)
for cmd, cwd in commands:
    name = name_of(cmd)
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
    (BUILD / (name + '.log')).write_text(r.stdout + r.stderr, encoding='utf-8')
    results.append({'check': name, 'command': cmd, 'exit_code': r.returncode})
    print(('PASS ' if r.returncode == 0 else 'FAIL ') + name, flush=True)
    if r.returncode: print((r.stdout + r.stderr)[-2200:], flush=True)
if args.retry_failed:
    retry = {r['check']: r for r in results}
    results = [retry.get(r['check'], r) for r in previous]
(BUILD / 'full-results.json').write_text(json.dumps(results, indent=2) + '\n')
print(f'{sum(r["exit_code"] == 0 for r in results)}/{len(results)} commands passed')
sys.exit(any(r['exit_code'] for r in results))
