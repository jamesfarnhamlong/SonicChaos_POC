// Runs shipped GML against Research's original ordered-slot oracle.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {loadHost,root}=require('./chaos_world_harness');
const R=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/gpz/boss-51-runtime.json')));
const h=loadHost(),c=h.ctx,g=h.g;let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const vp={left:1664,top:96,w:256,h:192};
function snap(b,tick){return {tick,slots:b.slots.filter(s=>s.type>0&&s.type!==255).map(s=>({slot:s.slot,type:s.type,parameter:s.parameter,state:s.state,requested_state:s.requested,frame:s.frame,timer:s.timer,x:c.chaos_51_x(s),y:c.chaos_51_y(s),vx:s.vx,vy:s.vy,lower_support:s.lower,upper_predecessor:s.upper,phase:s.phase,phase_counter:s.phase_counter,mode:s.mode,health:s.health,mux:s.mux,extent:[s.ex,s.ey]}))};}
function boss(y=160,x=1500){const b=c.chaos_51_new(),p=c.SCR_cc_new(x,y);p.move=0;p.state=p.next=5;return {b,p};}
function step(b,p){c.chaos_51_tick(b,vp,p,true);}
const runs={};
for(const [name,x,y] of [['mode0_left',1500,64],['mode1_left',1500,160],['mode2_left',1500,256],['mode1_right',2200,160]]){
 const {b,p}=boss(y,x),rows=[];
 for(let t=0;t<1000;t++){
  step(b,p);const actual=snap(b,t);rows.push(actual);
  const expected=R.cycles[name].rows?.[t]||R.cycles[name].events.find(v=>v.tick===t);
  if(expected){
   const aa=actual.slots.filter(s=>s.type===81),ee=expected.slots.filter(s=>s.type===81);
   eq(aa.length,ee.length,`${name} tick${t} slot count`);
   for(let i=0;i<aa.length;i++)for(const k of Object.keys(aa[i]))eq(aa[i][k],ee[i][k],`${name} tick${t} slot${aa[i].slot.toString(16)} ${k}`);
  }
 }
 runs[name]=rows;
}
fs.mkdirSync(path.join(root,'build/gpz-boss'),{recursive:true});
fs.writeFileSync(path.join(root,'build/gpz-boss/poc-cycles.json'),JSON.stringify(runs));
// Exact low-byte mode selection (including wrap at 0..15), not world bands.
for(let y=0;y<256;y++){
 const {b,p}=boss(y);step(b,p);const q=(y-16)&255,mode=q<128?0:q>=224?2:1;
 eq([b.head.mode,b.head.health],[mode,[5,8,10][mode]],`Ylow${y}`);
}
// $12's canonical parity-controlled SAT slide in the supplied control fixture.
{const {b,p}=boss();for(let t=0;t<131;t++){
 step(b,p);const actual=b.slots.filter(s=>s.type===18),expected=R.cycles.mode1_left.rows[t].slots.filter(s=>s.type===18);
 eq(actual.length,expected.length,`HUD live ${t}`);for(let i=0;i<actual.length;i++)eq([actual[i].slot,actual[i].state,actual[i].requested,actual[i].frame,actual[i].timer],[expected[i].slot,expected[i].state,expected[i].requested_state,expected[i].frame,expected[i].timer],`HUD script${t}`);
}}
// Ordinary mapped scan owns creation. Outer band starts the intro while still
// outside wake; an initially absent placement scans only every fourth update.
{const a=loadHost(),q=a.ctx,z=a.world;q.room=q.ROM_chaos_gpz3;z.follow=false;z.cam={x:1300,y:96,w:256,h:192};a.newPlayer(1450,270,{state:1,move:0});
 const o=a.create(q.OBJ_chaos_object_51,1728,270);q.chaos_51_runtime_phase();eq(o.chaosBoss51.active,false);
 z.cam.x=1408;eq(q.SCR_chaos_spawn_cell(q.chaos_vp_current(),1728,270),2);
 for(let i=0;i<3;i++){q.chaos_51_runtime_phase();eq(o.chaosBoss51.active,false);}
 q.chaos_51_runtime_phase();eq(o.chaosBoss51.active,true);eq(o.chaosBoss51.head.health,10);
}
// Geometry and five-slot mux, including state $0F's wider Sonic extent.
for(const state of [5,15])for(let dx=-23;dx<=23;dx++)for(let dy=-35;dy<=27;dy++){
 const {b,p}=boss(270+dy,1856+dx),s=b.head;s.xu=1856*256;s.yu=270*256;s.ex=12;s.ey=32;b.head.mux=4;p.state=state;
 const bits=c.chaos_51_contact(b,s,p,true,false),ex=state===15?9:8;
 const penh=ex+12-Math.abs(dx),penv=dy>=0?24-dy:32+dy;
 const want=penh<0||penv<0?0:penh<penv?(dx>=0?4:8):(dy>=0?2:1);
 eq(bits,want,`geometry${state}:${dx},${dy}`);
}
for(const v of R.contacts.mux){
 const {b,p}=boss(260,1856);const s=c.chaos_51_slot(0xD700+64*v.parameter,81,v.parameter,1856,270);s.ex=12;s.ey=32;b.head.mux=v.start;
 const bits=c.chaos_51_contact(b,s,p,true,false);eq(b.head.mux,v.end);eq(bits,v.contact);
}
const points={top:[0,-31],below:[0,23],left:[-19,0],right:[19,0],center:[0,0],outside_x:[21,0],outside_y:[0,-33]};
function contactSetup(v,detached=false){
 const [dx,dy]=points[v.region],{b,p}=boss(270+dy,1856+dx);
 p.move=v.flags;p.state=p.next=5;p.vx=128;p.vy=256;p.rings=47;p.immune=v.power===6;p.invuln=v.flags&128?120:0;p.bg=p.contacts=2;
 const s=detached?c.chaos_51_slot(0xD740,81,1,1856,270):b.head;
 s.xu=1856*256;s.yu=270*256;s.ex=12;s.ey=32;s.state=s.requested=detached?11:7;s.health=8;
 return {b,p,s};
}
for(const v of R.contacts.attached_cases){
 const {b,p,s}=contactSetup(v);s.parameter=v.parameter;b.head.mux=v.parameter===0?4:v.parameter;
 const bits=c.chaos_51_contact(b,s,p,true,false);eq(bits,v.contact.bits);
 eq(p.vx,v.before_consumer.vx);eq(p.vy,v.before_consumer.vy);
 c.chaos_contact_promote(p);c.SCR_cc_damage_gate(p);
 for(const [k,r] of [['vx','vx'],['vy','vy'],['next','requested'],['rings','rings']])eq(p[k],k==='rings' ? ((v.after_consumer[r]>>4)*10+(v.after_consumer[r]&15)) : v.after_consumer[r]);
}
for(const v of R.contacts.detached_cases){
 const {b,p,s}=contactSetup(v,true);c.chaos_51_contact(b,s,p,true,true);
 eq(p.stage_request,v.before_consumer.damage);c.chaos_contact_promote(p);c.SCR_cc_damage_gate(p);
 for(const [k,r] of [['vx','vx'],['vy','vy'],['next','requested'],['rings','rings']])eq(p[k],k==='rings' ? ((v.after_consumer[r]>>4)*10+(v.after_consumer[r]&15)) : v.after_consumer[r]);
}
function settled(){const {b,p}=boss();for(let t=0;t<233;t++)step(b,p);return {b,p};}
for(const v of R.head_hits.cases){
 const {b,p}=settled();b.head.mux=v.mux;
 // Predict the live follow anchor without consuming the actual phase update.
 const saved=JSON.parse(JSON.stringify(b));c.chaos_51_follow(saved,saved.head);
 const [dx,dy]=points[v.region];p.xu=(c.chaos_51_x(saved.head)+dx)*256;p.yu=(c.chaos_51_y(saved.head)+dy)*256;
 p.move=v.flags;p.immune=v.power===6;p.invuln=v.flags&128?120:0;p.vx=128;p.vy=v.incoming_vy;p.rings=47;
 c.chaos_51_callback(b,b.head,0x9E29,p,true);
 eq(b.head.requested,v.contact.requested);eq(b.head.health,v.contact.head_health);
 eq(p.vx,v.player.vx);eq(p.vy,v.player.vy);
 c.chaos_contact_promote(p);c.SCR_cc_damage_gate(p);eq(p.vy,v.after_consumer.vy);
}
// Reaction records, health-entry ordering, fast sway and continuing mux.
{const {b,p}=settled();b.head.requested=13;
 for(const v of R.head_hits.reaction_rows){step(b,p);const a=snap(b,v.tick).slots.filter(s=>s.type===81),e=v.slots.filter(s=>s.type===81);
  eq(a.length,e.length);for(let i=0;i<a.length;i++)for(const k of Object.keys(a[i]))eq(a[i][k],e[i][k],`reaction ${v.tick} ${k}`);
 }}
