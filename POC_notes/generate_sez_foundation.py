"""SEZ S1 importer. Verified ROM -> canonical Research manifest -> resources.

Reuses the deterministic GPZ resource writer; all SEZ policies below are explicit.
Research remains read-only. No placements, mappings, collision or art are authored.
"""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'ed9122b3d5ac11442714ecaef4cc4316c4706342'

def main():
    source=(ROOT/'POC_notes/generate_gpz_foundation.py').read_text()
    source=source.replace('gpz','sez').replace('GPZ','SEZ')
    source=source.replace("COMMIT = 'bbcef38a4463b4054d5dbeeede197d9c7b1b8238'",f"COMMIT = '{COMMIT}'")
    source=source.replace("for dep in manifest['dependencies']:","for dep in []:")
    source=source.replace("    sys.path.insert(0, str(args.research / 'tools'))", "    import subprocess\n    research_path=args.research.resolve().as_posix()\n    head=subprocess.check_output(['git','-c','safe.directory='+research_path,'-C',str(args.research),'rev-parse','main'],text=True).strip()\n    assert head==COMMIT,('Research main checkpoint',head,COMMIT)\n    assert subprocess.run(['git','-c','safe.directory='+research_path,'-C',str(args.research),'diff','--quiet','main']).returncode==0,'Research working tree differs from canonical main (another branch checked out?): import from a clean main checkout'\n    sys.path.insert(0, str(args.research / 'tools'))")
    start=source.index("    prizes=manifest['ordinary_sign_prize_tables']")
    end=source.index('    palettes =',start)
    source=source[:start]+source[end:]
    source=source.replace('    project_path =',"    census=json.loads((args.research/'data/rom-cache/sez/object-census.json').read_bytes())\n    for key,act in manifest['acts'].items():\n        act['objects']=[dict(r,status=r['classification']) for r in census['acts'][key]['records']]\n    for filename in ('object-census.json','art-approval.json'):\n        dump(cache/filename,json.loads((args.research/'data/rom-cache/sez'/filename).read_bytes()))\n    project_path =",1)
    # Do not bake destructible blocks into the immutable backdrop.
    # S2: crumble ledge $AF is a dynamic layout cell too. The immutable backdrop shows its replacement $B0 (all 16 mapping cells = blank tile 192); the intact $AF art
    # is drawn dynamically by chaos_sez_terrain_dynamic while the layout still holds $AF. The $B0 header comes from the Research static block-header table.
    source=source.replace("visible = 70 if b == 71 or b in act['rings']['presence_and_replacement_tables']['ring_blocks'] else b", "visible = 157 if b in (155,156) else (176 if b == 175 else (70 if b == 71 or b in act['rings']['presence_and_replacement_tables']['ring_blocks'] else b))")
    source=source.replace("        full = Image.new('RGBA',tuple(act['dimensions_pixels']))", "        b0_mapping=L.block_mapping(rom,act['descriptor']['header']['block_mapping_rom'],176)\n        assert b0_mapping['attributes']==[192]*16,'block $B0 mapping is 16 x blank tile 192'\n        b0_pixels=L.block_pixel_maps(rom,vram,only=[176],mapping_rom=act['descriptor']['header']['block_mapping_rom'])[176]\n        assert not any(c for row in b0_pixels for c in row),'block $B0 is empty air'\n        blocks[176]=Image.new('RGBA',(32,32))\n        full = Image.new('RGBA',tuple(act['dimensions_pixels']))",1)
    source=source.replace("        text += '}\\n'\n        vram, loads", "        b0h=json.loads((args.research/'data/rom-cache/sez/surfaces-0c-1a.json').read_bytes())['static']['block_headers']['0xB0']\n        assert b0h['flags'] == '0x00' and b0h['modifier'] == 0 and b0h['vertical_profile_by_x'] == [0]*32 and b0h['horizontal_profile_distinct'] == [64]\n        for plane in (0,1): text += f' global.chaosHeaders{plane}[176] = {json.dumps([0,0,[0]*32,[64]*32])};\\n'\n        text += '}\\n'\n        vram, loads",1)
    start=source.index("        draws.append('for (var cp_cell")
    end=source.index('        obj =',start)
    source=source[:start]+"        draws.append('chaos_sez_terrain_dynamic(false);')\n"+source[end:]
    source=source.replace('        draws = []',"        draws = ['draw_set_color(make_color_rgb('+','.join(str(c) for c in bg[0][:3])+'));','var cp_cam=view_camera[0];','draw_rectangle(camera_get_view_x(cp_cam),camera_get_view_y(cp_cam),camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam),camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam),false);','draw_set_color(c_white);']")
    source=source.replace('for b in (70,71,157):','for b in (70,71,155,156,157):')
    start=source.index('    assert rom[0x2B00:')
    end=source.index('    ring_images=[]',start)
    source=source[:start]+source[end:]
    source=source.replace('0x2980:0x2A00','0x29A0:0x2A20')
    source=source.replace('for selector in (1,2,3,4,6):','for selector in (1,2,4,6):')
    start=source.index('    # Identity-packed diagnostic atlas')
    source=source[:start]+"    extra_assets(args,rom,manifest,vram,bg,pal,L,sprite,dump,cache)\n"+source[source.index('if __name__',start):]
    env={'__file__':str(Path(__file__).resolve()),'__name__':'sez_writer','extra_assets':extra_assets}
    exec(compile(source,str(Path(__file__).resolve()),'exec'),env)
    env['main']()

