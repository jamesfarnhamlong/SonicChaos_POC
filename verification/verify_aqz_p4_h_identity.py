"""Keep Windows-accepted P4 A canonical callbacks, data and art byte-identical."""
from pathlib import Path
import zipfile,hashlib,json
r=Path(__file__).resolve().parents[1];a=r.parent/'releases/SonicChaos_AQZ_P4_20261009_A.zip';assert hashlib.sha256(a.read_bytes()).hexdigest()=='2827ed06dbd4c039664626941a0888386f3c898dd7ade8a2ebef9fd3fa89cf9c';checks=0
with zipfile.ZipFile(a) as z:
 prefix='SonicChaos_AQZ_P4_20261009_A/'
 path='scripts/SCR_chaos_aqz_boss/SCR_chaos_aqz_boss.gml';before=z.read(prefix+path).decode().replace('\r\n','\n');after=(r/path).read_text();raw_after=after
 after=after.split('// AQZ DIAGNOSTIC BEGIN')[0]
 after='\n'.join(line for line in after.split('\n') if 'AQZ_DIAG_ONLY' not in line)
 after=after.replace('chaos_59_diag_impl_','chaos_59_')
 lo='function chaos_59_callback(';hi='function chaos_59_slot_index('
 def function(src,name):
  start=src.index('function '+name+'(');body=src.index('{',start);depth=1;end=body+1
  while depth:
   if src[end]=='{':depth+=1
   if src[end]=='}':depth-=1
   end+=1
  return src[start:end].strip()
 for name in ['chaos_59_callback','chaos_59_alloc','chaos_59_combat_contact','chaos_59_clear','chaos_59_script','chaos_59_velocity','chaos_59_convert','chaos_59_combat_init']:
  actual=function(after,name)
  if name=='chaos_59_velocity':actual=actual.replace('cp_s.vx+=cp_s.salvo_bias;','')
  if name=='chaos_59_callback':
   actual=actual.replace('chaos_59_salvo_begin(cp_s,cp_c,cp_vp);','').replace('chaos_59_salvo_launch(cp_s,cp_parent,cp_vp);','')
   actual=actual.replace('            chaos_59_body_route(cp_s,cp_c,cp_present,cp_vp);\n','')
   actual=actual.replace('            if (cp_vp.w == 348 && cp_s.wide_launch_vx != 0) cp_s.vx=cp_s.wide_launch_vx;\n','')
   actual=actual.replace('cp_s.vx=-chaos_59_jump_speed(160,cp_vp.w);','cp_s.vx=-160;')
   actual=actual.replace('if (chaos_59_patrol_stop(cp_s,cp_vp)) cp_s.vx=0;','if ((cp_s.vx < 0 && (cp_s.sx&255) < 48) || (cp_s.vx >= 0 && (cp_s.sx&255) >= 208)) cp_s.vx=0;')
  if name=='chaos_59_script':
   actual=actual.replace('chaos_59_script_alloc(cp_b,cp_pool,cp_s,cp_r,cp_c,cp_present,cp_vp);','chaos_59_alloc(cp_b,cp_pool,cp_r[2],cp_r[5],(chaos_59_x(cp_s)+cp_r[3])&$FFFF,(chaos_59_y(cp_s)+cp_r[4])&$FFFF,true);')
  assert function(before,name)==actual,name;checks+=1
 for n in z.namelist():
  rel=n[len(prefix):]
  if rel.startswith(('POC_notes/rom-cache/aqz/','sprites/SPR_chaos_aqz_boss_','scripts/SCR_chaos_aqz_boss_data/','scripts/SCR_chaos_aqz_enemy/','scripts/SCR_chaos_aqz_environment/')):
   assert z.read(n)==(r/rel).read_bytes(),rel;checks+=1
 for name in ['SCR_chaos_lost_ring','SCR_chaos_core','SCR_chaos_attack','SCR_chaos_box_contact','SCR_chaos_adapter']:
  rel=f'scripts/{name}/{name}.gml'
  actual=(r/rel).read_bytes()
  if name=='SCR_chaos_lost_ring':actual=actual.replace(b'\r\n',b'\n');expected=z.read(prefix+rel).replace(b'\r\n',b'\n')
  else:expected=z.read(prefix+rel)
  assert expected==actual,rel;checks+=1
with zipfile.ZipFile(r.parent/'releases/SonicChaos_AQZ_P4_20261010_C.zip') as z:
 c=z.read('SonicChaos_AQZ_P4_20261010_C/'+path).decode().replace('\r\n','\n')
 for name in ['chaos_59_viewport_callback','chaos_59_camera_step','chaos_59_visit','chaos_59_draw','chaos_59_view_x','chaos_59_bits','chaos_59_project_player','chaos_59_lifecycle']:
  actual=function(after,name)
  if name=='chaos_59_draw':
   begin=actual.index('  if (cp_sprite != -1) {')
   expected='''  if (cp_sprite != -1) {
   if (cp_b.viewport_w == 348 && cp_type == $5D && cp_s.vx>0) draw_sprite_ext(cp_sprite,chaos_59_sprite_frame(cp_type,cp_s.frame),chaos_59_view_x(cp_s),chaos_59_y(cp_s),-1,1,0,c_white,1);
   else draw_sprite(cp_sprite,chaos_59_sprite_frame(cp_type,cp_s.frame),chaos_59_view_x(cp_s),chaos_59_y(cp_s));
  }
 }
}'''
   assert actual[begin:]==expected,'only the exact documented mirror adapter permitted'
   actual=actual[:begin]+'  if (cp_sprite != -1) draw_sprite(cp_sprite,chaos_59_sprite_frame(cp_type,cp_s.frame),chaos_59_view_x(cp_s),chaos_59_y(cp_s));\n }\n}'
  assert function(c,name)==actual,name;checks+=1
with zipfile.ZipFile(r.parent/'releases/SonicChaos_AQZ_P4_20261010_G.zip') as z:
 g=z.read('SonicChaos_AQZ_P4_20261010_G/'+path).decode().replace('\r\n','\n')
 for name in ['chaos_59_jump_speed','chaos_59_fire_target','chaos_59_face','chaos_59_body_route','chaos_59_patrol_stop','chaos_59_script_alloc','chaos_59_draw','chaos_59_camera_step','chaos_59_viewport_callback']:
  assert function(g,name)==function(raw_after,name),name;checks+=1
out={'status':'PASS','assertions':checks,'accepted_a_sha256':hashlib.sha256(a.read_bytes()).hexdigest()};print(out)
(r/'build/aqz-p4-h/core-identity-results.json').write_text(json.dumps(out,indent=2)+'\n')
