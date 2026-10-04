"""Native camera + shipping oil/player pass, independent of controlled render cameras."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/mghz-m1'
rows=json.loads((BUILD/'native-oil-rows.json').read_text());reports=[]
for width in (256,348):
    r=[v for v in rows if v['width']==width];assert r[-1]['death'] and r[-1]['update']<180
    a=[v for v in r if 'y'in v];steps=[abs(b['camera']-p['camera'])for p,b in zip(a,a[1:])]
    assert max(steps)<=7,(width,max(steps),'automatic camera must not bypass the cap')
    plunge=next(b for p,b in zip(a,a[1:])if b['y']-p['y']>=30);assert plunge['counter']in(25,26)
    assert r[-1]['update']-plunge['update']<=5,(width,r[-1],plunge)
    increments=[b for p,b in zip(a,a[1:])if b['counter']>p['counter']]
    assert all((v['update']-1)%4==0 for v in increments)
    assert all(v['floor']==2 and v['next']==1 and v['move']==0 for v in a)
    reports.append({'width':width,'plunge_update':plunge['update'],'counter':plunge['counter'],'death_update':r[-1]['update'],'max_camera_step':max(steps),'status':'PASS'})
(BUILD/'native-oil-verification.json').write_text(json.dumps(reports,indent=2)+'\n');print(reports)