def extra_assets(args,rom,manifest,vram,bg,pal,L,sprite,dump,cache):
    from PIL import Image
    import hashlib
    import sez_art_approval as A
    import mghz_object_census as C
    from generate_mghz_footwear import compose,ANCHOR,REGISTRATION
    approval=json.loads((cache/'art-approval.json').read_text())
    assert approval['approval'].startswith('APPROVED BY USER')
    # Recompute the entire approval contract before importing new compositions.
    full=A.build(rom)
    assert A.manifest_for(full)==approval,'canonical approval mismatch'
    origin=(ANCHOR[0]-REGISTRATION[0],ANCHOR[1]-REGISTRATION[1])
    for t,name in ((0x28,'platform'),(0x2F,'spring_shoes')):
        subject=full['subjects'][str(t)]
        images=[compose(f['images'][0],pal) for f in subject['frames'] if f['frame'] != 0]
        sprite('SPR_chaos_sez_'+name,images,origin)
    # Shared support art under SEZ CRAM $08, including breakable shards.
    for t,frames,name in ((7,[15],'shard'),(0x34,[1,2,3,4],'puff'),(0x0A,[5,6],'sparkle'),(3,[1,2],'ring_sparkle')):
        images=[]
        for f in frames:
            rec=C.frame_record(rom,t,f,0,0,vram,flips=(False,))
            images.append(compose(rec['images'][0],pal))
        sprite('SPR_chaos_sez_'+name,images,origin)
    maps={b['block_id']:b['mapping']['attributes'] for a in manifest['acts'].values() for b in a['blocks']}
    table=manifest['acts']['sez1']['descriptor']['header']['block_mapping_rom']
    ids=sorted(maps)
    atlas=Image.new('RGBA',(512,512))
    for b,rows in L.block_pixel_maps(rom,vram,only=ids,mapping_rom=table).items():
        image=Image.new('RGBA',(32,32));image.putdata([tuple((pal if c&16 else bg)[c&15]) if c else (0,0,0,0) for row in rows for c in row])
        atlas.paste(image,((b%16)*32,(b//16)*32))
    sprite('SPR_chaos_sez_blocks',[atlas])
    for front in (False,True):
        frames=[]
        # Initial art remains until the first effect upload. Recovered order:
        # first $8DFD, then $8DDD, with exactly three unpaused updates per write.
        for source in (None,0x74DFD,0x74DDD):
            dynamic=bytearray(vram)
            if source is not None: dynamic[0x2B00:0x2B20]=rom[source:source+32]
            pixels=L.block_pixel_maps(rom,dynamic,only=ids,mapping_rom=table)
            atlas=Image.new('RGBA',(512,512))
            for b,rows in pixels.items():
                image=Image.new('RGBA',(32,32));data=[]
                for y,row in enumerate(rows):
                    for x,c in enumerate(row):
                        attr=maps[b][(y//8)*4+x//8]
                        active=(attr&511)==0x158 and (not front or attr&0x1000)
                        colour=tuple((pal if c&16 else bg)[c&15]) if c else tuple(bg[0][:3])+(255,)
                        data.append(colour if active and (not front or c) else (0,0,0,0))
                image.putdata(data);atlas.paste(image,((b%16)*32,(b//16)*32))
            frames.append(atlas)
        sprite('SPR_chaos_sez_effect5'+('_front' if front else ''),frames)
    project=ROOT/'SonicChaos_POC.yyp';p=json.loads(project.read_text())
    assets=[]
    for d in sorted((ROOT/'sprites').glob('SPR_chaos_sez*')):
        rel=f'sprites/{d.name}/{d.name}.yy'
        if not any(r['id']['path']==rel for r in p['resources']):p['resources'].append({'id':{'name':d.name,'path':rel}})
        for i,f in enumerate(json.loads((d/(d.name+'.yy')).read_text())['frames']):
            assets.append({'resource':d.name,'frame':i,'rgba_sha256':hashlib.sha256(Image.open(d/(f['name']+'.png')).convert('RGBA').tobytes()).hexdigest()})
    dump(project,p)
    dump(cache/'generated-assets.json',{'research_commit':COMMIT,'rom_sha256':hashlib.sha256(rom).hexdigest(),'assets':assets,'approval_checked':True})

if __name__=='__main__':main()
