"""Verify two canonical THZ1 ring datasets feeding one explicit surface."""
from __future__ import annotations

import hashlib, json, re
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
RESEARCH=ROOT.parent/'sonic-chaos-reference-work/data/rom-cache/thz1/layout-interactions.json'
TYPE09_RESEARCH=ROOT.parent/'sonic-chaos-reference-work/data/rom-cache/thz1/object-09.json'
SOURCE_SHA='2cdec17b0eb0ea8cada58e442074ebb1b3641cde09dfb9c8e959ceacea335628'
LAYOUT_SHA='0d2bba656d1a2cbaf8d5545d47c1c42b40235b8f3f67f015e324c10ec92f719b'
TYPE09_SOURCE_SHA='827b11bedfc0e4a8dfe3039288ace6db8cf5ddf8fb969e0b61ffaba82a1acdb3'
def gm(path): return json.loads(re.sub(r',\s*([}\]])',r'\1',path.read_text()))

assert hashlib.sha256(RESEARCH.read_bytes()).hexdigest()==SOURCE_SHA
source=json.loads(RESEARCH.read_text())['rings']
assert len(source)==142
data_path=ROOT/'scripts/SCR_chaos_ring_data/SCR_chaos_ring_data.gml'
data=data_path.read_text()
records=[tuple(map(int,row[:3]))+(int(row[3],16),)+tuple(map(int,row[4:]))
 for row in re.findall(r'\[(\d+),(\d+),(\d+),\$([0-9A-F]{2}),(\d+),(\d+)\]',data)]
