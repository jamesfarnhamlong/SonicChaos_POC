// Execute shipped GML against reviewed original-code fixtures, not a duplicate route model.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {loadHost,root}=require('./chaos_world_harness');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache',n)));
const L=read('gpz-loop-route.json'),S=read('gpz-surface19.json');
const h=loadHost(null),c=h.ctx,g=h.g;let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);checks++;};
const snap=p=>[p.state,p.next,Math.floor(p.xu/256),Math.floor(p.yu/256),p.vx,p.vy,p.plane,p.move,!!(p.bg&2),p.route_progress,p.route_x,p.route_y];
const expected=r=>[r.current,r.requested,r.x,r.y,r.vx,r.vy,r.plane,r.flags,r.floor,r.progress_16_8,...r.origin];
for(const r of L.contact_matrix){
 const p=c.SCR_cc_new(770,194);Object.assign(p,{state:r.state,next:r.requested,plane:r.plane,vx:r.vx,bg:r.floor?2:0});
 const entered=c.SCR_cc_route19_try(p,r.previous_block,r.current_block);
 eq(entered,r.after.requested===19,'alternate block helper matrix');
}
for(const f of [...L.traversal_fixtures,...L.control_fixtures]) {
 const i=f.input;c.room=c['ROM_chaos_'+f.gate.act];c.chaos_level_install_layout();
 const p=c.SCR_cc_new(i.x,i.y);Object.assign(p,{state:i.current,next:i.requested,vx:i.vx,vy:i.vy,plane:i.plane,foot_block:i.previous_block,previous:i.previous_surface,bg:i.floor?2:0,move:i.attack?2:0});
 c.SCR_cc_floor(p);eq(snap(p),expected(f.entry),'entry '+JSON.stringify(i));
 for(const r of f.updates){c.SCR_cc_tick(p);eq(snap(p),expected(r),'route update '+r.update);}
}
for(const f of L.progress_boundary_fixtures){
 const p=c.SCR_cc_new(768,196);Object.assign(p,{state:19,next:19,route_x:768,route_y:196,route_progress:f.progress_before_16_8,vx:f.vx_before,vy:1792,bg:2});
 c.SCR_cc_tick(p);eq(snap(p),expected(f.after),'fractional route boundary');
}
// Actual player adapter, from canonical gate contact through success. The route
// skips ordinary terrain/rings, preserves flags and resumes on plane 1.
for(const f of L.traversal_fixtures){
 h.reset();c.room=c['ROM_chaos_'+f.gate.act];c.chaos_level_install_layout();
 const player=h.newPlayer(f.input.x,f.input.y,{state:5,vx:1024,vy:1792,move:0,bg:2,previous:0x90});
 const p=player.chaosCore;p.foot_block=0x57;c.SCR_cc_floor(p);c.SCR_chaos_core_publish(player);
 for(const r of f.updates){h.frame({});eq(snap(p),expected(r),'adapter route '+r.update);eq(p.ring_probe_valid,false);}
 h.frame({});eq(p.state,10);eq(p.plane,1);eq(p.ring_probe_valid,true);
}
// Position fractions survive both entry and every table assignment; no entry speed gate.
for(const vx of [-1024,0,9,10,853,854,1024])for(const fraction of [0,1,127,255]){
 const p=c.SCR_cc_new(770,193);p.xu+=fraction;p.yu+=fraction;p.vx=vx;
 c.SCR_cc_route19_enter(p);eq(p.xu&255,fraction);eq(p.yu&255,fraction);eq(p.next,19);
 c.SCR_cc_tick(p);eq(p.xu&255,fraction);eq(p.yu&255,fraction);
}
// Exhaustive original suffix ranges, including the asymmetric fractional run boundary.
for(const hi of [2,4,6])for(let vx=-2048;vx<=2048;vx++){
 const p=c.SCR_cc_new(528,686);Object.assign(p,{state:5,next:5,vx,maximum:hi*256,special:1,bg:2});
 c.SCR_cc_strip_suffix(p);eq(p.next,(Math.abs(vx)>>8)===hi?6:20,'walk '+hi+'/'+vx);
}
for(let vx=-1280;vx<=1280;vx++){
 const p=c.SCR_cc_new(528,686);Object.assign(p,{state:6,next:6,vx,special:1,bg:2});
 c.SCR_cc_strip_suffix(p);eq(p.next,Math.abs(vx>>8)<4?5:6,'run '+vx);
}
c.room=c.ROM_chaos_gpz2;c.chaos_level_install_layout();
for(const [name,held] of [['fast_right',8],['fast_left',4],['slow',8],['stopped_walk',0],['stopped_idle',0],['decelerate',0]]){
 const rows=S.fixtures[name],r=rows[0];
 const p=c.SCR_cc_new(r.x,r.y);Object.assign(p,{state:r.current,next:r.requested,vx:r.vx,vy:r.vy,plane:r.plane,move:r.movement_flags,bg:r.floor?2:0,contacts:r.floor?2:0,previous:r.surface,special:r.special,surface_counter:r.counter,held,zone:1});
 for(const e of rows.slice(1)){
  c.SCR_cc_anim_update(p);c.SCR_cc_tick(p);
  eq([Math.floor(p.xu/256),Math.floor(p.yu/256),p.vx,p.vy,p.state,p.next,p.special,p.surface_counter,p.plane,p.move,!!(p.bg&2)],
     [e.x,e.y,e.vx,e.vy,e.current,e.requested,e.special,e.counter,e.plane,e.movement_flags,e.floor],name);
 }
}
for(const r of S.support_matrix){
 const p=c.SCR_cc_new(r.x,693);Object.assign(p,{state:r.current,next:r.requested,previous:0x59,special:r.bit0_before,bg:2});
 const s=c.SCR_cc_lookup(r.x,711,r.plane);c.SCR_cc_project_floor(p,s);eq(Math.floor(p.yu/256),r.y_after,'one-way request/bit matrix');
}
console.log('GPZ CLOSURE PASS: '+checks+' original-route, suffix and support checks');
