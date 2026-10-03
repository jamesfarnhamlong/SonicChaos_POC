"""Import only hash-approved PNG bytes from Research d214c60; never mirror/repaint.

Boss/support sprites are staged resources, not a gameplay implementation.
"""
import copy, hashlib, json, shutil, uuid
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT.parent / 'sonic-chaos-reference-work'
COMMIT = 'd214c60ccf04f62634c4565f4abf38ec63ae77c6'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def guid(s): return str(uuid.uuid5(uuid.NAMESPACE_URL, 'sonic-chaos-gpz-enemies/' + s))
def dump(p,d):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')

def main():
    cache=ROOT/'POC_notes/rom-cache/gpz'
    for name in ('approved-art-manifest','enemy-art-approval','boss-51-composition'):
        shutil.copyfile(RESEARCH/f'data/rom-cache/gpz/{name}.json',cache/f'{name}.json')
    approved=json.loads((cache/'approved-art-manifest.json').read_text())
    records={r['path']:r for r in approved['images']}
    for r in records.values():
        assert sha(RESEARCH/r['path'])==r['sha256'],r['path']
    project=json.loads((ROOT/'SonicChaos_POC.yyp').read_text())
    groups={
        'SPR_chaos_gpz_enemy_25':[f'build/gpz-enemy-approval/type-25-frame-{f:02d}-bit4-0.png' for f in (1,2)],
        'SPR_chaos_gpz_enemy_25_mirror':[f'build/gpz-enemy-approval/type-25-frame-{f:02d}-bit4-1.png' for f in (1,2)],
        'SPR_chaos_gpz_enemy_2C':[f'build/gpz-enemy-approval/type-2c-frame-{f:02d}-bit4-0.png' for f in (1,2)],
        'SPR_chaos_gpz_smoke_0F':[f'build/gpz-enemy-approval/type-0f-frame-{f:02d}-bit4-0.png' for f in (7,8,9)],
        'SPR_chaos_gpz_support_34':[f'build/gpz-enemy-approval/type-34-frame-{f:02d}-bit4-0.png' for f in (1,2,3,4)],
        'SPR_chaos_gpz_support_0A':[f'build/gpz-enemy-approval/type-0a-frame-{f:02d}-bit4-0.png' for f in (5,6)],
        'SPR_chaos_gpz_boss_51':[f'build/gpz51-correction/51-frame-{f:02d}.png' for f in range(1,12)],
    }
    imported=[]
    board=Image.new('RGBA',(128*11,150*len(groups)),(38,45,56,255))
    for n,(name,paths) in enumerate(groups.items()):
        s=json.loads((ROOT/'sprites/SPR_chaos_platform/SPR_chaos_platform.yy').read_text())
        s['name']=s['%Name']=name;s['width']=128;s['height']=112
        s['bbox_left']=s['bbox_top']=0;s['bbox_right']=127;s['bbox_bottom']=111
        seq=s['sequence'];seq['name']=seq['%Name']=name;seq['xorigin']=64;seq['yorigin']=56;seq['length']=float(len(paths))
        layer=guid(name+'/layer');s['layers'][0]['name']=s['layers'][0]['%Name']=layer
        base=copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0]);keys=[];s['frames']=[]
        for i,path in enumerate(paths):
            r=records[path];assert r['eligible_for_import'],path
            frame=guid(name+'/'+str(i));dest=ROOT/'sprites'/name
            (dest/'layers'/frame).mkdir(parents=True,exist_ok=True)
            for target in (dest/(frame+'.png'),dest/'layers'/frame/(layer+'.png')):shutil.copyfile(RESEARCH/path,target)
            im=Image.open(dest/(frame+'.png')).convert('RGBA');assert im.size==(128,112)
            # Review board only: enlarge opaque art. Imported frames stay byte-identical.
            crop=im.crop(im.getbbox());crop=crop.resize((crop.width*3,crop.height*3),Image.Resampling.NEAREST)
            board.alpha_composite(crop,(i*128+(128-crop.width)//2,n*150+40))
            ImageDraw.Draw(board).text((i*128+8,n*150+24),Path(path).stem,fill='white')
            s['frames'].append({'$GMSpriteFrame':'v1','%Name':frame,'name':frame,'resourceType':'GMSpriteFrame','resourceVersion':'2.0'})
            k=copy.deepcopy(base);k['id']=guid(name+'/key/'+str(i));k['Key']=float(i);k['Channels']['0']['Id']={'name':frame,'path':f'sprites/{name}/{name}.yy'};keys.append(k)
            imported.append({'resource':name,'frame':i,'source':path,'sha256':r['sha256']})
        ImageDraw.Draw(board).text((8,n*150+8),name,fill='white')
        seq['tracks'][0]['keyframes']['Keyframes']=keys
        dump(ROOT/f'sprites/{name}/{name}.yy',s)
        rel=f'sprites/{name}/{name}.yy'
        if not any(r['id']['path']==rel for r in project['resources']):project['resources'].append({'id':{'name':name,'path':rel}})
    dump(ROOT/'SonicChaos_POC.yyp',project)
    preview=ROOT/'verification/gpz-enemies/imported-sprites.png';preview.parent.mkdir(parents=True,exist_ok=True);board.save(preview)
    d=json.loads((cache/'enemy-art-approval.json').read_text())
    script=d['types']['15']['animation']['states'][1]['script']
    frames=[r['frame'] for r in script if r['op']=='record' for _ in range(r['duration'])]
    # Final blank's first callback deletes ordinary parameter-zero smoke.
    frames=frames[:frames.index(0,1)+1]
    text='/// Generated from approved Research '+COMMIT+'; ordinary $0F state 1.\n'
    text+='function chaos_gpz_smoke_frames() { return '+json.dumps(frames)+'; }\n'
    p=ROOT/'scripts/SCR_chaos_gpz_enemy_data';p.mkdir(exist_ok=True);(p/'SCR_chaos_gpz_enemy_data.gml').write_text(text)
    template=json.loads((ROOT/'scripts/SCR_chaos_attack/SCR_chaos_attack.yy').read_text());template['name']=template['%Name']='SCR_chaos_gpz_enemy_data';dump(p/'SCR_chaos_gpz_enemy_data.yy',template)
    rel='scripts/SCR_chaos_gpz_enemy_data/SCR_chaos_gpz_enemy_data.yy'
    if not any(r['id']['path']==rel for r in project['resources']):project['resources'].append({'id':{'name':'SCR_chaos_gpz_enemy_data','path':rel}})
    dump(ROOT/'SonicChaos_POC.yyp',project)
    dump(cache/'enemy-import.json',{'research_commit':COMMIT,'transformation':'NONE: source PNG bytes copied exactly; origin (64,56), draw registration (+1,+18)','assets':imported,'boss_gameplay':'DEFERRED','normal_stack':'head + balls 1/2/3; mode2 ball4 separate','throws':[3,2,1],'regrowth':[1,2,3],'dust_frames':[10,11]})
    boards=['build/gpz-enemy-approval/type-25-approval.png','build/gpz-enemy-approval/type-2c-approval.png','build/gpz-enemy-approval/support-approval.png',
            'build/gpz51-correction/51-stack-registration.png','build/gpz51-correction/51-sequence-summary.png','build/gpz51-correction/51-mode-direction.png']
    target=ROOT/'verification/gpz-enemies/approved';target.mkdir(exist_ok=True)
    for b in boards:shutil.copyfile(RESEARCH/b,target/Path(b).name)
    print('Imported',len(imported),'approved PNG frames; all source hashes verified.')
if __name__=='__main__':main()