for(const v of R.head_hits.health_decrements){const {b,p}=settled();b.head.health=v.before;b.head.requested=13;step(b,p);eq([b.head.health,b.head.state,b.head.requested],[v.after,v.state,v.requested]);}
for(const v of R.head_hits.recontacts){
 const {b,p}=settled();b.head.requested=13;b.head.mux=v.start_mux;
 for(const row of v.rows){
  const saved=JSON.parse(JSON.stringify(b));c.chaos_51_follow(saved,saved.head);
  p.xu=(c.chaos_51_x(saved.head)-19)*256;p.yu=c.chaos_51_y(saved.head)*256;p.move=2;
  step(b,p);eq([b.head.state,b.head.requested,b.head.health,b.head.mux],[row.state,row.requested,row.health,row.mux],`recontact${v.start_mux}:${row.tick}`);
 }
}
for(const v of R.throw_sweep){const {b,p}=boss(100,v.player_x);const s=c.chaos_51_slot(0xD700+64*v.parameter,81,v.parameter,1800,270);s.state=s.requested=10;s.phase=v.phase_before;s.accel=2;b.head.state=7;b.head.mode=v.mode;
 c.chaos_51_callback(b,s,0x9F4E,p,true);eq([s.phase,s.requested],[v.phase_after,v.requested]);}
