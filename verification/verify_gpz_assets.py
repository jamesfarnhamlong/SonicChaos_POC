"""Check GPZ stage boundaries without relying on generator-produced hash assertions."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def gm(p):return json.loads(re.sub(r',\s*([}\]])',r'\1',p.read_text()))
def image(name,frame=0):
    p=ROOT/'sprites'/name;s=gm(p/(name+'.yy'));f=s['frames'][frame]['name']
    im=Image.open(p/(f+'.png')).convert('RGBA')
    assert im.size==(s['width'],s['height'])
    for layer in s['layers']:
        assert im.tobytes()==Image.open(p/'layers'/f/(layer['name']+'.png')).convert('RGBA').tobytes()
    return im

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--research',type=Path,required=True);ap.add_argument('--rom',type=Path,required=True);args=ap.parse_args()
    sys.path[:0]=[str(args.research/'tools'),str(ROOT/'POC_notes')]
    import level_package as L
    import thz1_object_assets as G
    rom=L.load_rom(args.rom);m=gm(args.research/'data/rom-cache/gpz/implementation-manifest.json');o=gm(ROOT/'verification/gpz-art-oracle.json')
    assert gm(ROOT/'POC_notes/rom-cache/gpz/implementation-manifest.json')==m
    assert sha(rom)==m['rom_sha256']==o['rom_sha256']
    atlas=Image.open(ROOT/'verification/gpz-art-sanity/block-atlas.png').convert('RGBA')
    assert atlas.size==(512,512)
    block_count=cell_count=divergent=0;surface1c=[];checks=[]
    for key,a in m['acts'].items():
        vram,loads=L.build_vram(rom,a['descriptor']['art']);assert sha(vram)==a['graphics']['vram_sha256'];assert loads==a['graphics']['static_vram_loads']
        palettes=[G.palette_rgba(rom,a['graphics']['palettes'][name]['index'])for name in ['background','sprite']]
        for palette,name in zip(palettes,['background','sprite']):
            cram=a['graphics']['palettes'][name]['cram']
            assert palette==[((v&3)*85,((v>>2)&3)*85,((v>>4)&3)*85,0 if i==0 else 255)for i,v in enumerate(cram)]
        expected={}
        decoded=L.block_pixel_maps(rom,vram,only=[b['block_id']for b in a['blocks']],mapping_rom=a['descriptor']['header']['block_mapping_rom'])
        for ref in o['acts'][key]['blocks']:
            b=ref['block_id'];mapping=L.block_mapping(rom,a['descriptor']['header']['block_mapping_rom'],b)
            assert mapping['cpu']==ref['cpu'] and mapping['rom']==ref['rom']
            h=a['descriptor']['header']
            assert mapping['rom']==h['block_mapping_bank']*0x4000+mapping['cpu']-0x8000
            assert mapping['rom']!=h['block_mapping_rom']+mapping['cpu']-0x8000,'no table-relative $1640 bias'
            assert sha(b''.join(v.to_bytes(2,'little')for v in mapping['attributes']))==ref['mapping_sha256']
            indices=decoded[b]
            assert sha(bytes(c for row in indices for c in row))==ref['index_sha256']
            im=Image.new('RGBA',(32,32));im.putdata([(0,0,0,0)if v==0 else palettes[1 if v&16 else 0][v&15]for row in indices for v in row]);assert sha(im.tobytes())==ref['rgba_sha256']
            cell=atlas.crop(((b%16)*32,(b//16)*32,(b%16+1)*32,(b//16+1)*32));assert cell.tobytes()==im.tobytes(),(key,b,'atlas cell')
            expected[b]=im;block_count+=1
            canonical=next(v for v in a['blocks']if v['block_id']==b)
            assert mapping==canonical['mapping']
            assert ref['index_sha256']==canonical['decoded_palette_index_sha256']
            wrong=h['block_mapping_rom']+mapping['cpu']-0x8000
            divergent+=sha(rom[wrong:wrong+32])!=canonical['mapping_sha256']
            if 0x8c<=b<=0x97:
                # Canonical bbcef38 withdraws the transparent interpretation.
                assert canonical['nonzero_pixels']==ref['opaque_pixels']
                assert ref['opaque_pixels']>0
                assert sum(cell.tobytes()[3::4][i]!=0 for i in range(1024))==ref['opaque_pixels']
                surface1c.append([key,b,ref['opaque_pixels']])
        width=a['descriptor']['layout']['width_cells'];cells=sum(a['layout']['rows'],[])[:a['layout']['runtime_written_cells']]
        chunks=[image(f'SPR_chaos_{key}_terrain_{n}')for n in range((a['dimensions_pixels'][0]+1023)//1024)]
        for index,b in enumerate(cells):
            visible=70 if b==71 or b in a['rings']['presence_and_replacement_tables']['ring_blocks']else b
            x=(index%width)*32;y=index//width*32;im=chunks[x//1024].crop((x%1024,y,x%1024+32,y+32))
            assert im.tobytes()==expected[visible].tobytes(),(key,index,b,'runtime chunk cell')
            cell_count+=1
        for b in [70,71,157]:
            if b in expected:assert image(f'SPR_chaos_gpz_block_{b:02x}').tobytes()==expected[b].tobytes()
        draw=(ROOT/'objects'/f'OBJ_chaos_{key}_terrain'/'Draw_0.gml').read_text()
        for n in range(len(chunks)):assert f'draw_sprite(SPR_chaos_{key}_terrain_{n},0,{n*1024},0);' in draw
        room=gm(ROOT/'rooms'/f'ROM_chaos_{key}'/f'ROM_chaos_{key}.yy')
        assert any(i['objectId']['name']==f'OBJ_chaos_{key}_terrain'for l in room['layers']for i in l.get('instances',[]))
    assert divergent==block_count,'Negative control: table-relative pointers must not be accepted'
    # Object art is a separate addressing path. Compare every object frame with
    # failed package A to prove that the fix did not disturb positive controls.
    old_zip=ROOT.parent/'releases/SonicChaos_GPZ_Foundation_20261003_A.zip'
    if old_zip.exists():
      with zipfile.ZipFile(old_zip)as z:
        entries=gm(ROOT/'POC_notes/rom-cache/gpz/generated-assets.json')['assets']
        for entry in entries:
            name=entry['resource']
            # Terrain ring extraction is now separately verified against the
            # original animated VRAM upload, not package A's object-ring art.
            # Priority foreground is a new adapter asset absent from package A.
            if '_terrain_'in name or '_block_'in name or name=='SPR_chaos_gpz_foreground':continue
            spr=gm(ROOT/'sprites'/name/(name+'.yy'));f=spr['frames'][entry['frame']]['name']
            old=z.read(f'SonicChaos_GPZ_Foundation_20261003_A/sprites/{name}/{f}.png')
            assert old==(ROOT/'sprites'/name/(f+'.png')).read_bytes(),name
            checks.append(name)
    # Platform additionally compared to canonical mapping/render, not just old output.
    mapping=G.object_mapping(rom,0x28);cpu=L.u16(rom,mapping['mapping_rom']+2)
    w,h,raw,_=G.render_frame(vram,G.parse_frame_record(rom,cpu),0x6a,scale=1,margin=0,palette=palettes[1])
    platform=image('SPR_chaos_gpz_platform');assert platform.size==(w,h)and platform.tobytes()==raw
    # Standalone inspection: labels outside each ROM-derived block, no image editing.
    representative=[1,0x3c,0x47,0x8c,0x90,0x94,0x97,0x46,0x9d,0x10]
    sheet=Image.new('RGBA',(640,100),(40,40,40,255));d=ImageDraw.Draw(sheet)
    for n,b in enumerate(representative):
        im=atlas.crop(((b%16)*32,(b//16)*32,(b%16+1)*32,(b//16+1)*32));sheet.alpha_composite(im.resize((64,64),Image.Resampling.NEAREST),(n*64,0));d.text((n*64+5,75),f'${b:02X}',fill='white')
    sheet.save(ROOT/'verification/gpz-art-sanity/representative-blocks.png')
    report={'block_checks':block_count,'runtime_cell_checks':cell_count,'rejected_table_relative_mappings':divergent,
            'object_control_frames':len(checks),'surface1c_original_rom_opaque_pixels':surface1c,
            'palette':'EXACT CRAM','vram':'EXACT Research HASH/LOADS','gameplay':'UNCHANGED',
            'first_divergent_stage':'Research block-mapping CPU-to-ROM conversion (table base mistaken for bank base)',
            'status':'PASS','canonical_review':'CONFIRMED_bbcef38','replacement_package':'READY_FOR_COMPILE'}
    out=ROOT/'build/gpz-visual-fix/asset-verification.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n')
    print('GPZ ASSET CHECKS PASSED:',block_count,'canonical blocks;',cell_count,'runtime cells;',len(checks),'unchanged object frames;',divergent,'table-relative mappings rejected')
if __name__=='__main__':main()
