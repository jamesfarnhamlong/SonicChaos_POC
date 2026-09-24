from pathlib import Path
from PIL import Image
import argparse,hashlib,json

parser=argparse.ArgumentParser(description="Install canonical reference type-$18 frames into the POC sprite")
parser.add_argument("reference_output",type=Path,
    help="output directory produced by reference tools/thz1_type18_dynamic_graphics.py --scale 1")
parser.add_argument("--project-root",type=Path,default=Path("."))
args=parser.parse_args()

source=args.reference_output.resolve()
project=args.project_root.resolve()
summary=json.loads((source/'summary.json').read_text())
frame_ids=[
    '18000001-0000-4000-8000-000000000001',
    '18000002-0000-4000-8000-000000000002',
    '18000003-0000-4000-8000-000000000003',
    '18000004-0000-4000-8000-000000000004',
    '18000005-0000-4000-8000-000000000005',
]
layer_id='18000000-0000-4000-8000-000000000000'
sprite_dir=project/'sprites/SPR_chaos_object_18'
sprite_dir.mkdir(parents=True,exist_ok=True)
assets=[]

rendered=[row for row in summary['frames'] if row['png']]
assert [row['frame_index'] for row in rendered]==[f'0x{x:02X}' for x in range(1,6)]
for frame_id,row in zip(frame_ids,rendered):
    source_png=source/row['png']
    image=Image.open(source_png).convert('RGBA')
    canvas=Image.new('RGBA',(32,48),(0,0,0,0))
    canvas.alpha_composite(image,((32-image.width)//2,48-image.height))
    root_png=sprite_dir/f'{frame_id}.png'
    layer_png=sprite_dir/'layers'/frame_id/f'{layer_id}.png'
    layer_png.parent.mkdir(parents=True,exist_ok=True)
    canvas.save(root_png,optimize=True)
    canvas.save(layer_png,optimize=True)
    raw=root_png.read_bytes();assert raw==layer_png.read_bytes()
    assets.append({'frame_index':row['frame_index'],'frame_id':frame_id,
        'root_png':root_png.relative_to(project).as_posix(),
        'layer_png':layer_png.relative_to(project).as_posix(),
        'sha256':hashlib.sha256(raw).hexdigest()})

cache=project/'POC_notes/rom-cache/object-18-graphics.json'
cache.write_text(json.dumps({'format':1,'rom_sha256':summary['rom_sha256'],
    'source_tool':'sonic-chaos-reference/tools/thz1_type18_dynamic_graphics.py',
    'dynamic_selector':summary['dynamic_selector'],
    'placement':{'x':3960,'y':558},
    'scope':'verified graphics and animation frames only; completion/lifetime behavior remains partial',
    'assets':assets},indent=2)+'\n')
print(cache)
