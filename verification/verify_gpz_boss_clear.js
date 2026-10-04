// Shipped player/camera/bonus/completion path. Original results art and MGHZ1
// remain outside the POC; verify the numeric next-zone handoff separately.
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const {loadHost,root}=require('./chaos_world_harness');
const R=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/gpz/boss-51-fullgame.json')));
function run(width,height=192){
 const h=loadHost(),c=h.ctx,g=h.g,w=h.world;
 c.room=c.ROM_chaos_gpz3;w.roomWidth=2560;w.roomHeight=512;w.cam={x:1663-Math.max(0,width-256),y:c.chaos_51_fight_camera_y(width,height),w:width,h:height};w.follow=false;
 c.chaos_level_install_layout();g.minutes=1;g.seconds=0;g.ring=47;g.chaosComplete=false;g.chaosDebugSession=true;g.zoneGoto=3;
 const o=h.create(c.OBJ_chaos_object_51,1728,270),b=o.chaosBoss51;
 const dummy=c.SCR_cc_new(1500,160);dummy.move=0;
 for(let i=0;i<233;i++)c.chaos_51_tick(b,{left:1664,top:96,w:256,h:192},dummy,true);
 b.active=true;b.head.health=1;b.head.requested=13;b.camera_mode=3;
 const player=h.newPlayer(1800,270,{state:1,move:0,bg:2,contacts:2}),p=player.chaosCore;
 p.previous=c.SCR_cc_lookup(1800,288,0).flags;
 c.SCR_chaos_core_sprites(player);
 // First eligible clear: 261 visits after the final-health entry, no timeout.
 let visits=0;while(!b.clear&&visits<270){c.chaos_51_tick(b,{left:w.cam.x,top:w.cam.y,w:width,h:height},p,true);visits++;}
 assert.equal(visits,262);assert.equal(p.next,32);assert.equal(b.head.type,255);
 assert.deepEqual(JSON.parse(JSON.stringify(g.chaosBossNextAct)),{zone:2,act:0});
 assert.equal(b.camera_right,1920);assert.equal(b.camera_bottom,96);assert.equal(g.chaosGoalContact,false);
 const transition={state:p.state,requested:p.next,movement_flags:p.move,player_flags:p.player_flags,
  facing:player.image_xscale,sprite:player.sprite_index,frame:player.image_index};
 const rows=[];let saved=0;c.SCR_save_game=()=>saved++;
 for(let t=0;t<550;t++){
  h.frame({});c.chaos_51_camera_step();
  if(p.act_clear&&!g.chaosComplete)c.chaos_act_complete();
  rows.push({t,state:p.state,next:p.next,animation:p.anim?JSON.parse(JSON.stringify(p.anim)):null,
   sprite:player.sprite_index,frame:player.image_index,movement_flags:p.move,player_flags:p.player_flags,facing:player.image_xscale,
   x:Math.floor(p.xu/256),y:Math.floor(p.yu/256),camera:[w.cam.x,w.cam.y],clear_dx:p.clear_dx,clear:p.act_clear,overlay:g.chaosComplete,sparkles:b.spawns.filter(s=>s[1]===10&&s[2]===255).length});
  if(p.act_clear)break;
 }
 assert.equal(rows[0].state,32);assert.equal(rows[0].y,270,'grounded state-$20 handoff');
 assert.equal(rows.at(-1).clear,true,'shared state $20 clear flag');assert.equal(rows.at(-1).overlay,true);
 assert.equal(rows.at(-1).camera[0],1919,'exclusive world right limit');assert.equal(rows.at(-1).camera[1],c.chaos_51_fight_camera_y(width,height));
 assert.equal(rows.at(-1).clear_dx,width+33);assert(rows.at(-1).sparkles>0,'approved $0A trail');
 assert.equal(saved,0,'debug sessions never save progression');assert.equal(g.zoneGoto,3);
 assert.equal(g.chaosFinishTime,60);assert.equal(g.chaosBossBonus.steps,c.chaos_boss_bonus(60,47).steps);
 return {width,height,visits,transition,rows,destination:g.chaosBossNextAct};
}
const traces=[run(256),run(640),run(348,196)];
const marks=Object.fromEntries(R.marks.map(m=>[m.name,m]));
assert(marks.floor_clear_gate.frame<marks.state_20_handler_sets_D293_bit4_or_5.frame);
assert(marks.call_32F9_results_screen.frame<marks.level_load_requested_15DE.frame);
assert.deepEqual([R.rows.at(-1).zone,R.rows.at(-1).act],[2,0]);
assert(R.rows.filter(r=>r.zone===1).every(r=>r.timer_running===255));
fs.writeFileSync(path.join(root,'build/gpz-boss/poc-clear.json'),JSON.stringify(traces,null,2));
console.log('GPZ $51 clear: grounded gate, 256/640 camera release, bonus/sparkles, shared completion and MGHZ1 numeric handoff PASS');