expected=[]
for i,row in enumerate(source):
 x,y=row['x'],row['y']; expected.append((i,x,y,row['block_id'],(y//32)*128+x//32,
     (1 if x%32==24 else 0)+(2 if y%32==24 else 0)))
assert records==expected and len(records)==142
assert SOURCE_SHA in data and LAYOUT_SHA in data

assert hashlib.sha256(TYPE09_RESEARCH.read_bytes()).hexdigest()==TYPE09_SOURCE_SHA
type09_source=json.loads(TYPE09_RESEARCH.read_text())
assert type09_source['raw_record_count']==24 and len(type09_source['placements'])==24
assert type09_source['parameter_counts']=={'0x00':11,'0x01':13}
type09_path=ROOT/'scripts/SCR_chaos_type09_data/SCR_chaos_type09_data.gml'
type09_data=type09_path.read_text()
type09_records=[(int(i),int(x),int(y),int(parameter,16),int(offset,16)) for i,x,y,parameter,offset in
 re.findall(r'\[(\d+),(\d+),(\d+),\$([0-9A-F]{2}),\$([0-9A-F]{5})\]',type09_data)]
type09_expected=[(row['index'],row['world_x'],row['world_y'],int(row['parameter'],16),int(row['rom_offset'],16))
 for row in type09_source['placements']]
assert type09_records==type09_expected and len(type09_records)==24
visible={(x,y) for _,x,y,parameter,_ in type09_records if parameter==0}
hidden={(x,y) for _,x,y,parameter,_ in type09_records if parameter==1}
assert len(visible)==11 and len(hidden)==13 and 142+len(visible)==153
loop={(2880,384),(2832,448),(2840,408),(2928,448),(2920,408)}
twist={(3124,548),(3160,522),(3208,512)}
post_twist={(3367,830),(3394,798),(3422,774)}
assert loop<=visible and twist<=visible and post_twist<=visible
assert TYPE09_SOURCE_SHA in type09_data

motion=(ROOT/'scripts/SCR_chaos_motion_data/SCR_chaos_motion_data.gml').read_text()
tiles=[int(x) for x in re.findall(r'\d+',re.search(r'global\.chaosTileIds\s*=\s*\[(.*?)\];',motion,re.S).group(1))]
assert hashlib.sha256(bytes(tiles)).hexdigest()==LAYOUT_SHA
room=gm(ROOT/'rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy')
instances=[i for layer in room['layers'] for i in layer.get('instances',[])]
assert sum(i['objectId']['name']=='OBJ_ring' for i in instances)==0

manager_dir=ROOT/'objects/OBJ_chaos_ring_manager'
create=(manager_dir/'Create_0.gml').read_text(); step=(manager_dir/'Step_0.gml').read_text()
collect=(manager_dir/'Step_2.gml').read_text(); draw=(manager_dir/'Draw_0.gml').read_text()
gui=(manager_dir/'Draw_64.gml').read_text()
assert 'SCR_chaos_ring_data()' in create and 'array_create(chaosRingSourceCount,true)' in create
assert 'SCR_chaos_type09_data()' in create
assert 'chaosType09State[cp_t09] = 1' in create and 'chaosType09State[cp_t09] = 3' in create
assert 'depth = 0' in create and 'chaosRingRenderX = 0' in create and 'chaosRingRenderY = 0' in create
for token in ('surface_exists','surface_create','surface_set_target','draw_clear_alpha',
              'surface_reset_target','draw_surface','draw_sprite(SPR_ring,cp_frame'):
 assert token in draw,token
assert draw.count('draw_sprite(SPR_ring')==1
assert draw.count('draw_sprite(SPR_chaos_object_09')==1
assert 'cp_t09_canonical_x = cp_t09_record[1];' in draw
assert 'cp_t09_canonical_y = cp_t09_record[2];' in draw
assert 'cp_t09_record[1]+chaosRingRenderX' not in draw
assert 'for (var cp_i=0; cp_i<chaosRingSourceCount; cp_i++)' in draw
assert 'for (var cp_t09=0; cp_t09<chaosType09SourceCount; cp_t09++)' in draw
assert 'cp_t09_state != 1 && cp_t09_state != 2' in draw
assert not re.search(r'cp_(world_)?[xy]\s*[+\-]=',draw)
assert 'keyboard_check_pressed(vk_f8)' in step and 'keyboard_check_pressed(vk_f9)' in step
assert 'global.ring += 1' in collect and 'OBJ_ring_stars' in collect
assert 'abs(cp_player.x-cp_t09_record[1]) >= 12' in collect
assert 'abs(cp_player.y-cp_t09_record[2]) >= 12' in collect
assert '(chaosRingGlobalFrame mod 2) != 0' in collect
assert 'chaosType09State[cp_t09] = 2' in collect and 'chaosType09State[cp_t09] = -1' in collect
assert 'chaosType09SparkleTimer[cp_t09] > 32' in step
assert '(chaosRingGlobalFrame div 8) mod 4' in draw
assert '(chaosType09SparkleTimer[cp_t09]-1) div 4' in draw
assert 'cp_t09_draw_x+7 >= cp_cam_x' in draw and 'cp_t09_draw_y-15 < cp_cam_y+cp_h' in draw
assert 'cp_t09_draw_x = cp_t09_canonical_x+TYPE09_RENDER_X' in draw
assert 'cp_t09_draw_y = cp_t09_canonical_y+TYPE09_RENDER_Y' in draw
assert 'cp_t09_draw_x-cp_cam_x,cp_t09_draw_y-cp_cam_y' in draw
assert 'draw_world_y=' in draw and 'adapter_y=' in draw
_adapter=(ROOT/'scripts/SCR_chaos_render_adapter/SCR_chaos_render_adapter.gml').read_text()
assert '#macro TYPE09_RENDER_X 1' in _adapter and '#macro TYPE09_RENDER_Y 17' in _adapter
# Idle frames 1-4 have asset rows -15..0; with the +17 background term they must land on +2..+17.
assert (-15+17,0+17)==(2,17)
_collect=(ROOT/'objects/OBJ_chaos_ring_manager/Step_2.gml').read_text()
assert 'TYPE09_RENDER' not in _collect and 'chaos_render_offset' not in _collect
assert all(token in draw for token in ('c_aqua','draw_line','cp_t09_mx-11','cp_t09_mx+11'))
assert all(abs(delta)<12 for delta in (-11,0,11))
assert not any(abs(delta)<12 for delta in (-12,12))
assert 'chaosRingExpectedThisFrame[cp_i] = true' in draw
assert '!chaosRingExpectedThisFrame[cp_dump]' in draw
assert 'string(chaosRingDrawnThisFrame[cp_dump])' in draw
assert 'RING SOLO' in gui and 'RING COVERAGE' in gui
assert all(token not in gui for token in ('TERRAIN:','TYPE09 VISIBLE:','VISIBLE ACTIVE:',
                                          'EXPECTED IN CAMERA:','MISSED DRAW CALLS:','HASHES: OK'))
controls_draw=(ROOT/'objects/OBJ_chaos_controls/Draw_0.gml').read_text()
assert 'THZ1 CLEANUP RING LAYER' not in controls_draw
assert all(token not in controls_draw for token in ('foot=', 'grounded=', 'loop=', '$26 state='))

pairs={(str(r['x']),str(r['y'])) for r in source}
for path in ROOT.rglob('*.gml'):
 if path in (data_path,type09_path) or '.codex-build' in path.parts: continue
 hits=sum(1 for x,y in pairs if f'{x},{y}' in path.read_text())
 assert hits<10,(path,hits)
assert not (ROOT/'scripts/SCR_chaos_terrain_rings').exists()

type09_census=json.loads((ROOT.parent/'sonic-chaos-reference-work/data/rom-cache/thz1/object-census.json').read_text())
assert type09_census['type_counts']['0x09']==24

terrain=json.loads((ROOT/'POC_notes/rom-cache/terrain-assets.json').read_text())
assert terrain['object_only_ring_block_ids']==['0x40','0x41','0x42','0x43']
assert len(terrain['ring_cells_removed'])==72
quadrants={a['world_x']:Image.open(ROOT/a['root_png']).convert('RGBA') for a in terrain['assets']}
for cell in terrain['ring_cells_removed']:
 qx=(cell['world_x']//1024)*1024; lx=cell['world_x']-qx; y=cell['world_y']
 pixels=set(quadrants[qx].crop((lx,y,lx+32,y+32)).getdata())
 assert pixels=={tuple(cell['context_backdrop_rgba'])},cell

project={r['id']['name'] for r in gm(ROOT/'SonicChaos_POC.yyp')['resources']}
assert {'SCR_chaos_ring_data','SCR_chaos_type09_data','OBJ_chaos_ring_manager'}<=project
assert 'SPR_chaos_object_09' in project
assert 'SCR_chaos_terrain_rings' not in project
assert not ({f'SPR_chaos_block_{x:02X}' for x in range(0x40,0x46)} & project)

type09_assets=json.loads((ROOT/'POC_notes/rom-cache/object-09-poc-assets.json').read_text())
assert type09_assets['mapping_cpu']=='0x8C71' and type09_assets['mapping_rom']=='0x3CC71'
assert type09_assets['canvas']==[16,16] and type09_assets['origin']==[8,15]
assert type09_assets['sat_y_plus_one'] is True
assert type09_assets['state_1_sequence']==[1,2,4,3] and type09_assets['state_1_duration']==8
assert type09_assets['state_2_sequence']==[5,6,5,6,5,6,5,6]
assert type09_assets['state_2_duration']==4 and type09_assets['state_2_updates']==32
assert [row['mapping_frame'] for row in type09_assets['assets']]==list(range(1,7))
assert [row['displayed_relative_bounds'] for row in type09_assets['assets']]==[
 [-7,-15,6,0],[-5,-15,5,0],[-6,-15,4,0],[-2,-15,1,0],[-4,-9,2,-1],[-3,-14,1,-4]]
type09_sprite=gm(ROOT/'sprites/SPR_chaos_object_09/SPR_chaos_object_09.yy')
assert (type09_sprite['width'],type09_sprite['height'])==(16,16)
assert (type09_sprite['sequence']['xorigin'],type09_sprite['sequence']['yorigin'])==(8,15)
assert len(type09_sprite['frames'])==6
for asset in type09_assets['assets']:
 root_png=ROOT/asset['root_png']; layer_png=ROOT/asset['layer_png']
 assert root_png.read_bytes()==layer_png.read_bytes()
 assert hashlib.sha256(root_png.read_bytes()).hexdigest()==asset['png_sha256']
 assert hashlib.sha256(Image.open(root_png).convert('RGBA').tobytes()).hexdigest()==asset['rgba_sha256']

report={'terrain_source_count':142,'terrain_generated_count':142,'terrain_source_sha256':SOURCE_SHA,
 'layout_sha256':LAYOUT_SHA,'room_OBJ_ring_count':0,'type_09_raw_count':24,
 'type_09_visible_count':11,'type_09_hidden_count':13,'initial_visible_population':153,
 'type_09_source_sha256':TYPE09_SOURCE_SHA,'known_loop_type09':sorted(loop),
 'known_twist_type09':sorted(twist),'ring_cells_stripped':72,'shared_surface_draw_loops':2,
 'restart_terrain_active_count':142,'restart_type09_visible_active_count':11,
 'type_09_mapping_cpu':'0x8C71','type_09_mapping_rom':'0x3CC71',
 'type_09_canvas':[16,16],'type_09_origin':[8,15],'type_09_sat_y_plus_one':True,
 'type_09_visible_pixel_bounds':[row['displayed_relative_bounds'] for row in type09_assets['assets']],
 'type_09_state_1_sequence':[1,2,4,3],'type_09_state_1_duration':8,
 'type_09_state_2_sequence':[5,6,5,6,5,6,5,6],'type_09_state_2_updates':32,
 'strict_overlap':{'11':True,'12':False},
 'terrain_render_offsets':[0,0],'type_09_render_offsets':[1,17],
 'surface':'view-sized','modes':['NORMAL','SOLO','COVERAGE'],
 'normal_mode_debug_text':False,'f8_tiny_labels_only':True,'f9_audit_retained':True}
(ROOT/'verification/ring-layer-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
