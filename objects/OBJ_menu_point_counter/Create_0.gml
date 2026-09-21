/// @description  Center Screen

SCR_screen();

__view_set( e__VW.Object, 0, self );

x = room_width/2;
y = room_height/2;

/// Fade-In Effect

instance_create(0,0,OBJ_effect_fade_in);

/// Stop All Sounds

audio_stop_all();

/// Variables

countTime = true;
countRings = true;

countStart = false;
countStop = false;


///Time to Start Countdown

alarm [0] = 30;

/// Get Points

// Ring Bonus
global.ringBonus = global.ring;

// Time Bonus
if (global.minutes > 4) {global.timeBonus = 0;}
if (global.minutes == 4 && global.seconds < 60) {global.timeBonus = 500;}
if (global.minutes == 3 && global.seconds < 60) {global.timeBonus = 1000;}
if (global.minutes == 2 && global.seconds < 60) {global.timeBonus = 2000;}
if (global.minutes == 1 && global.seconds < 60) {global.timeBonus = 3000;}
if (global.minutes == 1 && global.seconds < 30) {global.timeBonus = 4000;}
if (global.minutes == 0 && global.seconds < 60) {global.timeBonus = 5000;}
if (global.minutes == 0 && global.seconds < 40) {global.timeBonus = 10000;}
if (global.minutes == 0 && global.seconds < 30) {global.timeBonus = 15000;}


