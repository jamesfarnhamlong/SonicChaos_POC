// $64FA presentation, before the executing callback. Independent of ring-parity shadow.
function chaos_player_animation_new() {
 return {state:-1,ptr:0,script:0,frame:-1,counter:0,loop:0,branch:0,selector:0,active:false};
}
function chaos_player_animation_supported(cp_state) {
 return cp_state == 9 || cp_state == 10 || cp_state == 11 || cp_state == 14 || cp_state == 16 || cp_state == 20 || cp_state == 27 || cp_state == 28;
}
function chaos_player_facing_input(cp_c) {
 if ((cp_c.held & 4) != 0) cp_c.player_flags |= 16;
 else if ((cp_c.held & 8) != 0) cp_c.player_flags &= ~16;
}
function chaos_player_animation_update(cp_c) {
 if (!variable_struct_exists(cp_c,"visual_anim")) cp_c.visual_anim=chaos_player_animation_new();
 var cp_a=cp_c.visual_anim,cp_state=cp_c.next,cp_changed=cp_a.state != cp_state;
 cp_a.active=chaos_player_animation_supported(cp_state);
 if (cp_changed) {cp_a.state=cp_state;cp_a.ptr=0;cp_a.counter=0;cp_a.loop=0;}
 // Walk/run selectors share D52F. Track their numeric frame/counter so a
 // later spin continues the canonical selector phase; retain existing walk/run art.
 if (!cp_a.active) {
  if (cp_state == 5 || cp_state == 6) {
   if (!cp_changed && cp_a.counter > 1) {cp_a.counter--;return;}
   cp_a.selector++;
   if (cp_a.selector >= (cp_state == 5 ? 6 : 4)) cp_a.selector=0;
   cp_a.frame=cp_a.selector+(cp_state == 5 ? 1 : 7);
   cp_a.counter=cp_state == 6 ? 4 : ((cp_c.contacts & 12) != 0 ? 2 : global.chaosAnimTables[0][min(abs(cp_c.vx >> 8) & 255,15)]);
  } else if (cp_state == 1) {cp_a.frame=11;cp_a.counter=cp_changed ? 180 : max(1,cp_a.counter-1);}
  return;
 }
 if (!cp_changed && cp_a.counter > 1) {cp_a.counter--;return;}
 var cp_program=chaos_player_animation_program(cp_state);
 // Decoded scripts have finite command chains ending in a record; no invented retry/fallback.
 while (true) {
  var cp_op=cp_program[cp_a.ptr];cp_a.script=cp_op[3];
  if (cp_op[0] == 0) {cp_a.counter=cp_op[1];cp_a.frame=cp_op[2];cp_a.ptr++;return;}
  if (cp_op[0] == 1) {cp_a.ptr=0;continue;}
  if (cp_op[0] == 2) {
   cp_a.branch=variable_struct_exists(cp_c,"d448") ? (cp_c.d448 & 1) : 0;
   cp_a.ptr=cp_a.branch != 0 ? cp_op[1] : cp_a.ptr+1;continue;
  }
  if (cp_op[0] == 3) {cp_a.loop=cp_op[1];cp_a.ptr++;continue;}
  if (cp_op[0] == 4) {cp_a.loop--;cp_a.ptr=cp_a.loop == 0 ? cp_a.ptr+1 : cp_op[1];continue;}
  if (cp_op[0] == 5) {
   cp_a.selector=(cp_a.selector+1) mod 20;
   cp_a.frame=chaos_player_spin_frames()[cp_a.selector];
   if ((cp_c.bg & 2) != 0) {
    var cp_hi=cp_c.vx >> 8;cp_a.counter=chaos_player_spin_durations()[min(15,abs(cp_hi))];
    if (cp_hi < 0) cp_c.player_flags |= 16;else cp_c.player_flags &= ~16;
   } else {cp_a.counter=3;chaos_player_facing_input(cp_c);}
   cp_a.ptr++;return;
  }
 }
}
function chaos_player_animation_present(cp_p) {
 var cp_c=cp_p.chaosCore;
 if (!variable_struct_exists(cp_c,"visual_anim")) return false;
 var cp_a=cp_c.visual_anim;
 if (!cp_a.active || cp_a.state != cp_c.state) return false;
 cp_p.sprite_index=chaos_player_frame_sprite(cp_a.frame,chaos_is_aqz());
 cp_p.image_index=0;cp_p.image_speed=0;cp_p.image_angle=0;
 cp_p.image_xscale=(cp_c.player_flags & 16) != 0 ? -1 : 1;
 return true;
}
