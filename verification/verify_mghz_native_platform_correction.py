"""Verify native fixture milestones and make an unpainted screenshot sheet."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/mghz-m11/platform-correction-output';OUT=ROOT/'verification/mghz-m11'
rows=json.loads((BUILD/'rows.json').read_text());milestones=[];images=[]
for scene,u,y,kind in [('mghz2-12-crush',104,517,'death'),('mghz2-13-crush',136,421,'death'),('mghz2-12-jump',75,517,'break'),('mghz1-10-snap',194,206,'snap'),('mghz1-11-snap',450,366,'snap')]:
 rr=[r for r in rows if r['scene']==scene];r=next(r for r in rr if r['u']==u)
 assert int(r['y'])==y,(scene,r)
 if kind=='death':
  assert r['object']=='OBJ_player_death' and r['next']==31 and r['vy']==-1280 and r['rings']==5 and r['freeze']==2 and r['owner']==0
  assert any(e['kind']=='death' and e['owner']!=0 for e in r['events'])
  assert len({z['platform'][0]['y']for z in rr if z['u']>=u})==1
 elif kind=='break':assert any(e['kind']=='break' for e in r['events']) and r['vy']==-464 and r['owner']==0 and r['object']!='OBJ_player_death'
 else:
  p=next(p for p in r['projections']if p['block']==249)
  assert p['after']-p['before']==-11 and r['floor']==2 and r['owner']==0 and r['vy']==832
 milestones.append({'scene':scene,'u':u,'kind':kind,'row':r})
 im=Image.open(BUILD/f'{scene}-{u}.png').convert('RGB');images.append((scene,u,im));(OUT/f'{scene}-{u}.png').write_bytes((BUILD/f'{scene}-{u}.png').read_bytes())
sheet=Image.new('RGB',(720,3*226),(28,32,40));d=ImageDraw.Draw(sheet)
for i,(scene,u,im)in enumerate(images):
 x=(i%2)*360;y=(i//2)*226;d.text((x+6,y+5),f'{scene}, update {u}',fill='white');im.thumbnail((348,196));sheet.paste(im,(x+6,y+24))
sheet.save(OUT/'platform-correction-sheet.png')
(OUT/'native-platform-correction-rows.json').write_text(json.dumps(rows,indent=2)+'\n')
report={'status':'PASS','milestones':milestones,'native_cases':5,'update_index':'zero-based','source':'shipping GML in isolated fixture snapshot'}
(OUT/'native-platform-correction-results.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS five native platform correction cases')
