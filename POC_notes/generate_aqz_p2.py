"""Import reviewed A3 scripts/oracles and approved $3F SAT art; leave P1 assets intact."""
from pathlib import Path
import argparse, copy, hashlib, json, subprocess, sys, uuid
from chaos_asset_parents import set_chaos_parent
ROOT=Path(__file__).resolve().parents[1]
COMMIT='89641f8093e62401cd81f94e6ac889422f600472'
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--research',type=Path,required=True);ap.add_argument('--rom',type=Path,required=True);a=ap.parse_args()
    git=['git','-C',str(a.research)]
    assert subprocess.check_output(git+['rev-parse','main'],text=True).strip()==COMMIT
    cache=ROOT/'POC_notes/rom-cache/aqz'
    for name in ['platform-3f-runtime','platform-3f-game-checks']:
        (cache/(name+'.json')).write_bytes(subprocess.check_output(git+['show',COMMIT+':data/rom-cache/aqz/'+name+'.json']))
    d=json.loads((cache/'platform-3f-runtime.json').read_bytes());rom=a.rom.read_bytes()
    assert hashlib.sha256(rom).hexdigest()==d['rom_sha256']
    sys.path.insert(0,str(a.research/'tools'))
    import aqz_art_approval as A
    from generate_mghz_footwear import compose
    from PIL import Image
    meta,art=A.build(rom);meta=json.loads(json.dumps(meta))
    approved=json.loads((cache/'art-approval.json').read_bytes())
    assert approved['status']=='APPROVED'
    for tag in ['3F-80-32','3F-80-00']:
        assert meta['subjects'][tag]==approved['subjects'][tag], 'Approved composition must match'
    pal=[(i+17,1,1,0 if i==0 else 255) for i in range(16)]
    images=[]
    for frame in art['subjects']['3F-80-32']['frames']:
        im=compose(frame['images'][0],pal)
        assert im.tobytes()==compose(art['subjects']['3F-80-00']['frames'][frame['frame']]['images'][0],pal).tobytes()
        images.append(im)
    assert len(images)==2
    name='SPR_chaos_aqz_platform';dest=ROOT/'sprites'/name;dest.mkdir(exist_ok=True)
    t=json.loads((ROOT/'sprites/SPR_chaos_sez_platform/SPR_chaos_sez_platform.yy').read_text())
    guid=lambda k:str(uuid.uuid5(uuid.NAMESPACE_URL,'sonic-chaos-aqz-p2/'+k))
    t['name']=t['%Name']=name;t['width']=t['height']=64;t['bbox_left']=t['bbox_top']=0;t['bbox_right']=t['bbox_bottom']=63
    seq=t['sequence'];seq['name']=seq['%Name']=name;seq['xorigin']=31;seq['yorigin']=14;seq['length']=2.0
    key=copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0]);layer=guid('layer');t['layers'][0]['name']=t['layers'][0]['%Name']=layer
    t['frames']=[];keys=[];hashes=[]
    for i,im in enumerate(images):
        f=guid(str(i));(dest/'layers'/f).mkdir(parents=True,exist_ok=True);im.save(dest/(f+'.png'));im.save(dest/'layers'/f/(layer+'.png'))
        t['frames'].append({'$GMSpriteFrame':'v1','%Name':f,'name':f,'resourceType':'GMSpriteFrame','resourceVersion':'2.0'})
        k=copy.deepcopy(key);k['id']=guid('key'+str(i));k['Key']=float(i);k['Channels']['0']['Id']={'name':f,'path':f'sprites/{name}/{name}.yy'};keys.append(k)
        hashes.append(hashlib.sha256(im.tobytes()).hexdigest())
    seq['tracks'][0]['keyframes']['Keyframes']=keys;set_chaos_parent(t);(dest/(name+'.yy')).write_text(json.dumps(t,indent=2)+'\n')
    scripts=[]
    for state in d['scripts']['states']:
        ops=[]
        for op in state['ops']:
            kind=op['op']
            if kind=='record': row=[1,op['duration'],op['frame'],int(op['callback'],16)]
            elif kind=='velocity_8_8': row=[2,op['x'],op['y']]
            elif kind=='call': row=[3,int(op['target'],16)]
            elif kind=='set_field': row=[4,op['offset'],op['value']]
            elif kind=='or_field': row=[5,op['offset'],op['mask']]
            elif kind=='jump': row=[6,next(i for i,x in enumerate(state['ops']) if x['cpu']==op['target'])]
            elif kind=='restart_state': row=[0]
            elif kind=='loops_back': continue
            else: raise ValueError(op)
            ops.append(row)
        scripts.append(ops)
    text='/// Generated from reviewed AQZ A3; only states 0/4/7/13/14 are registered.\nfunction chaos_platform3f_scripts() { return '+json.dumps(scripts,separators=(',',':'))+'; }\n'
    # Keep the table in the existing platform script to avoid a new runtime resource.
    p=ROOT/'scripts/SCR_chaos_platform/SCR_chaos_platform.gml';s=p.read_text();marker='/// Generated from reviewed AQZ A3;';s=s.split(marker)[0];p.write_text(s+text)
    project=ROOT/'SonicChaos_POC.yyp';p=json.loads(project.read_text());rel=f'sprites/{name}/{name}.yy'
    if not any(r['id']['path']==rel for r in p['resources']):p['resources'].append({'id':{'name':name,'path':rel}})
    project.write_text(json.dumps(p,indent=2)+'\n')
    (cache/'platform-3f-assets.json').write_text(json.dumps({'research':COMMIT,'rom_sha256':d['rom_sha256'],'sprite':name,'rgba_sha256':hashes,'origin':[31,14],'registration':[1,18]},indent=2)+'\n')
    print('AQZ P2 scripts, exact approved frames and A3 caches imported')
if __name__=='__main__':main()
