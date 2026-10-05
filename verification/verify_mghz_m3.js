// Executes shipped GML, locks original Z80 routine fixtures directly.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {loadHost,root}=require('./chaos_world_harness');
const D=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/mghz/object-24-2e.json')));
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;
let checks=0,last=0;const sections={};
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const ok=(a,m)=>{assert.ok(a,m);checks++;};
const section=n=>{sections[n]=checks-last;last=checks;};
const out=path.join(root,'verification/mghz-m3');fs.mkdirSync(out,{recursive:true});
const sheet={hazard:[],children:[]};
function level(act=1){h.reset();c.room=c[`ROM_chaos_mghz${act}`];c.chaos_level_install_layout();g.chaosM3=c.chaos_m3_new();g.score=0;}
function slot(t=0x24,p=1,x=456,y=112,token=26){return c.chaos_m3_slot(t,p,x,y,token);}
function player(x=412,y=300,state=1,move=0){return Object.assign(c.SCR_cc_new(x,y),{state,next:state,move,rings:10});}
const vp=(x=328,y=0,width=256)=>c.chaos_vp_new(x,y,width,192);
function canonicalRow(r){return [r.index_1based,r.world_x,r.world_y,parseInt(r.type,16),parseInt(r.flags,16),parseInt(r.parameter,16),parseInt(r.aux0,16),parseInt(r.aux1,16)];}
function fixtureRow(s,n){return [n,s.state,s.requested,s.frame,Math.floor(s.xu/256),s.xu&255,Math.floor(s.yu/256),s.yu&255,s.vx,s.vy];}
// Placements are the generic importer rows; the M3 runtime consumes exact aux1.
for(const act of [1,2,3]){
 level(act);c.chaos_level_spawn_objects();
 const rows=c.chaos_level_object_rows().filter(r=>[0x24,0x2e].includes(r[3]));
 const wanted=D.placements.records.filter(r=>r.act===`mghz${act}`).map(canonicalRow);
 eq(rows.map(r=>r.slice(0,8)),wanted,`MGHZ${act} canonical placements`);
 eq(g.chaosM3.records.filter(r=>[0x24,0x2e].includes(r.row[3])).map(r=>r.row.slice(0,8)),wanted,'runtime importer');
 for(const t of [0x56,0x57,0x58,0x2d]) eq(g.chaosSpawnedByType[t],0,'excluded/unused type');
}
section('placements/scope');
// Trigger boundaries are the cache sweep intervals, including the exact speed extremes.
level();const trigger=D.object_24.trigger['mghz1:26'];
for(let dx=-60;dx<=60;dx++)for(const speed of [-32768,-256,-255,0,255,256,32767])for(const y of [-120,240]){
 const s=slot(),p=player(456+dx,y);s.asleep=false;p.vx=speed;
 eq(c.chaos_m3_trigger24(s,p),dx>=trigger.dx_that_fire_vx0[0]&&dx<=trigger.dx_that_fire_vx0[1]&&speed>=trigger.vx_that_fire_dx0[0]&&speed<=trigger.vx_that_fire_dx0[1],'trigger/speed/Y sweep');
}
for(const [key,want] of Object.entries(trigger.corner_cases)){
 const [dx,speed]=key.match(/-?\d+/g).map(Number);const s=slot(),p=player(456+dx);s.asleep=false;p.vx=speed;
 eq(c.chaos_m3_trigger24(s,p),want,key);
}
for(let state=0;state<=0x22;state++)for(const move of [0,1,2,3,64,128]){
 const s=slot();s.asleep=false;eq(c.chaos_m3_trigger24(s,player(456,500,state,move)),true,'no player-state gate');
 s.asleep=true;eq(c.chaos_m3_trigger24(s,player(456,112,state,move)),false,'asleep trigger disabled');
}
section('trigger/speed/state');
// Every controlled animation/movement row from both parameters (not a duration clone).
for(const param of [0,1]){
 const b=c.chaos_m3_new(),s=slot(0x24,param,param===1?456:472),p=player(464,300);
 s.state=s.requested=1;s.asleep=false;
 const trace=D.object_24.shake_and_fall_templates_by_parameter[param].rows_from_trigger;
 for(const want of trace){c.chaos_m3_step24(b,s,p,true);eq(fixtureRow(s,want[0]),want,'exact shake/fall fixture');
  if(param===1&&[0,1,3,17,18,23].includes(want[0]))sheet.hazard.push({pass:want[0],type:s.type,frame:s.frame,x:s.xu/256,y:s.yu/256});}
}
// All twelve original landing fixtures, their fraction bytes, 56 falls and +10.
for(const f of D.object_24.landing_table_controlled){
 level(Number(f.act.at(-1)));const b=c.chaos_m3_new(),s=slot(0x24,f.parameter,f.x,f.y,f.index_1based),p=player(f.x-40,f.y+100);
 s.state=s.requested=1;s.asleep=false;c.chaos_m3_record(b,canonicalRow(D.placements.records.find(r=>r.act===f.act&&r.index_1based===f.index_1based)),c.noone);
 let pass=0;while(s.type===0x24&&pass<100){c.chaos_m3_step24(b,s,p,true);pass++;
  if(f.index_1based===26&&f.act==='mghz1'&&pass===73)sheet.hazard.push({pass:72,type:s.type,frame:s.frame,x:s.xu/256,y:s.yu/256});}
 eq(pass-18,f.fall_updates_to_conversion,'56 falling passes');
 eq([s.type,c.chaos_m3_x(s),c.chaos_m3_y(s)],[f.slot_after_conversion.type,f.slot_after_conversion.x,f.slot_after_conversion.y],'exact landing');
 eq([s.xu&255,s.yu&255,s.vy],[f.model.x_frac,f.model.y_frac,f.model.vy_8_8],'fixed point landing');
 eq([b.score,s.token,b.records[0].consumed],[10,0,true],'score +10 and permanent placement consume');
 if(f.index_1based===26&&f.act==='mghz1')sheet.hazard.push({pass:73,type:s.type,frame:s.frame,x:s.xu/256,y:s.yu/256});
}
// Terrain header gate: one-way and solid stop; slopes and other flags do not.
level();const cell=7*g.chaosMapWidth+14,save=g.chaosTileIds[cell];
for(const flags of [0,1,0x1b,0x20,0x40,0x80,0xc0]){
 const saved=g.chaosHeaders0[save][0];g.chaosHeaders0[save][0]=flags;
 const b=c.chaos_m3_new(),s=slot(0x24,0,456,206);s.state=s.requested=3;s.asleep=false;s.vx=128;
 c.chaos_m3_step24(b,s,player(),false);eq(s.type,(flags&0xc0)?15:36,'terrain header-only conversion');
 g.chaosHeaders0[save][0]=saved;
}
eq(c.chaos_m3_terrain(-1,224),0,'outside map air');eq(c.chaos_m3_terrain(4096,224),0,'outside map air');
section('shake/fall/terrain/conversion');
// Contact skipped on T+17, even if sleeping; then fall uses ordinary wrapper.
level();{
 const b=c.chaos_m3_new(),s=slot(),p=player(456,112,10,3);s.state=s.requested=2;s.tick=16;s.asleep=true;
 c.chaos_m3_step24(b,s,p,true);eq([s.frame,s.requested,s.vx,s.vy,p.stage_request],[3,3,-128,0,0],'final shake pass has no contact/motion');
 s.asleep=false;c.chaos_m3_step24(b,s,p,true);eq(p.stage_request,255,'first falling pass contacts');
 b.score_disabled=true;s.yu=206*256;s.xu=456*256;s.vy=0;c.chaos_m3_step24(b,s,p,true);
 eq([s.type,b.score],[15,0],'$D292 disabled score still converts');
}
section('last shake callback/disabled score');
// Direct cache geometry grid: 24,990 original controlled cases.
const contact=D.object_24.contact;
for(const [name,f] of Object.entries(contact.variants)){
 const state=name==='state_0F_9x24'?15:1,move=name==='attack_bit1'?2:name==='player_bit6'?64:name==='player_bit7_blink'?128:0;
 for(let dx=contact.grid.dx[0];dx<=contact.grid.dx[1];dx++)for(let dy=contact.grid.dy[0];dy<=contact.grid.dy[1];dy++){
  const s=slot(),p=player(456+dx,112+dy,state,move);p.immune=name==='invincible_d532_6';
  const hit=f.hit_rects_dx0_dx1_dy0_dy1.some(([x0,x1,y0,y1])=>dx>=x0&&dx<=x1&&dy>=y0&&dy<=y1);
  eq(c.chaos_m3_contact24(s,p)!==0,hit,name+' contact');eq(p.stage_request,hit?255:0,'shared $0434 request');
 }
}
// All posture contacts feed the shared damage path; no rebound, defeat, cooldown.
for(const [state,move] of [[1,0],[9,2],[10,3],[11,1],[17,0],[18,2]])for(const dy of [-11,0,24]){
 const s=slot(),p=player(456,112+dy,state,move);p.vy=77;p.vx=99;
 c.chaos_m3_contact24(s,p);c.chaos_contact_promote(p);eq(c.SCR_cc_damage_gate(p),true,'all postures hurt');
 eq(s.type,36,'cannot defeat $24');eq(p.next,30,'ordinary hurt state');
 eq([p.vy,p.vx],[-1024,-256],'hurt movement, no contact rebound');
}
for(const mode of ['invincible','blink','hurt']){
 const s=slot(),p=player(456,112,10,mode==='hurt'?64:mode==='blink'?130:2);p.vy=77;p.invuln=120;p.immune=mode==='invincible';
 c.chaos_m3_contact24(s,p);c.chaos_contact_promote(p);eq(c.SCR_cc_damage_gate(p),false,mode+' gate');
 eq([p.rings,p.vy,s.type],[10,77,36],mode+' no hurt/rebound/defeat');
 if(mode==='blink')eq(p.damage_request,255,'blink holds request');
}
const sNoCooldown=slot(),pNoCooldown=player(456,112);for(let n=0;n<10;n++){pNoCooldown.stage_request=0;c.chaos_m3_contact24(sNoCooldown,pNoCooldown);eq(pNoCooldown.stage_request,255,'no hit cooldown');}
section('contact geometry/postures/gates');
// Canonical lifecycle updates after callbacks: state zero does not wake; asleep falls freeze.
level();let b=c.chaos_m3_new();const row=canonicalRow(D.placements.records[0]);c.chaos_m3_record(b,row,c.noone);
let p=player(412,300),view=vp();
c.chaos_m3_phase(b,p,true,view);let s=b.slots[7];eq([s.state,s.requested,s.asleep],[0,1,true],'created asleep/init');
c.chaos_m3_phase(b,p,true,view);eq([s.requested,s.asleep],[1,false],'wake after callback');
c.chaos_m3_phase(b,p,true,view);eq(s.requested,2,'first awake trigger');
for(let i=0;i<37;i++)c.chaos_m3_phase(b,p,true,view);
view=vp(c.chaos_m3_x(s)+40);c.chaos_m3_phase(b,p,true,view);eq(s.asleep,true,'sleep band');
let frozen=[s.xu,s.yu,s.vy];for(let i=0;i<7;i++)c.chaos_m3_phase(b,p,true,view);eq([s.xu,s.yu,s.vy],frozen,'airborne freeze');
view=vp(c.chaos_m3_x(s)+100);c.chaos_m3_phase(b,p,true,view);eq(s.type,254,'placement removal FE');
c.chaos_m3_phase(b,p,true,view);eq(s.type,255,'second pass FF');
c.chaos_m3_phase(b,p,true,view);eq(b.records[0].occupied,false,'released occupancy');
view=vp(128);for(let i=0;i<8;i++)c.chaos_m3_phase(b,p,true,view);s=b.slots.find(o=>o.type===36);
ok(s,'recreate in canonical outer ring');eq([s.xu,s.yu,s.requested],[456*256,112*256,1],'fresh origin after removal');
// Post-awake retention is existing adapter only; initial entry must not use retention.
for(const width of [256,348,640]){
 b=c.chaos_m3_new();c.chaos_m3_record(b,row,c.noone);
 view=vp(556,0,width);for(let i=0;i<8;i++)c.chaos_m3_phase(b,p,true,view);eq(b.slots.filter(o=>o.type===36).length,0,'no initial retention extension');
 b=c.chaos_m3_new();s=slot();b.slots[7]=s;s.state=s.requested=3;s.woken=true;s.asleep=false;
 view=vp(556,0,width);c.chaos_m3_phase(b,p,false,view);eq(s.type,width===256?254:36,'post-awake deletion retention');
}
// Shared $0F: saved conversion frame, two blank passes, then accepted frame timeline.
level();b=c.chaos_m3_new();s=slot();s.type=15;s.converted=true;s.frame=2;s.asleep=false;b.slots[7]=s;
const smoke=D.object_24.replacement_effect_0F['post_conversion_runs_[frame_index,count]'];
const expected=smoke.flatMap(([f,n])=>Array(n).fill(f));eq(s.frame,expected[0],'conversion keeps frame');
for(let n=1;n<expected.length;n++){c.chaos_m3_phase(b,p,false,vp());eq(s.frame,expected[n],'shared $0F frame fixture');
 if([1,3,7,11].includes(n))sheet.hazard.push({pass:73+n,type:15,frame:s.frame,x:428,y:208});}
