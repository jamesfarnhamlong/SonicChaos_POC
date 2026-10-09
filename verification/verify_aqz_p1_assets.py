"""AQZ P1 byte/cache/assets/registration parity. No visual heuristics or authored placements."""
from pathlib import Path
import hashlib,json,re,sys,os
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
RESEARCH=Path(os.environ.get('SONIC_RESEARCH_MAIN',ROOT.parent/'sonic-chaos-reference-work'))
sys.path.insert(0,str(RESEARCH/'tools'))
import level_package as L
rom=L.load_rom(Path(os.environ.get('SONIC_CHAOS_ROM',ROOT.parent/'source/Sonic Chaos (Europe).sms')))
cache=ROOT/'POC_notes/rom-cache/aqz';checks=0

def check(ok,msg):
 global checks
 assert ok,msg
 checks+=1

def yy(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text(encoding='utf8')))
for n in ('implementation-manifest','object-census','art-approval','water-runtime','original-checks','water-game-checks'):
 check((cache/(n+'.json')).read_bytes()==(RESEARCH/'data/rom-cache/aqz'/(n+'.json')).read_bytes(),'cache stale '+n)
m=json.loads((cache/'implementation-manifest.json').read_bytes());census=json.loads((cache/'object-census.json').read_bytes());assets=json.loads((cache/'generated-assets.json').read_bytes())
check(hashlib.sha256(rom).hexdigest()==m['rom_sha256']==assets['rom_sha256'],'ROM SHA')
check(assets['research_commit']=='eb4bf953dcb2f1ad57c629543b55c8536eb688cb' and assets['approval_checked'],'provenance')
gml=(ROOT/'scripts/SCR_chaos_aqz_data/SCR_chaos_aqz_data.gml').read_text()
def fn(n):return json.loads(re.search(r'function '+n+r'\(\) \{ return (.*?); \}',gml).group(1))
project=yy(ROOT/'SonicChaos_POC.yyp');registered={r['id']['name'] for r in project['resources']}
for key,a in m['acts'].items():
 room=yy(ROOT/f'rooms/ROM_chaos_{key}/ROM_chaos_{key}.yy')
 check([room['roomSettings'][k] for k in ('Width','Height')]==a['dimensions_pixels'],'dimensions '+key)
 check(fn('SCR_chaos_'+key+'_start')==[a['descriptor']['start'][k] for k in ('ram_d511','ram_d514')],'start '+key)
 check(fn('SCR_chaos_'+key+'_camera')==[a['descriptor']['start'][k] for k in ('ram_d2d6','ram_d2d8')],'camera '+key)
 check(fn('SCR_chaos_'+key+'_map_width')==a['dimensions_cells'][0],'stride '+key)
 cells=[v for row in a['layout']['rows'] for v in row];n=a['layout']['runtime_written_cells'];data=fn('SCR_chaos_'+key+'_tile_ids')
 check(data[:n]==cells[:n] and data[n:]==[254]*(4096-n),'layout/ceiling '+key)
 check(hashlib.sha256(bytes(data[:n])).hexdigest()==a['layout']['runtime_sha256'],'runtime layout hash '+key)
 records=fn('SCR_chaos_'+key+'_objects');check(len(records)==len(census['acts'][key]['records']),'census '+key)
 for record,raw in zip(records,census['acts'][key]['records']):
  expected=[raw['index'],raw['world_x'],raw['world_y']]+[int(raw[k],16) for k in ('type_id','flags','parameter','aux0','aux1','rom_offset')]+[raw['classification']]
  check(record==expected,'placement/token '+key)
 check(len(fn('SCR_chaos_'+key+'_terrain_rings'))==len(a['rings']['terrain']),'terrain ring census '+key)
 check(len(fn('SCR_chaos_'+key+'_type09'))==len(a['rings']['object09']),'object ring census '+key)
 table=a['descriptor']['header']['block_mapping_rom'];bank=a['descriptor']['header']['block_mapping_bank']
 for block in range(256):
  ptr=L.u16(rom,table+block*2);mapping=L.block_mapping(rom,table,block)
  check(mapping['rom']==bank*0x4000+ptr-0x8000,'mapping pointer '+key)
  check(rom[mapping['rom']:mapping['rom']+32]!=rom[table+ptr-0x8000:table+ptr-0x8000+32],'stale pointer separation '+key)
 for block in a['blocks']:
  for plane,header in enumerate(block['headers']):
   parsed=json.loads(re.search(r'global\.chaosHeaders'+str(plane)+r'\['+str(block['id'])+r'\] = (.*?);',gml[gml.index('function SCR_chaos_'+key+'_profiles'):]).group(1))
   check(parsed==[header['flags'],header['modifier'],header['vertical'],header['horizontal']],'plane/profile '+key)
 # Every encoded chunk pixel comes from canonical mappings, including dynamic replacement backdrop.
 vram,_=L.build_vram(rom,a['descriptor']['art']);ids={b['id'] for b in a['blocks']}|{70,157,176};pixels=L.block_pixel_maps(rom,vram,only=ids,mapping_rom=table)
 full=Image.new('RGBA',tuple(a['dimensions_pixels']));blocks={}
 for bid,rows in pixels.items():
  image=Image.new('RGBA',(32,32));image.putdata([(0,0,0,0) if v==0 else ((v&15)+(17 if v&16 else 1),1,1,255) for row in rows for v in row]);blocks[bid]=image
 blocks[176]=Image.new('RGBA',(32,32))
 width=a['dimensions_cells'][0]
 for i,bid in enumerate(cells[:n]):
  bid=157 if bid in (155,156) else 176 if bid==175 else 70 if bid in (64,65,66,67,68,69,71) else bid
  full.paste(blocks[bid],((i%width)*32,(i//width)*32))
 for i,x in enumerate(range(0,full.width,1024)):
  name='SPR_chaos_'+key+'_terrain_'+str(i);meta=yy(ROOT/f'sprites/{name}/{name}.yy');image=Image.open(ROOT/'sprites'/name/(meta['frames'][0]['name']+'.png')).convert('RGBA')
  check(image.tobytes()==full.crop((x,0,min(x+1024,full.width),full.height)).tobytes(),'terrain pixel parity '+name)
 for layer in room['layers']:
  for inst in layer.get('instances',[]):check(not re.search(r'OBJ_chaos_object_',inst['objectId']['name']),'hand-authored placement')
for asset in assets['assets']:
 name=asset['resource'];check(name in registered,'asset registration '+name)
 d=ROOT/'sprites'/name;meta=yy(d/(name+'.yy'));frame=meta['frames'][asset['frame']]['name'];image=Image.open(d/(frame+'.png')).convert('RGBA')
 check(hashlib.sha256(image.tobytes()).hexdigest()==asset['rgba_sha256'],'asset pixel hash '+name)
 check(all(a==0 or (17<=a<=32 if name.startswith('SPR_chaos_aqz_base_') else (1<=r<=32 and g==b==1)) for r,g,b,a in set(image.getdata())),'index encoding '+name)
water=json.loads((cache/'water-runtime.json').read_bytes())['raster']['palette_modes']
check(water['split_irq_cram']!=water['fully_submerged_cram'],'separate palettes')
check(hashlib.sha256(rom[0x688:0x6A8]).hexdigest()==water['split_irq_cram_sha256'],'fixed IRQ source')
check(water['fully_submerged_cram']==list(rom[0x38000+0x364D+48*16:0x38000+0x364D+50*16]),'indexed palettes source')
shader=(ROOT/'shaders/SHD_chaos_aqz_palette/SHD_chaos_aqz_palette.fsh').read_text();check(all(n in shader for n in ['above[32]','split[32]','submerged[32]']),'shader sources')
output=ROOT/'build/aqz-p1';output.mkdir(parents=True,exist_ok=True);(output/'asset-results.json').write_text(json.dumps({'status':'PASS','assertions':checks,'index_encoding':'R=index+1,G=B=1; opaque alpha; canonical SAT/profile/layout parity'},indent=2)+'\n')
print('AQZ P1 assets',checks,'assertions PASS')
