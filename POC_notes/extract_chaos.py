from pathlib import Path
from PIL import Image
import hashlib,json,re,struct
from collections import Counter
import argparse
parser=argparse.ArgumentParser(description="Extract Turquoise Hill graphics/layout from the supplied Sonic Chaos SMS revision")
parser.add_argument("rom",type=Path)
parser.add_argument("--out",type=Path,default=Path("extracted"))
parser.add_argument("--project-root",type=Path,
    help="also install the four reproducible terrain quadrants into this GameMaker project")
args=parser.parse_args()
BASE=args.out
BASE.mkdir(parents=True,exist_ok=True)
ROM=args.rom.read_bytes()
def gm_json(path):
 return json.loads(re.sub(r',\s*([}\]])',r'\1',path.read_text()))
def word(p):return struct.unpack_from('<H',ROM,p)[0]
def decompress(p):
 n=word(p+2); flags=p+word(p+4); src=p+6; tiles=[]
 for t in range(n):
  mode=(ROM[flags+t//4]>>(2*(t%4)))&3
  b=bytearray(32)
  if mode==1:b[:]=ROM[src:src+32];src+=32
  elif mode in (2,3):
   mask=int.from_bytes(ROM[src:src+4],'little');src+=4
   for i in range(32):
    if mask>>i&1:b[i]=ROM[src];src+=1
   if mode==3:
    for i in range(0,14,2):
     for k in (0,1,16,17):b[i+k+2]^=b[i+k]
  tiles.append(bytes(b))
 print('decompressed',hex(p),'tiles',n,'data end',hex(src),'flags end',hex(flags+(n+3)//4))
 return tiles
pal=[((v&3)*85,((v>>2)&3)*85,((v>>4)&3)*85,255) for v in ROM[0x3b79d:0x3b79d+16]]
tiles=decompress(0x40f9e)
imgs=[]
for t in tiles:
 im=Image.new('RGBA',(8,8));im.putdata([pal[sum(((t[y*4+b]>>(7-x))&1)<<b for b in range(4))] for y in range(8) for x in range(8)]);imgs.append(im)
# Read tile mappings as standard little-endian VDP tile attributes.
blocks=[]
for i in range(256):
 im=Image.new('RGBA',(32,32),pal[0])
 for j in range(16):
  attr=word(0x44000+(word(0x44000+i*2)-0x8000)+j*2);idx=(attr&511)-192
  if idx<0 or idx>=len(imgs):continue
  tile=imgs[idx]
  if attr&512:tile=tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  if attr&1024:tile=tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
  im.paste(tile,((j%4)*8,(j//4)*8))
 blocks.append(im)
out=[];p=0x48000
while len(out)<4095:
 v=ROM[p];p+=1
 if v==255:
  v,n=ROM[p:p+2];p+=2
  if not n:break
  out.extend([v]*n)
 else:out.append(v)
print('layout',len(out),'end',hex(p),'max',max(out))
# Terrain spring cells are foreground/sprite-like layout blocks. Palette index
# zero is transparent in the original composition. The POC flattens the scene
# to one bitmap, so each placement must inherit the surrounding backdrop rather
# than retaining the block's CRAM colour or exposing the runner's black clear
# plane. This is a block-class composition rule, not a placement repaint.
SPRING_BLOCK_IDS={48,49,51,54,56}
# Blocks $40-$43 are foreground-only ring arrangements. The 142 collectible
# positions are decoded separately from these cells and instantiated as
# OBJ_ring. Leaving these block pixels in the flattened terrain duplicates
# every ring as a permanent, non-collectible image behind the real object.
RING_BLOCK_IDS={64,65,66,67}
# Determine origin/stride visually. First render the ordinary opaque map so
# each spring placement can sample its immediate cardinal boundary.
im=Image.new('RGBA',(4096,1024),pal[0])
for i,v in enumerate(out):
 if v<len(blocks):im.paste(blocks[v],((i%128)*32,(i//128)*32))

spring_context=[]
for i,v in enumerate(out):
 if v not in SPRING_BLOCK_IDS:continue
 x=(i%128)*32;y=(i//128)*32
 boundary=[]
 if y>0:boundary.extend(im.crop((x,y-1,x+32,y)).getdata())
 if y+32<im.height:boundary.extend(im.crop((x,y+32,x+32,y+33)).getdata())
 if x>0:boundary.extend(im.crop((x-1,y,x,y+32)).getdata())
 if x+32<im.width:boundary.extend(im.crop((x+32,y,x+33,y+32)).getdata())
 backdrop=Counter(pixel for pixel in boundary if pixel[3]).most_common(1)[0][0]
 block=blocks[v].copy()
 transparent_colour=Counter(block.getdata()).most_common(1)[0][0]
 block.putdata([backdrop if pixel==transparent_colour else pixel for pixel in block.getdata()])
 im.paste(block,(x,y))
 spring_context.append({'block_id':f'0x{v:02X}','world_x':x,'world_y':y,
     'transparent_plane_rgba':list(transparent_colour),'context_backdrop_rgba':list(backdrop)})

ring_cell_context=[]
for i,v in enumerate(out):
 if v not in RING_BLOCK_IDS:continue
 x=(i%128)*32;y=(i//128)*32
 boundary=[]
 if y>0:boundary.extend(im.crop((x,y-1,x+32,y)).getdata())
 if y+32<im.height:boundary.extend(im.crop((x,y+32,x+32,y+33)).getdata())
 if x>0:boundary.extend(im.crop((x-1,y,x,y+32)).getdata())
 if x+32<im.width:boundary.extend(im.crop((x+32,y,x+33,y+32)).getdata())
 # The dominant colour in the block is its original transparent/background
 # plane. Prefer the matching boundary colour; otherwise use the dominant
 # opaque boundary colour. The entire cell is foreground-only once the rings
 # become objects, so no ring-coloured pixels are retained in terrain.
 transparent_colour=Counter(blocks[v].getdata()).most_common(1)[0][0]
 matching=[pixel for pixel in boundary if pixel==transparent_colour]
 backdrop=transparent_colour if matching else Counter(pixel for pixel in boundary if pixel[3]).most_common(1)[0][0]
 im.paste(Image.new('RGBA',(32,32),backdrop),(x,y))
 ring_cell_context.append({'block_id':f'0x{v:02X}','world_x':x,'world_y':y,
     'transparent_plane_rgba':list(transparent_colour),'context_backdrop_rgba':list(backdrop)})
im.save(BASE/'thz1-map.png');im.crop((0,384,1536,896)).resize((1536,512)).save(BASE/'thz1-opening.png')
atlas=Image.new('RGBA',(16*32,16*32),pal[0])
for i,b in enumerate(blocks):atlas.paste(b,((i%16)*32,(i//16)*32))
atlas.save(BASE/'thz1-blocks.png')
(BASE/'thz1-layout.json').write_text(json.dumps(out))

if args.project_root:
 project=args.project_root.resolve()
 assets=[]
 for quadrant in range(4):
  sprite_dir=project/f'sprites/SPR_chaos_terrain_{quadrant}'
  meta=gm_json(sprite_dir/f'SPR_chaos_terrain_{quadrant}.yy')
  frame=meta['frames'][0]['name']; layer=meta['layers'][0]['name']
  quadrant_image=im.crop((quadrant*1024,0,(quadrant+1)*1024,1024))
  root_png=sprite_dir/f'{frame}.png'
  layer_png=sprite_dir/'layers'/frame/f'{layer}.png'
  quadrant_image.save(root_png,optimize=True)
  quadrant_image.save(layer_png,optimize=True)
  raw=root_png.read_bytes()
  assert raw==layer_png.read_bytes()
  assets.append({'sprite':f'SPR_chaos_terrain_{quadrant}',
      'world_x':quadrant*1024,'width':1024,'height':1024,
      'root_png':root_png.relative_to(project).as_posix(),
      'layer_png':layer_png.relative_to(project).as_posix(),
      'sha256':hashlib.sha256(raw).hexdigest()})
 # GameMaker can retain RGB colour in fully transparent frame pixels while
 # cycling frames. Canonicalise the existing ring presentation to zero RGBA so
 # a narrow frame cannot leave the previous wide frame's silhouette behind.
 ring_frames=[]
 ring_dir=project/'sprites/SPR_ring'
 ring_meta=gm_json(ring_dir/'SPR_ring.yy')
 ring_layer=ring_meta['layers'][0]['name']
 for frame_row in ring_meta['frames']:
  frame=frame_row['name'];root_png=ring_dir/f'{frame}.png'
  layer_png=ring_dir/'layers'/frame/f'{ring_layer}.png'
  ring=Image.open(root_png).convert('RGBA')
  ring.putdata([(0,0,0,0) if pixel[3]==0 else pixel for pixel in ring.getdata()])
  ring.save(root_png,optimize=True);ring.save(layer_png,optimize=True)
  raw=root_png.read_bytes();assert raw==layer_png.read_bytes()
  ring_frames.append({'frame':frame,'root_png':root_png.relative_to(project).as_posix(),
      'layer_png':layer_png.relative_to(project).as_posix(),'sha256':hashlib.sha256(raw).hexdigest()})
 cache=project/'POC_notes/rom-cache'
 terrain_manifest={'format':1,'rom_sha256':hashlib.sha256(ROM).hexdigest(),
     'generator':'POC_notes/extract_chaos.py',
     'context_composited_spring_block_ids':[f'0x{x:02X}' for x in sorted(SPRING_BLOCK_IDS)],
     'object_only_ring_block_ids':[f'0x{x:02X}' for x in sorted(RING_BLOCK_IDS)],
     'spring_placements':spring_context,'ring_cells_removed':ring_cell_context,'assets':assets,
     'normalized_ring_frames':ring_frames}
 terrain_path=cache/'terrain-assets.json'
 terrain_path.write_text(json.dumps(terrain_manifest,indent=2)+'\n')
 manifest_path=cache/'manifest.json'
 manifest=json.loads(manifest_path.read_text())
 payload=terrain_path.read_bytes()
 manifest['files']['terrain-assets.json']={'sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)}
 manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
