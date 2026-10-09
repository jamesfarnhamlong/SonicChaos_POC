// Audit-only instrumented execution of shipped GML. No source/gameplay edits.
const fs=require('fs'),path=require('path');const {loadHost,root}=require('./chaos_world_harness');
const out=path.join(root,'verification/player-state-audit');fs.mkdirSync(out,{recursive:true});
function lab(act){const h=loadHost(),c=h.ctx,g=h.g,w=h.world;const events=[];let update=0;
 const aliases=[...fs.readFileSync(path.join(root,'scripts/SCR_player_sprites_sonic/SCR_player_sprites_sonic.gml'),'utf8').matchAll(/(SPR_player_\w+)\s*=\s*(SPR_sonic_\w+);/g)].filter(r=>!r[2].includes('super'));
 const snap=p=>({state:p.state,next:p.next,d503:p.move,d448:p.d448??null,x:p.xu/256,y:c.chaos_signed_yu(p.yu)/256,vx:p.vx/256,vy:p.vy/256,bg:p.bg,contacts:p.contacts,plane:p.plane,foot:p.foot_block});
 for(const name of ['SCR_cc_fall','SCR_cc_spring','SCR_cc_ceiling_spring','SCR_cc_project_floor','SCR_cc_project_side','SCR_cc_ceiling_profile','SCR_cc_break13_floor','SCR_cc_break13_side','SCR_cc_break16_floor','SCR_chaos_block47_step','SCR_cc_stand','SCR_cc_walk','chaos_spring26_launch']){
  const original=c[name];c[name]=(...args)=>{const p=name==='SCR_chaos_block47_step'?args[0].chaosCore:args[0],before=snap(p);const result=original(...args);events.push({update,call:name,args:args.slice(1).map(a=>a&&typeof a==='object'?{tile:a.tile,index:a.index,flags:a.flags,ax:a.ax,ay:a.ay,vertical:a.vertical,horizontal:a.horizontal}:a),before,after:snap(p),result:result??null});return result;};
 }
 const lookup=c.SCR_cc_lookup;c.SCR_cc_lookup=(...args)=>{const r=lookup(...args);events.push({update,call:'lookup',x:args[0],y:args[1],plane:args[2],tile:r.tile,index:r.index,flags:r.flags,kind:r.flags&31});return r;};
 c.room=c['ROM_chaos_'+act];c.chaos_level_install_layout();w.roomWidth=act==='thz1'?4096:2560;w.roomHeight=act==='thz1'?1024:512;
 const springs=w.springs;
 function player(x,y,opt){const p=h.newPlayer(x,y,opt);for(const a of aliases)p[a[1]]=a[2];return p;}
 function run(seed,frames,input,setup){const p=player(seed.x,seed.y,seed);c.chaos_level_spawn_objects();if(setup)setup({h,c,g,w,p,springs});events.length=0;const rows=[];for(update=0;update<frames&&!p.dead;update++){
 const start=events.length,before=snap(p.chaosCore),broken=g.chaosBrokenCells.slice();h.frame(input(update));
 rows.push({update,input:input(update),before,after:snap(p.chaosCore),playerJump:g.playerJump,playerJumpSpring:g.playerJumpSpring,springVisual:p.chaosSpringVisual,sprite:p.sprite_index,image_index_model:p.image_index,image_speed:p.image_speed,events:events.slice(start),broken:g.chaosBrokenCells.filter(i=>!broken.includes(i))});
 const sprite=p.sprite_index;let count=1;try{count=JSON.parse(fs.readFileSync(path.join(root,'sprites',sprite,sprite+'.yy'))) .sequence.length;}catch{}p.image_index=(p.image_index+p.image_speed)%count;
 }return {seed,rows,end:snap(p.chaosCore),springs:springs.map(s=>[s.chaosBaseX,s.chaosLayoutY,s.chaosParameter]),dead:!!p.dead};}
 return {h,c,g,w,snap,player,run,events};}
module.exports={lab,out};
if(require.main===module){
 const summaries=[];
 for(const vx of [0,512,1024,1536])for(const x of [480,488,496,504])for(const y of [330,334,338,342]){
  const l=lab('aqz3'),r=l.run({x,y,vx,state:5,move:0,bg:2},500,()=>({right:true}));const launches=r.rows.flatMap(t=>t.events.filter(e=>e.call.includes('spring')&&JSON.stringify(e.before)!==JSON.stringify(e.after)).map(e=>[t.update,e.call,e.after.x,e.after.y,e.after.next]));summaries.push({x,y,vx,end:r.end,launches,broken:r.rows.flatMap(r=>r.broken)});
 }
 fs.writeFileSync(path.join(out,'corridor-seed-sweep.json'),JSON.stringify(summaries,null,2));console.log(summaries.sort((a,b)=>b.end.x-a.end.x).slice(0,6).map(r=>({seed:[r.x,r.y,r.vx],end:r.end,launches:r.launches.length,broken:r.broken})));
}
