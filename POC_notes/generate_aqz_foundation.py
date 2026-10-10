"""AQZ P1 deterministic adapter of the accepted GPZ resource writer.
Canonical Research is read-only; caches are mirrored without normalization.
"""
from pathlib import Path
import copy, hashlib, json, re

def read_json(text):
    if isinstance(text,bytes): text=text.decode("utf-8")
    return json.loads(re.sub(r",\s*([}\]])",r"\1",text))
ROOT=Path(__file__).resolve().parents[1]
COMMIT='eb4bf953dcb2f1ad57c629543b55c8536eb688cb'

def normalize(manifest,args):
    import level_package as L
    import rom as R
    canonical=copy.deepcopy(manifest)
    cache=ROOT/'POC_notes/rom-cache/aqz';cache.mkdir(parents=True,exist_ok=True)
    for name in ('implementation-manifest','object-census','art-approval','water-runtime','original-checks','water-game-checks'):
        (cache/(name+'.json')).write_bytes((args.research/'data/rom-cache/aqz'/(name+'.json')).read_bytes())
    census=read_json((cache/'object-census.json').read_bytes())
    for key,a in manifest['acts'].items():
        a['start']={'player_anchor':[a['descriptor']['start'][k] for k in ('ram_d511','ram_d514')], 'camera':[a['descriptor']['start'][k] for k in ('ram_d2d6','ram_d2d8')]}
        a['objects']=[dict(r,status=r['classification']) for r in census['acts'][key]['records']]
        a['layout']['runtime_cells_sha256']=a['layout']['runtime_sha256']
        a['rings']['presence_and_replacement_tables']=a['rings']['tables']
        a['graphics']['static_vram_loads']=a['graphics']['loads']
        vram,_=L.build_vram(L.load_rom(args.rom),a['descriptor']['art'])
        for bid in (70,71,155,156,157,176):
            if not any(b['id']==bid for b in a['blocks']):
                mapping=L.block_mapping(L.load_rom(args.rom),a['descriptor']['header']['block_mapping_rom'],bid)
                a['blocks'].append({'id':bid,'mapping':mapping,'mapping_sha256':hashlib.sha256(b''.join(v.to_bytes(2,'little') for v in mapping['attributes'])).hexdigest(),'headers':[R.header(L.load_rom(args.rom),bid,p) for p in (0,1)]})
        pixels=L.block_pixel_maps(L.load_rom(args.rom),vram,only=[b['id'] for b in a['blocks']],mapping_rom=a['descriptor']['header']['block_mapping_rom'])
        for b in a['blocks']:
            b['block_id']=b['id']
            b['decoded_palette_index_sha256']=hashlib.sha256(bytes(c for row in pixels[b['id']] for c in row)).hexdigest()
    return manifest

