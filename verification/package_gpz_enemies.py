"""Unique review package: tracked project plus this milestone, no old untracked diagnostics."""
import json,hashlib,re,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NAME='SonicChaos_GPZ_Regular_Enemies_20261003_D'
BUILD=ROOT/'build/gpz-enemies'
ZIP=ROOT.parent/'releases'/(NAME+'.zip')
EXTRACT=BUILD/'extracted'/NAME
def read(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text(encoding='utf-8-sig')))
results=read(BUILD/'focused-results.json');assert all(r['exit_code']==0 for r in results)
assert 'Igor complete.' in (BUILD/'source-compile.log').read_text()
assert not ZIP.exists() and not EXTRACT.exists(),'Never overwrite a prior acceptance package'
tracked=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
files={ROOT/p for p in tracked if (ROOT/p).is_file()}
for folder in ['objects/OBJ_chaos_object_25','objects/OBJ_chaos_object_2C','objects/OBJ_chaos_gpz_smoke_0F','scripts/SCR_chaos_gpz_enemy','scripts/SCR_chaos_gpz_enemy_data',
               'sprites/SPR_chaos_gpz_enemy_25','sprites/SPR_chaos_gpz_enemy_25_mirror','sprites/SPR_chaos_gpz_enemy_2C','sprites/SPR_chaos_gpz_smoke_0F',
               'sprites/SPR_chaos_gpz_boss_51','sprites/SPR_chaos_gpz_support_34','sprites/SPR_chaos_gpz_support_0A','verification/gpz-enemies']:
    files.update(p for p in (ROOT/folder).rglob('*') if p.is_file())
for p in ['POC_notes/import_gpz_enemies.py','docs/gpz-regular-enemies-d.md','verification/make_gpz_enemy_oracles.py','verification/verify_gpz_enemies.js',
          'verification/verify_gpz_enemy_assets.py','verification/run_gpz_enemy_checks.py','verification/package_gpz_enemies.py']:
    files.add(ROOT/p)
for name in ['approved-art-manifest','enemy-art-approval','boss-51-composition','enemy-import']:
    files.add(ROOT/f'POC_notes/rom-cache/gpz/{name}.json')
blocked={'.sms','.gg','.rom','.zip','.exe','.win','.pyc','.log','.tmp'}
files={p for p in files if p.suffix.lower() not in blocked and not set(p.relative_to(ROOT).parts)&{'build','__pycache__','.git','node_modules'}}
included={'objects','scripts','sprites','rooms','sounds','tilesets','timelines','options','notes','docs','POC_notes','verification'}
files={p for p in files if p.relative_to(ROOT).parts[0] in included or p.name=='SonicChaos_POC.yyp' or (p.parent==ROOT and p.suffix=='.md')}
assert [p.name for p in files if p.suffix=='.yyp']==['SonicChaos_POC.yyp']
project=read(ROOT/'SonicChaos_POC.yyp')
assert len(project['resources'])==len({r['id']['path'] for r in project['resources']})
for resource in project['resources']:
    p=ROOT/resource['id']['path'];assert p in files,p
    d=read(p)
    if d.get('resourceType')=='GMSprite':
        for frame in d['frames']:
            assert p.parent/(frame['name']+'.png') in files
            for layer in d['layers']:assert p.parent/'layers'/frame['name']/(layer['name']+'.png') in files
ZIP.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files):z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(ZIP) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.yyp')])==1
    z.extractall(EXTRACT.parent)
for p in files:assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
report={'zip':str(ZIP),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'files':len(files),'resources':len(project['resources']),
        'extracted_project':str(EXTRACT/'SonicChaos_POC.yyp'),'research_commit':'d214c60ccf04f62634c4565f4abf38ec63ae77c6',
        'tests':len(results),'source_compile':'PASS','extracted_compile':'PENDING','windows_acceptance':'PENDING','commit':'UNCOMMITTED'}
(BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
