from pathlib import Path
from PIL import Image
import struct,json
import argparse
parser=argparse.ArgumentParser(description="Extract Turquoise Hill graphics/layout from the supplied Sonic Chaos SMS revision")
parser.add_argument("rom",type=Path)
parser.add_argument("--out",type=Path,default=Path("extracted"))
args=parser.parse_args()
BASE=args.out
BASE.mkdir(parents=True,exist_ok=True)
ROM=args.rom.read_bytes()
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
pal=[((v&3)*85,((v>>2)&3)*85,((v>>4)&3)*85) for v in ROM[0x3b79d:0x3b79d+16]]
tiles=decompress(0x40f9e)
imgs=[]
for t in tiles:
 im=Image.new('RGB',(8,8));im.putdata([pal[sum(((t[y*4+b]>>(7-x))&1)<<b for b in range(4))] for y in range(8) for x in range(8)]);imgs.append(im)
# Read tile mappings as standard little-endian VDP tile attributes.
blocks=[]
for i in range(256):
 im=Image.new('RGB',(32,32),pal[0])
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
# Determine origin/stride visually.
im=Image.new('RGB',(4096,1024),pal[0])
for i,v in enumerate(out):
 if v<len(blocks):im.paste(blocks[v],((i%128)*32,(i//128)*32))
im.save(BASE/'thz1-map.png');im.crop((0,384,1536,896)).resize((1536,512)).save(BASE/'thz1-opening.png')
atlas=Image.new('RGB',(16*32,16*32),pal[0])
for i,b in enumerate(blocks):atlas.paste(b,((i%16)*32,(i//16)*32))
atlas.save(BASE/'thz1-blocks.png')
(BASE/'thz1-layout.json').write_text(json.dumps(out))