for(const v of R.boundaries.detached_removal_sweep){const {b,p}=boss(100,1500);const s=c.chaos_51_slot(0xD740,81,v.parameter,v.x_before,270);s.state=s.requested=11;b.head.state=7;
 c.chaos_51_callback(b,s,v.callback,p,true);eq([c.chaos_51_x(s),s.type],[v.x_after,v.type]);}
for(const v of R.boundaries.camera_ready_sweep){const {b,p}=boss();b.camera_x=v.camera[0];b.camera_y=v.camera[1];b.head.timer=224;
 c.chaos_51_callback(b,b.head,0x9AF7,p,true);eq(b.head.timer,v.timer);eq(b.head.pc,v.script);}
for(const v of R.boundaries.floor_gate_sweep){const {b,p}=boss();p.contacts=v.floor_flags;b.camera_x=1664;c.chaos_51_callback(b,b.head,0x9D26,p,true);
 eq(b.head.type,v.type);eq(p.next,v.requested);if(v.type===255)eq([b.camera_left,b.camera_right,b.camera_bottom],v.limits);}
// Final hit: sequential upper-state cascade and exact head/segment puff births.
{const {b,p}=settled();b.head.health=1;b.head.requested=13;
 for(const row of R.defeat.rows){p.contacts=row.tick>=290?2:0;step(b,p);
  const a=snap(b,row.tick).slots.filter(s=>s.type===81),e=row.slots.filter(s=>s.type===81);eq(a.length,e.length,`defeat${row.tick}`);
  for(let i=0;i<a.length;i++)for(const k of Object.keys(a[i]))eq(a[i][k],e[i][k],`defeat${row.tick}:${k}`);
 }
 eq(b.spawns.filter(s=>s[1]===52&&s[2]===8).map(s=>s.slice(0,5)),[[234,52,8,c.chaos_51_x(b.head)-8,c.chaos_51_y(b.head)],[235,52,8,c.chaos_51_x(b.head)+8,c.chaos_51_y(b.head)],[236,52,8,c.chaos_51_x(b.head),c.chaos_51_y(b.head)-16],[237,52,8,c.chaos_51_x(b.head)-8,c.chaos_51_y(b.head)-24],[238,52,8,c.chaos_51_x(b.head)-8,c.chaos_51_y(b.head)-24]]);
 let prev={},births=[];
 for(const row of R.defeat.rows){const now={};for(const s of row.slots){now[s.slot]=s;if(s.type===52&&prev[s.slot]?.type!==52)births.push([row.tick+233,52,s.parameter,s.x,s.y,s.slot]);}prev=now;}
 eq(b.spawns.filter(s=>s[1]===52),births,'original dynamic-slot exhaustion and all successful puff births');
 eq(b.spawns.some(s=>s[1]===15),false,'no $0F boss conversion');eq(b.clear,true);eq(p.next,32);
}
console.log('GPZ $51 runtime parity:',checks,'checks');
