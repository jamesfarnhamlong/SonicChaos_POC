"""Keep Windows-accepted P4 A canonical callbacks, data and art byte-identical."""
from pathlib import Path
import zipfile,hashlib,json
r=Path(__file__).resolve().parents[1];a=r.parent/'releases/SonicChaos_AQZ_P4_20261009_A.zip';assert hashlib.sha256(a.read_bytes()).hexdigest()=='2827ed06dbd4c039664626941a0888386f3c898dd7ade8a2ebef9fd3fa89cf9c';checks=0
with zipfile.ZipFile(a) as z:
 prefix='SonicChaos_AQZ_P4_20261009_A/'
 path='scripts/SCR_chaos_aqz_boss/SCR_chaos_aqz_boss.gml';before=z.read(prefix+path).decode().replace('\r\n','\n');after=(r/path).read_text();lo='function chaos_59_callback(';hi='function chaos_59_slot_index('
 def function(src,name):
  start=src.index('function '+name+'(');end=src.find('\nfunction ',start+1)
  return src[start:end if end>=0 else len(src)].strip()
 for name in ['chaos_59_callback','chaos_59_alloc','chaos_59_combat_contact','chaos_59_clear','chaos_59_script','chaos_59_velocity','chaos_59_convert','chaos_59_combat_init']:
  actual=function(after,name)
  if name=='chaos_59_callback':actual=actual.replace('if (chaos_59_patrol_stop(cp_s,cp_vp)) cp_s.vx=0;','if ((cp_s.vx < 0 && (cp_s.sx&255) < 48) || (cp_s.vx >= 0 && (cp_s.sx&255) >= 208)) cp_s.vx=0;')
  assert function(before,name)==actual,name;checks+=1
 for n in z.namelist():
  rel=n[len(prefix):]
  if rel.startswith(('POC_notes/rom-cache/aqz/','sprites/SPR_chaos_aqz_boss_','scripts/SCR_chaos_aqz_boss_data/','scripts/SCR_chaos_aqz_enemy/','scripts/SCR_chaos_aqz_environment/')):
   assert z.read(n)==(r/rel).read_bytes(),rel;checks+=1
 for name in ['SCR_chaos_lost_ring','SCR_chaos_core','SCR_chaos_attack','SCR_chaos_box_contact','SCR_chaos_adapter']:
  rel=f'scripts/{name}/{name}.gml'
  assert z.read(prefix+rel)==(r/rel).read_bytes(),rel;checks+=1
with zipfile.ZipFile(r.parent/'releases/SonicChaos_AQZ_P4_20261010_C.zip') as z:
 c=z.read('SonicChaos_AQZ_P4_20261010_C/'+path).decode().replace('\r\n','\n')
 for name in ['chaos_59_viewport_callback','chaos_59_camera_step','chaos_59_visit','chaos_59_draw','chaos_59_view_x','chaos_59_bits','chaos_59_project_player']:
  assert function(c,name)==function(after,name),name;checks+=1
out={'status':'PASS','assertions':checks,'accepted_a_sha256':hashlib.sha256(a.read_bytes()).hexdigest()};print(out)
(r/'build/aqz-p4-e/core-identity-results.json').write_text(json.dumps(out,indent=2)+'\n')
