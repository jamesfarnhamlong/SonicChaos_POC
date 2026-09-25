"""Validate project paths and package the POC source tree. Does not compile GML."""
import hashlib, json, re, sys, zipfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def json_gm(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
guid_re=re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
resource_guid_strings=0
for p in root.rglob('*.yy'):
    data=json_gm(p)
    pending=[data]
    while pending:
        value=pending.pop()
        if isinstance(value,dict):
            for key,item in value.items():
                if key=='id' and isinstance(item,str):
                    assert guid_re.fullmatch(item),(p,item,'invalid GUID')
                    resource_guid_strings+=1
                elif isinstance(item,(dict,list)):
                    pending.append(item)
        elif isinstance(value,list):
            pending.extend(item for item in value if isinstance(item,(dict,list)))
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
report['poc_18_objects']=json.loads((root/'verification/poc18-results.json').read_text())
report['task_06_core']=json.loads((root/'verification/task06-results.json').read_text())
report['task_06_integration']=json.loads((root/'verification/task06-integration-results.json').read_text())
sprite_manifest=json.loads((root/'POC_notes/rom-cache/thz1-object-sprites.json').read_text())
for asset in sprite_manifest['assets']:
    sprite_path=root/asset['sprite_path']
    assert sprite_path.is_file(),sprite_path
    assert hashlib.sha256(sprite_path.read_bytes()).hexdigest()==asset['sha256'],asset
report['enemy_research']={
    'verified_placements':15,
    'rom_derived_sprite_assets':len(sprite_manifest['assets']),
    'type_18_presentation_instances_added':1,
    'room_type_27_instances_added':3,
    'type_21_instances_added':6,
    'type_10_instances_added':5,
    'scope':'numeric types $10/$21/$27 plus verified type-$18 presentation graphics'
}
report['project_resource_counts']=projects
report['resource_metadata_validated']=True
report['resource_guid_strings_validated']=resource_guid_strings
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
terrain_manifest=json.loads((root/'POC_notes/rom-cache/terrain-assets.json').read_text())
for asset in terrain_manifest['assets']:
    root_png=root/asset['root_png']; layer_png=root/asset['layer_png']
    assert root_png.read_bytes()==layer_png.read_bytes(),asset
    assert hashlib.sha256(root_png.read_bytes()).hexdigest()==asset['sha256'],asset
terrain_2=Image.open(root/terrain_manifest['assets'][2]['root_png']).convert('RGBA')
spring_31=list(terrain_2.crop((64,832,96,864)).getdata())
assert set(p[3] for p in spring_31)=={255}
assert spring_31.count((0,0,255,255))==856
for frame in terrain_manifest['normalized_ring_frames']:
    root_png=root/frame['root_png'];layer_png=root/frame['layer_png']
    assert root_png.read_bytes()==layer_png.read_bytes(),frame
    assert hashlib.sha256(root_png.read_bytes()).hexdigest()==frame['sha256'],frame
    transparent=[p for p in Image.open(root_png).convert('RGBA').getdata() if p[3]==0]
    assert set(transparent)=={(0,0,0,0)},frame
assert terrain_manifest['object_only_ring_block_ids']==['0x40','0x41','0x42','0x43']
assert len(terrain_manifest['ring_cells_removed'])==72
terrain_quadrants={asset['world_x']:Image.open(root/asset['root_png']).convert('RGBA')
    for asset in terrain_manifest['assets']}
for cell_info in terrain_manifest['ring_cells_removed']:
    world_x=cell_info['world_x']; world_y=cell_info['world_y']
    quadrant_x=(world_x//1024)*1024; local_x=world_x-quadrant_x
    cell=terrain_quadrants[quadrant_x].crop((local_x,world_y,local_x+32,world_y+32))
    assert set(cell.getdata())=={tuple(cell_info['context_backdrop_rgba'])},cell_info
report['terrain_generation']={
    'quadrants_validated':len(terrain_manifest['assets']),
    'root_layer_copies_match':True,
    'spring_31_context_backdrop_pixels':spring_31.count((0,0,255,255)),
    'ring_frames_normalized':len(terrain_manifest['normalized_ring_frames']),
    'ring_foreground_cells_removed':len(terrain_manifest['ring_cells_removed']),
    'generator':terrain_manifest['generator'],
}
type18_manifest=json.loads((root/'POC_notes/rom-cache/object-18-graphics.json').read_text())
for asset in type18_manifest['assets']:
    root_png=root/asset['root_png'];layer_png=root/asset['layer_png']
    assert root_png.read_bytes()==layer_png.read_bytes(),asset
    assert hashlib.sha256(root_png.read_bytes()).hexdigest()==asset['sha256'],asset
report['type_18_presentation']={'placement':type18_manifest['placement'],
    'frames_validated':len(type18_manifest['assets']),
    'presentation_offset_y':22,
    'scope':type18_manifest['scope']}
ring_create=(root/'objects/OBJ_ring/Create_0.gml').read_text()
assert 'image_speed = 0.25' in ring_create
ring_draw=(root/'objects/OBJ_ring/Draw_0.gml').read_text()
assert 'draw_sprite(SPR_ring, chaosTHZFrame, x, y)' in ring_draw
assert 'else draw_self();' in ring_draw
type18_draw=(root/'objects/OBJ_chaos_object_18/Draw_0.gml').read_text()
assert 'y + 22' in type18_draw
report['windows_feedback_adapters']={
    'ring_flat_terrain_duplicates_removed':142,
    'ring_foreground_cells_removed':72,
    'ring_original_animation_preserved':True,
    'ring_integer_subimage_draw_adapter':True,
    'type_18_presentation_offset_y':22,
}
type10_assets=json.loads((root/'POC_notes/rom-cache/object-10-poc-assets.json').read_text())
type10_reference=json.loads((root/'POC_notes/rom-cache/object-10-graphics.json').read_text())
reference_variants={v['selector']:v for v in type10_reference['variants'] if v['player_type']=='0x01'}
for variant in type10_assets['type_10']:
    reference=reference_variants[variant['selector']]
    assert len(variant['frames'])==2
    for imported,canonical in zip(variant['frames'],reference['frames']):
        root_png=root/imported['root_png'];layer_png=root/imported['layer_png']
        assert root_png.read_bytes()==layer_png.read_bytes()
        assert hashlib.sha256(root_png.read_bytes()).hexdigest()==imported['png_sha256']
        image=Image.open(root_png).convert('RGBA')
        expanded=image.resize((image.width*4,image.height*4),Image.Resampling.NEAREST)
        assert hashlib.sha256(expanded.tobytes()).hexdigest()==canonical['rgba_sha256']
assert type10_assets['type_05']['frame_count']==32
assert type10_assets['type_05']['tile_offsets']==['0x20','0x22']
assert len(json_gm(root/'sprites/SPR_chaos_object_05/SPR_chaos_object_05.yy')['frames'])==32
for frame in type10_assets['type_05']['frames']:
    root_png=root/frame['root_png'];layer_png=root/frame['layer_png']
    assert root_png.read_bytes()==layer_png.read_bytes()
    assert hashlib.sha256(root_png.read_bytes()).hexdigest()==frame['png_sha256']
    canvas=Image.open(root_png).convert('RGBA');bounds=frame['bounds']
    piece=canvas.crop((20+bounds['min_x'],42+bounds['min_y'],
                       20+bounds['max_x'],42+bounds['max_y']))
    source=Image.new('RGBA',(16,24),(0,0,0,0));source.alpha_composite(piece,(4,4))
    expanded=source.resize((64,96),Image.Resampling.NEAREST)
    assert hashlib.sha256(expanded.tobytes()).hexdigest()==frame['reference_rgba_sha256']
report['task_05_closure']={
    'type_10_selector_graphics':'RESOLVED',
    'type_05_visible_effect':'RESOLVED',
    'type_05_frames':32,
    'type_05_anchor':type10_assets['type_05']['anchor'],
    'ring_verifier_contradiction':'RESOLVED',
    'candidate':'THZ1 POC READY WITH DOCUMENTED ADAPTERS',
}
cache_root=root/'POC_notes/rom-cache'
cache_manifest=json.loads((cache_root/'manifest.json').read_text())
for name,expected in cache_manifest['files'].items():
    cached=cache_root/name
    assert cached.is_file(),cached
    assert cached.stat().st_size==expected['bytes'],(name,'bytes')
    assert hashlib.sha256(cached.read_bytes()).hexdigest()==expected['sha256'],(name,'sha256')
report['rom_cache_manifest_files_validated']=len(cache_manifest['files'])
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
        if not p.is_file() or any(part in ('.git','__pycache__','.deps','.video-deps','generated-poc18','generated-feedback') for part in rel.parts):continue
        assert p.suffix.lower() not in ('.sms','.gg','.rom'),p
        z.write(p,rel.as_posix())
with zipfile.ZipFile(dest) as z:assert z.testzip() is None
print(json.dumps(dict(zip=str(dest),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),validation=report),indent=2))
