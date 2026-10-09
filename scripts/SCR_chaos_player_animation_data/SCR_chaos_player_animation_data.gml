// Generated from Research 81b8294 player-spring-airborne.json. Do not edit frame/timing data.
function chaos_player_animation_program(cp_state) { switch (cp_state) {
case 9: return [[5,0,0,33074],[1,0,0,33080]];
case 10: return [[5,0,0,33090],[1,0,0,33096]];
case 11: return [[2,16,0,33098],[3,2,0,33104],[0,4,28,33107],[0,4,29,33111],[0,4,30,33115],[0,4,31,33119],[0,4,32,33123],[0,4,33,33127],[4,2,0,33131],[0,4,28,33135],[0,4,29,33139],[0,6,30,33143],[0,6,31,33147],[0,6,32,33151],[0,8,33,33155],[1,0,0,33159],[0,4,97,33161],[1,0,0,33165]];
case 14: return [[0,8,2,33248],[0,8,3,33252],[0,8,4,33256],[0,8,5,33260],[0,8,6,33264],[0,8,1,33268],[0,8,2,33272],[0,8,3,33276],[0,8,4,33280],[0,8,5,33284],[0,8,6,33288],[0,8,1,33292],[0,8,2,33296],[0,8,3,33300],[0,8,4,33304],[0,8,5,33308],[0,8,6,33312],[0,8,1,33316],[0,8,2,33320],[0,8,3,33324],[0,8,4,33328],[0,8,5,33332],[0,8,6,33336],[0,8,1,33340],[0,8,2,33344],[0,8,3,33348],[0,8,4,33352],[0,8,5,33356],[0,8,6,33360],[1,0,0,33364]];
case 27: return [[5,0,0,33082],[1,0,0,33088]];
case 28: return [[0,8,28,33172],[0,8,29,33176],[0,8,30,33180],[0,8,31,33184],[0,8,32,33188],[0,8,33,33192],[1,0,0,33196]];
case 20: return [[0,4,28,33222],[0,4,29,33226],[0,4,30,33230],[0,4,31,33234],[0,4,32,33238],[0,4,33,33242],[1,0,0,33246]];
case 16: return [[5,0,0,33580],[1,0,0,33586]];
} return []; }
function chaos_player_spin_frames() { return [37, 38, 39, 40, 41, 38, 39, 40, 37, 41, 39, 40, 37, 38, 41, 40, 37, 38, 39, 41]; }
function chaos_player_spin_durations() { return [10, 8, 6, 5, 4, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]; }
function chaos_player_frame_sprite(cp_frame,cp_aqz) { switch (cp_frame) {
case 2: return cp_aqz ? SPR_chaos_aqz_player_frame_02 : SPR_chaos_player_frame_02;
case 3: return cp_aqz ? SPR_chaos_aqz_player_frame_03 : SPR_chaos_player_frame_03;
case 4: return cp_aqz ? SPR_chaos_aqz_player_frame_04 : SPR_chaos_player_frame_04;
case 5: return cp_aqz ? SPR_chaos_aqz_player_frame_05 : SPR_chaos_player_frame_05;
case 6: return cp_aqz ? SPR_chaos_aqz_player_frame_06 : SPR_chaos_player_frame_06;
case 1: return cp_aqz ? SPR_chaos_aqz_player_frame_01 : SPR_chaos_player_frame_01;
case 28: return cp_aqz ? SPR_chaos_aqz_player_frame_1C : SPR_chaos_player_frame_1C;
case 29: return cp_aqz ? SPR_chaos_aqz_player_frame_1D : SPR_chaos_player_frame_1D;
case 30: return cp_aqz ? SPR_chaos_aqz_player_frame_1E : SPR_chaos_player_frame_1E;
case 31: return cp_aqz ? SPR_chaos_aqz_player_frame_1F : SPR_chaos_player_frame_1F;
case 32: return cp_aqz ? SPR_chaos_aqz_player_frame_20 : SPR_chaos_player_frame_20;
case 33: return cp_aqz ? SPR_chaos_aqz_player_frame_21 : SPR_chaos_player_frame_21;
case 97: return cp_aqz ? SPR_chaos_aqz_player_frame_61 : SPR_chaos_player_frame_61;
case 37: return cp_aqz ? SPR_chaos_aqz_player_frame_25 : SPR_chaos_player_frame_25;
case 38: return cp_aqz ? SPR_chaos_aqz_player_frame_26 : SPR_chaos_player_frame_26;
case 39: return cp_aqz ? SPR_chaos_aqz_player_frame_27 : SPR_chaos_player_frame_27;
case 40: return cp_aqz ? SPR_chaos_aqz_player_frame_28 : SPR_chaos_player_frame_28;
case 41: return cp_aqz ? SPR_chaos_aqz_player_frame_29 : SPR_chaos_player_frame_29;
} return -1; }
// Resource identity owns registration, independently of executing/requested state.
function chaos_player_rom_resource(cp_sprite) { switch (cp_sprite) {
case SPR_chaos_player_frame_02:
case SPR_chaos_aqz_player_frame_02:
case SPR_chaos_player_frame_03:
case SPR_chaos_aqz_player_frame_03:
case SPR_chaos_player_frame_04:
case SPR_chaos_aqz_player_frame_04:
case SPR_chaos_player_frame_05:
case SPR_chaos_aqz_player_frame_05:
case SPR_chaos_player_frame_06:
case SPR_chaos_aqz_player_frame_06:
case SPR_chaos_player_frame_01:
case SPR_chaos_aqz_player_frame_01:
case SPR_chaos_player_frame_1C:
case SPR_chaos_aqz_player_frame_1C:
case SPR_chaos_player_frame_1D:
case SPR_chaos_aqz_player_frame_1D:
case SPR_chaos_player_frame_1E:
case SPR_chaos_aqz_player_frame_1E:
case SPR_chaos_player_frame_1F:
case SPR_chaos_aqz_player_frame_1F:
case SPR_chaos_player_frame_20:
case SPR_chaos_aqz_player_frame_20:
case SPR_chaos_player_frame_21:
case SPR_chaos_aqz_player_frame_21:
case SPR_chaos_player_frame_61:
case SPR_chaos_aqz_player_frame_61:
case SPR_chaos_player_frame_25:
case SPR_chaos_aqz_player_frame_25:
case SPR_chaos_player_frame_26:
case SPR_chaos_aqz_player_frame_26:
case SPR_chaos_player_frame_27:
case SPR_chaos_aqz_player_frame_27:
case SPR_chaos_player_frame_28:
case SPR_chaos_aqz_player_frame_28:
case SPR_chaos_player_frame_29:
case SPR_chaos_aqz_player_frame_29:
case SPR_chaos_player_state_11:
case SPR_chaos_aqz_base_chaos_player_state_11: return true;
} return false; }
