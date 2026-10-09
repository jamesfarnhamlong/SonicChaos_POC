const fs=require('fs'),assert=require('assert'),path=require('path');
const {loadHost,root}=require('./chaos_world_harness');const h=loadHost(),c=h.ctx,g=h.g,w=h.world;let checks=0;
const eq=(a,b)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));checks++;};
const sprite=JSON.parse(fs.readFileSync(path.join(root,'sprites/SPR_chaos_aqz_waterline/SPR_chaos_aqz_waterline.yy')));
c.sprite_get_xoffset=()=>sprite.sequence.xorigin;c.sprite_get_width=()=>sprite.width;
const tables=c.chaos_aqz_strip_tables(),cases=[];
for(const width of [256,348,640])for(const cameraX of [0,1,127,256,1023,1023.5])for(let phase=0;phase<16;phase++){
 const vp={left:cameraX,top:528,w:width,h:192};w.cam={x:cameraX,y:528,w:width,h:192};g.chaosAqzEnv=c.chaos_aqz_env_new(1);g.chaosAqzEnv.line=568;const e=g.chaosAqzEnv,pool=c.chaos_s2_new();
 const draws=[];c.draw_sprite=(sprite,frame,x,y)=>draws.push({sprite,frame,x,y});
 for(let param=0;param<2;param++){
  const s=c.chaos_aqz_slot(13,param,0,568,0);Object.assign(s,{strip:(phase+15)&15,callback:0x9ddd,frame:1});c.chaos_aqz_callback(e,pool,s,{},false,vp);
  eq(s.x,Math.floor(cameraX+tables[param][phase]));eq(s.y,568);const before=JSON.stringify(e),start=draws.length;
  c.chaos_aqz_water_strip_draw(99,s.frame,s.x,s.y);eq(JSON.stringify(e),before);eq(draws[start],{sprite:99,frame:1,x:s.x,y:568});
  const sub=draws.slice(start);eq(sub.every(d=>d.frame===1&&d.y===568&&(d.x-s.x)%256===0),true);
  if(width===256)eq(sub.length,1);
 }
 eq((tables[1][phase]-tables[0][phase]+256)%256,128);
 cases.push({width,cameraX,phase,draws});
}
// Fixed current phase has an identical camera-relative draw sequence while
// scrolling, retaining the canonical callback's integer anchor for subpixel
// cameras. No WORLD grid or new phase clock.
for(const width of [256,348,640])for(let phase=0;phase<16;phase++){
 const rows=cases.filter(r=>r.width===width&&r.phase===phase);const relative=r=>r.draws.map(d=>[d.x-Math.floor(r.cameraX),d.y,d.frame]);
 for(const row of rows)eq(relative(row),relative(rows[0]));
}
// $4BC0 is repeated for fully submerged updater calls, not just water entry.
for(const vx of [1024,-1023,1792,-1792]){
 const e=c.chaos_aqz_env_new(1);e.line=568;const pool=c.chaos_s2_new(),p=c.SCR_cc_new(128,700);Object.assign(p,{water:255,move:2,vx});
 for(let u=0;u<12;u++){p.vy=0;c.chaos_aqz_water_update(e,p,pool);eq(p.vy,-768);eq(p.water,255);}
 eq(pool.slots.some(s=>s.type===14),false);
}
const drawSource=fs.readFileSync(path.join(root,'scripts/SCR_chaos_aqz_environment/SCR_chaos_aqz_environment.gml'),'utf8');eq(drawSource.includes('if (cp_s.type == $0D) chaos_aqz_water_strip_draw'),true);
fs.writeFileSync(path.join(root,'build/aqz-p1/strip-d-draws.json'),JSON.stringify({sprite:'SPR_chaos_aqz_waterline',cases}));
fs.writeFileSync(path.join(root,'build/aqz-p1/followup-d-results.json'),JSON.stringify({status:'PASS',assertions:checks,cases:cases.length},null,2)+'\n');console.log('AQZ D strip/runtime',checks,'assertions PASS');
