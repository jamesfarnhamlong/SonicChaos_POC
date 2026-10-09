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
    for name in ['enemies-3c-3d-runtime','enemies-3c-3d-game-checks']:
        (cache/(name+'.json')).write_bytes(subprocess.check_output(git+['show',COMMIT+':data/rom-cache/aqz/'+name+'.json']))
    d=json.loads((cache/'enemies-3c-3d-runtime.json').read_bytes());rom=a.rom.read_bytes()
    assert hashlib.sha256(rom).hexdigest()==d['rom_sha256']
    sys.path.insert(0,str(a.research/'tools'))
    import aqz_art_approval as A
    from generate_mghz_footwear import compose
    from PIL import Image
    meta,art=A.build(rom);meta=json.loads(json.dumps(meta))
    approved=json.loads((cache/'art-approval.json').read_bytes())
    assert approved['status']=='APPROVED'
    hashes={}
    for typ,tag in [('3c','3C-6A-6A'),('3d','3D-70-70')]:
        assert meta['subjects'][tag]==approved['subjects'][tag]
        images=[compose(f['images'][0],[(i+17,1,1,0 if i==0 else 255) for i in range(16)]) for f in art['subjects'][tag]['frames']]
        name='SPR_chaos_aqz_enemy_'+typ;dest=ROOT/'sprites'/name;dest.mkdir(exist_ok=True)
        t=json.loads((ROOT/'sprites/SPR_chaos_aqz_platform/SPR_chaos_aqz_platform.yy').read_text())
        guid=lambda k:str(uuid.uuid5(uuid.NAMESPACE_URL,'sonic-chaos-aqz-p3/'+typ+'/'+k))
        t['name']=t['%Name']=name
        seq=t['sequence'];seq['name']=seq['%Name']=name;seq['length']=float(len(images))
        key=copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0]);layer=guid('layer');t['layers'][0]['name']=t['layers'][0]['%Name']=layer
        t['frames']=[];keys=[];hashes[typ]=[]
        for i,im in enumerate(images):
            f=guid(str(i));(dest/'layers'/f).mkdir(parents=True,exist_ok=True);im.save(dest/(f+'.png'));im.save(dest/'layers'/f/(layer+'.png'))
            t['frames'].append({'$GMSpriteFrame':'v1','%Name':f,'name':f,'resourceType':'GMSpriteFrame','resourceVersion':'2.0'})
            k=copy.deepcopy(key);k['id']=guid('key'+str(i));k['Key']=float(i);k['Channels']['0']['Id']={'name':f,'path':f'sprites/{name}/{name}.yy'};keys.append(k)
            hashes[typ].append(hashlib.sha256(im.tobytes()).hexdigest())
        seq['tracks'][0]['keyframes']['Keyframes']=keys;set_chaos_parent(t);(dest/(name+'.yy')).write_text(json.dumps(t,indent=2)+'\n')
        project=ROOT/'SonicChaos_POC.yyp';pr=json.loads(project.read_text());rel=f'sprites/{name}/{name}.yy'
        if not any(r['id']['path']==rel for r in pr['resources']):pr['resources'].append({'id':{'name':name,'path':rel}})
        project.write_text(json.dumps(pr,indent=2)+'\n')
    tables={}
    for typ,contract in d['scripts'].items():
        scripts=[]
        for state in contract['states']:
            ops=[]
            for op in state['ops']:
                kind=op['op']
                if kind=='record': row=[1,op['duration'],op['frame'],int(op['callback'],16)]
                elif kind=='velocity_8_8': row=[2,op['x'],op['y']]
                elif kind=='request_state': row=[3,op['state']]
                elif kind=='jump': row=[7,next(i for i,x in enumerate(state['ops']) if x['cpu']==op['target'])]
                elif kind=='restart_state': row=[0]
                elif kind=='loops_back': continue
                else: raise ValueError(op)
                ops.append(row)
            scripts.append(ops)
        tables[str(int(typ,16))]=scripts
    p=ROOT/'scripts/SCR_chaos_aqz_enemy/SCR_chaos_aqz_enemy.gml';s=p.read_text().split('/// Generated A4 scripts')[0]
    p.write_text(s+'/// Generated A4 scripts from pinned Research. State3 is not naturally registered.\nfunction chaos_aqz_enemy_scripts() { return '+json.dumps(tables,separators=(',',':'))+'; }\n')
    (cache/'enemies-3c-3d-assets.json').write_text(json.dumps({'research':COMMIT,'rom_sha256':d['rom_sha256'],'rgba_sha256':hashes,'origin':[31,14],'registration':[1,18]},indent=2)+'\n')
    print('AQZ P3 approved art, decoded scripts and canonical oracles imported')
if __name__=='__main__':main()