def main():
    source=(ROOT/'POC_notes/generate_gpz_foundation.py').read_text().replace('gpz','aqz').replace('GPZ','AQZ')
    source=source.replace("COMMIT = 'bbcef38a4463b4054d5dbeeede197d9c7b1b8238'", "COMMIT = '"+COMMIT+"'")
    source=source.replace("    sys.path.insert(0, str(args.research / 'tools'))", "    import subprocess\n    assert subprocess.check_output(['git','-C',str(args.research),'rev-parse','main'],text=True).strip()==COMMIT\n    assert subprocess.run(['git','-C',str(args.research),'diff','--quiet','main']).returncode==0\n    sys.path.insert(0, str(args.research / 'tools'))")
    source=source.replace('    manifest = json.loads(raw)','    manifest = normalize(read_json(raw),args)')
    source=source.replace("    pal = G.palette_rgba(rom, palettes['sprite']['index'])", "    pal = [(i+17,1,1,0 if i==0 else 255) for i in range(16)]\n    bg = [(i+1,1,1,0 if i==0 else 255) for i in range(16)]")

    source=source.replace("    dump(cache / 'implementation-manifest.json', manifest)", '')
    source=source.replace("for dep in manifest['dependencies']:", 'for dep in []:')
    start=source.index("    prizes=manifest['ordinary_sign_prize_tables']")
    end=source.index('    palettes =',start);source=source[:start]+source[end:]
    source=source.replace("visible = 70 if b == 71 or b in act['rings']['presence_and_replacement_tables']['ring_blocks'] else b", "visible = 157 if b in (155,156) else (176 if b == 175 else (70 if b == 71 or b in act['rings']['presence_and_replacement_tables']['ring_blocks'] else b))")
    source=source.replace("        full = Image.new('RGBA',tuple(act['dimensions_pixels']))", "        blocks[176]=Image.new('RGBA',(32,32))\n        full = Image.new('RGBA',tuple(act['dimensions_pixels']))")
    source=source.replace("(ROOT/'objects'/obj/'Draw_0.gml').write_text('\\n'.join(draws)+'\\n')", "(ROOT/'objects'/obj/'Draw_0.gml').write_text('chaos_aqz_palette_begin(false);\\n'+'\\n'.join(draws)+'\\nchaos_aqz_palette_end();\\n')")
    source=source.replace('        draws = []',"        draws = ['draw_set_color(make_color_rgb('+','.join(str(c) for c in bg[0][:3])+'));','var cp_cam=view_camera[0];','draw_rectangle(camera_get_view_x(cp_cam),camera_get_view_y(cp_cam),camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam),camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam),false);','draw_set_color(c_white);']")
    # P4 I2: all AQZ acts VDP R7=0, CRAM16=$10, including water splits. Paint backdrop before indexed shader;
    # texture decoding cannot decode a vertex-only make_color_rgb(1,1,1) tint.
    needle="(ROOT/'objects'/obj/'Draw_0.gml').write_text('chaos_aqz_palette_begin(false);\\n'+'\\n'.join(draws)+'\\nchaos_aqz_palette_end();\\n')"
    replacement="(ROOT/'objects'/obj/'Draw_0.gml').write_text(('\\n'.join([draws[0].replace('make_color_rgb(1,1,1)','make_color_rgb(0,0,85)')]+draws[1:4])+ '\\nchaos_aqz_palette_begin(false);\\n'+'\\n'.join(draws[4:])+'\\nchaos_aqz_palette_end();\\n') if key in ('aqz1','aqz2','aqz3') else ('chaos_aqz_palette_begin(false);\\n'+'\\n'.join(draws)+'\\nchaos_aqz_palette_end();\\n'))"
    source=source.replace(needle,replacement)

    start=source.index("        draws.append('for (var cp_cell")
    end=source.index('        obj =',start);source=source[:start]+"        draws.append('chaos_aqz_terrain_dynamic(false);')\n"+source[end:]
    source=source.replace('for b in (70,71,157):','for b in (70,71,155,156,157):')
    start=source.index("    name='OBJ_chaos_terrain_foreground'");end=source.index('    # Shared object mappings',start);source=source[:start]+source[end:]

    # $30 only: approved strong spring cap comes from base $86; shared $26 movement.
    source=source.replace("[(0x28,0x6A,[1],'SPR_chaos_aqz_platform',(16,0)),(9", "[(9")
    source=source.replace("(0x26,0x72,[1],'SPR_chaos_aqz_spring'", "(0x30,0x86,[1],'SPR_chaos_aqz_spring'")
    source=source.replace('if t == 0x26:', 'if t == 0x30:')
    start=source.index('    assert rom[0x2B00:');end=source.index('    ring_images=[]',start);source=source[:start]+source[end:]
    source=source.replace('0x2980:0x2A00','0x28C0:0x2940')
    start=source.index('    # Identity-packed diagnostic atlas')
    source=source[:start]+"    extra_assets(args,rom,manifest,vram,bg,pal,L,sprite,dump,cache)\n"+source[source.index('if __name__',start):]
    env={'__file__':str(Path(__file__).resolve()),'__name__':'aqz_writer','normalize':normalize,'extra_assets':extra_assets}
    source=source.replace('json.loads(', 'read_json(');env['read_json']=read_json
    exec(compile(source,str(Path(__file__).resolve()),'exec'),env);env['main']()

