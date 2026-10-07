// Execute shipped menu events through SCR_buttons with all keyboard input off.
// Engine room teardown/rendering remain Windows acceptance boundaries.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),rd=p=>fs.readFileSync(path.join(root,p),'utf8');
let pressed=new Set(),next,activations=0,resumes=0,saves=0,transitions=0,checks=0;
const g={chaosComplete:false,ring:12,zoneGoto:1};
const c=vm.createContext({global:g,noone:-4,room:1,ROM_menu_title:90,ROM_menu_options:91,ROM_menu_data_select:92,ROM_chaos_debug_select:93,ROM_menu_game_over:94,
 OBJ_effect_fade_out:10,OBJ_effect_fade_in:11,c_white:0,c_yellow_dark:1,
 keyboard_check:()=>false,keyboard_check_pressed:()=>false,keyboard_check_released:()=>false,
 gamepad_button_check:(_,k)=>pressed.has(k),gamepad_button_check_pressed:(_,k)=>pressed.has(k),gamepad_button_check_released:()=>false,
 ord:s=>s,instance_create:()=>{},instance_destroy:()=>{},instance_activate_all:()=>activations++,audio_stop_all:()=>{},audio_resume_all:()=>resumes++,
 room_goto:r=>{next=r;transitions++;},room_exists:()=>true,variable_global_exists:k=>k in g,
 chaos_act_index_for_room:()=>1,chaos_act_progress:(_,a)=>a+1,SCR_save_game:()=>saves++});
for(const k of ['left','right','up','down','space','enter','escape','f10'])c['vk_'+k]=k;
for(const k of ['padl','padr','padu','padd','face1','face2','start'])c['gp_'+k]=k;
vm.runInContext(rd('scripts/SCR_buttons/SCR_buttons.gml'),c);
vm.runInContext(rd('scripts/SCR_chaos_debug_select/SCR_chaos_debug_select.gml'),c);
const level=rd('scripts/SCR_chaos_level/SCR_chaos_level.gml');
vm.runInContext(level.slice(level.indexOf('function chaos_act_complete()'),level.indexOf('/// Type $18 contact')),c);
function event(o,p){c.o=o;vm.runInContext('(function(){with(o){'+rd(p).replace(/\bexit;/g,'return;').replace(/\bmod\b/g,'%')+'}})()',c);}
function eq(a,b){assert.equal(a,b);checks++;}
function title(i=1){return {option:i,optionLimit:3,press:false,alarm:[],c_yellow_dark:1};}
function pause(i=1){return {...title(i),fade:'out',alpha:1,pause:true,press_up:0,press_down:0,press_action:0};}
for(const kind of ['title','pause'])for(let i=1;i<=3;i++)for(const dir of ['padu','padd']){
 const o=kind==='title'?title(i):pause(i);pressed=new Set([dir]);event(o,'objects/OBJ_'+(kind==='title'?'menu_title_options':'pause')+'/Step_0.gml');
 eq(o.option,dir==='padu'?(i===1?3:i-1):(i===3?1:i+1));
}
for(let i=1;i<=3;i++){
 let o=title(i);pressed=new Set(['face1']);event(o,'objects/OBJ_menu_title_options/Step_0.gml');eq(o.alarm[i===1?1:2],30);
 pressed=new Set(['padd']);event(o,'objects/OBJ_menu_title_options/Step_0.gml');eq(o.option,i);
 event(o,'objects/OBJ_menu_title_options/Alarm_'+(i===1?1:2)+'.gml');eq(next,[92,93,91][i-1]);
}
let o=pause();pressed=new Set(['face1']);event(o,'objects/OBJ_pause/Step_0.gml');eq(o.fade,'in');eq(resumes,1);
o=pause(2);event(o,'objects/OBJ_pause/Step_0.gml');eq(next,93);eq(g.chaosDebugSession,true);assert(activations>=2);checks++;
o=pause(3);event(o,'objects/OBJ_pause/Step_0.gml');eq(o.alarm[1],8);event(o,'objects/OBJ_pause/Alarm_1.gml');eq(next,90);
// Selector action/Start launch; face2 cancels, without keyboard.
c.floor=Math.floor;c.array_length=a=>a.length;
const entries=[{enabled:true,room:1}],selector={selected:0,entries,message:''};
// Use the real 21-entry shape but a stub table, isolating selector input from zone loading.
selector.entries=Array.from({length:21},()=>entries[0]);
for(const key of ['face1','start']){pressed=new Set([key]);event(selector,'objects/OBJ_chaos_debug_select/Step_0.gml');eq(next,1);eq(g.chaosDebugReturnTicks,-1);}
pressed=new Set(['face2']);event(selector,'objects/OBJ_chaos_debug_select/Step_0.gml');eq(next,90);
g.chaosComplete=false;g.chaosDebugSession=true;c.chaos_act_complete();eq(g.chaosDebugReturnTicks,90);eq(g.zoneGoto,1);eq(saves,0);
for(let i=0;i<89;i++)eq(c.chaos_debug_return_tick(),false);
c.chaos_act_complete();eq(g.chaosDebugReturnTicks,1);const before=transitions;
eq(c.chaos_debug_return_tick(),true);eq(next,93);eq(transitions,before+1);
c.chaos_act_complete();for(let i=0;i<100;i++)eq(c.chaos_debug_return_tick(),false);eq(transitions,before+1);
// Real no-lives death alarm -> Game Over's unchanged 90-tick alarm -> Title.
g.life=0;event({},'objects/OBJ_player_death/Alarm_1.gml');eq(next,94);
assert(rd('objects/OBJ_menu_game_over/Create_0.gml').includes('alarm[0] = 90;'));checks++;
event({},'objects/OBJ_menu_game_over/Alarm_0.gml');eq(next,90);
const system=rd('objects/OBJ_system/Create_0.gml');vm.runInContext(system.slice(0,system.indexOf('// Settings')),c);eq(g.chaosDebugSession,false);eq(g.chaosDebugReturnTicks,-1);
g.chaosComplete=false;c.chaos_act_complete();eq(g.zoneGoto,2);eq(saves,1);eq(c.chaos_debug_return_tick(),false);
for(const p of ['objects/OBJ_menu_title_options/Step_0.gml','objects/OBJ_chaos_controls/Step_0.gml']){assert(rd(p).includes('keyboard_check_pressed(vk_f10)'));checks++;}
assert(rd('objects/OBJ_chaos_controls/Step_0.gml').includes('chaos_in_level() && chaos_debug_return_tick()'));checks++;
assert(rd('objects/OBJ_virtual_controller/Step_0.gml').includes('global.btStartPress'));checks++;
console.log('PORTABLE NAVIGATION PASS: '+checks+' assertions; controller abstraction only, engine boundaries mocked.');
