"""Pinned AQZ A5 importer: numeric scripts/oracles and approved SAT compositions."""
from pathlib import Path
import argparse,copy,hashlib,json,subprocess,sys,uuid
from generate_sez_s5 import record_rows
from chaos_asset_parents import set_chaos_parent
ROOT=Path(__file__).resolve().parents[1];COMMIT='89641f8093e62401cd81f94e6ac889422f600472'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--research',type=Path,required=True);ap.add_argument('--rom',type=Path,required=True);a=ap.parse_args();git=['git','-C',str(a.research)]
 assert subprocess.check_output(git+['rev-parse','main'],text=True).strip()==COMMIT
 cache=ROOT/'POC_notes/rom-cache/aqz'
 for name in ['boss-59-runtime','boss-59-game-checks']:(cache/(name+'.json')).write_bytes(subprocess.check_output(git+['show',COMMIT+':data/rom-cache/aqz/'+name+'.json']))
 d=json.loads((cache/'boss-59-runtime.json').read_bytes());rom=a.rom.read_bytes();assert hashlib.sha256(rom).hexdigest()==d['rom_sha256']
 tables={};records={};extents={}
 for typ,sc in d['state_graphs'].items():
  typ=int(typ,16);tables[typ]=[int(x,16) for x in sc['state_script_cpus']];rows={}
  for st in sc['states']:
   normal=[o for o in st['ops'] if o['op']!='set_field'];rows.update(record_rows(normal))
   for o in st['ops']:
    if o['op']=='set_field':
     cpu=int(o['cpu'],16);rows[cpu]=[cpu+4,9,o['offset'],o['value']]
  records[typ]=rows
 # Accepted shared support tables/records and geometry: same original routines.
 m=json.loads((ROOT/'POC_notes/rom-cache/mghz/boss-56-runtime.json').read_bytes())
 for typ,v in m['static']['support'].items():
  if not typ.startswith('0x'):continue
  typ=int(typ,16);rows={};cpus=[]
  for st in v['states']:rows.update(record_rows(st['script']));cpus.append(int(st['script_cpu'],16))
  tables[typ]=cpus;records[typ]=rows
 for typ,rows in records.items():
  for cpu,row in list(rows.items()):
   if row[1]==3:
    off=(30 if typ>=52 else 12)*16384+row[0]-32768
    assert rom[off:off+2]==bytes([255,0]);rows[row[0]]=[row[0]+2,0]
 sys.path.insert(0,str(a.research/'tools'));import aqz_art_approval as A
 from PIL import Image
 meta,art=A.build(rom);approved=json.loads((cache/'art-approval.json').read_bytes());project=ROOT/'SonicChaos_POC.yyp';pr=json.loads(project.read_text());assets=[];frames={}
 for typ,tag in [(89,'59-00-00'),(90,'5A-child'),(91,'5B-child'),(92,'5C-child'),(93,'5D-child')]:
  assert json.loads(json.dumps(meta['subjects'][tag]))==approved['subjects'][tag]
  src=art['subjects'][tag];extents[typ]={f['frame']:f['extent_x_y'] for f in src['frames']};frames[typ]=[f['frame'] for f in src['frames']]
  for flash in [False,True]:
   name=f'SPR_chaos_aqz_boss_{typ:02x}'+('_flash' if flash else '');dest=ROOT/'sprites'/name;dest.mkdir(exist_ok=True)
   t=json.loads((ROOT/'sprites/SPR_chaos_aqz_platform/SPR_chaos_aqz_platform.yy').read_text());t['name']=t['%Name']=name;t.update(width=128,height=128,bbox_right=127,bbox_bottom=127)
   seq=t['sequence'];seq['name']=seq['%Name']=name;seq.update(xorigin=63,yorigin=78,length=float(len(src['frames'])))
   guid=lambda k:str(uuid.uuid5(uuid.NAMESPACE_URL,'sonic-chaos-aqz-p4/'+name+'/'+k));key=copy.deepcopy(seq['tracks'][0]['keyframes']['Keyframes'][0]);layer=guid('layer');t['layers'][0]['name']=t['layers'][0]['%Name']=layer;t['frames']=[];keys=[]
   for i,f in enumerate(src['frames']):
    im=Image.new('RGBA',(128,128))
    for piece in reversed(f['images'][0]['pieces']):
     tile=Image.new('RGBA',(8,len(piece['pixels'])));tile.putdata([(255,255,255,255) if flash and c in [13,14] else (c+17,1,1,255) if c else (0,0,0,0) for row in piece['pixels'] for c in row]);im.alpha_composite(tile,(64+piece['x'],96+piece['y']))
    uid=guid(str(i));(dest/'layers'/uid).mkdir(parents=True,exist_ok=True);im.save(dest/(uid+'.png'));im.save(dest/'layers'/uid/(layer+'.png'))
    t['frames'].append({'$GMSpriteFrame':'v1','%Name':uid,'name':uid,'resourceType':'GMSpriteFrame','resourceVersion':'2.0'});k=copy.deepcopy(key);k['id']=guid('key'+str(i));k['Key']=float(i);k['Channels']['0']['Id']={'name':uid,'path':f'sprites/{name}/{name}.yy'};keys.append(k);assets.append({'resource':name,'frame':f['frame'],'rgba_sha256':hashlib.sha256(im.tobytes()).hexdigest()})
   seq['tracks'][0]['keyframes']['Keyframes']=keys;set_chaos_parent(t);(dest/(name+'.yy')).write_text(json.dumps(t,indent=2)+'\n');rel=f'sprites/{name}/{name}.yy'
   if not any(r['id']['path']==rel for r in pr['resources']):pr['resources'].append({'id':{'name':name,'path':rel}})
 project.write_text(json.dumps(pr,indent=2)+'\n')
 out=['/// Generated from pinned AQZ A5; shared support uses accepted SEZ tables.']
 macros={'RIGHT_LIMIT':2304,'BOTTOM_INITIAL':320,'BOTTOM_LIMIT':78,'TOKEN':1}
 for k,v in macros.items():out.append(f'#macro CHAOS_59_{k} {v}')
 for k in ['DEADZONE','FOLLOW_LEFT','FOLLOW_RIGHT','LEAD_LEFT','LEAD_RIGHT','LEAD_SLEW','EDGE_ESCAPE','EDGE_STOP','MIRROR_ESCAPE','MIRROR_STOP']:out.append(f'#macro CHAOS_59_{k} CHAOS_54_{k}')
 def obj(v):return json.dumps(v,separators=(',',':'))
 for name,v in [('tables',tables),('records',records),('extents',extents),('frames',frames),('velocities',d['children']['angular_velocity']),('parameters',[[x['camera_offsets'][0],x['camera_offsets'][1],x['initial_angle'],x['angle_step'],x['wait']] for x in d['boundaries']['5c_parameters']])]:out.append('function chaos_59_'+name+'() { return '+obj(v)+'; }')
 out += ['function chaos_59_table(t) { return variable_struct_get(chaos_59_tables(),string(t)); }','function chaos_59_record(t,p) { var v=variable_struct_get(chaos_59_records(),string(t));return variable_struct_exists(v,string(p)) ? variable_struct_get(v,string(p)) : []; }','function chaos_59_extent(t,f) { if (t < 89) return chaos_54_extent(t,f);var e=variable_struct_get(chaos_59_extents(),string(t));return variable_struct_exists(e,string(f)) ? variable_struct_get(e,string(f)) : [0,0]; }','function chaos_59_destination() {return {zone:5,act:0};}']
 (ROOT/'scripts/SCR_chaos_aqz_boss_data/SCR_chaos_aqz_boss_data.gml').write_text('\n'.join(out)+'\n');(cache/'boss-59-assets.json').write_text(json.dumps({'research':COMMIT,'rom_sha256':d['rom_sha256'],'canvas':[128,128],'anchor':[64,96],'registration':[1,18],'assets':assets},indent=2)+'\n')
 print('AQZ P4 scripts, oracles and approved SAT art imported')
if __name__=='__main__':main()
