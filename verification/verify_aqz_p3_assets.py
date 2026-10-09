"""Pinned cache identity, decoded-script identity and exact approved SAT pixels."""
from pathlib import Path
import hashlib, json, os, subprocess, sys
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
RESEARCH=Path(os.environ.get('SONIC_RESEARCH_MAIN') or ROOT.parent/'sonic-chaos-reference-work')
ROM=Path(os.environ.get('SONIC_CHAOS_ROM') or ROOT.parent/'source/Sonic Chaos (Europe).sms')
sys.path.insert(0,str(RESEARCH/'tools'));sys.path.insert(0,str(ROOT/'POC_notes'))
import aqz_art_approval as A
from generate_mghz_footwear import compose
COMMIT='89641f8093e62401cd81f94e6ac889422f600472';checks=0
def eq(a,b):
    global checks
    assert a==b,(a,b);checks+=1
cache=ROOT/'POC_notes/rom-cache/aqz';r=ROM.read_bytes()
eq(hashlib.sha256(r).hexdigest(),'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607')
for name in ['enemies-3c-3d-runtime','enemies-3c-3d-game-checks']:
    canonical=subprocess.check_output(['git','-C',str(RESEARCH),'show',COMMIT+':data/rom-cache/aqz/'+name+'.json'])
    eq(json.loads((cache/(name+'.json')).read_bytes()),json.loads(canonical))
d=json.loads((cache/'enemies-3c-3d-runtime.json').read_bytes())
meta,art=A.build(r);approved=json.loads((cache/'art-approval.json').read_bytes());eq(approved['status'],'APPROVED')
asset=json.loads((cache/'enemies-3c-3d-assets.json').read_bytes())
for typ,tag,count in [('3c','3C-6A-6A',3),('3d','3D-70-70',5)]:
    name='SPR_chaos_aqz_enemy_'+typ;dest=ROOT/'sprites'/name;t=json.loads((dest/(name+'.yy')).read_text())
    eq([t['width'],t['height'],t['sequence']['xorigin'],t['sequence']['yorigin']],[64,64,31,14]);eq(t['sequence']['length'],float(count))
    eq(json.loads(json.dumps(meta['subjects'][tag])),approved['subjects'][tag])
    pal=[(i+17,1,1,0 if i==0 else 255) for i in range(16)]
    for i,f in enumerate(art['subjects'][tag]['frames']):
        expected=compose(f['images'][0],pal);actual=Image.open(dest/(t['frames'][i]['name']+'.png')).convert('RGBA')
        eq(actual.tobytes(),expected.tobytes());eq(hashlib.sha256(actual.tobytes()).hexdigest(),asset['rgba_sha256'][typ][i])
        for a,b in zip(actual.getdata(),expected.getdata()):eq(a,b)
eq(asset['registration'],[1,18]);eq(asset['research'],COMMIT)
# P1's player, water, spring, ring, room and navigation implementation files
# remain byte-for-byte equal to the accepted checkpoint. The sole environment
# addition is the conditional $3F scan hook checked in the focused runtime tests.
base='d4705ce63ddafcfcab663c5bc75da493cdd297bd'
for folder in ['SCR_chaos_core','SCR_chaos_adapter','SCR_chaos_motion','SCR_chaos_spring','SCR_chaos_player_animation','SCR_chaos_player_animation_data','SCR_chaos_terrain_ring','SCR_chaos_anim_counter','SCR_chaos_aqz_data','SCR_chaos_aqz_environment_data','SCR_chaos_debug_select','SCR_chaos_platform']:
    for p in (ROOT/'scripts'/folder).glob('*'):
        rel=p.relative_to(ROOT).as_posix();before=subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT)
        eq(p.read_bytes().replace(b'\r\n',b'\n'),before.replace(b'\r\n',b'\n'))
for act in [1,2,3]:
    for p in (ROOT/'rooms'/('ROM_chaos_aqz'+str(act))).glob('*'):
        rel=p.relative_to(ROOT).as_posix();before=subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT)
        eq(p.read_bytes().replace(b'\r\n',b'\n'),before.replace(b'\r\n',b'\n'))
out={'status':'PASS','assertions':checks,'research':COMMIT};(ROOT/'build/aqz-p3').mkdir(exist_ok=True);(ROOT/'build/aqz-p3/asset-results.json').write_text(json.dumps(out,indent=2)+'\n');print(out)
