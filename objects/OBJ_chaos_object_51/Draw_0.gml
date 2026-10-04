// Imported PNG canvas origin (64,56); approved SAT registration (+1,+18).
// Every live slot is drawn independently; direction never flips bitmap pixels.
if (!chaosBoss51.active) exit;
for (var cp_i=0;cp_i<19;cp_i++) {
    var cp_s=chaosBoss51.slots[cp_i];
    if (cp_s.type==0 || cp_s.type==$FF || cp_s.frame==0) continue;
    var cp_sprite=cp_s.type==$51 ? SPR_chaos_gpz_boss_51 : (cp_s.type==$34 ? SPR_chaos_gpz_support_34 : SPR_chaos_gpz_support_0A);
    var cp_frame=cp_s.type==$0A ? cp_s.frame-5 : cp_s.frame-1;
    draw_sprite(cp_sprite,cp_frame,chaos_51_x(cp_s)+1,chaos_51_y(cp_s)+18);
}
