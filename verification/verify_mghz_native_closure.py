"""Native runner evidence and screenshot sheet for the bounded M1.1 closure."""
from pathlib import Path
import json,csv,zipfile
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/mghz-m11';OUT=ROOT/'verification/mghz-m11';OUT.mkdir(exist_ok=True)
before=json.loads((BUILD/'baseline-output/rows.json').read_text());after=json.loads((BUILD/'fixed-output/rows.json').read_text())
signs=[]
for act in (1,2):
 for spin in (0,1):
  name=f'sign-{act}-{spin}';rows=[r for r in after if r['scene']==name];old=[r for r in before if r['scene']==name]
  assert len(rows)==600 and all(r['sign_count']==1 and r['prize']==0xA962 for r in rows)
  milestones={key:next(r['tick']for r in rows if predicate(r))for key,predicate in [('contact',lambda r:r['contact']),('child',lambda r:r['child_count']),('state20',lambda r:r['state']==32),('clear',lambda r:r['complete'])]}
  assert milestones['contact']<milestones['child']<milestones['state20']<milestones['clear']
  assert all(r['timer_alarm']==-1 for r in rows if r['contact'])
  assert bool(any(r['complete']for r in old))==(not bool(spin))
  signs.append({'act':act,'player':'spin'if spin else 'standing','prize_table':'$A962',**milestones})
  (OUT/(name+'-rows.json')).write_text(json.dumps(rows,indent=2)+'\n')
base=BUILD/'foreground-source-output';fixed=BUILD/'foreground-fixed-output'
images={mode:Image.open(base/f'line-{mode}-20.png').convert('RGB')for mode in ('all','no-strip','no-palettes','none','nearest','no-foreground','nearest-foreground')}
shipping=Image.open(fixed/'line-all-20.png').convert('RGB')
for x in range(193,207):
 assert images['all'].getpixel((x,95))==(69,133,69)
 assert images['none'].getpixel((x,95))==images['all'].getpixel((x,95))
 assert images['nearest'].getpixel((x,95))==images['all'].getpixel((x,95))
 assert shipping.getpixel((x,95))==images['nearest-foreground'].getpixel((x,95))==images['no-foreground'].getpixel((x,95))==(85,170,85)
differences={mode:sum(a!=b for a,b in zip(images['all'].get_flattened_data(),im.get_flattened_data()))for mode,im in images.items()}
assert differences['nearest']>0 and differences['no-strip']>0
green_cleared=sum(a!=b and b==(85,170,85)for a,b in zip(images['all'].get_flattened_data(),shipping.get_flattened_data()));assert green_cleared>0
sheet=Image.new('RGB',(1068,622),(28,32,40));d=ImageDraw.Draw(sheet)
for col,(label,im)in enumerate([('M1: line with effects enabled',images['all']),('ALL effects disabled: line remains',images['none']),('M1.1: effects ON, line removed',shipping)]):
 x=col*356+8;d.text((x,8),label,fill='white');sheet.paste(im,(x,30))
 # Native pixels are only enlarged, never repainted.
 crop=im.crop((184,90,216,100)).resize((332,104),Image.Resampling.NEAREST);sheet.paste(crop,(x,246));d.text((x,356),'Horizontal line crop, enlarged',fill='white')
d.text((8,378),'Same canonical map/art/camera. Priority-atlas edge bleed; no approved pixels altered.',fill='white')
for col,act in enumerate((1,2)):
 im=Image.open(BUILD/f'fixed-output/sign-{act}-1-320.png').convert('RGB');sheet.paste(im,(8+col*356,414));d.text((8+col*356,396),f'MGHZ{act}: spin object reaches shared $20',fill='white')
sheet.save(OUT/'diagnosis-sheet.png')
# Approved M1 art and terrain caches remain byte-identical, not re-exported.
zpath=ROOT.parent/'releases/SonicChaos_MGHZ_Foundation_20261004_M1.zip';art_count=0
with zipfile.ZipFile(zpath)as z:
 for p in (ROOT/'sprites').glob('SPR_chaos_mghz_*/*'):
  if p.suffix=='.png':assert z.read('SonicChaos_MGHZ_Foundation_20261004_M1/'+p.relative_to(ROOT).as_posix())==p.read_bytes();art_count+=1
 for p in (ROOT/'POC_notes/rom-cache/mghz').glob('*.json'):
  if p.name=='m1-windows-followup.json':continue
  assert z.read('SonicChaos_MGHZ_Foundation_20261004_M1/'+p.relative_to(ROOT).as_posix())==p.read_bytes()
m=json.loads((ROOT/'POC_notes/rom-cache/mghz/implementation-manifest.json').read_text());refs=[]
for act,a in m['acts'].items():
 blocks={b['block_id']:b['mapping']['attributes']for b in a['blocks']};stride=a['descriptor']['layout']['width_cells']
 for index,b in enumerate(sum(a['layout']['rows'],[])):
  if index>=a['layout']['runtime_written_cells']:continue
  for slot,attr in enumerate(blocks[b]):
   if attr&511 in (424,425):refs.append([act,index,index%stride*32,index//stride*32,hex(b),slot,hex(attr&511),hex(attr)])
with (OUT/'animated-tile-references.csv').open('w',newline='')as f:w=csv.writer(f);w.writerow(['act','cell_index','cell_x','cell_y','block','mapping_slot','tile','attribute']);w.writerows(refs)
platforms=json.loads((BUILD/'platform-proof-output/rows.json').read_text())
last_y={}
for row in platforms:
 for platform in row['platforms']:
  key=(row['scene'],platform['placement']);previous=last_y.get(key,240 if platform['placement']==9 else 560)
  platform['delta']=platform['y']-previous;last_y[key]=platform['y']
(OUT/'native-platform-rows.json').write_text(json.dumps(platforms,indent=2)+'\n')
p=[r for r in platforms if r['scene']=='platform-2-13'];by={r['tick']:r for r in p}
assert by[152]['y']==334.125 and by[155]['y']==238.125
assert [by[t]['y']for t in range(156,161)]==[245.125,252.125,259.125,266.125,238.125]
assert by[278]['owner']==0 and by[279]['owner']!=0
assert by[310]['y']==237.125 and by[311]['y']==206.125 and by[311]['owner']==0
for name in ('platform-1-9-31','platform-1-9-36','platform-2-13-152','platform-2-13-160','platform-2-13-278','platform-2-13-311'):
 source=BUILD/'platform-proof-output'/(name+'.png');(OUT/(name+'.png')).write_bytes(source.read_bytes())
report={'status':'PASS','sign_chains':signs,'overlay_ab_changed_pixels':differences,'background_pixels_cleared':green_cleared,'horizontal_line':'Persists with effects disabled; absent with foreground disabled or nearest foreground sampling; absent in shipping fix.','unchanged_mghz_art_frames':art_count,'animated_tile_references':len(refs),'animated_blocks':['$D2','$D3'],'platform':'Historical pre-correction evidence; superseded by native-platform-correction-results.json.'}
(OUT/'native-closure-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
