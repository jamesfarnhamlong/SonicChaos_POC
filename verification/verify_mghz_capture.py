"""Actual GameMaker captures vs independent ROM terrain; controlled render camera."""
from pathlib import Path
import sys,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/mghz-m1';OUT=BUILD/'captures'
sys.path.insert(0,str(ROOT.parent/'sonic-chaos-reference-work/tools'))
import level_package as L
import thz1_object_assets as G
rom=L.load_rom(ROOT.parent/'source/Sonic Chaos (Europe).sms')
m=json.loads((ROOT/'POC_notes/rom-cache/mghz/implementation-manifest.json').read_text())
census=json.loads((ROOT/'POC_notes/rom-cache/mghz/object-census.json').read_text())
rows=json.loads((OUT/'runtime-rows.json').read_text());assert len(rows)==48
prepared={};checks=[]
for key,a in m['acts'].items():
    vram,_=L.build_vram(rom,a['descriptor']['art']);bg=G.palette_rgba(rom,24);sp=G.palette_rgba(rom,9)
    prepared[key]=(vram,bg,sp)
for row in rows:
    name=row['scene'];width=256 if name.endswith('256')else 348;key=name[:5]if name.startswith('mghz')else 'mghz1'if name.startswith(('oil','spike-3e'))else 'mghz2'
    a=m['acts'][key];vram,bg,sp=prepared[key];bg=list(bg);tick=int(row['update'])
    if tick>=10:bg[4]=(0,0,255,255);bg[11]=(0,85,85,255)
    if tick>=20:bg[4]=(0,0,0,255);bg[11]=(0,170,170,255)
    dynamic=bytearray(vram);src=0x74e3d if(tick//4)%2 else 0x74e1d;dynamic[0x3500:0x3540]=rom[src:src+64]
    pixels=L.block_pixel_maps(rom,dynamic,only=[b['block_id']for b in a['blocks']],mapping_rom=a['descriptor']['header']['block_mapping_rom'])
    im=Image.open(OUT/(name+'-'+str(tick)+'.png')).convert('RGBA');assert im.size==(width,224 if width==256 else 196),(name,im.size)
    left,top=map(int,row['camera']);ids=sum(a['layout']['rows'],[]);stride=a['descriptor']['layout']['width_cells'];matches=tested=0;mismatches=[]
    # Omit HUD, player and mapped sprites. This leaves actual GPU terrain pixels,
    # including priority strips and both dynamic palette/VRAM effects.
    skip=[(row['anchor'][0]-42,row['anchor'][1]-52,row['anchor'][0]+42,row['anchor'][1]+52)]
    for r in a['rings']['object09']:
        skip.append((r['world_x']-12,r['world_y']-4,r['world_x']+12,r['world_y']+22))
    for r in census['acts'][key]['records']:
        if int(r['type_id'],16)in(0x28,0x10,0x1b,0x18):skip.append((r['world_x']-48,r['world_y']-64,r['world_x']+48,r['world_y']+96))
    for y in range(40,im.height):
        for x in range(im.width):
            wx,wy=left+x,top+y;i=wy//32*stride+wx//32
            if i>=a['layout']['runtime_written_cells']or wx>=stride*32:continue
            b=ids[i]
            if 64<=b<=69 or any(x0<=wx<=x1 and y0<=wy<=y1 for x0,y0,x1,y1 in skip):continue
            c=pixels[b][wy%32][wx%32];wanted=(sp if c&16 else bg)[c&15][:3]if c else bg[0][:3]
            tested+=1;actual=im.getpixel((x,y))[:3]
            if tuple(wanted)==actual:matches+=1
            elif len(mismatches)<6:mismatches.append([x,y,b,list(wanted),list(actual)])
    ratio=matches/tested
    checks.append({'scene':name,'update':tick,'terrain_pixels':tested,'matched':matches,'ratio':ratio,'examples':mismatches})
    assert ratio==1,(name,tick,ratio,mismatches)
sheet=Image.new('RGB',(728,960),(28,32,40));draw=ImageDraw.Draw(sheet)
names=['mghz1-start','mghz2-start','mghz3-start','oil','spike-3e','spike-3f','twist','scenery']
for i,n in enumerate(names):
    x=(i%2)*364+8;y=(i//2)*240+8;draw.text((x,y),n+' | native 348x196',fill=(245,245,245))
    sheet.paste(Image.open(OUT/(n+'-348-4.png')).convert('RGB'),(x,y+22))
sheet.save(BUILD/'mghz-m1-verification-sheet.png')
strip=Image.new('RGB',(728,242),(28,32,40));d=ImageDraw.Draw(strip)
for i,tick in enumerate((4,8)):
    d.text((8+i*364,8),f'$1A8/$1A9 native upload, update {tick}',fill=(245,245,245));strip.paste(Image.open(OUT/f'scenery-348-{tick}.png').convert('RGB'),(8+i*364,30))
strip.save(BUILD/'mghz-m1-animated-strip.png')
report={'status':'PASS','native_captures':len(rows),'terrain_pixels':sum(r['terrain_pixels']for r in checks),'camera':'controlled render fixture at canonical world coordinates','checks':checks}
(BUILD/'capture-verification.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',len(rows),'native captures;',report['terrain_pixels'],'ROM-matching terrain pixels')
