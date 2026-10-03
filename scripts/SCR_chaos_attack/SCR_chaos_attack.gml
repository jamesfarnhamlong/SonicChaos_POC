// Canonical player attack posture and the THZ badnik / monitor contact rules (sonic-chaos-reference-work docs/player-attack-badnik-audit.md, 28485aa;
// POC_notes/rom-cache/player-attack-badnik.json). Plain numbers and the shared core struct only.
//
// Sonic attacks when +$03 bit 1 ($D503 bit 1, core.move & 2) is set OR the power-up $D532 == 6 (invincibility, global.powerInv). Not airborne, not the state, not the sprite:
// upright-spring flight ($0B) and every ordinary fall ($0E) are airborne and NOT attacking. global.playerJump (move & 3) is an airborne/physics predicate and is not used here.
//   type $27 (flying bee, chaos_type27_resolve): contact = $6328 box; converted iff overlap && (bit 1 || $D532 == 6). The callback never requests damage, but the overlap raises $D520, so $48BC hurts a
//                          non-attacking Sonic in the NEXT update, or (bit 1, not invincible) rebounds him: above -3.0, below +0.5 (not in state 9), side none.
//   type $21 (patrol):     contact = $6328 box; top (playerY <= objY - 4) is a stomp BEFORE the attack test (Y speed -6.75, state $0B, bit 1 cleared, badnik survives, any posture);
//                          otherwise converted iff bit 1 || $D532 == 6 (no rebound), else request $D3B0 := $FF (hurt next update). Its +$03 bit 7 keeps it out of $D520.
//   type $10 (monitor):    bit 1 ONLY (see OBJ_chaos_object_10); invincibility alone does not break it.
// While Sonic is hurt / dying (+$03 bit 6) $6328 reports no contact at all.
function chaos_attack_posture(cp_c) {
    return (cp_c.move & 2) != 0;
}
function chaos_attack_or_invincible(cp_c, cp_inv) {
    return (cp_c.move & 2) != 0 || cp_inv;
}
/// $D521 high nibble for a $6328 bit: above $20 (bit 5), below $10 (bit 4), the sides $80 (player right of the object) / $40 (left).
function chaos_contact_nibble(cp_bits) {
    if (cp_bits == 1) return 32;
    if (cp_bits == 2) return 16;
    return cp_bits == 4 ? 128 : 64;                              // player to the right $80, to the left $40 (no rebound either way)
}
/// Object phase side of $D520 / $D3B0: staged by the object (whichever order GameMaker runs the Step events in), promoted after the player's pass.
function chaos_contact_stage(cp_c, cp_nib) { cp_c.stage_contact = 1; cp_c.stage_nib = cp_nib; }
function chaos_request_stage(cp_c) { cp_c.stage_request = 255; }
function chaos_contact_promote(cp_c) {
    if (cp_c.stage_contact != 0) { cp_c.contact = cp_c.stage_contact; cp_c.contact_nib = cp_c.stage_nib; cp_c.stage_contact = 0; }
    if (cp_c.stage_request != 0) { cp_c.damage_request = 255; cp_c.stage_request = 0; }
}
/// Type $27. Returns 0 = no overlap, 1 = overlap, Sonic not attacking (object survives; $D520 raised), 2 = overlap and the bee is converted ($D520 raised too).
function chaos_type27_resolve(cp_c, cp_ox, cp_oy, cp_inv) {
    return chaos_ordinary_enemy_resolve(cp_c,cp_ox,cp_oy,cp_inv,9,14);
}
/// Shared $6328 -> $5F3D path; $25/$2C have no $21 top-stomp exception.
function chaos_ordinary_enemy_resolve(cp_c, cp_ox, cp_oy, cp_inv, cp_ex, cp_ey) {
    if ((cp_c.move & 64) != 0) return 0;
    var cp_pex = cp_c.state == $0F ? 9 : 8;
    var cp_bits = SCR_chaos_box_contact(floor(cp_c.xu / 256), floor(cp_c.yu / 256), cp_ox, cp_oy, cp_pex, 24, cp_ex, cp_ey);
    if (cp_bits == 0) return 0;
    chaos_contact_stage(cp_c, chaos_contact_nibble(cp_bits));
    return chaos_attack_or_invincible(cp_c, cp_inv) ? 2 : 1;
}
/// Type $21 (box |dx| <= 19, dy -26..+24). Returns 0 none, 1 stomp (caller applies SCR_chaos_type21_top_bounce), 2 defeated (no rebound), 3 Sonic hurt next update (request staged).
function chaos_type21_resolve(cp_c, cp_ox, cp_oy, cp_inv) {
    if ((cp_c.move & 64) != 0) return 0;
    var cp_px = floor(cp_c.xu / 256), cp_py = floor(cp_c.yu / 256);
    if (abs(cp_px - cp_ox) > 19 || cp_py < cp_oy - 26 || cp_py > cp_oy + 24) return 0;
    if (cp_py <= cp_oy - 4) return 1;
    if (chaos_attack_or_invincible(cp_c, cp_inv)) return 2;
    chaos_request_stage(cp_c);
    return 3;
}
