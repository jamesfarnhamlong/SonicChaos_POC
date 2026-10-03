"""Import reviewed Research closure fixtures and ROM route coordinates reproducibly."""
from pathlib import Path
import hashlib, json, struct, shutil, sys
ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT.parent / 'sonic-chaos-reference-work'
ROM = ROOT.parent / 'source/Sonic Chaos (Europe).sms'
raw = ROM.read_bytes()
assert hashlib.sha256(raw).hexdigest() == 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'
cache = ROOT / 'POC_notes/rom-cache'
for name in ('gpz-loop-route.json', 'gpz-surface19.json'):
    shutil.copyfile(RESEARCH / 'data/rom-cache' / name, cache / name)
shutil.copyfile(RESEARCH / 'reports/thz-fidelity-followup.json', cache / 'thz-fidelity-followup.json')
# Read exactly as the original callback does, including exit-update overshoot.
# 512 entries cover the audited controls (including signed negative entry).
tables = {k:list(struct.unpack_from('<512h', raw, off)) for k,off in [('x',0x35140),('y',0x34DDC)]}
out = ROOT / 'scripts/SCR_chaos_gpz_data/SCR_chaos_gpz_data.gml'
marker = '// Research 08fb38c: alternate route coordinate import'
text = out.read_text().split(marker)[0].rstrip() + '\n\n' + marker + '\n'
for k,values in tables.items():
    text += 'function SCR_chaos_gpz_loop_' + k + '() { return ' + json.dumps(values,separators=(',',':')) + '; }\n'
out.write_text(text)
# Canonical SAT composition: reverse piece locations, preserve each piece's pixels.
sys.path.insert(0,str(RESEARCH / 'tools'))
import thz1_object_assets as a
vram,_ = a.build_vram(raw,a.load_json(a.GRAPHICS_MAP))
frames = a.mapping_frame_pointers(raw,a.object_mapping(raw,0x27)['mapping_cpu'])
spr = ROOT / 'sprites/SPR_chaos_object_27'
yy = json.loads((spr/'SPR_chaos_object_27.yy').read_text())
hashes=[]
for index,frame in enumerate(yy['frames'],1):
    rec = a.parse_frame_record(raw,frames[index])
    pixels=bytearray(32*24*4)
    pal=a.thz1_sprite_palette(raw)
    for piece in rec['pieces']:
        tile=0xAA+piece['tile_offset']
        pix=a.tile_pixels(vram,tile)+a.tile_pixels(vram,tile+1)
        for y,line in enumerate(pix):
            for x,col in enumerate(line):
                xx=16-piece['relative_x']-8+x
                yypos=20+piece['relative_y']+y
                pos=(yypos*32+xx)*4
                if col and 0<=xx<32 and 0<=yypos<24 and not pixels[pos+3]:
                    pixels[pos:pos+4]=bytes(pal[col])
    for p in [spr/(frame['name']+'.png'), *[spr/'layers'/frame['name']/(l['name']+'.png') for l in yy['layers']]]:
        a.write_rgba_png(p,32,24,pixels)
    hashes.append(hashlib.sha256(pixels).hexdigest())
(cache/'gpz-closure-import.json').write_text(json.dumps({'research_commit':'08fb38ca081ac9c1644b9ae8a3d83182d9510450','rom_sha256':hashlib.sha256(raw).hexdigest(),'route_tables':tables,'bee_rgba_sha256':hashes},indent=2)+'\n')
print('Imported closure fixtures, route tables and mirrored SAT bee composition')
