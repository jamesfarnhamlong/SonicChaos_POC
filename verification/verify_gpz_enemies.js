// Executes shipped GML against the approved Research original-routine caches.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {loadHost,root,hex}=require('./chaos_world_harness');
const rd=p=>fs.readFileSync(path.join(root,p),'utf8');
const R=JSON.parse(rd('POC_notes/rom-cache/gpz/enemy-art-approval.json'));
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
// Original helper grids and directional reaction cases; include state $0F extents.
for(const [type,ex,ey] of [[37,7,17],[44,12,16]]) {
 const facts=R.types[type].contact;
 eq(facts.grid_mismatches,0);eq(facts.bounds,[-8-ex,8+ex,-ey,24]);
 for(const state of [5,15])for(let dx=-ex-12;dx<=ex+12;dx++)for(let dy=-ey-3;dy<=27;dy++)for(const posture of [0,1,2,3,64,128])for(const inv of [false,true]) {
  const p=c.SCR_cc_new(1000+dx,500+dy);p.state=state;p.move=posture;
  const result=c.chaos_ordinary_enemy_resolve(p,1000,500,inv,ex,ey);
  const touch=!(posture&64)&&Math.abs(dx)<=ex+(state===15?9:8)&&dy>=-ey&&dy<=24;
  eq(result,touch?((posture&2)||inv?2:1):0,`type${type} ${dx},${dy} state${state} posture${posture}`);
  eq(p.stage_contact,touch?1:0);eq(p.stage_request,0);
 }
 for(const row of facts.reaction_cases) {
  const p=c.SCR_cc_new(1000+row.dx,500+row.dy);p.move=row.posture;
  const result=c.chaos_ordinary_enemy_resolve(p,1000,500,row.invincibility===6,ex,ey);
  eq(result===2,row.type_after===15);eq(p.stage_nib,row.D521&240);
 }
}
// Preserve complete canonical placement records, including the below-map $25.
for(const act of ['gpz1','gpz2','gpz3']) {
 h.reset();c.room=c['ROM_chaos_'+act];c.chaos_level_install_layout();c.chaos_level_spawn_objects();
 const rows=c.chaos_level_object_rows().filter(r=>[37,44].includes(r[3]));
 eq(rows.length,R.placements[act].filter(r=>[37,44].includes(parseInt(r.type_id,16))).length);
 for(const o of w.gpzEnemies) {
  const source=R.placements[act].find(r=>parseInt(r.rom_offset,16)===o.chaosPlacementRom);
  eq([o.x,o.y,o.chaosPlacementFlags],[source.world_x,source.world_y,parseInt(source.flags,16)]);
  if(o.object_index===c.OBJ_chaos_object_25)eq(o.chaosParameter,parseInt(source.parameter,16));
  else eq([o.chaosEnemyEX,o.chaosEnemyEY,o.image_xscale],[12,16,1]);
 }
 eq(g.chaosSpawnedByType[81],act==='gpz3'?1:0,'$51 dispatch only in GPZ3; regular enemies unchanged');
}
// All-byte patrol initializer arithmetic; strict unsigned bounds and fractional overshoots.
for(let parameter=0;parameter<256;parameter++) {
 h.reset();c.room=c.ROM_chaos_gpz1;w.cam={x:4900,y:400,w:256,h:192};
 const o=h.newInstance('OBJ_chaos_object_25',5000,500);o.chaosParameter=parameter;o.chaosEnemyPhase=true;
 h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');
 eq([o.chaosLeftBound,o.chaosVX,o.chaosVY],[5000-parameter*16,-128,512]);
 for(const vx of [-128,128])for(const fraction of [0,1,127,128,255])for(const delta of [-1,0,1]) {
  const bound=vx<0?o.chaosLeftBound:5000;
  eq(c.chaos_gpz_patrol_reverse((bound+delta)*256+fraction,vx,o.chaosLeftBound,5000),vx<0?delta<0:delta>0);
 }
}
// Actual $25 callback floor projection into GPZ1 canonical terrain; no extra gravity.
const patrols=JSON.parse(rd('verification/gpz-enemies/patrol-oracles.json'));
for(const row of patrols.rows) {
 if(row.placement.world_y >= (row.act==='gpz1'?768:1024)) continue; // canonical below-map record is retained, reachability unresolved
 h.reset();c.room=c['ROM_chaos_'+row.act];c.chaos_level_install_layout();
 const p=row.placement;
 const b=h.newInstance('OBJ_chaos_object_25',p.world_x,p.world_y);
 Object.assign(b,{chaosParameter:parseInt(p.parameter,16),chaosEnemyPhase:true,chaosActive:true,chaosAsleep:false,chaosState:1,chaosLeftBound:p.world_x-parseInt(p.parameter,16)*16});
 for(const expected of row.timeline) {
  w.cam={x:Math.floor(b.x)-100,y:Math.floor(b.y)-100,w:256,h:192};
  h.runEvent(b,'objects/OBJ_chaos_object_25/Step_0.gml');
  eq([b.chaosXU,b.chaosYU,b.chaosVX,b.chaosState],expected.slice(0,4),row.act+' original patrol '+p.index);
 }
}
h.reset();c.room=c.ROM_chaos_gpz1;c.chaos_level_install_layout();w.cam={x:700,y:220,w:256,h:192};
let o=h.newInstance('OBJ_chaos_object_25',848,334);Object.assign(o,{chaosParameter:9,chaosEnemyPhase:true});
h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');
h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');
h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');
eq([o.x,o.y,o.chaosVY],[847.5,302,512]);
// Reversal skips overlap; otherwise top contact is ordinary defeat, never the $21 bounce.
{
 h.reset();c.room=c.ROM_chaos_gpz1;c.chaos_level_install_layout();
 const b=h.newInstance('OBJ_chaos_object_25',848,334);
 Object.assign(b,{chaosParameter:9,chaosEnemyPhase:true,chaosActive:true,chaosAsleep:false,chaosState:1,chaosLeftBound:704});
 for(const row of JSON.parse(rd('verification/gpz-enemies/animation-oracle.json'))) {
  w.cam={x:Math.floor(b.x)-100,y:Math.floor(b.y)-100,w:256,h:192};
  h.runEvent(b,'objects/OBJ_chaos_object_25/Step_0.gml');
  eq([b.image_index+1,b.sprite_index===c.SPR_chaos_gpz_enemy_25_mirror?16:0,b.chaosState,b.chaosXU,b.chaosVX],[row[0],row[1],row[3],row[4],row[5]],'original animation/orientation scheduler');
 }
}
h.reset();c.room=c.ROM_chaos_gpz1;c.chaos_level_install_layout();w.cam={x:700,y:220,w:256,h:192};
o=h.newInstance('OBJ_chaos_object_25',848,334);Object.assign(o,{chaosParameter:9,chaosEnemyPhase:true,chaosActive:true,chaosAsleep:false,chaosState:1,chaosLeftBound:704});
h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');
const p=h.newPlayer(847,302,{state:5,move:2});g.powerInv=false;
o.chaosLeftBound=848;
h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');eq(o.destroyed===true,false);eq(p.chaosCore.stage_contact,0);eq(o.chaosVX,128);
h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');eq(o.destroyed,true);eq(w.smoke.length,1);eq(w.smoke[0].chaosPlacementToken,0);
// Shared $2C callbacks: ROM 64 trigger and 384 removal cases, independent of view.
for(const width of [256,640]) {
 for(const row of R.controlled_movement.type2c_trigger) {
  h.reset();w.cam={x:900,y:400,w:width,h:192};
  const p=h.newPlayer(997-row.post_move_dx,1000);p.x=997-row.post_move_dx;
  const b=h.newInstance('OBJ_chaos_object_2C',1000,500);
  Object.assign(b,{chaosActive:true,chaosAsleep:false,chaosAge:5,chaosState:1,chaosVX:-640,chaosVY:0,chaosEnemyPhase:true});
  h.runEvent(b,'objects/OBJ_chaos_object_2C/Step_0.gml');eq(b.chaosState,row.requested_state);
 }
 for(const row of R.controlled_movement.type2c_removal) {
  h.reset();w.cam={x:900,y:400,w:width,h:192};const p=h.newPlayer(1000-row.pre_move_dx,1000);p.x=1000-row.pre_move_dx;
  const b=h.newInstance('OBJ_chaos_object_2C',1000,500);
  Object.assign(b,{chaosActive:true,chaosAsleep:false,chaosAge:5,chaosState:3,chaosVX:-640,chaosVY:0,chaosEnemyPhase:true});
  h.runEvent(b,'objects/OBJ_chaos_object_2C/Step_0.gml');eq(b.chaosActive,row.type_after!==254);
 }
}
h.reset();w.cam={x:900,y:400,w:640,h:192};h.newPlayer(1000,1000);
o=h.newInstance('OBJ_chaos_object_2C',1000,500);
Object.assign(o,{chaosActive:true,chaosAsleep:false,chaosAge:5,chaosState:2,chaosVX:0,chaosVY:0,chaosCounter:128,chaosEnemyPhase:true});
let expectedY=500*256,vy=0;
for(let t=1;t<=129;t++) {
 vy+=t<=32||t>=97?3:-3;expectedY+=vy;
 h.runEvent(o,'objects/OBJ_chaos_object_2C/Step_0.gml');
 eq(o.chaosYU,expectedY);eq(o.chaosState,t===129?3:2);eq(o.x,1000);
}
h.runEvent(o,'objects/OBJ_chaos_object_2C/Step_0.gml');eq(o.x,997.5);
// Canonical lifetime: wider view changes edges but adds no post-wake retention.
o.chaosAsleep=false;o.chaosWoken=true;
for(const width of [256,640])for(let dx=-110;dx<=width+110;dx++) {
 const vp=c.chaos_vp_new(1000,400,width,192);
 eq(c.chaos_flying_lifetime_cell(o,vp,1000+dx,500),c.SCR_chaos_spawn_cell(vp,1000+dx,500));
}
// Ordinary smoke schedule is read from the canonical scripts, not a looping approximation.
const records=R.types['15'].animation.states[1].script.filter(r=>r.op==='record');
const expected=records.flatMap(r=>Array(r.duration).fill(r.frame));expected.length=expected.indexOf(0,1)+1;
eq(c.chaos_gpz_smoke_frames(),expected);
o=h.newInstance('OBJ_chaos_gpz_smoke_0F',1000,500);
for(let t=0;t<expected.length;t++) {
 h.runEvent(o,'objects/OBJ_chaos_gpz_smoke_0F/Step_0.gml');eq(o.visible,expected[t]!==0);
 if(expected[t])eq(o.image_index,expected[t]-7);
 eq(o.destroyed===true,t===expected.length-1);
}
// Defeat cannot call inherited sample explosion / immediate player jump.
h.reset();c.room=c.ROM_chaos_gpz1;c.chaos_level_install_layout();c.chaos_level_spawn_objects();
o=w.gpzEnemies.find(b=>b.object_index===c.OBJ_chaos_object_25&&b.x===848);
Object.assign(o,{chaosActive:true,chaosAsleep:false,chaosState:1,chaosAge:5,chaosLeftBound:704,chaosYU:302*256});o.y=302;
w.cam={x:700,y:220,w:640,h:192};
h.newPlayer(847,302,{state:9,move:2});c.chaos_level_install_layout();g.powerInv=false;
const before=o.chaosXU;
h.runEvent(o,'objects/OBJ_chaos_object_25/Step_0.gml');eq(o.chaosXU,before,'ordinary Step is gated');
c.SCR_chaos_objects_phase();eq(o.destroyed,true);eq(w.smoke.length,1);
eq(w.player.chaosCore.contact,1,'object phase promotes contact for next player update');
c.SCR_chaos_objects_phase();eq(w.smoke.length,1,'defeated placement cannot recreate');
// Nonattacking $2C contact stalls movement but still runs scheduler lifetime.
h.reset();w.cam={x:1100,y:400,w:256,h:192};
o=h.newInstance('OBJ_chaos_object_2C',1000,500);
Object.assign(o,{chaosActive:true,chaosAsleep:false,chaosAge:5,chaosState:1,chaosEnemyPhase:true});
h.newPlayer(1000,500,{state:5,move:0});
h.runEvent(o,'objects/OBJ_chaos_object_2C/Step_0.gml');eq(o.chaosActive,false,'contact callback still deletes outside lifetime');eq(o.x,1000);
eq(rd('objects/OBJ_chaos_object_27/Destroy_0.gml').includes('if (!chaosSilentDestroy)'),true);
eq(rd('objects/OBJ_chaos_object_2C/Draw_0.gml').includes('draw_sprite(sprite_index,image_index,x+1,y+18)'),true);
console.log('GPZ ENEMY CHECKS PASSED:',checks,'assertions; original grids/reactions, patrol/floor, 64/384, oscillator, smoke, imports');
