"""MGHZ M1 canonical importer. Research is read-only; no authored placements/art.

Reuses the accepted GPZ resource writer, with MGHZ-specific manifest adaptation.
The generated block masks implement CRAM writes without altering approved pixels.
"""
from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[1]

def main():
    # Reuse the established deterministic sprite/room/package writer, not its
    # zone assumptions. All substitutions below are explicit integration policy.
    source=(ROOT/'POC_notes/generate_gpz_foundation.py').read_text()
    source=source.replace('gpz','mghz').replace('GPZ','MGHZ')
    source=source.replace("COMMIT = 'bbcef38a4463b4054d5dbeeede197d9c7b1b8238'", "COMMIT = 'ac04dfe4d3d7aedea394948811da67eba83782bd'")
    source=source.replace("for dep in manifest['dependencies']:", "for dep in []:")
    start=source.index("    prizes=manifest['ordinary_sign_prize_tables']")
    end=source.index('    palettes =',start)
    source=source[:start]+source[end:]
    source=source.replace("    project_path =", "    census=json.loads((args.research/'data/rom-cache/mghz/object-census.json').read_bytes())\n    for key,act in manifest['acts'].items(): act['objects']=census['acts'][key]['records']\n    for filename in ('object-census.json','art-approval.json','surface-1b-ceiling-spikes.json'):\n        dump(cache/filename,json.loads((args.research/'data/rom-cache/mghz'/filename).read_bytes()))\n    project_path =")
    # Keep all raw mapped rows, but runtime dispatch excludes deferred types.
    source=source.replace("runtime = cells[:count] + [254] * (4096-count)", "runtime = cells[:count] + [254] * (4096-count)")
    source=source.replace("visible = 70 if b == 71 or b in act['rings']['presence_and_replacement_tables']['ring_blocks'] else b", "visible = 157 if b in (155,156) else (70 if b in act['rings']['presence_and_replacement_tables']['ring_blocks'] else b)")
    start=source.index("        draws.append('for (var cp_cell")
    end=source.index("        obj =",start)
    source=source[:start]+"        draws.append('chaos_mghz_terrain_dynamic(false);')\n"+source[end:]
    source=source.replace("for b in (70,71,157):", "for b in (155,156,157):")
    source=source.replace("        draws = []", "        draws = ['draw_set_color(make_color_rgb('+','.join(str(c) for c in bg[0][:3])+'));', 'var cp_cam=view_camera[0];', 'draw_rectangle(camera_get_view_x(cp_cam),camera_get_view_y(cp_cam),camera_get_view_x(cp_cam)+camera_get_view_width(cp_cam),camera_get_view_y(cp_cam)+camera_get_view_height(cp_cam),false);', 'draw_set_color(c_white);']")
    start=source.index("    assert rom[0x2B00:")
    end=source.index("    ring_images=[]",start)
    source=source[:start]+source[end:]
    source=source.replace('0x2980:0x2A00','0x2160:0x21E0')
    source=source.replace("for selector in (1,2,3,4,6):", "for selector in (1,2,6):")
    start=source.index('    # Identity-packed diagnostic atlas')
    source=source[:start]+"    make_effect_assets(rom,manifest,vram,bg,pal,L,sprite,dump,cache)\n"+source[source.index("if __name__",start):]
    env={'__file__':str(Path(__file__).resolve()),'__name__':'mghz_writer','make_effect_assets':make_effect_assets}
    exec(compile(source,str(Path(__file__).resolve()),'exec'),env)
    env['main']()

def make_effect_assets(rom,manifest,vram,bg,pal,L,sprite,dump,cache):
    from PIL import Image
    maps={b['block_id']:b['mapping']['attributes'] for a in manifest['acts'].values() for b in a['blocks']}
    table=manifest['acts']['mghz1']['descriptor']['header']['block_mapping_rom']
    ids=sorted(maps)
    indices=L.block_pixel_maps(rom,vram,only=ids,mapping_rom=table)
    atlas=Image.new('RGBA',(512,512))
    for b,rows in indices.items():
        image=Image.new('RGBA',(32,32));image.putdata([tuple((pal if c&16 else bg)[c&15]) if c else (0,0,0,0) for row in rows for c in row])
        atlas.paste(image,((b%16)*32,(b//16)*32))
    sprite('SPR_chaos_mghz_blocks',[atlas])
    effects={'palette4':[],'palette11':[],'strip':[]}
    for front in (False,True):
        suffix='_front' if front else ''
        for entry in (4,11):
            atlas=Image.new('RGBA',(512,512))
            for b,rows in indices.items():
                image=Image.new('RGBA',(32,32));image.putdata([(255,255,255,255) if c==entry and (not front or maps[b][(y//8)*4+x//8]&0x1000) else (0,0,0,0) for y,row in enumerate(rows) for x,c in enumerate(row)])
                atlas.paste(image,((b%16)*32,(b//16)*32))
            sprite(f'SPR_chaos_mghz_palette_{entry}{suffix}',[atlas])
        frames=[]
        # Initial VRAM is retained until first upload. Sources overlap by 32
        # bytes, as the ROM does; do not manufacture two independent tile pairs.
        for source in (None,0x74E3D,0x74E1D):
            dynamic=bytearray(vram)
            if source is not None: dynamic[0x3500:0x3540]=rom[source:source+64]
            pixels=L.block_pixel_maps(rom,dynamic,only=ids,mapping_rom=table)
            atlas=Image.new('RGBA',(512,512))
            for b,rows in pixels.items():
                image=Image.new('RGBA',(32,32)); data=[]
                for y,row in enumerate(rows):
                    for x,c in enumerate(row):
                        attr=maps[b][(y//8)*4+x//8]
                        active=(attr&511) in (0x1A8,0x1A9) and (not front or attr&0x1000)
                        colour=tuple((pal if c&16 else bg)[c&15]) if c else tuple(bg[0][:3])+(255,)
                        data.append(colour if active and (not front or c) else (0,0,0,0))
                image.putdata(data);atlas.paste(image,((b%16)*32,(b//16)*32))
            frames.append(atlas)
        sprite('SPR_chaos_mghz_strip'+suffix,frames)
    # Writer saves resources before invoking us; persist additional sprites.
    project=ROOT/'SonicChaos_POC.yyp';p=json.loads(project.read_text())
    for d in sorted((ROOT/'sprites').glob('SPR_chaos_mghz_*')):
        rel=f'sprites/{d.name}/{d.name}.yy'
        if not any(r['id']['path']==rel for r in p['resources']):p['resources'].append({'id':{'name':d.name,'path':rel}})
    dump(project,p)
    generated=json.loads((cache/'generated-assets.json').read_text())
    import hashlib
    generated['assets']=[{'resource':d.name,'frame':i,'rgba_sha256':hashlib.sha256(Image.open(d/(f['name']+'.png')).convert('RGBA').tobytes()).hexdigest()} for d in sorted((ROOT/'sprites').glob('SPR_chaos_mghz_*')) for i,f in enumerate(json.loads((d/(d.name+'.yy')).read_text())['frames'])]
    dump(cache/'generated-assets.json',generated)

if __name__=='__main__':main()