eq(g.chaosLastSoundRequest,0xc4,'$0F sound request');c.chaos_m3_phase(b,p,false,vp());c.chaos_m3_phase(b,p,false,vp());eq(b.slots[7].type,0,'41-pass shared conversion lifetime');
b=c.chaos_m3_new();c.chaos_m3_record(b,row,c.noone);b.records[0].consumed=true;for(let i=0;i<100;i++)c.chaos_m3_phase(b,p,true,vp());eq(b.slots.filter(o=>o.type!==0).length,0,'post-conversion persists across backtracking');
section('lifecycle/retention/shared 0F');
// $2E strips: every X/Y boundary from both recovered bands, all player postures irrelevant.
for(const r of D.placements.records.filter(r=>r.type==='0x2E')){
 const s=slot(0x2e,0,r.world_x,r.world_y,r.index_1based);s.aux1=parseInt(r.aux1,16);
 for(let dx=-12;dx<=s.aux1*16+12;dx++)for(let dy=-8;dy<=8;dy++)
  eq(c.chaos_m3_strip(s,player(r.world_x+dx,r.world_y+dy)),dx>0&&dx<=s.aux1*16&&Math.abs(dy)<=2,'left-open right-closed ±2 strip');
 for(const state of [1,9,10,11,15,17,18,30])for(const move of [0,1,2,64,128]){
  const p=player(r.world_x+40,r.world_y,state,move),b=c.chaos_m3_new();
  c.chaos_m3_step2e(b,s,p,true);c.chaos_m3_step2e(b,s,p,true);eq(s.requested,2,'no posture/speed gate');
  eq([p.stage_contact,p.stage_request,p.next],[0,0,state],'zero player contact');s.state=s.requested=0;
 }
}
section('strip bounds/no contact');
// Direct original child rows, both directions, exact signed/fractional motion.
for(const bit of [0,16]){
 level();const b=c.chaos_m3_new(),s=slot(0x2e,0,1352,780,34);s.aux1=19;b.slots[7]=s;
 const p=player(1392,780);p.player_flags=bit;
 // Controlled lab has already run init, as do its cached pass labels.
 c.chaos_m3_step2e(b,s,p,true);
 const want=D.object_2e.splash_burst_controlled.mghz1.cases[`face_bit4=${bit?1:0}`];
 for(let pass=0;pass<=20;pass++){
  if(pass===5)p.yu=0; // no immediate retrigger, like the controlled fixture
  c.chaos_m3_phase(b,p,true,vp(1264,680));
  if(pass>=5&&pass<20){
   for(let n=1;n<=3;n++){
    const k=b.slots[7+n],rel=pass-5,wantRow=want.child_rows_first_16[n].find(r=>r[0]===rel);
    if(wantRow)eq([rel,k.type,k.state,k.requested,k.frame,c.chaos_m3_x(k),c.chaos_m3_y(k),k.vx,k.vy,k.parameter],wantRow,'exact child fixture, both directions');
    if([5,9,13,17].includes(pass)&&k.type===46)sheet.children.push({bit,pass:rel,param:n,frame:k.frame,x:k.xu/256,y:k.yu/256});
   }
  }
 }
 eq(b.spawns.map(r=>r.slice(1,3)),[[8,1],[9,2],[10,3]],'exactly three children');
 eq(b.slots.slice(8,11).map(o=>o.type),[0,0,0],'child cleanup rel15');
}
// Pool exhaustion fixture: 0/1/2/3 free slots -> partial bursts, silent failure.
for(const f of Object.values(D.object_2e.slot_pool_exhaustion)){
 const b=c.chaos_m3_new(),parent=slot(46,0,1392,780,34);
 for(let i=7;i<18;i++)b.slots[i]=slot(36,0,300,112);
 b.slots[7]=parent;for(let i=0;i<f.free_slots_besides_parent;i++)b.slots[8+i]=slot(0);
 c.chaos_m3_burst(b,parent);eq(b.spawns.map(r=>r[2]),f.children_parameters_created,'canonical partial burst');
 eq(b.slots.slice(7,18).filter(o=>o.type!==0).length<=11,true,'11-slot total');
}
// Lower slot: not revisited this pass. Higher slot: init runs this pass.
for(const parentIndex of [7,10]){
 const b=c.chaos_m3_new(),s=slot(46,0,1392,780,34),p=player(1392,780);s.keep=true;s.state=s.requested=2;s.tick=4;s.aux1=19;b.slots[parentIndex]=s;
 c.chaos_m3_phase(b,p,true,vp(1264,680));const first=b.spawns[0][1],k=b.slots[first];
 eq(k.requested,parentIndex===7?3:0,'lower-slot init delay');
 c.chaos_m3_phase(b,p,true,vp(1264,680));eq(k.requested,3,'init on following update');
 eq(k.xu,parentIndex===7?1396*256-176:1396*256,'one-update motion difference');
}
section('bursts/child rows/pool/order');
// 5-update cadence under continuous activity and silent saturation.
level();b=c.chaos_m3_new();s=slot(46,0,1352,780,34);s.aux1=19;b.slots[7]=s;p=player(1392,780);
c.chaos_m3_step2e(b,s,p,true);for(let i=0;i<60;i++)c.chaos_m3_phase(b,p,true,vp(1264,680));
const bursts=[...new Set(b.spawns.map(r=>r[0]))];eq(bursts.slice(0,3),[6,11,16],'5-update cadence');
for(let i=1;i<bursts.length;i++)eq(bursts[i]-bursts[i-1],5,'every five updates even with finite pool');
ok(b.slots.slice(7,18).filter(o=>o.type!==0).length<=11,'never unlimited');
// Parent creation never widened; fresh approach from right has no emitter/splash.
const rec=D.placements.records.find(r=>r.type==='0x2E'&&r.act==='mghz1'),r=canonicalRow(rec);
for(const width of [256,348,640]){
 b=c.chaos_m3_new();c.chaos_m3_record(b,r,c.noone);p=player(1646,780);
 for(let i=0;i<60;i++)c.chaos_m3_phase(b,p,true,vp(1542,680,width));
 eq([b.slots.filter(o=>o.type!==0).length,b.spawns.length],[0,0],'fresh right-side no parent/no splash');
 b=c.chaos_m3_new();c.chaos_m3_record(b,r,c.noone);p=player(1392,780);
 for(let i=0;i<12;i++)c.chaos_m3_phase(b,p,true,vp(1264,680,width));
 const parent=b.slots.find(o=>o.type===46&&o.parameter===0);ok(parent&&parent.keep,'initialized keep-alive');
 for(let i=0;i<150;i++)c.chaos_m3_phase(b,player(3000,100),true,vp(2800,0,width));
 eq(parent.type,46,'permanent keep-alive far away');eq(parent.token,34,'placement retained');
}
section('cadence/initial creation/keep-alive');
// Integration: use the actual object phase, existing score counter, accepted
// M1/M2 occupants and real lost-ring list, rather than a standalone M3 model.
level();g.chaosMghzEffects=c.chaos_mghz_effect_new();c.chaos_level_spawn_objects();
w.follow=false;w.cam={x:1264,y:680,w:256,h:192};h.newPlayer(1392,780,{state:1,move:0});
for(let i=0;i<8;i++)h.frame({});
eq(g.chaosM3.slots.slice(7,10).map(o=>[o.type,o.token]),[[40,4],[40,8],[46,34]],'original sampled scene pool: two M1 platforms then parent');
eq(g.chaosM3.spawns.map(r=>r[1]),[10,11,12],'M1/M2 occupancy shares child allocator');
// Ring lifetimes are unchanged; eight live rings reserve 0..7 and can force
// a newly emitted lower-slot child to wait until the next ordered pass.
level();g.chaosMghzEffects=c.chaos_mghz_effect_new();w.cam={x:328,y:0,w:256,h:192};
const ringList=Array.from({length:8},(_,i)=>c.chaos_lr_new(0,460+i,128));g.chaosLostRings=ringList;
c.chaos_m3_runtime_phase(player(),true);eq(g.chaosM3.slots.slice(0,8).map(o=>o.type),Array(8).fill(6),'lost-ring occupancy bridge');
ringList.forEach(r=>r.alive=false);c.chaos_m3_runtime_phase(player(),true);c.chaos_m3_runtime_phase(player(),true);
eq(g.chaosM3.slots.filter(o=>o.type!==0).length,0,'ring removal releases occupied slots');
level();w.cam={x:328,y:0,w:256,h:192};b=g.chaosM3;s=slot(36,0,456,206);s.state=s.requested=3;s.asleep=false;b.slots[7]=s;
const oldScore=c.score;c.chaos_m3_runtime_phase(player(),false);eq(c.score-oldScore,10,'actual GameMaker score award');
eq([g.chaosLastEnemyScore0,g.chaosLastEnemyScore1,g.chaosLastEnemyScore2],[16,0,0],'canonical BCD score bytes');
// The shared object-phase promotion defers hurt to the player's next gate.
level();const instance=h.newPlayer(456,112,{state:10,move:3}),core=instance.chaosCore;core.rings=10;
s=slot();s.state=s.requested=1;s.asleep=false;g.chaosM3.slots[7]=s;w.cam={x:328,y:0,w:256,h:192};
c.SCR_chaos_objects_phase();eq([core.damage_request,core.stage_request],[255,0],'actual phase promotes contact');
eq(core.rings,10,'no same-pass hurt');eq(c.SCR_cc_damage_gate(core),true,'following player pass hurts attacking Sonic');
eq(core.next,30,'hurt state');
// A consumed existing monitor keeps its accepted effect occupancy until the
// instance disappears; this bridge does not change monitor contact/projection.
level();b=c.chaos_m3_new();const ref={x:456,y:112,chaosActive:false,chaosConsumed:true};
s=slot(16,1,456,112,12);s.external=true;s.ref=ref;b.slots[7]=s;c.chaos_m3_record(b,[12,456,112,16,0,1,0,0],ref);
c.chaos_m3_phase(b,player(),false,vp());eq([s.type,b.records[0].consumed],[16,true],'monitor effect retains occupied slot');
ref.destroyed=true;c.chaos_m3_phase(b,player(),false,vp());eq(s.type,254,'monitor effect disappearance starts release');
c.chaos_m3_phase(b,player(),false,vp());c.chaos_m3_phase(b,player(),false,vp());eq(b.slots[7].type,0,'monitor effect releases slot');
section('runtime score/occupancy/contact integration');
fs.writeFileSync(path.join(out,'runtime-samples.json'),JSON.stringify(sheet,null,2)+'\n');
fs.writeFileSync(path.join(out,'focused-results.json'),JSON.stringify({status:'PASS',assertions:checks,sections,research:'7ba4d8a7bfb7f8164462fbf50db05c4b63cec0fe'},null,2)+'\n');
console.log(`PASS MGHZ M3: ${checks} assertions ${JSON.stringify(sections)}`);
