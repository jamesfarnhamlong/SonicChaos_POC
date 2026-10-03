"""Read-only original ROM block pointer lookup plus independent pixel oracle.

Run with Research's Z80-enabled Python. Writes only POC fixtures.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sha = lambda raw: hashlib.sha256(raw).hexdigest()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--research',type=Path,required=True);ap.add_argument('--rom',type=Path,required=True);args=ap.parse_args()
    sys.path.insert(0,str(args.research/'tools'))
    import level_package as L
    from oracle import Oracle
    rom=L.load_rom(args.rom)
    manifest=json.loads((args.research/'data/rom-cache/gpz/implementation-manifest.json').read_text())
    assert sha(rom)==manifest['rom_sha256']
    # Original map-column renderer: push BC/HL, block*2 + (D164), read DE.
    assert rom[0x5314:0x5323].hex()=='c5e55e1600eb29ed4b64d1095e2356'
    o=Oracle(rom);o.cpu.set_breakpoint(0x5323)
    output={'rom_sha256':sha(rom),'original_pointer_routine':{'start':0x5314,'stop':0x5323,'bytes_sha256':sha(rom[0x5314:0x5323])},'acts':{}}
    for key,act in manifest['acts'].items():
        header=act['descriptor']['header'];vram,loads=L.build_vram(rom,act['descriptor']['art'])
        assert sha(vram)==act['graphics']['vram_sha256']
        o.bank(2,header['block_mapping_bank']);o.word(0xd164,header['block_mapping_cpu'])
        blocks=[]
        for block in act['blocks']:
            b=block['block_id'];o.mem[0xc100]=b;o.cpu.hl=0xc100;o.cpu.sp=0xdfe0;o.cpu.pc=0x5314;o.cpu.ticks_to_stop=1000;o.cpu.run()
            assert o.cpu.pc==0x5323
            pointer=o.cpu.de;attrs=bytes(o.mem[pointer:pointer+32]);values=[]
            for y in range(32):
                for x in range(32):
                    attr=int.from_bytes(attrs[(y//8*4+x//8)*2:][:2],'little')
                    tx=7-x%8 if attr&0x200 else x%8;ty=7-y%8 if attr&0x400 else y%8
                    # Independent mode-4 bit-plane reconstruction, no Research pixel renderer.
                    row=vram[(attr&0x1ff)*32+ty*4:][:4]
                    color=sum(((row[plane]>>(7-tx))&1)<<plane for plane in range(4))
                    values.append(color|(16 if color and attr&0x800 else 0))
            palettes=act['graphics']['palettes'];rgba=bytearray()
            for color in values:
                if color==0:rgba+=bytes(4);continue
                cram=palettes['sprite' if color&16 else 'background']['cram'][color&15]
                rgba+=bytes(((cram&3)*85,((cram>>2)&3)*85,((cram>>4)&3)*85,255))
            blocks.append({'block_id':b,'cpu':pointer,'rom':header['block_mapping_bank']*0x4000+pointer-0x8000,
                           'mapping_sha256':sha(attrs),'index_sha256':sha(bytes(values)),
                           'rgba_sha256':sha(rgba),'opaque_pixels':sum(bool(c)for c in values),
                           'published_mapping_sha256':block['mapping_sha256'],
                           'published_index_sha256':block['decoded_palette_index_sha256']})
        output['acts'][key]={'vram_sha256':sha(vram),'blocks':blocks}
    dest=ROOT/'verification/gpz-art-oracle.json';dest.write_text(json.dumps(output,indent=2)+'\n')
    print('Original ROM pointer + independent pixel oracle:',sum(len(a['blocks'])for a in output['acts'].values()),'blocks')
if __name__=='__main__':main()
