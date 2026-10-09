const assert=require('assert'),fs=require('fs'),path=require('path');
const {loadHost,root}=require('./chaos_world_harness');
const w=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/water-runtime.json')));
const h=loadHost(),c=h.ctx,g=h.g;let checks=0;
function eq(a,b){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));checks++;}
function lab(act=1){g.chaosS2=c.chaos_s2_new();g.chaosAqzEnv=c.chaos_aqz_env_new(act);g.chaosLastSoundRequest=0;return {e:g.chaosAqzEnv,b:g.chaosS2,p:c.SCR_cc_new(128,600),vp:{left:0,top:500,w:256,h:192}};}
for(const row of w.crossing_vectors){const {e,b,p}=lab();e.line=568;p.yu=(568+row.dy)*256;p.water=row.prior_water;p.vx=row.vx;p.vy=row.vy;p.move=row.attack;c.chaos_aqz_cross(e,p,b);eq([p.water,p.vy,b.slots.some(s=>s.type===14)],[row.water,row.result_vy,row.splash]);}
for(const row of w.timer_vectors){const {e,b,p}=lab();e.line=568;e.fine=row.fine;e.coarse=row.coarse;e.refresh=4;p.yu=(568+row.dy)*256;p.state=p.next=5;p.water=255;if(row.pool_full) b.slots.forEach(s=>s.type=1);c.chaos_aqz_water_update(e,p,b);eq([e.fine,e.coarse,p.next,b.slots.filter(s=>s.type===50).length],[row.result_fine,row.result_coarse,row.requested,row.countdown]);}
for(const row of w.physics.vertical){const {p}=lab();Object.assign(p,{state:row.state,water:row.water,move:row.air,vy:row.vy,bg:row.forced,modifier:row.surface});c.SCR_cc_y(p);eq(p.vy,row.result_vy);}
for(const row of w.physics.control.filter(r=>r.state<=40)){const {p}=lab();Object.assign(p,{state:row.state,water:row.water,vx:row.vx,held:row.pad,input_delta:0x1234,surface_delta:0x5678});c.SCR_cc_input(p);eq([p.input_delta,p.surface_delta],[row.input_acceleration,row.slope_acceleration]);}
for(const row of w.physics.jump){const {p}=lab();Object.assign(p,{state:row.state,next:row.state,water:row.water,move:0,bg:2,tile:255});c.SCR_cc_jump(p);eq([p.vy,p.next,p.move,p.bg],[row.vy,row.requested,row.flags,row.floor]);}
for(const row of w.raster.boundary_vectors){const {e}=lab();e.line=568;e.enabled=row.prior_enabled;e.raster=77;c.chaos_aqz_raster(e,568-row.screen_delta);eq([e.enabled,e.raster,e.requests],[row.enabled,row.line,row.palette_requests]);}
for(const row of w.objects.bubble_contact){const {e,b,p,vp}=lab();e.d12f=row.phase;e.d2e2=0;p.xu=(128+row.dx)*256;p.yu=(800+row.dy)*256;p.move=row.player_hurt;p.next=p.state=5;const s=c.chaos_aqz_slot(12,2,128,800,0);s.state=s.requested=3;s.frame=row.frame;s.ex=8;s.ey=16;s.asleep=!!row.sleep;s.callback=row.callback;s.vy=-192;c.chaos_aqz_callback(e,b,s,p,true,vp);eq([p.next,s.type],[row.requested,row.type]);}
for(const row of w.objects.waterline_edges){const {e,b,p,vp}=lab();e.d2e2=row.phase;const s=c.chaos_aqz_slot(12,1,128,e.line+row.extent_y+row.dy_above_extent_line,0);s.state=s.requested=2;s.ey=row.extent_y;s.asleep=!!row.sleep;s.callback=row.callback;s.vy=-192;c.chaos_aqz_callback(e,b,s,p,false,vp);eq(s.type===254,row.removed);}
for(const row of w.objects.air_reset){const {e,p}=lab();e.fine=row.fine;e.coarse=row.coarse;p.state=37;c.chaos_aqz_air_tick(e,p);eq([e.fine,e.coarse],[row.result_fine,row.result_coarse]);}
// Exact original scheduler records, birth frames, allocation and terminal callback.
for(const [name,tid,param] of [['emitter',12,0],['splash',14,0],['countdown',50,0]]){
 const {e,b,p,vp}=lab();e.line=568;e.coarse=11;p.xu=128*256;p.yu=800*256;
 const s=c.chaos_aqz_slot(tid,param,100,800,0);s.keep=true;b.slots[0]=s;
 for(const row of w.lifecycle[name]){e.passes=row.update;e.sound=0;c.chaos_aqz_visit(e,b,s,p,true,vp);eq([s.type,s.state,s.requested,s.frame,s.timer,e.sound],[row.type,row.state,row.requested,row.frame,row.counter,row.sound]);}
}
for(let act=1;act<=3;act++){
 const {e,b,p,vp}=lab(act);c.chaos_aqz_create_water(e,b);eq(b.slots.filter(s=>s.type===13).length,act===3?0:2);
 if(act===3){c.chaos_aqz_water_update(e,p,b);eq([e.calls,e.fine,e.line],[0,0,0]);continue;}
 for(let pass=1;pass<=4;pass++){e.passes=pass;for(const s of b.slots)if(s.type)c.chaos_aqz_visit(e,b,s,p,true,{...vp,top:act===1?99:447});const row=w.lifecycle.controllers.find(r=>r.act===act-1&&r.update===pass);eq(e.line,row.line);eq(b.slots.filter(s=>s.type===13).map(s=>[s.state,s.requested,s.x,s.y]),row.controllers.map(s=>[s.state,s.requested,s.x,s.y]));}
}
// Allocation pressure never retries controller/splash/countdown. Distinct ranges.
{const {e,b,p}=lab();b.slots.forEach(s=>s.type=1);c.chaos_aqz_create_water(e,b);eq([e.line,e.spawns.length],[768,0]);b.slots[17].type=0;eq(c.chaos_aqz_alloc(e,b,12,2,0,0,false,0),-1);eq(c.chaos_aqz_alloc(e,b,12,2,0,0,true,0),17);}
// Sustained original-game air clock and recovery traces; synthetic held-anchor fixtures.
const game=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/water-game-checks.json')));
for(let act=1;act<=2;act++) {
 const {e,b,p}=lab(act);e.line=act===1?568:788;p.state=p.next=14;p.water=255;p.move=1;
 for(const row of game.acts['aqz'+act].fixtures.drowning) {
  p.yu=row.y*256;c.chaos_aqz_water_update(e,p,b);eq([e.fine,e.coarse,p.next],[row.fine,row.air,row.req]);
 }
 const recovery=game.acts['aqz'+act].fixtures.air_recovery;
 e.fine=0;e.coarse=12;p.state=p.next=37;p.air_active=false;
 for(const row of recovery.slice(1)) {
  p.state=p.next;
  if(p.state===37)c.chaos_aqz_air_tick(e,p);else c.chaos_aqz_water_update(e,p,b);
  eq([p.state,e.fine,e.coarse],[row.cur,row.fine,row.air]);
 }
}
fs.mkdirSync(path.join(root,'build/aqz-p1'),{recursive:true});fs.writeFileSync(path.join(root,'build/aqz-p1/runtime-results.json'),JSON.stringify({status:'PASS',assertions:checks},null,2));console.log('AQZ P1 runtime',checks,'assertions PASS');
