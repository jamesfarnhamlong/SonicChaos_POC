"""Register the boss's GameMaker resources without hand editing the large .yyp."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'SonicChaos_POC.yyp'
project_text = PROJECT.read_text()
project = json.loads(project_text)
resources = [
    ('scripts', 'SCR_chaos_boss_data'), ('scripts', 'SCR_chaos_boss'),
    ('objects', 'OBJ_chaos_object_50'), ('objects', 'OBJ_chaos_boss_effect'),
    *[('sprites', n) for n in ('SPR_chaos_boss_50', 'SPR_chaos_boss_50_mirror',
                              'SPR_chaos_boss_50_flash', 'SPR_chaos_boss_50_mirror_flash',
                              'SPR_chaos_boss_puff_34', 'SPR_chaos_boss_sparkle_0A',
                              'SPR_chaos_boss_poof_0F')]
]
known = {r['id']['name'] for r in project['resources']}
new_lines = []
for kind, name in resources:
    folder = ROOT / kind / name
    folder.mkdir(parents=True, exist_ok=True)
    if kind == 'scripts':
        (folder / (name + '.yy')).write_text(json.dumps({
            '$GMScript': 'v1', '%Name': name, 'isCompatibility': False, 'isDnD': False,
            'name': name, 'parent': {'name': 'Scripts', 'path': 'folders/Scripts.yy'},
            'resourceType': 'GMScript', 'resourceVersion': '2.0'}, indent=2) + '\n')
    if kind == 'objects':
        template = json.loads((ROOT / 'objects/OBJ_chaos_object_21/OBJ_chaos_object_21.yy').read_text())
        template['%Name'] = template['name'] = name
        template['eventList'] = [e for e in template['eventList'] if e['eventType'] == 0 or (name == 'OBJ_chaos_boss_effect' and e['eventType'] == 3)]
        sprite = 'SPR_chaos_boss_50' if name == 'OBJ_chaos_object_50' else 'SPR_chaos_boss_puff_34'
        template['spriteId'] = {'name': sprite, 'path': f'sprites/{sprite}/{sprite}.yy'}
        (folder / (name + '.yy')).write_text(json.dumps(template, indent=2) + '\n')
    if name not in known:
        new_lines.append(f'    {{"id": {{"name": "{name}", "path": "{kind}/{name}/{name}.yy"}}}},')
        known.add(name)
if new_lines:
    marker = '  "resources": [\n'
    assert marker in project_text
    PROJECT.write_text(project_text.replace(marker, marker + '\n'.join(new_lines) + '\n', 1))
