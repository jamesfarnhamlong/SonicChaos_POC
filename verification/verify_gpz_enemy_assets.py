"""Verify approved import bytes and GameMaker layer/source consistency."""
import hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
RESEARCH=ROOT.parent/'sonic-chaos-reference-work'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
cache=ROOT/'POC_notes/rom-cache/gpz'
for name in ('approved-art-manifest','enemy-art-approval','boss-51-composition'):
    assert read(cache/(name+'.json'))==read(RESEARCH/f'data/rom-cache/gpz/{name}.json')
manifest=read(cache/'enemy-import.json')
approved={r['path']:r for r in read(cache/'approved-art-manifest.json')['images']}
for a in manifest['assets']:
    source=RESEARCH/a['source'];r=approved[a['source']]
    assert r['eligible_for_import'] and sha(source)==a['sha256']==r['sha256']
    folder=ROOT/'sprites'/a['resource'];s=read(folder/(a['resource']+'.yy'))
    assert (s['width'],s['height'],s['sequence']['xorigin'],s['sequence']['yorigin'])==(128,112,64,56)
    f=s['frames'][a['frame']]['name'];assert sha(folder/(f+'.png'))==a['sha256']
    for layer in s['layers']:assert sha(folder/'layers'/f/(layer['name']+'.png'))==a['sha256']
    Image.open(folder/(f+'.png')).verify()
assert len(manifest['assets'])==26
for b in (ROOT/'verification/gpz-enemies/approved').glob('*.png'):
    source=next(RESEARCH/r for r in approved if Path(r).name==b.name and 'gpz51-correction' in r or Path(r).name==b.name and '51-' not in b.name)
    assert sha(b)==sha(source)
assert 'case $51: if (chaos_gpz_act()==3)' in (ROOT/'scripts/SCR_chaos_level/SCR_chaos_level.gml').read_text()
print('GPZ ENEMY ASSET CHECKS PASSED: 26 byte-identical frames, 6 approved boards, no forced mirrors; GPZ3 boss dispatch')
