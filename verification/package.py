"""Validate project paths and package the POC source tree. Does not compile GML."""
import hashlib, json, re, sys, zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def json_gm(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
for p in root.rglob('*.yy'):json_gm(p)
projects={}
for p in root.glob('*.yyp'):
    rows=json_gm(p)['resources'];names=[]
    for row in rows:
        assert (root/row['id']['path']).is_file(),row
        names.append(row['id']['name'])
    assert len(names)==len(set(names)),p
    projects[p.name]=len(names)
report=json.loads((root/'verification/results.json').read_text())
report['canon_layout']=json.loads((root/'verification/layout-results.json').read_text())
report['twist_state_22']=json.loads((root/'verification/twist-results.json').read_text())
enemy_manifest=json.loads((root/'POC_notes/rom-cache/enemy-art/manifest.json').read_text())
report['enemy_research']={
    'verified_placements':len(json.loads((root/'POC_notes/enemy-placements.json').read_text())['enemies']),
    'cached_native_tiles':sum(asset['tile_count'] for asset in enemy_manifest['assets']),
    'room_enemy_instances_added':0,
    'scope':'research cache only; frame composition and AI deferred'
}
report['project_resource_counts']=projects
report['resource_metadata_validated']=True
report['source_sha256']={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
    for name in ['SCR_chaos_core','SCR_chaos_core_data','SCR_chaos_adapter']
    for p in (root/'scripts'/name).glob('*.gml')}
(root/'verification/results.json').write_text(json.dumps(report,indent=2)+'\n')
dest=Path(sys.argv[1]).resolve()
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(root.rglob('*')):
        rel=p.relative_to(root)
        if not p.is_file() or any(part in ('.git','__pycache__') for part in rel.parts):continue
        assert p.suffix.lower() not in ('.sms','.gg','.rom'),p
        z.write(p,rel.as_posix())
with zipfile.ZipFile(dest) as z:assert z.testzip() is None
print(json.dumps(dict(zip=str(dest),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),validation=report),indent=2))
