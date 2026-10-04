"""Cache provenance, approved boss/support PNG parity and draw registration."""
import json,hashlib
from PIL import Image
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RESEARCH=ROOT.parent/'sonic-chaos-reference-work'
for name in ('boss-51-runtime','boss-51-fullgame'):
    assert (ROOT/f'POC_notes/rom-cache/gpz/{name}.json').read_bytes()==(RESEARCH/f'data/rom-cache/gpz/{name}.json').read_bytes()
manifest=json.loads((ROOT/'POC_notes/rom-cache/gpz/enemy-import.json').read_text())
count=0
for a in manifest['assets']:
    if a['resource'] not in ('SPR_chaos_gpz_boss_51','SPR_chaos_gpz_support_34','SPR_chaos_gpz_support_0A'):continue
    p=ROOT/'sprites'/a['resource'];s=json.loads((p/(a['resource']+'.yy')).read_text())
    assert (s['sequence']['xorigin'],s['sequence']['yorigin'])==(64,56)
    f=s['frames'][a['frame']]['name']
    for image in [p/(f+'.png')]+[p/'layers'/f/(l['name']+'.png') for l in s['layers']]:
        assert hashlib.sha256(image.read_bytes()).hexdigest()==a['sha256']
        assert image.read_bytes()==(RESEARCH/a['source']).read_bytes()
    count+=1
assert count==17
draw=(ROOT/'objects/OBJ_chaos_object_51/Draw_0.gml').read_text()
assert 'draw_sprite(cp_sprite,cp_frame,chaos_51_x(cp_s)+1,chaos_51_y(cp_s)+18)' in draw
assert 'draw_sprite_ext' not in draw and 'image_xscale' not in draw
print('GPZ boss assets: Research cache provenance, 17 source/layer PNG bytes, origin/registration/no-flip PASS')
script=(ROOT/'scripts/SCR_chaos_gpz_boss/SCR_chaos_gpz_boss.gml').read_text()
p=ROOT/'sprites/SPR_chaos_gpz_boss_51';s=json.loads((p/(p.name+'.yy')).read_text())
bounds=[Image.open(p/(f['name']+'.png')).getbbox() for f in s['frames'][:9]]
left=[b[0]-63 for b in bounds];right=[b[2]-63 for b in bounds]
assert 'var cp_l='+json.dumps(left,separators=(',',':'))+';' in script
assert 'var cp_r='+json.dumps(right,separators=(',',':'))+';' in script
print('E.1 viewport lifetime: nine approved alpha bounds + origin/registration verified')
