// Accepted Research 81b8294: execute shipped GML, compare canonical scripts and natural replay.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {lab}=require('./audit_player_state_adapter'),{loadHost,root}=require('./chaos_world_harness');
const cache=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/player-spring-airborne.json')));
let checks=0;function eq(a,b,why){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),why);checks++;}
const h=loadHost(),c=h.ctx;
// Independent interpretation of Research records/control commands (no POC generated opcode arrays).
function referenceFrames(key,strong,updates){const script=cache.state_scripts[key].program;const rows=[...script,...script.flatMap(r=>r.fragment_at_target||[])];const at=new Map(rows.map((r,i)=>[r.at,i]));let ptr=0,loop=0;const out=[];
 while(out.length<updates){const r=rows[ptr];if('record' in r){for(let t=r.record;t>0;t--)out.push([r.frame,t]);ptr++;}
 else if(r.cmd==='FF 00')ptr=0;else if(r.cmd==='FF 08')ptr=strong?at.get(r.target_if_carry):ptr+1;
 else if(r.cmd==='FF 0E'){loop=parseInt(r.args,16);ptr++;}else if(r.cmd==='FF 0F')ptr=--loop?at.get(r.target):ptr+1;else throw Error(r.cmd);}
 return out.slice(0,updates);}
for(const [key,d448,period] of [['0x0B',0,82],['0x0B',255,4],['0x1C',0,48],['0x14',0,24],['0x0E',0,232]]){
 const p=c.SCR_cc_new(100,200);Object.assign(p,{next:parseInt(key,16),d448});const expected=referenceFrames(key,!!(d448&1),period*3);
 for(let u=0;u<expected.length;u++){c.chaos_player_animation_update(p);eq([p.visual_anim.frame,p.visual_anim.counter],expected[u],`${key} update ${u+1}`);}
}
// Same-state launch doesn't reset B or reread D448; branch is evaluated at script restart.
for(const [first,second,period] of [[0,255,82],[255,0,4]]){
 const p=c.SCR_cc_new(0,0);Object.assign(p,{next:11,d448:first,vy:0});c.chaos_player_animation_update(p);
 c.chaos_spring26_launch(p,second===255);const want=referenceFrames('0x0B',!!first,period);
 for(let u=1;u<period;u++){c.chaos_player_animation_update(p);eq([p.visual_anim.frame,p.visual_anim.counter],want[u]);}
 c.chaos_player_animation_update(p);eq(p.visual_anim.frame,second?97:28);eq(p.visual_anim.counter,4);
 p.next=14;c.chaos_player_animation_update(p);eq([p.visual_anim.frame,p.visual_anim.counter],[2,8]);
}
// Accepted emulated open-air movement/facing vectors (the Oracle input becomes effective on update 3).
{
 const f=loadHost();f.isolate();
 for(const vector of cache.free_flight.fixtures){const state=parseInt(vector.state,16),p=f.ctx.SCR_cc_new(512,200);
  Object.assign(p,{state,next:state,move:[9,10,16,27,28].includes(state)?3:1,vx:vector.start_vx,vy:vector.start_vy,bg:0,contacts:0,player_flags:vector.start_facing?16:0,d448:0});
  for(let u=0;u<vector.vx.length;u++){p.held=u<2?0:vector.input==='left'?4:vector.input==='right'?8:0;f.ctx.chaos_player_animation_update(p);p.presentation_counter=p.visual_anim.counter;f.ctx.SCR_cc_tick(p);
   eq([p.vx,p.vy,(p.player_flags>>4)&1],[vector.vx[u],vector.vy[u],vector.facing[u]],`${vector.state} ${vector.input} ${vector.start_vx} update ${u+1}`);}
 }
}
// Natural midair horizontal path: $1C -> $09 -> $0A, including two executing-9 updates.
{
 const fixture=cache.aqz_chains.scenarios.find(s=>s.id==='aqz3_left_diag_horizontal_ceiling'),l=lab('aqz3'),p=l.player(1072,286,{state:14,move:1,bg:0,vy:256,previous:130});
 for(let u=0;u<18;u++){l.h.frame({});const z=p.chaosCore,a=z.visual_anim;const actual=[u+1,z.state,z.next,z.move,a.frame,a.counter,Math.floor(z.xu/256),Math.floor(l.c.chaos_signed_yu(z.yu)/256),z.vx,z.vy,z.d448??0,(z.player_flags>>4)&1,(z.bg>>1)&1];eq(actual,fixture.rows[u].slice(0,13),`horizontal midair ${u+1}`);}
}
// Same executing state 9: the ordinary suffix can replace the spring's 9 request.
for(const [held,want] of [[0,9],[4,7],[8,9]]){
 const f=loadHost(),p=f.ctx.SCR_cc_new(100,100);Object.assign(p,{state:9,next:9,move:2,vx:-512,vy:0,bg:2,contacts:2,held});
 f.ctx.SCR_cc_shared=z=>{f.ctx.SCR_cc_spring(z,1,51);};f.ctx.SCR_cc_tick(p);eq(p.next,want);eq(p.move&2,want===7?0:2);
}
// Spin selector and facing reload timing, all floor speeds and both air input directions.
const frameTable=cache.selector_frame_tables.frame_table_object_type_1.map(x=>parseInt(x,16));
for(const state of [9,10,16,27])for(const floor of [0,2])for(const vx of [-4096,-1025,-1,0,1024,4096])for(const held of [4,8]){
 const p=c.SCR_cc_new(100,100);Object.assign(p,{next:state,bg:floor,vx,held,player_flags:0});let index=0,remaining=0,facing=0;
 for(let u=0;u<120;u++){if(remaining>1)remaining--;else {index=(index+1)%20;remaining=floor?cache.selector_frame_tables.floor_duration_table_8FE0[Math.min(15,Math.abs(vx>>8))]:3;facing=floor?(vx>>8)<0?1:0:held===4?1:0;}
  c.chaos_player_animation_update(p);eq([p.visual_anim.frame,p.visual_anim.counter,(p.player_flags>>4)&1],[frameTable[index],remaining,facing]);}
}
// Weak launch and boss top bounce use one animation program; strong launch is distinct.
for(const strong of [false,true]){const p=c.SCR_cc_new(100,100);p.vy=0;c.chaos_spring26_launch(p,strong);eq([p.next,p.vy,p.d448,p.move&2],[11,strong?-1888:-1280,strong?255:0,0]);c.chaos_player_animation_update(p);eq(p.visual_anim.frame,strong?97:28);}
{const b=c.chaos_boss_new(),p=c.SCR_cc_new(b.xu/256,b.y-48);Object.assign(p,{state:10,next:10,move:3,vy:256,d448:255});c.chaos_boss_contact(b,p,true);eq([p.next,p.vy,p.d448,p.move&2],[11,-1024,0,0]);c.chaos_player_animation_update(p);eq(p.visual_anim.frame,28);}
{const p=h.newPlayer(100,100,{state:10,move:3,vy:256});p.chaosCore.d448=0;c.SCR_chaos_type21_top_bounce(p);eq([p.chaosCore.next,p.chaosCore.vy,p.chaosCore.d448,p.chaosCore.move&2],[11,-1728,255,0]);c.chaos_player_animation_update(p.chaosCore);eq(p.chaosCore.visual_anim.frame,97);}
for(const [kind,tile,state,branch,attack] of [[9,10,11,255,0],[20,55,28,0,2],[20,57,28,0,2]]){const p=c.SCR_cc_new(100,100);Object.assign(p,{state:14,next:14,bg:2,vy:0,zone:4,d448:123});c.SCR_cc_spring(p,kind,tile);eq([p.next,p.d448,p.move&2],[state,branch,attack]);c.chaos_player_animation_update(p);eq(p.visual_anim.frame,kind===9?97:28);}
// Both $3A/$3B profile boundaries with falling/rising velocities and both floor flags.
for(const tile of [58,59])for(const vy of [-1280,0,1280])for(const bg of [0,2])for(const vertical of [0,16,32,64,65,80,96,127])for(let ay=0;ay<32;ay++){
 const p=c.SCR_cc_new(100,100);Object.assign(p,{state:14,next:14,vy,bg,move:1});const allowed=(vertical&63)!==0&&((vertical&63)===32||(vertical&64)!==0)&&(vertical&63)>=ay;
 c.SCR_cc_ceiling_spring(p,{tile,vertical,ay});eq(p.next,allowed?27:14);if(allowed)eq([p.vx,p.vy,p.move],[1024,1408,3]);
}
// Special probe consumes last terrain profile, not sampled tile's own profile.
{const lookup=c.SCR_cc_lookup;for(const counter of [1,2]){const p=c.SCR_cc_new(100,100);Object.assign(p,{state:14,next:14,move:1,vy:256,presentation_counter:counter,terrain_vertical:96});let sample;
 c.SCR_cc_lookup=(x,y)=>{sample=[x,y];return {tile:59,vertical:0,ay:y&31,index:1};};c.SCR_cc_terrain_probe(p);eq(sample,[100,counter&1?102:92]);eq([p.next,p.vx,p.vy,p.move],[27,1024,1408,3]);}c.SCR_cc_lookup=lookup;}
