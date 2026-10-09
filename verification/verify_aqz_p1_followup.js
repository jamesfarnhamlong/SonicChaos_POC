const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const {loadHost,root,hex}=require('./chaos_world_harness');const h=loadHost(),c=h.ctx,g=h.g,w=h.world;let checks=0;
function eq(a,b){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));checks++;}
// Actual shipped Step clock for AQZ and all accepted 8-update terrain paths.
const clock=fs.readFileSync(path.join(root,'objects/OBJ_chaos_ring_manager/Step_0.gml'),'utf8').split('// Type-$09')[0];
for(const zone of ['aqz','gpz','mghz','sez']) {
 const ctx={chaosRingGlobalFrame:0,chaosRingFrame:0,sprite_get_number:()=>4,max:Math.max,SPR_ring:1};
 for(const z of ['aqz','gpz','mghz','sez'])ctx['chaos_is_'+z]=()=>z===zone;
 vm.createContext(ctx);const frames=[];
 for(let u=0;u<96;u++){ctx.chaosRingGlobalFrame=u;vm.runInContext(hex(clock),ctx);frames.push(Math.floor(ctx.chaosRingFrame));eq(Math.floor(ctx.chaosRingFrame),Math.floor(u/8)%4);}
 eq(frames.slice(0,32),Array.from({length:32},(_,u)=>Math.floor(u/8)));
}
const traces=[];
for(let act=1;act<=2;act++) {
 h.reset();c.room=c['ROM_chaos_aqz'+act];c.chaos_level_install_layout();c.chaos_level_spawn_objects();
 const x=act===1?768:2496,y=act===1?686:942;w.cam={x:x-128,y:y-96,w:256,h:192};
 const e=g.chaosAqzEnv,b=g.chaosS2,p=c.SCR_cc_new(x,y);eq(e.emitters.length,1);eq(e.emitters[0].record.slice(1,3),[x,y]);
 for(let u=0;u<900;u++){c.chaos_aqz_pass_begin();c.chaos_s2_phase(p,false);c.chaos_aqz_mapped_scan();e.d2e2=(e.d2e2+1)&255;e.d12f=(e.d12f+1)&255;}
 const spawned=e.spawns.filter(r=>r[1]===12 && r[2]!==0);assert(spawned.length>=6);checks++;eq(spawned.slice(0,6).map(r=>r[2]),[1,1,2,1,1,2]);eq(spawned[3][0]-spawned[0][0],360);
 traces.push({act,anchor:[x,y],emitter:e.spawns.filter(r=>r[1]===12 && r[2]===0),bubbles:spawned});
}
// AQZ3 mapped $30: exact canonical placement and real shared gate/launch.
h.reset();c.room=c.ROM_chaos_aqz3;c.chaos_level_install_layout();c.chaos_level_spawn_objects();
const row=c.chaos_level_object_rows().find(r=>r[3]===48);eq(row.slice(1,3),[944,256]);w.cam={x:800,y:132,w:256,h:192};
const player=h.newPlayer(944,238,{state:5,move:0});player.chaosCore.bg=2;player.chaosCore.vy=0;
const o={chaosBaseX:944,chaosLayoutY:256,chaosBaseY:268,chaosDrawX:944,chaosSpan:0,chaosParameter:0,chaosRestState:7,chaosState:7,chaosOffset:0,chaosTimer:0};
c.chaos_sez_mapped_init(o,row);c.SCR_chaos_object_spring_step(o);eq([player.chaosCore.vy,player.chaosCore.next,player.chaosCore.d448],[-1888,11,255]);
// Ordinary Rocket timer remains 300 decrements across both water states.
for(const water of [0,255]){h.reset();c.room=c.ROM_chaos_aqz1;c.chaos_level_install_layout();const p=h.newPlayer(100,600,{state:17});g.chaosPowerCode=4;g.chaosPowerTimer=300;p.chaosCore.water=water;
 for(let u=1;u<=300;u++){c.SCR_chaos_power_tick(p,p.chaosCore);eq([g.chaosPowerTimer,g.chaosPowerCode],[300-u,u===300?0:4]);}}
fs.writeFileSync(path.join(root,'build/aqz-p1/followup-results.json'),JSON.stringify({status:'PASS',assertions:checks,bubble_traces:traces},null,2));console.log('AQZ follow-up',checks,'assertions PASS');
