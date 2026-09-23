"""Validate project paths and package the POC source tree. Does not compile GML."""
import hashlib, json, re, sys, zipfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def json_gm(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
for p in root.rglob('*.yy'):
    data=json_gm(p)
    if data.get('resourceType')=='GMSprite':
        sprite_dir=p.parent
        frames=[frame['name'] for frame in data.get('frames',[])]
        layers=[layer['name'] for layer in data.get('layers',[])]
        for frame in frames:
            assert (sprite_dir/f'{frame}.png').is_file(),(p,frame,'root PNG')
            for layer in layers:
                layer_png=sprite_dir/'layers'/frame/f'{layer}.png'
                assert layer_png.is_file(),(p,frame,layer,'layer PNG')
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
report['type_27_handlers']=json.loads((root/'verification/type27-results.json').read_text())
sprite_manifest=json.loads((root/'POC_notes/rom-cache/thz1-object-sprites.json').read_text())
for asset in sprite_manifest['assets']:
    sprite_path=root/asset['sprite_path']
    assert sprite_path.is_file(),sprite_path
    assert hashlib.sha256(sprite_path.read_bytes()).hexdigest()==asset['sha256'],asset
report['enemy_research']={
    'verified_placements':len(json.loads((root/'POC_notes/enemy-placements.json').read_text())['enemies']),
    'rom_derived_sprite_assets':len(sprite_manifest['assets']),
    'room_type_27_instances_added':3,
    'type_21_instances_added':0,
    'scope':'type $27 implemented from recovered handlers; type $21 deliberately deferred'
}
report['project_resource_counts']=projects
report['resource_metadata_validated']=True
report['sprite_root_and_layer_pngs_validated']=True
for slot in range(1,6):
    create=(root/f'objects/OBJ_menu_data_card_{slot}/Create_0.gml').read_text()
    assert 'loadIcon = 0;' in create and 'loadZone = "zone";' in create
report['data_card_draw_defaults_validated']=True
adapter=(root/'scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml').read_text()
assert 'cp_spike_top = cp_o.chaosBaseY-cp_visible' in adapter
assert 'cp_spike_bottom = cp_o.chaosBaseY' in adapter
assert 'cp_o.x-12,cp_o.chaosBaseY-cp_visible' in adapter
report['moving_spike_floor_anchor_validated']=True
spring_alpha={}
for block in (48,49,51,54,56):
    sprite_dir=root/f'sprites/SPR_chaos_spring_{block}'
    root_png=next(sprite_dir.glob('*.png'))
    layer_png=next(sprite_dir.glob('layers/*/*.png'))
    assert root_png.read_bytes()==layer_png.read_bytes(),block
    image=Image.open(root_png).convert('RGBA')
    pixels=list(image.getdata())
    alpha=[pixel[3] for pixel in pixels]
    transparent=[pixel for pixel in pixels if pixel[3]==0]
    assert image.getpixel((0,0))==(0,0,0,0) and set(transparent)=={(0,0,0,0)},block
    assert 0<alpha.count(0)<len(alpha),block
    spring_alpha[str(block)]={'transparent_pixels':alpha.count(0),'opaque_pixels':len(alpha)-alpha.count(0)}
report['terrain_spring_transparency']=spring_alpha
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
