// Shipped GML against reviewed Research m1-windows-followup fixtures.
// Research update numbers are zero-based. No collision is implemented here.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {loadHost,root}=require('./chaos_world_harness');
const fixtures=require('../POC_notes/rom-cache/mghz/m1-windows-followup.json').part_a.fixtures;
let checks=0;const eq=(a,b,label)=>{assert.strictEqual(a,b,label);checks++;};
function setup(act,index,rings=0,width=256){
 const h=loadHost(),c=h.ctx,g=h.g,w=h.world;c.room=c[`ROM_chaos_mghz${act}`];c.chaos_level_install_layout();g.chaosMghzEffects=c.chaos_mghz_effect_new();w.cam.w=width;
 const record=c[`SCR_chaos_mghz${act}_objects`]().find(r=>r[0]===index);
 const p=h.newPlayer(record[1],record[2]-39,{vy:256}),o=c.chaos_spawn_type28(record);g.ring=rings;
 // Model the instance's changed identity; death is outside normal-player contact.
 c.instance_change=object=>{p.dead=true;p.object_index=object;};
 return {h,c,g,w,p,o,record};
}
function replay(act,index,{rings=0,jump=-1,retained,width=256}={}){
 const s=setup(act,index,rings,width),{h,c,g,p,o}=s;let claimed=false,claim=-1,event=null,rows=[],proj=[];
 for(const name of ['SCR_cc_project_floor','SCR_cc_ceiling_profile']){const original=c[name];c[name]=(cc,ss)=>{const y=cc.yu;original(cc,ss);if(y!==cc.yu)proj.push({path:name,before:y/256,after:cc.yu/256,block:ss.tile,index:ss.index});};}
 const death=c.SCR_cc_crush_death;c.SCR_cc_crush_death=cc=>{event={outcome:'death',owner_at_handler:cc.support,pass_y:Math.floor(cc.yu/256)};death(cc);};
 const br=c.SCR_cc_break13;c.SCR_cc_break13=i=>{event={outcome:'break',index:i,pass_y:Math.floor(p.chaosCore.yu/256)};br(i);};
 for(let u=0;u<510;u++){
  // The original frame rig samples pad at the end of the preceding frame.
  // PC-hook check at $3FEF: pad set on u60 reaches D137/D147 on u61.
  const sampledJump=jump+1;
  proj=[];const before=o.chaosY;g.chaosMghzEffects.frame++;h.frame({jump:u>=sampledJump&&u<sampledJump+3&&jump>=0,jumpPress:jump>=0&&u===sampledJump});const q=p.chaosCore;
  if(!claimed&&q.support){claimed=true;claim=u;if(retained!==undefined)q.vy=retained;}
  rows.push({u,platform_y:o.chaosY,platform_delta:o.chaosY-before,y:q.yu/256,state:q.state,next:q.next,vy:q.vy,owner:q.support,floor:q.bg&2,projections:proj});
  if(event){event={...event,u,vy:q.vy,platform_before:before,platform_after:o.chaosY};break;}
  if(proj.some(r=>r.block===249&&r.path==='SCR_cc_project_floor')){event={outcome:'snap',u,projection:proj.find(r=>r.block===249),vy:q.vy};break;}
 }
 return {...s,claim,event,rows};
}
const evidence=[];
for(const width of [256,348,640])for(const index of [12,13])for(const rings of [0,5]){
 const r=replay(2,index,{rings,width}),f=index===12?fixtures.mghz2_12_ride_into_breakable_0d.rings_0:fixtures.mghz2_13_ride_into_breakable_0d;
 const expected=f.death_update!==undefined?f:f.rings_0;
 eq(r.claim,11,'natural support claim');eq(r.event.outcome,'death','supported breakable ceiling');eq(r.event.u,expected.death_update,'death update');eq(r.event.pass_y,expected.player_y_in_death_pass,'death anchor');eq(r.event.platform_before,expected.platform_y_at_start_of_death_update,'fatal platform Y');
 eq(r.event.vy,-1280,'direct $4984 Y speed');eq(r.g.ring,rings,'rings retained');eq(r.g.chaosBrokenCells.length,0,'no block break');eq(r.p.chaosCore.next,31,'death requested');eq(r.p.chaosCore.support,0,'owner released by final object pass');eq(r.g.chaosCrushDeathPhase,2,'object list frozen');
 eq(r.rows.some(row=>row.projections.some(p=>p.path==='SCR_cc_ceiling_profile')),false,'no ceiling push-out');
 const y=r.o.chaosY;for(let i=0;i<4;i++)r.h.frame();eq(r.o.chaosY,y,'platform stays frozen');
 evidence.push({act:2,placement:r.record,width,rings,event:r.event,rows:r.rows.slice(-5)});
}
// Every Research jump-window update, with exact sample update/Y/speed checks.
for(let jump=20;jump<=109;jump++){
 const r=replay(2,12,{jump}),run=fixtures.mghz2_12_jump_window.outcome_runs.find(x=>jump>=x.from&&jump<=x.to);eq(r.event.outcome,run.outcome,`jump ${jump}`);
 const sample=fixtures.mghz2_12_jump_window.samples.find(x=>x.jump_update===jump);
 if(sample){eq(r.event.u,sample.update,'jump event update');eq(r.event.pass_y,sample.pass_y,'jump event Y');eq(r.event.vy,sample.vy_after,'jump retained speed');}
 if(r.event.outcome==='break'){eq(r.p.chaosCore.support,0,'jump owner clear');eq(r.p.dead===true,false,'jump survives');eq(r.g.chaosTileIds[r.event.index],157,'canonical $9D replacement');assert(r.event.vy<0);checks++;}
 if(jump===60)evidence.push({act:2,placement:r.record,jump,event:r.event,rows:r.rows.slice(-5)});
}
for(const width of [256,348,640])for(const [index,update,y] of [[10,194,206],[11,450,366]]){
 const r=replay(1,index,{width});eq(r.event.outcome,'snap','one-way capture');eq(r.event.u,update,'capture update');eq(r.event.projection.after-r.event.projection.before,-11,'single-update 11px snap');eq(Math.floor(r.p.chaosCore.yu/256),y,'upper surface');eq(r.event.vy,832,'retained Y speed');eq(r.p.chaosCore.support,0,'terrain releases platform');eq(r.p.chaosCore.bg&2,2,'terrain floor set');
 eq(r.rows.some(row=>row.projections.some(p=>p.path==='SCR_cc_ceiling_profile')),false,'F9 is not a solid ceiling');
 evidence.push({act:1,placement:r.record,width,event:r.event,rows:r.rows.slice(-5)});
}
for(const f of fixtures.mghz1_10_one_way_depth_sweep.rows){const r=replay(1,10,{retained:f.retained_vy});eq(r.event.u,f.snap_update,'capture depth timing');eq(Math.floor(r.event.projection.before),f.player_y_in_pass,'capture depth entry');eq(Math.floor(r.event.projection.after),f.player_y_after,'capture top');}
// Direct ceiling dispatch cannot be shielded, blinked, or made invincible.
for(const rings of [0,5,99])for(const shield of [false,true])for(const immune of [0,128])for(const inv of [0,6]){
 const r=setup(2,12,rings),q=r.p.chaosCore;q.yu=517*256;q.support=9;q.bg=2;q.vy=832;q.move=immune|2;q.immune=immune;q.power=inv;r.g.powerShield=shield;r.g.powerInv=inv===6;
 r.c.SCR_cc_ceiling(q);eq(q.crush_death,true,'direct crush ignores protection');eq(q.next,31,'direct death state');eq(q.move,immune|3,'death preserves movement bits');eq(q.support,9,'handler retains owner');eq(q.yu,517*256,'no projection');eq(r.g.chaosBrokenCells.length,0,'no break');r.c.SCR_chaos_hurt_apply(r.p);eq(r.g.ring,rings,'adapter does not lose rings');eq(r.g.powerShield,shield,'adapter does not consume shield');eq(r.w.created.length,0,'no ring scatter');
}
const out=path.join(root,'verification/mghz-m11/platform-correction.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({checks,research:'reviewed m1-windows-followup.json (Research working tree)',update_index:'zero-based',cases:evidence},null,2)+'\n');
console.log(`PASS MGHZ platform correction: ${checks} assertions, 90 jump windows, 256/348/640 viewports`);
