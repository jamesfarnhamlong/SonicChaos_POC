// Diagnostic replay of shipped player/terrain/object code; no collision changes.
const fs=require('fs'),path=require('path');
const {loadHost,root}=require('./chaos_world_harness');
const traces=[];
for(let act=1;act<=2;act++) {
 const seed=loadHost(null),records=seed.ctx[`SCR_chaos_mghz${act}_objects`]().filter(r=>r[3]===40 && [5,10].includes(r[5]));
 for(const record of records)for(const dx of [-16,0,16]) {
  const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;c.room=c[`ROM_chaos_mghz${act}`];c.chaos_level_install_layout();g.chaosMghzEffects=c.chaos_mghz_effect_new();
  const p=h.newPlayer(record[1]+dx,record[2]-14,{state:14,move:1,vy:0});
  const o=c.chaos_spawn_type28(record);o.chaosPlacementIndex=record[0];
  let projections=[];
  for(const name of ['SCR_cc_project_floor','SCR_cc_ceiling_profile']) {const original=c[name];c[name]=(cc,s)=>{const before=cc.yu/256;original(cc,s);if(cc.yu/256!==before)projections.push({path:name,before,after:cc.yu/256,block:s.tile,index:s.index,probe:[s.ax,s.ay],flags:s.flags});};}
  const rows=[];
  for(let tick=1;tick<=1100&&!p.dead;tick++) {
   g.chaosMghzEffects.frame++;projections=[];const y0=o.chaosY;h.frame({});const cc=p.chaosCore;
   rows.push({tick,platform_y:o.chaosY,platform_delta:o.chaosY-y0,platform_vy:o.chaosVY/256,platform_mode:o.chaosMode,y:cc.yu/256,state:cc.state,next:cc.next,vy:cc.vy/256,floor:cc.bg&2,contacts:cc.contacts,move:cc.move,owner:cc.support,owner_flag:cc.objects,mirror_owner:p.chaosSupport===o,projections});
  }
  const fights=rows.filter(r=>r.projections.some(q=>q.path==='SCR_cc_ceiling_profile'));
  traces.push({act,type:'$28',parameter:'$'+record[5].toString(16).toUpperCase().padStart(2,'0'),placement:record,player_dx:dx,ceiling_projection_ticks:fights.map(r=>r.tick),rows});
 }
}
const out=path.join(root,'build/mghz-m11/platform-traces.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(traces,null,2));
for(const t of traces)console.log(JSON.stringify({act:t.act,placement:t.placement.slice(0,3),parameter:t.parameter,dx:t.player_dx,ceiling:t.ceiling_projection_ticks.length,first:t.ceiling_projection_ticks[0],last:t.ceiling_projection_ticks.at(-1)}));
