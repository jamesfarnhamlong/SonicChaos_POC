"""Import Manager-approved frames unchanged; generate state programs from Research 81b8294.
AQZ companions encode original palette indices for the existing direct-lookup shader.
No ROM or raw graphics dumps are copied into the project.
"""
from pathlib import Path
import sys,json,copy,hashlib,shutil,uuid
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];REF=ROOT.parent/'sonic-chaos-reference-work';CACHE=ROOT/'POC_notes/rom-cache'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 j=json.loads((REF/'data/rom-cache/player-spring-airborne.json').read_text());source=REF/'build/player-spring-airborne'
 assert sha((source/'approval-board.png').read_bytes())==j['approval_board']['png_sha256']
 rom=(ROOT.parent/'source/Sonic Chaos (Europe).sms').read_bytes();assert sha(rom)==j['rom_sha256']
 sys.path.insert(0,str(REF/'tools'));import player_state_11_graphics as G;import thz1_object_assets as A
 shutil.copyfile(REF/'data/rom-cache/player-spring-airborne.json',CACHE/'player-spring-airborne.json')
 programs={}
 for key,s in j['state_scripts'].items():
  if int(key,16) not in {9,10,11,14,16,20,27,28}:continue
  rows=list(s['program']);rows += [f for r in s['program'] for f in r.get('fragment_at_target',[])]
  at={int(r['at'],16):i for i,r in enumerate(rows)};ops=[]
  for r in rows:
   addr=int(r['at'],16)
   if 'record' in r:op=[0,r['record'],r['frame'],addr]
   elif r['cmd']=='FF 00':op=[1,0,0,addr]
   elif r['cmd']=='FF 08':op=[2,at[int(r['target_if_carry'],16)],0,addr]
   elif r['cmd']=='FF 0E':op=[3,int(r['args'],16),0,addr]
   elif r['cmd']=='FF 0F':op=[4,at[int(r['target'],16)],0,addr]
   elif r['cmd']=='FF 05':op=[5,0,0,addr]
   else:raise ValueError(r)
   ops.append(op)
  programs[int(key,16)]=ops
 s='// Generated from Research 81b8294 player-spring-airborne.json. Do not edit frame/timing data.\nfunction chaos_player_animation_program(cp_state) { switch (cp_state) {\n'
 for state,ops in programs.items():s+='case '+str(state)+': return '+json.dumps(ops,separators=(',',':'))+';\n'
 s+='} return []; }\nfunction chaos_player_spin_frames() { return '+json.dumps([int(f,16) for f in j['selector_frame_tables']['frame_table_object_type_1']])+'; }\nfunction chaos_player_spin_durations() { return '+json.dumps(j['selector_frame_tables']['floor_duration_table_8FE0'])+'; }\n'
 template=json.loads((ROOT/'sprites/SPR_chaos_player_state_11/SPR_chaos_player_state_11.yy').read_text());project=json.loads((ROOT/'SonicChaos_POC.yyp').read_text());assets=[];sprite_table=[]
 for fid,meta in j['frames']['frames'].items():
  frame=int(fid,16);image=Image.open(source/('frame-%02X.png'%frame)).convert('RGBA');assert sha(image.tobytes())==meta['rgba_sha256_thz1_palette'];assert image.size==(meta['canvas_width'],meta['canvas_height'])
  parsed=A.parse_frame_record(rom,int(meta['mapping_frame_cpu'],16));source_tiles=G.dynamic_source(rom,frame);assert source_tiles['tile_bytes_sha256']==meta['tile_bytes_sha256']
  vram=bytearray(0x4000);vram[:len(source_tiles['raw'])]=source_tiles['raw'];w,h,rgba,render=A.render_frame(vram,parsed,0,scale=1,margin=0,palette=[(i+17,1,1,0 if i==0 else 255) for i in range(16)])
  indeximage=Image.frombytes('RGBA',image.size,rgba);assert image.getchannel('A').tobytes()==indeximage.getchannel('A').tobytes()
  names=[]
  for aqz in [False,True]:
   name=('SPR_chaos_aqz_player_frame_' if aqz else 'SPR_chaos_player_frame_')+('%02X'%frame);names.append(name)
   uid=str(uuid.uuid5(uuid.NAMESPACE_URL,name+'/frame'));layer=str(uuid.uuid5(uuid.NAMESPACE_URL,name+'/layer'));v=copy.deepcopy(template)
   v['name']=v['%Name']=name;v['width'],v['height']=image.size;v['sequence']['name']=v['sequence']['%Name']=name;v['sequence']['length']=1.0;v['sequence']['xorigin']=meta['gamemaker_origin_x'];v['sequence']['yorigin']=meta['gamemaker_origin_y'];v['frames']=v['frames'][:1];v['frames'][0]['name']=v['frames'][0]['%Name']=uid;v['layers'][0]['name']=v['layers'][0]['%Name']=layer
   k=v['sequence']['tracks'][0]['keyframes']['Keyframes'][0];k['Channels']['0']['Id']={'name':uid,'path':'sprites/'+name+'/'+name+'.yy'};k['id']=str(uuid.uuid5(uuid.NAMESPACE_URL,name+'/key'));k['Key']=0.0;v['sequence']['tracks'][0]['keyframes']['Keyframes']=[k]
   box=image.getbbox();v['bbox_left'],v['bbox_top'],right,bottom=box;v['bbox_right']=right-1;v['bbox_bottom']=bottom-1
   d=ROOT/'sprites'/name;d.mkdir(exist_ok=True);(d/'layers'/uid).mkdir(parents=True,exist_ok=True)
   png=d/(uid+'.png')
   if aqz:indeximage.save(png)
   else:shutil.copyfile(source/('frame-%02X.png'%frame),png)
   shutil.copyfile(png,d/'layers'/uid/(layer+'.png'));(d/(name+'.yy')).write_text(json.dumps(v,indent=2)+'\n')
   if not any(r['id']['name']==name for r in project['resources']):project['resources'].append({'id':{'name':name,'path':'sprites/'+name+'/'+name+'.yy'}})
   assets.append({'frame':frame,'resource':name,'aqz_indexed':aqz,'origin':[meta['gamemaker_origin_x'],meta['gamemaker_origin_y']],'rgba_sha256':sha(Image.open(png).convert('RGBA').tobytes()),'png_sha256':sha(png.read_bytes()),'png':png.relative_to(ROOT).as_posix()})
  sprite_table.append((frame,names))
 s+='function chaos_player_frame_sprite(cp_frame,cp_aqz) { switch (cp_frame) {\n'
 for frame,names in sprite_table:s+='case '+str(frame)+': return cp_aqz ? '+names[1]+' : '+names[0]+';\n'
 s+='} return -1; }\n'
 s+='// Resource identity owns registration, independently of executing/requested state.\nfunction chaos_player_rom_resource(cp_sprite) { switch (cp_sprite) {\n'
 for _,names in sprite_table:
  for name in names:s+='case '+name+':\n'
 s+='case SPR_chaos_player_state_11:\ncase SPR_chaos_aqz_base_chaos_player_state_11: return true;\n} return false; }\n'
 for name in ['SCR_chaos_player_animation','SCR_chaos_player_animation_data']:
  d=ROOT/'scripts'/name;d.mkdir(exist_ok=True);v=json.loads((ROOT/'scripts/SCR_chaos_anim_counter/SCR_chaos_anim_counter.yy').read_text());v['name']=v['%Name']=name;(d/(name+'.yy')).write_text(json.dumps(v,indent=2)+'\n')
  if name.endswith('_data'):(d/(name+'.gml')).write_text(s)
  if not any(r['id']['name']==name for r in project['resources']):project['resources'].append({'id':{'name':name,'path':'scripts/'+name+'/'+name+'.yy'}})
 (ROOT/'SonicChaos_POC.yyp').write_text(json.dumps(project,indent=2)+'\n')
 (CACHE/'player-spring-airborne-poc-assets.json').write_text(json.dumps({'research':'81b82941e7f44865e0d551484bee82d28d600d43','approval_board_sha256':j['approval_board']['png_sha256'],'assets':assets},indent=2)+'\n')
 manifest_path=CACHE/'manifest.json';manifest=json.loads(manifest_path.read_text())
 for filename in ['player-spring-airborne.json','player-spring-airborne-poc-assets.json']:
  raw=(CACHE/filename).read_bytes();manifest['files'][filename]={'sha256':sha(raw),'bytes':len(raw)}
 manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
 print('Imported 18 approved frames + 18 indexed AQZ companions; generated 8 state programs')
if __name__=='__main__':main()