def extra_assets(args,rom,manifest,vram,bg,pal,L,sprite,dump,cache):
    from PIL import Image
    import aqz_art_approval as A
    import mghz_object_census as C
    from generate_mghz_footwear import compose,ANCHOR,REGISTRATION
    approval,data=A.build(rom)
    assert read_json(json.dumps(approval))==read_json((cache/'art-approval.json').read_bytes())
    assert approval['status']=='APPROVED'
    origin=(ANCHOR[0]-REGISTRATION[0],ANCHOR[1]-REGISTRATION[1])
    # Original unmirrored SAT compositions; frames indexed by raw mapping frame.
    for tag,name in [('0C-8E-8E','bubble'),('0D-waterline','waterline'),('0E-water-support','splash'),('32-water-support','countdown')]:
        subject=data['subjects'][tag];frames={f['frame']:f for f in subject['frames']}
        images=[compose(frames[i]['images'][0],pal) if i in frames else Image.new('RGBA',(64,64)) for i in range(max(frames)+1)]
        sprite('SPR_chaos_aqz_'+name,images,origin)
    for t,frames,name in ((7,[15],'shard'),(0x34,[1,2,3,4],'puff'),(0x0A,[5,6],'sparkle'),(3,[1,2],'ring_sparkle')):
        sprite('SPR_chaos_aqz_'+name,[compose(C.frame_record(rom,t,f,0,0,vram,flips=(False,))['images'][0],pal) for f in frames],origin)
    maps={b['id']:b['mapping']['attributes'] for a in manifest['acts'].values() for b in a['blocks']};ids=sorted(maps)
    table=manifest['acts']['aqz1']['descriptor']['header']['block_mapping_rom']
    atlas=Image.new('RGBA',(512,512))
    for b,rows in L.block_pixel_maps(rom,vram,only=ids,mapping_rom=table).items():
        image=Image.new('RGBA',(32,32));image.putdata([tuple((pal if c&16 else bg)[c&15]) if c else (0,0,0,0) for row in rows for c in row]);atlas.paste(image,((b%16)*32,(b//16)*32))
    sprite('SPR_chaos_aqz_blocks',[atlas])
    for eid in ('5','11'):
        for front in (False,True):
            images=[];copies=manifest['effects'][eid]['unique_copies'];touched=set(t for cp in copies for t in range(cp['vram']//32,(cp['vram']+cp['length'])//32))
            for cp in [None]+copies:
                dynamic=bytearray(vram)
                if cp:
                    off=L.bank_cpu_to_rom(29,cp['source_cpu']);dynamic[cp['vram']:cp['vram']+cp['length']]=rom[off:off+cp['length']]
                atlas=Image.new('RGBA',(512,512))
                for b,rows in L.block_pixel_maps(rom,dynamic,only=ids,mapping_rom=table).items():
                    image=Image.new('RGBA',(32,32));pixels=[]
                    for y,row in enumerate(rows):
                        for x,c in enumerate(row):
                            attr=maps[b][(y//8)*4+x//8];active=(attr&511) in touched and (not front or attr&0x1000)
                            pixels.append((tuple((pal if c&16 else bg)[c&15]) if c else tuple(bg[0][:3])+(255,)) if active and (not front or c) else (0,0,0,0))
                    image.putdata(pixels);atlas.paste(image,((b%16)*32,(b//16)*32))
                images.append(atlas)
            sprite('SPR_chaos_aqz_effect'+eid+('_front' if front else ''),images)
    import player_state_11_graphics as PG
    source=PG.dynamic_source(rom,54);dynamic=bytearray(vram);dynamic[:len(source['raw'])]=source['raw']
    import thz1_object_assets as G
    pieces=C.sat_pieces(rom,1,54,0,0,False)
    for piece in pieces:piece['pixels']=G.tile_pixels(dynamic,piece['pattern'])+G.tile_pixels(dynamic,piece['pattern']+1)
    sprite('SPR_chaos_aqz_air_recovery',[compose({'pieces':pieces},pal)],(origin[0],origin[1]+5))
    # Constants from A2, including three separate CRAM sources and exact input tables.
    water=read_json((cache/'water-runtime.json').read_bytes())
    text='/// Generated from reviewed A1/A2 caches; no gameplay tuning.\n'
    def fn(name,value):
        payload=json.dumps(json.dumps(value,separators=(',',':')))
        key='chaosAqzCache_'+name
        return 'function '+name+'() { if (!variable_global_exists("'+key+'")) global.'+key+'=json_parse('+payload+'); return global.'+key+'; }\n'
    text+=fn('chaos_aqz_water_contract',water['contracts'])
    text+=fn('chaos_aqz_palette_sources',water['raster']['palette_modes'])
    text+=fn('chaos_aqz_strip_tables',list(water['raster']['strip_tables'].values()))
    text+=fn('chaos_aqz_water_tables',water['physics']['horizontal_tables'])
    scripts={}
    for tid,info in water['objects']['scripts'].items():
        states=[]
        for st in info['states']:
            ops=[op for op in st['ops'] if op['op']!='loops_back'];rows=[]
            for op in ops:
                if op['op']=='record':rows.append([1,op['duration'],op['frame'],int(op['callback'],16)])
                elif op['op']=='restart_state':rows.append([0])
                elif op['op']=='spawn':rows.append([4,op['type'],op['parameter'],op['dx'],op['dy']])
                elif op['op']=='sound':rows.append([6,op['sound']])
                elif op['op']=='jump':rows.append([7,next(i for i,x in enumerate(ops) if x['cpu']==op['target'])])
                else:raise ValueError(op)
            states.append(rows)
        scripts[tid]=states
    text+=fn('chaos_aqz_object_scripts',scripts)
    extents={}
    for tag in ('0C-8E-8E','0D-waterline','0E-water-support','32-water-support'):
        sub=approval['subjects'][tag];extents[str(sub['type'])]={str(f['frame']):f['extent_x_y'] for f in sub['frames']}
    text+=fn('chaos_aqz_object_extents',extents)

    for key,a in manifest['acts'].items():
        h=a['descriptor']['header'];text+=fn('SCR_chaos_'+key+'_bounds',[h[k] for k in ('ram_d280','ram_d27c','ram_d282','ram_d27e')])
    # Immutable legacy-player adapter copies: RGB unchanged, alpha carries palette index.
    # No new composition; original resources/animation/masks remain untouched.
    import re
    player_names=sorted(set(re.findall(r'SPR_sonic_(?!super)\w+', (ROOT/'scripts/SCR_player_sprites_sonic/SCR_player_sprites_sonic.gml').read_text())))+['SPR_chaos_player_state_11']
    base=water['raster']['palette_modes']['above_water_cram']
    rgb=[((v&3)*85,((v>>2)&3)*85,((v>>4)&3)*85) for v in base]
    text+='function chaos_aqz_player_source(cp_sprite) { switch (cp_sprite) {\n'
    proxies=[]
    for original in player_names:
        src=ROOT/'sprites'/original;meta=read_json(re.sub(r',\s*([}\]])',r'\1',(src/(original+'.yy')).read_text()))
        name='SPR_chaos_aqz_base_'+original.removeprefix('SPR_');images=[]
        for frame in meta['frames']:
            im=Image.open(src/(frame['name']+'.png')).convert('RGBA');out=Image.new('RGBA',im.size);pixels=[]
            for r,g,b,a in im.getdata():
                assert a in (0,255),original
                index=min(range(16,32),key=lambda i:sum((v-c)**2 for v,c in zip((r,g,b),rgb[i])))
                pixels.append((r,g,b,index+1) if a else (r,g,b,0))
            out.putdata(pixels);images.append(out)
        sprite(name,images,(meta['sequence']['xorigin'],meta['sequence']['yorigin']))
        proxies.append({'source':original,'adapter':name})
        text+='case '+original+': return '+name+';\n'
    text+='} return cp_sprite; }\n'
    dump(cache/'player-palette-adapter.json',{'method':'Immutable original RGB; alpha=nearest canonical above sprite index+1; transparent alpha=0; no runtime RGB conversion','copies':proxies})
    dest=ROOT/'scripts/SCR_chaos_aqz_environment_data';dest.mkdir(parents=True,exist_ok=True)
    template=read_json((ROOT/'scripts/SCR_chaos_sez_s2_data/SCR_chaos_sez_s2_data.yy').read_text());template['name']=template['%Name']=dest.name;dump(dest/(dest.name+'.yy'),template);(dest/(dest.name+'.gml')).write_text(text)
    project=ROOT/'SonicChaos_POC.yyp';p=read_json(project.read_text());rel='scripts/'+dest.name+'/'+dest.name+'.yy'
    if not any(r['id']['path']==rel for r in p['resources']):p['resources'].append({'id':{'name':dest.name,'path':rel}})
    for d in sorted((ROOT/'sprites').glob('SPR_chaos_aqz*')):
        rel=f'sprites/{d.name}/{d.name}.yy'
        if not any(r['id']['path']==rel for r in p['resources']):p['resources'].append({'id':{'name':d.name,'path':rel}})
    dump(project,p)
    assets=[]
    for d in sorted((ROOT/'sprites').glob('SPR_chaos_aqz*')):
        for i,f in enumerate(read_json((d/(d.name+'.yy')).read_text())['frames']):assets.append({'resource':d.name,'frame':i,'rgba_sha256':hashlib.sha256(Image.open(d/(f['name']+'.png')).convert('RGBA').tobytes()).hexdigest()})
    dump(cache/'generated-assets.json',{'research_commit':COMMIT,'rom_sha256':hashlib.sha256(rom).hexdigest(),'assets':assets,'approval_checked':True})

if __name__=='__main__':main()
