"""Static GML sanity for the SEZ S2 scripts (the standalone Igor compiler is blocked in this environment, see docs/mghz-package-m4.md).

Checks that every called identifier is a project function or a known GML builtin, that every `$HEX`/macro/OBJ_/SPR_ name resolves to a project resource or
macro, that no JavaScript-only syntax slipped in, and that braces/parentheses balance.  This is NOT a compiler; the GameMaker IDE remains the compile gate.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['scripts/SCR_chaos_sez_s2/SCR_chaos_sez_s2.gml', 'scripts/SCR_chaos_sez_s2_data/SCR_chaos_sez_s2_data.gml']
BUILTIN = set('''floor ceil round abs min max sign clamp string array_push array_length array_create variable_global_exists variable_instance_exists instance_exists
instance_find instance_create draw_sprite show_debug_message __view_set function var if else for while switch case return break continue exit with repeat do
true false noone global self id'''.split())
text = {p: (ROOT / p).read_text(encoding='utf-8') for p in FILES}
defined, macros, resources = set(), set(), set()
for g in ROOT.glob('scripts/*/*.gml'):
    t = g.read_text(encoding='utf-8', errors='ignore')
    defined.update(re.findall(r'\bfunction\s+([A-Za-z_]\w*)\s*\(', t))
    macros.update(re.findall(r'#macro\s+([A-Za-z_]\w*)', t))
for kind in ('objects', 'sprites', 'sounds', 'scripts', 'rooms'):
    resources.update(p.name for p in (ROOT / kind).iterdir() if p.is_dir())
errors = []
for path, t in text.items():
    code = re.sub(r'//[^\n]*', '', t)
    code = re.sub(r'"[^"\n]*"', '""', code)
    if code.count('{') != code.count('}') or code.count('(') != code.count(')') or code.count('[') != code.count(']'):
        errors.append(f'{path}: unbalanced brackets')
    for name in set(re.findall(r'\b([A-Za-z_]\w*)\s*\(', code)):
        if name not in defined and name not in BUILTIN:
            errors.append(f'{path}: unresolved call {name}')
    for name in set(re.findall(r'\b((?:OBJ|SPR|ROM|SFX)_\w+)', code)):
        if name not in resources:
            errors.append(f'{path}: unknown resource {name}')
    for name in set(re.findall(r'\bCHAOS_[A-Z0-9_]+', code)):
        if name not in macros:
            errors.append(f'{path}: unknown macro {name}')
    for bad in (r'\blet\s', r'\bconst\s', r'=>', r'===', r'!==', r'\bnull\b', r'\bundefined\b', r'\.length\b', r'\bfunction\s*\('):
        if re.search(bad, code):
            errors.append(f'{path}: JavaScript-only syntax {bad}')
    # a var may not be re-declared in one function body (GameMaker reports it)
    for fn in re.split(r'\nfunction ', '\n' + code):
        names = re.findall(r'(?<!for \()\bvar\s+([A-Za-z_]\w*)', fn)
        dup = {n for n in names if names.count(n) > 1}
        if dup:
            errors.append(f'{path}: duplicate var {sorted(dup)} in {fn.split("(")[0].strip()}')
import json as _json
project = _json.loads((ROOT / 'SonicChaos_POC.yyp').read_text())
paths = {r['id']['path'] for r in project['resources']}
for need in ['scripts/SCR_chaos_sez_s2/SCR_chaos_sez_s2.yy', 'scripts/SCR_chaos_sez_s2_data/SCR_chaos_sez_s2_data.yy', 'sprites/SPR_chaos_sez_shard/SPR_chaos_sez_shard.yy']:
    if need not in paths:
        errors.append(f'project missing {need}')
    elif not (ROOT / need).exists():
        errors.append(f'resource file missing {need}')
# the generated contract must use plain identifier struct keys (GML rejects JSON-style quoted keys)
import re as _re
if _re.search(r'[{,]"[A-Za-z_0-9x]+":', text['scripts/SCR_chaos_sez_s2_data/SCR_chaos_sez_s2_data.gml']):
    errors.append('generated contract uses quoted struct keys')
if errors:
    print(chr(10).join(errors)); sys.exit(1)
print(f'PASS: {len(FILES)} files, {len(defined)} project functions, {len(macros)} macros; calls/resources/macros resolve')
