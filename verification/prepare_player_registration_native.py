"""Render registration controls using an immutable review package, no active runtime edits.
Synthetic fixed-anchor controls isolate Draw/resource registration from movement.
"""
from pathlib import Path
import argparse,zipfile,json,shutil
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--package',choices=['D','E','F'],required=True);ap.add_argument('--label',required=True);ap.add_argument('--current',action='store_true');args=ap.parse_args()
assert args.label.replace('-','').isalnum()
stage=ROOT/'build/aqz-p1'/args.label/'project';assert not stage.exists()
with zipfile.ZipFile(ROOT.parent/'releases'/('SonicChaos_AQZ_P1_20261009_'+('E' if args.current else args.package)+'.zip')) as z:
 for name in z.namelist():
  rel=name.split('/',1)[1]
  if not rel or name.endswith('/'):continue
  dst=stage/rel;dst.resolve().relative_to(stage.resolve());dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(z.read(name))
if args.current:
 for r in json.loads((ROOT/'SonicChaos_POC.yyp').read_text())['resources']:
  d=(ROOT/r['id']['path']).parent;shutil.copytree(d,stage/d.relative_to(ROOT),dirs_exist_ok=True)
 shutil.copy2(ROOT/'SonicChaos_POC.yyp',stage/'SonicChaos_POC.yyp')

def append(rel,s):
 p=stage/rel;p.write_text(p.read_text()+'\n'+s)
append('objects/OBJ_menu_title/Create_0.gml','''
global.regAudit=true;global.regTick=0;global.regLastState=-1;
global.regHandle=file_text_open_write("player-registration-'''+args.package+'''.jsonl");
var entries=chaos_debug_entries();chaos_debug_launch(entries[0]);
''')
# Freeze only the diagnostic control, not the shipping movement pipeline.
for obj in ['OBJ_player_char','OBJ_player_char_spin']:
 p=stage/'objects'/obj/'Step_0.gml';p.write_text('if(variable_global_exists("regAudit")) exit;\n'+p.read_text())
append('objects/OBJ_chaos_zone/Step_2.gml','''
if(variable_global_exists("regAudit")) {
 var p=instance_find(OBJ_player,0),c=p.chaosCore,t=global.regTick;
 var phase=t div 24,states=[9,15,16,17,14,11,1,11];
 c.state=states[phase];c.next=c.state;c.xu=400*256;c.yu=400*256;
 c.vx=phase==0||phase==2 ? 1536 : 0;c.vy=phase==5||phase==7 ? -1280 : 0;
 c.move=phase==0||phase==1||phase==2 ? 2 : (phase>=4&&phase!=6 ? 1 : 0);
 c.bg=phase<3||phase==6 ? 2 : 0;c.contacts=c.bg;c.player_flags=0;
 c.d448=phase==7 ? 255 : 0;
 var rocket_frames=[56,57,58,57];var rocket_index=3;if ((t mod 24)<20) rocket_index=2;if ((t mod 24)<12) rocket_index=1;if ((t mod 24)<8) rocket_index=0;
 c.state11_frame=rocket_frames[rocket_index];
'''+(' chaos_player_animation_update(c);\n' if args.package!='D' else '')+'''
 SCR_chaos_core_publish(p);SCR_chaos_core_sprites(p);
}
''')
p=stage/'scripts/SCR_chaos_aqz_environment/SCR_chaos_aqz_environment.gml';s=p.read_text()
s=s.replace('with (cp_o) draw_self();','reg_draw(cp_o,cp_o.sprite_index,cp_o.image_index,cp_o.x,cp_o.y,cp_o.image_xscale,cp_o.image_yscale,cp_o.image_angle,cp_o.image_blend,cp_o.image_alpha);')
s=s.replace('draw_sprite_ext(cp_o.sprite_index,cp_o.image_index,cp_o.x,cp_o.y,','reg_draw(cp_o,cp_o.sprite_index,cp_o.image_index,cp_o.x,cp_o.y,')
s=s.replace('draw_sprite_ext(cp_base,cp_o.image_index,cp_o.x,cp_o.y,','reg_draw(cp_o,cp_base,cp_o.image_index,cp_o.x,cp_o.y,')
s=s.replace('draw_sprite_ext(cp_o.sprite_index,cp_o.image_index,cp_o.x,cp_draw_y,','reg_draw(cp_o,cp_o.sprite_index,cp_o.image_index,cp_o.x,cp_draw_y,')
s=s.replace('draw_sprite_ext(cp_base,cp_o.image_index,cp_o.x,cp_draw_y,','reg_draw(cp_o,cp_base,cp_o.image_index,cp_o.x,cp_draw_y,')
# F uses an explicit resource registration helper; wrap its final Draw coordinates too.
s=s.replace('draw_sprite_ext(cp_o.sprite_index,cp_o.image_index,cp_draw.x,cp_draw.y,','reg_draw(cp_o,cp_o.sprite_index,cp_o.image_index,cp_draw.x,cp_draw.y,')
s=s.replace('draw_sprite_ext(cp_base,cp_o.image_index,cp_draw.x,cp_draw.y,','reg_draw(cp_o,cp_base,cp_o.image_index,cp_draw.x,cp_draw.y,')
s+='''
function reg_draw(p,spr,idx,xx,yy,xs,ys,angle,blend,alpha) {
 draw_sprite_ext(spr,idx,xx,yy,xs,ys,angle,blend,alpha);
 var c=p.chaosCore,rom_frame=-1;
 if(c.state==17)rom_frame=c.state11_frame;
'''+(' else if(variable_struct_exists(c,"visual_anim")&&c.visual_anim.active)rom_frame=c.visual_anim.frame;\n' if args.package!='D' else '')+'''
 var row={update:global.regTick,phase:global.regTick div 24,synthetic_fixed_anchor:true,
 core_x:c.xu/256,core_y:chaos_signed_yu(c.yu)/256,instance_x:p.x,instance_y:p.y,anchor_offset:p.chaosAnchorOffset,
 state:c.state,next:c.next,rom_frame:rom_frame,sprite:sprite_get_name(p.sprite_index),draw_sprite:sprite_get_name(spr),
 frame_index:idx,width:sprite_get_width(spr),height:sprite_get_height(spr),origin_x:sprite_get_xoffset(spr),origin_y:sprite_get_yoffset(spr),
 mask:sprite_get_name(p.mask_index>=0?p.mask_index:SPR_player_mask),bbox:[p.bbox_left,p.bbox_top,p.bbox_right,p.bbox_bottom],
 draw_x:xx,draw_y:yy,manual_x:xx-p.x,manual_y:yy-p.y,xscale:xs,yscale:ys,angle:angle};
 file_text_write_string(global.regHandle,json_stringify(row));file_text_writeln(global.regHandle);
}
''';p.write_text(s)
append('objects/OBJ_chaos_zone/Draw_0.gml','''
if(variable_global_exists("regAudit")) {
 if((global.regTick mod 24)==12)screen_save("player-registration-'''+args.package+'''-"+string(global.regTick div 24)+".png");
 global.regTick++;
 if(global.regTick>=192){file_text_close(global.regHandle);game_end();}
}
''')
print(stage/'SonicChaos_POC.yyp')
