// SEZ S4 allocator-pressure check (informational, exit 0): does adding $20/$23 change visible crumble/shard behaviour on the natural SEZ1 six-cell bridge (62..67,14)?
// The S2 pool models crumble parents/shards/lost rings only. Here the live $20/$23 records (and their $0F smoke for 40 updates) are ALSO charged to slots 7.. as placement
// objects would be in the ROM (placed objects allocate first-free of 7..17 before the shards do) and the shard counts per crumble group are compared with the S2-only model.
const fs=require('fs'),path=require('path');
const {loadHost,root}=require('./chaos_world_harness');
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;
function run(speed,withEnemies,start){
 h.reset();c.room=c.ROM_chaos_sez1;w.cam={x:0,y:0,w:256,h:192};w.follow=true;c.chaos_level_install_layout();g.chaosSezEffects=c.chaos_sez_effect_new();g.chaosLostRings=[];g.powerInv=false;
 c.chaos_level_spawn_objects();
 const p=h.newPlayer(start,430,{state:5,move:128});const k=p.chaosCore;k.invuln=1e9;k.maximum=1792;
 let maxEnemies=0,maxShardSlots=0,defeated=0;const groups=[];
 for(let u=1;u<=260;u++){
  k.vx=speed*256;
  const live=g.chaosSezEnemies.filter(e=>e.active).length;maxEnemies=Math.max(maxEnemies,live);
  if(withEnemies)for(let i=7;i<18;i++)g.chaosS2.slots[i].type===0x77&&(g.chaosS2.slots[i]=c.chaos_s2_slot());
  if(withEnemies)for(let i=0;i<live&&7+i<18;i++)if(g.chaosS2.slots[7+i].type===0)g.chaosS2.slots[7+i].type=0x77;
  const before=g.chaosS2.children.length;
  h.frame({right:true});
  if(g.chaosS2.children.length>before)groups.push(g.chaosS2.children.length-before);
  maxShardSlots=Math.max(maxShardSlots,g.chaosS2.slots.slice(7,18).filter(s=>s.type===0x13).length);
 }
 return {groups,maxEnemies,maxShardSlots,replaced:g.chaosS2.replaced.length};
}
const rows=[];
for(const speed of [2,3,4,5,6,7]){
 const a=run(speed,false,1940),b=run(speed,true,1940);
 rows.push({speed,s2_only_groups:a.groups,with_enemies_groups:b.groups,max_live_enemies:b.maxEnemies,max_shard_slots:a.maxShardSlots,replaced:a.replaced,changed:JSON.stringify(a.groups)!==JSON.stringify(b.groups)});
}
// static census: how many mapped $20/$23 can be inside one lifetime window ([-96,352) both axes) of any crumble cell
const D=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/sez/enemies-20-23-runtime.json'),'utf8'));
const C=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/sez/surface-runtime-contracts.json'),'utf8')).crumble_0C_13.cells;
let worst=0;for(const cell of C){const act=cell.act,x=cell.cell[0]*32,y=cell.cell[1]*32;let n=0;for(const p of D.placements)if(p.act===act&&Math.abs(p.world_x-x)<352+128&&Math.abs(p.world_y-y)<352+128)n++;worst=Math.max(worst,n);}
const out={rows,worst_enemies_near_a_crumble_cell:worst,verdict:rows.some(r=>r.changed)?'PRESSURE: shard counts differ':'no natural conflict: shard groups identical with the enemies charged to the pool'};
fs.mkdirSync(path.join(root,'build/sez-s4'),{recursive:true});fs.writeFileSync(path.join(root,'build/sez-s4/pool-pressure.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,1));
