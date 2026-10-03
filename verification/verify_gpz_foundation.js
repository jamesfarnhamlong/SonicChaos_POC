// Shipped runtime against the canonical GPZ manifest and controlled original-routine fixtures.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {loadHost,root}=require('./chaos_world_harness');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const M=read('POC_notes/rom-cache/gpz/implementation-manifest.json');
const I=read('POC_notes/rom-cache/gpz/isometric-platform.json');
const O=read('verification/gpz-platform-oracles.json');
const h=loadHost(null),c=h.ctx,g=h.g;let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const sha=a=>crypto.createHash('sha256').update(Buffer.from(a)).digest('hex');
for(const [key,a] of Object.entries(M.acts)) {
 const ids=c[`SCR_chaos_${key}_tile_ids`](),n=a.layout.runtime_written_cells;
 eq(sha(ids.slice(0,n)),a.layout.runtime_cells_sha256,key+' layout');
 eq(ids.slice(n).every(v=>v===254),true,'unloaded cells stay empty adapter');
 eq(c[`SCR_chaos_${key}_map_width`](),a.descriptor.layout.width_cells);
 eq(c[`SCR_chaos_${key}_start`](),a.start.player_anchor);
 eq(c[`SCR_chaos_${key}_camera`](),a.start.camera);
 eq(c[`SCR_chaos_${key}_terrain_rings`]().length,a.census.terrain_rings);
 eq(c[`SCR_chaos_${key}_type09`]().length,a.rings.object09.length);
 c[`SCR_chaos_${key}_profiles`]();
 for(const b of a.blocks)for(let plane=0;plane<2;plane++) {
  const hd=b.headers[plane];eq(g[`chaosHeaders${plane}`][b.block_id],[hd.flags,hd.modifier,hd.vertical,hd.horizontal],`${key} ${b.block_id} plane${plane}`);
 }
 c.room=c[`ROM_chaos_${key}`];c.chaos_level_install_layout();
 eq(g.chaosMapWidth,a.descriptor.layout.width_cells);
 c.chaos_level_spawn_objects();
 for(const t of [0x25,0x2C,0x51])eq(g.chaosSpawnedByType[t],0,'excluded '+t);
 eq(g.chaosSpawnedIndices.length,a.foundation.instantiate_indices.length+a.foundation.integrate_before_instantiating_indices.length-a.rings.object09.length);
}
// State4 complete timing/carry trajectory from accepted Research ce2ef9b.
{
 const o={x:1024,y:512,chaosOwnerId:9};c.chaos_platform28_configure(o,0x83,0x6A);
 const p=c.SCR_cc_new(1024,504);p.vy=1792;
 for(const r of I.type_28_parameter_83_sweep.timeline){c.chaos_platform28_step(o,p,true);eq([o.chaosY,o.chaosVY,o.chaosPhase,o.chaosDelay,o.chaosSag,p.support,Math.floor(p.yu/256),p.vy],r.slice(1),'state4 update '+r[0]);}
}
// Original ROM state10 and state13->6 trajectories, both contact and no-contact.
for(const t of O.timelines){
 const o={x:t.origin[0],y:t.origin[1],chaosOwnerId:9};c.chaos_platform28_configure(o,t.parameter,t.aux1);
 o.chaosTick=t.initial_elapsed; // Research ObjectLab fixture starts after initializer + first callback.
 const p=c.SCR_cc_new(t.origin[0],t.origin[1]-(t.riding?14:100));p.vy=1792;
 for(const r of t.rows){c.chaos_platform28_step(o,p,true);eq([o.chaosX,o.chaosY,o.chaosVX,o.chaosVY,Math.floor(p.xu/256),Math.floor(p.yu/256),p.support!==0],[r[1],r[2],r[3],r[4],r[8],r[9],r[10]],`param ${t.parameter} riding${t.riding} update${r[0]}`);}
}
// Surface1C underside sweeps: isolated decoded cells and original per-block results.
c.room=c.ROM_chaos_gpz1;c.chaos_level_install_layout();g.chaosTileIds=Array(4096).fill(254);g.chaosMapWidth=160;
for(const [id,a]of Object.entries(I.surface_1c_boundary_sweeps.isolated_block_side_underside_sweeps)){
 const block=parseInt(id,16);g.chaosTileIds[10*160+10]=block;
 for(let local=0;local<32;local++){
  const p=c.SCR_cc_new(328,326+local);p.vy=-256;c.SCR_cc_ceiling(p);
  const sample=a.ceiling_changed_samples.find(v=>v.probe_local_y===local);
  eq([Math.floor(p.yu/256),p.vy],sample?[sample.player_y_after,sample.player_vy_after]:[326+local,-256],id+' underside '+local);
 }
}
// Ceiling-spring exhaustive geometry against the accepted 544-point contract.
g.chaosTileIds.fill(254);g.chaosTileIds[5*160+10]=58;
for(let x=316;x<356;x++)for(let y=150;y<190;y++){
 const p=c.SCR_cc_new(x,y);p.vy=-256;c.SCR_cc_ceiling(p);
 const hit=x>=320&&x<352&&y-6>=160&&y-6<=176;
 eq(p.next===27,hit,`ceiling ${x},${y}`);
 if(hit)eq([p.vx,p.vy,p.move&3],[1024,1408,3]);
}
for(const zone of [0,1])for(const tile of [54,56]){
 const p=c.SCR_cc_new(0,0);p.bg=2;p.zone=zone;c.SCR_cc_spring(p,20,tile);
 eq([p.vx,p.vy,p.next,p.move&3],[tile===54?1024:-1024,zone===0?-1792:-1408,28,3]);
}
// $6AE3 exact state/attack/speed/side gates; $7857 mutation/reward once.
for(const r of O.surface16){
 g.chaosTileIds[0]=71;g.chaosBrokenCells=[];g.ring=23;
 const p=c.SCR_cc_new(1000,700);Object.assign(p,{zone:1,vx:123,vy:r.vy,move:r.attack?2:0,state:r.state,bg:r.bg});
 c.SCR_cc_break16_floor(p,{index:0});
 const e=r.after;eq([p.vx,p.vy,p.move,p.bg,g.chaosTileIds[0],Math.floor(g.ring/10)*16+g.ring%10],e,'surface16 '+JSON.stringify(r));
 if(e[4]===70){const rings=g.ring;c.SCR_cc_break16_floor(p,{index:0});eq(g.ring,rings,'reward once');}
}
// Triggered state4 permanently consumes its placement when it sleeps; a new act clears shells/ledger.
for(const phase of [0,128,255]){
 const o={x:1000,y:500,chaosOwnerId:9};c.chaos_platform28_configure(o,0x83,11);
 Object.assign(o,{chaosPhase:phase,chaosLive:true,chaosAsleep:false,chaosScanTick:0,chaosInitialFillDone:true,chaosPlacementX:1000,chaosPlacementY:500,chaosPlacementParameter:0x83,chaosPlacementAux1:11,chaosPlacementIndex:4});
 const p=c.SCR_cc_new(1000,486);p.support=9;g.chaosConsumedPlatforms=[];
 eq(c.chaos_platform28_lifecycle(o,p,true,c.chaos_vp_new(1200,500,256,192)),false);
 eq(o.chaosConsumed,phase!==0);eq(p.support,0);
 if(phase!==0){eq(g.chaosConsumedPlatforms,[4]);eq(c.chaos_platform28_lifecycle(o,p,true,c.chaos_vp_new(900,450,256,192)),false,'consumed cannot respawn');}
 else {eq(c.chaos_platform28_lifecycle(o,p,true,c.chaos_vp_new(1033,450,256,192)),false,'recreate asleep in outer band');eq(o.chaosLive,true);eq(o.chaosY,500);}
}
eq(c.chaos_gpz_prize_rows(),M.ordinary_sign_prize_tables.rows_other_table.map(row=>row.map(v=>parseInt(v,16))),'GPZ prize table A962');
// Full ordinary sign/player chain at the two canonical GPZ sign anchors.
for(const key of ['gpz1','gpz2'])for(const width of [256,640]){
 c.room=c[`ROM_chaos_${key}`];c.chaos_level_install_layout();
 const a=M.acts[key],row=c[`SCR_chaos_${key}_objects`]().find(r=>r[3]===24);
 const [sx,sy]=row.slice(1,3),p=c.SCR_cc_new(sx,sy);p.zone=1;p.vx=256;p.vy=0;
 const sign=c.chaos_goal_sign_new();
 eq(c.chaos_goal_contact(sx,sy,p.vx,p.next,sx,sy),true,key+' sign trigger');
 c.chaos_goal_sign_step(sign,true);
 for(let i=0;i<140&&!sign.spawn_child;i++)c.chaos_goal_sign_step(sign,false);
 eq(sign.spawn_child,true,key+' child emitted');
 const child=c.chaos_goal_child_new();
 for(let i=0;i<148;i++)c.chaos_goal_child_step(child,true,false);
 eq(child.requested,true,key+' state20 floor gate');c.chaos_goal_request_state20(p);
 p.camera_x=a.dimensions_pixels[0]-width;p.clear_dx=c.chaos_goal_clear_dx(width);
 for(let i=0;i<600&&!p.act_clear;i++)c.SCR_cc_tick(p);
 eq(p.act_clear,true,key+' clear width'+width);
 eq(Math.floor(p.xu/256)-p.camera_x>=width+33,true,key+' clear threshold');
}
console.log('GPZ FOUNDATION CHECKS PASSED:',checks,'assertions');