// Natural run: all supplied numeric fields on all 480 updates, plus every spring event.
const oracle=cache.aqz_chains.scenarios.find(s=>s.id==='aqz3_natural_run');const l=lab('aqz3'),p=l.player(110,238,{state:1,move:0,bg:2,previous:l.c.SCR_cc_lookup(110,256,0).flags});l.c.chaos_level_spawn_objects();const rows=[],springEvents=[];
for(let i=0;i<oracle.rows.length;i++){l.events.length=0;l.h.frame({right:i>=2});const z=p.chaosCore,a=z.visual_anim;
 const row=[i+1,z.state,z.next,z.move,a.frame,a.counter,Math.floor(z.xu/256),Math.floor(l.c.chaos_signed_yu(z.yu)/256),z.vx,z.vy,z.d448??0,(z.player_flags>>4)&1,(z.bg>>1)&1];rows.push(row);
 for(let k=0;k<13;k++)eq(row[k],oracle.rows[i][k],`natural update ${i+1} ${oracle.columns[k]}`);
 const launched=l.events.filter(e=>{
  if(e.call==='SCR_cc_ceiling_spring'){const s=e.args[0],v=s.vertical&63;return (s.tile&254)===58&&v!==0&&(v===32||(s.vertical&64)!==0)&&v>=(s.ay&31);}
  return ['SCR_cc_spring','chaos_spring26_launch'].includes(e.call)&&(e.before.next!==e.after.next||e.before.vy!==e.after.vy);
 });
 if(launched.length)springEvents.push({update:i+1,events:launched.map(e=>({call:e.call,state:e.after.next,vx:e.after.vx,vy:e.after.vy}))});
 const expected=oracle.rows[i][13].filter(e=>/^sp_|^set_1B/.test(e));eq(launched.length,expected.length,`spring event count ${i+1}: ${expected}`);
}
eq(springEvents.map(e=>e.update),[125,142,157,174,189,227,265,278,365]);
// Legacy sprite/jump output cannot alter canonical posture or executing animation.
Object.assign(p.chaosCore,{state:11,next:11,d448:0,move:1});l.c.chaos_player_animation_update(p.chaosCore);l.g.playerJump=false;l.g.playerJumpSpring=false;p.sprite_index='poison';l.c.SCR_chaos_core_sprites(p);eq(p.chaosCore.move&2,0);eq(p.image_speed,0);eq(p.sprite_index,l.c.SPR_chaos_aqz_player_frame_1C);
const result={status:'PASS',assertions:checks,natural_updates:rows.length,numeric_fields_per_update:13,springEvents,rows,research:'81b82941e7f44865e0d551484bee82d28d600d43'};
fs.writeFileSync(path.join(root,'build/aqz-p1/followup-e-results.json'),JSON.stringify(result,null,2));console.log(`AQZ E ${checks} assertions PASS; 480 natural updates × 13 fields; 10 canonical spring calls`);
