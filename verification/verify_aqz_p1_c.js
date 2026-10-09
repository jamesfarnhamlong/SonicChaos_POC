const fs=require('fs'),assert=require('assert'),path=require('path');
const {loadHost,root}=require('./chaos_world_harness');const h=loadHost(),c=h.ctx,g=h.g,w=h.world;let checks=0;
function eq(a,b){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));checks++;}
// Shipped mapped scan: approach across every D2E2 phase, including the narrow
// widescreen outer band at canonical max Rocket horizontal speed.
for(const act of [1,2])for(const width of [256,348,640])for(const speed of [4,6.5,7])for(let phase=0;phase<16;phase++){
 h.reset();c.room=c['ROM_chaos_aqz'+act];c.chaos_level_install_layout();c.chaos_level_spawn_objects();
 const e=g.chaosAqzEnv,x=act===1?768:2496,y=act===1?686:942;
 for(let u=0;u<150;u++){w.cam={x:x-width-180+Math.min(180,u*speed),y:act===1?528:784,w:width,h:192};e.d2e2=(u+phase)&255;e.passes=u;c.chaos_aqz_mapped_scan();}
 eq(e.spawns.filter(r=>r[1]===12&&r[2]===0).length,1);eq(e.emitters[0].occupied,true);
}
// AQZ static terrain path bypasses selector-6 request protection, but keeps
// the movement invulnerability-bit gate. Execute the shipped floor dispatch.
h.reset();c.room=c.ROM_chaos_aqz1;c.chaos_level_install_layout();
const lookup=c.SCR_cc_lookup,project=c.SCR_cc_project_floor;
c.SCR_cc_lookup=()=>({tile:60,flags:5,index:0});c.SCR_cc_project_floor=()=>{};
for(const move of [0,128]){const p=c.SCR_cc_new(100,600);Object.assign(p,{zone:4,state:5,next:5,bg:2,move,immune:true,rings:1});c.SCR_cc_floor(p);eq(p.hurt_pending,move===0);eq(p.rings,move===0?0:1);}
c.SCR_cc_lookup=lookup;c.SCR_cc_project_floor=project;
const p=c.SCR_cc_new(100,600);Object.assign(p,{immune:true,damage_request:1,rings:1,move:0});eq(c.SCR_cc_damage_gate(p),false);eq(p.rings,1);eq(p.damage_request,0);
eq(c.chaos_level_object_rows().some(r=>r[3]===27),false);
// Automatic follow runs after End Step in Windows; both entry and every End
// Step must keep VSpeed disabled, including player/death instance replacement.
for(const file of ['Create_0.gml','Step_2.gml'])assert(fs.readFileSync(path.join(root,'objects/OBJ_chaos_zone',file),'utf8').includes('if (chaos_is_mghz() || chaos_is_aqz()) __view_set(e__VW.VSpeed,0,0);')),checks++;
// Palette source selection remains independent of player water and retains
// the canonical controller transition requests, including offscreen domains.
for(const act of [1,2])for(const water of [0,255])for(const delta of [-1,0,1,40,192,193]){
 const e=c.chaos_aqz_env_new(act);e.line=act===1?568:788;e.enabled=255;e.palette=0;c.chaos_aqz_raster(e,e.line-delta);
 eq(e.enabled,delta>0&&delta<=192?255:0);eq(e.palette,delta<=0?1:0);
 eq(e.requests,delta>0&&delta<=192?[0,0]:delta<=0?[48,49]:[25,10]);
}
fs.writeFileSync(path.join(root,'build/aqz-p1/followup-c-results.json'),JSON.stringify({status:'PASS',assertions:checks,scan_sweeps:288,spikes:'canonical direct terrain entry retained'},null,2));console.log('AQZ C',checks,'assertions PASS');
