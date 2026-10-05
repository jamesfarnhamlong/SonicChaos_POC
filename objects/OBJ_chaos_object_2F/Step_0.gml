// Type $2F callbacks: $8B5B init, $8B64 offer, $8BC3 attached, $8BCE/$8BD7 falling (asm/recovered/object_2f_handlers.asm). Lifecycle: the shared placement scan + lifetime
// routine ($8000 / $61E1) through the viewport adapter; an attached object follows the player, so it stays inside the window.
var cp_vp = chaos_vp_current();
var cp_created = false;
if (!chaosActive) {
    if (!SCR_chaos_placement_scan(id,cp_vp,chaosOriginX,chaosOriginY)) exit;
    chaosAsleep = true;
    x = chaosOriginX; y = chaosOriginY; chaosYU = round(y*256); chaosVY = 0;
    chaosState = 1; chaosRequest = 0; chaosFrame = 1; chaosAnimTick = 0; // $8B5B: request state 1, +$03 bit 7 (no generic contact damage)
    chaosActive = true; visible = false; cp_created = true;
}
var cp_cell = SCR_chaos_lifetime_cell(id,cp_vp,floor(x),floor(y));
if (cp_cell == 3) { chaosActive = false; chaosAsleep = true; visible = false; chaosState = 1; exit; } // $FE: occupancy released, the record may respawn later
chaosAsleep = (cp_cell >= 2); visible = !chaosAsleep;
if (chaosAsleep) exit; // callbacks do not run while asleep

if (chaosRequest != 0) { chaosState = chaosRequest; chaosRequest = 0; chaosAnimTick = 0; } // the engine applies the requested state and reloads its script
else if (!cp_created) chaosAnimTick++;   // the creating update is the script's load update (record counter just loaded)

var cp_p = instance_find(OBJ_player,0);
var cp_have = instance_exists(cp_p) && variable_instance_exists(cp_p,"chaosCore");
if (instance_exists(cp_p) && !variable_instance_exists(cp_p,"chaosCore")) { SCR_chaos_core_attach(cp_p); cp_have = true; }
var cp_c = cp_have ? cp_p.chaosCore : noone;

if (chaosState == 5) {
    // $8BCE (record 1, one update): Y speed +1.5. $8BD7 (record 2, every update after): Y speed +0.5, then integrate.
    chaosFrame = 4;
    if (chaosAnimTick == 0) chaosVY = $0180;
    else { chaosVY += $0080; chaosYU += chaosVY; y = chaosYU/256; }
    image_index = chaosFrame-1;
    exit;
}
if (chaosState == 3 || chaosState == 4) {
    // $8BC3: the object lives exactly while the player's CURRENT state is $12; otherwise it requests state 5 (applied on its next update).
    if (chaosState == 3 && chaosAnimTick >= 12) { chaosState = 4; chaosAnimTick = 0; } // FF 03 04: the 12-update frame-3 record ends in state 4
    chaosFrame = (chaosState == 3) ? 3 : 4;
    image_index = chaosFrame-1;
    if (!cp_have || (cp_c.state != $12 && cp_c.next != $12)) chaosRequest = 5; // (next: the requested state also counts, so a Step-event order that runs this object first cannot see a stale D501)
    exit;
}

// State 1 (offer, callback $8B64): frames 1/2 alternate every 8 updates.
chaosFrame = 1 + ((chaosAnimTick div 8) & 1);
image_index = chaosFrame-1;
if (!cp_have) exit;
// $6328 reports no contact while Sonic is hurt/dying (+$03 bit 6); a rising Sonic (negative Y high byte) and an attached Sonic (current state $12) skip everything.
if ((cp_c.move & 64) != 0 || cp_c.vy < 0 || cp_c.state == $12) exit;
var cp_px = floor(cp_c.xu/256), cp_py = floor(cp_c.yu/256);
// Collision extents are the mapping fields of frames 1/2: 8 x 16 (+$2C/+$2D); Sonic 8 x 24 ($0F: 9 x 24).
var cp_bits = SCR_chaos_box_contact(cp_px,cp_py,floor(x),floor(y),(cp_c.state == $0F ? 9 : 8),24,8,16);
if (cp_bits == 0) exit;
if (cp_bits == 1) {
    // Top contact attaches: $D3A4 := this object, player state $12 requested, object state 3 requested. No selector, timer, sound, palette or velocity write; the
    // attack bit is inherited unchanged.
    cp_c.next = $12;
    cp_p.chaosShoeOwner = id;
    chaosRequest = 3;
    // The same $5FA0 top projection that classified the contact also places Sonic on the box (anchor Y = object Y - 16) and the staged object-floor contact reaches the next update's
    // merge: the first state-$12 update therefore already sees a floor and rebounds (Research spring-shoes-presentation traces.mghz1_plain: first $12 update = first rebound).
    cp_c.yu = (floor(y) - 16)*256 + (cp_c.yu & 255);
    cp_p.y = cp_c.yu/256+cp_p.chaosAnchorOffset; cp_p.chaosCoreLastY = cp_p.y;
    cp_p.chaosBoxContacts = cp_p.chaosBoxContacts | 32;
    exit;
}
// Bottom / side contacts: the same $5FA0 projection as every solid box (the top is not projected), then the grounded-attacker push.
if (!(cp_bits == 2 && (cp_c.contacts & 2) != 0)) {
    var cp_proj = SCR_chaos_box_projection(cp_bits,cp_px,cp_py,floor(x),floor(y),(cp_c.state == $0F ? 9 : 8),24,8,16);
    cp_c.xu = cp_proj[0]*256 + (cp_c.xu & 255);
    cp_c.yu = cp_proj[1]*256 + (cp_c.yu & 255);
    cp_p.x = cp_c.xu/256; cp_p.y = cp_c.yu/256+cp_p.chaosAnchorOffset;
    cp_p.chaosCoreLastX = cp_p.x; cp_p.chaosCoreLastY = cp_p.y;
}
if (cp_bits == 8) cp_p.chaosBoxContacts = 64;
if (cp_bits == 4) cp_p.chaosBoxContacts = 128;
if ((cp_c.bg & 2) != 0 && chaos_attack_posture(cp_c)) {
    // $8B95: a grounded attacking side contact is not a pickup: stand, zero X speed, place Sonic 16 px to the side (right of the object: +16, otherwise -16).
    cp_c.next = 1; cp_c.vx = 0;
    cp_c.xu = (floor(x) + (cp_bits == 4 ? 16 : -16))*256 + (cp_c.xu & 255);
    cp_p.x = cp_c.xu/256; cp_p.chaosCoreLastX = cp_p.x;
}
