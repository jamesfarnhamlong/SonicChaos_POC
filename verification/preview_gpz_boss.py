"""Compose imported PNGs at SHIPPED GML trace anchors; compare Research pixels.

Only this review board is enlarged. GameMaker asset bytes are untouched.
"""
import json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'build/gpz-boss'
OUT=ROOT/'verification/gpz-boss'
def read(p):return json.loads(p.read_text())
manifest=read(ROOT/'POC_notes/rom-cache/gpz/enemy-import.json')
approved=read(ROOT/'POC_notes/rom-cache/gpz/approved-art-manifest.json')
frames=[]
for i in range(11):
    name='SPR_chaos_gpz_boss_51';p=ROOT/'sprites'/name;s=read(p/(name+'.yy'))
    f=p/(s['frames'][i]['name']+'.png');a=next(a for a in manifest['assets'] if a['resource']==name and a['frame']==i)
    assert hashlib.sha256(f.read_bytes()).hexdigest()==a['sha256']
    frames.append(Image.open(f).convert('RGBA'))
poc=read(BUILD/'poc-cycles.json')
ref=read(ROOT/'POC_notes/rom-cache/gpz/boss-51-runtime.json')['cycles']
samples=[('mode1_left',232,'Settled: head + 3'),('mode1_left',357,'Head + 2; dust'),('mode1_left',471,'Head + 1; dust'),
 ('mode1_left',601,'Head only; last throw'),('mode1_left',602,'Regrowth 1: below floor'),('mode1_left',630,'Regrowth 1 > 2 > 3'),
 ('mode1_left',670,'Regrowth: stack rising'),('mode1_left',704,'Regrowth: restored'),('mode2_left',268,'Mode2: head + 4'),
 ('mode1_left',360,'Landing dust 10 / 11'),('mode1_left',333,'Thrown left: arc'),('mode1_right',333,'Thrown right: arc'),
 ('mode1_left',447,'Thrown left: slide'),('mode1_right',447,'Thrown right: slide')]
def compose(row):
    im=Image.new('RGBA',(400,320),(0,0,0,0))
    for s in row['slots']:
        if s['type']!=81 or s['frame']==0:continue
        # Same draw_sprite origin/registration as Draw_0.gml. No flip.
        im.alpha_composite(frames[s['frame']-1],(s['x']-1600+1-64,s['y']-120+18-56))
    return im
board=Image.new('RGBA',(800,660*7),(35,42,53,255));draw=ImageDraw.Draw(board)
checks=[]
for i,(run,t,label) in enumerate(samples):
    row=poc[run][t];im=compose(row)
    er=ref[run]['rows'][t] if ref[run]['rows'] else next(r for r in ref[run]['events'] if r['tick']==t)
    expected=compose(er)
    assert im.tobytes()==expected.tobytes(),(run,t,'composition differs from approved Research')
    # Board crops a 200x160 region at 2x. World floor 270 is indicated separately.
    crop=im.crop((80,0,280,300)).resize((400,600),Image.Resampling.NEAREST)
    x=(i%2)*400;y=(i//2)*660
    draw.text((x+8,y+8),label,fill='white');draw.text((x+8,y+24),f'{run}; tick {t}; byte/pixel parity PASS',fill=(140,220,160))
    board.alpha_composite(crop,(x,y+50));draw.line((x,y+50+300,x+399,y+50+300),fill=(100,160,130))
    checks.append({'run':run,'tick':t,'pixel_parity':'PASS'})
OUT.mkdir(exist_ok=True);board.save(OUT/'poc-boss-sheet.png')
(OUT/'preview-parity.json').write_text(json.dumps({'research':'44e0714d16185f213ab1b73822c67e50546ce3f6','asset_transformation':'NONE','samples':checks,'approved_boards':['51-stack-registration.png','51-sequence-summary.png','51-mode-direction.png','support-approval.png']},indent=2)+'\n')
print('POC $51 preview: 14 compositions match Research, 11 approved sprite hashes match.')
