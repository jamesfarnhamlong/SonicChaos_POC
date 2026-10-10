const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const {loadHost,hex,root}=require('./chaos_world_harness');const h=loadHost(),c=h.ctx,g=h.g,w=h.world;let checks=0;
function eq(a,b){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));checks++;}
for(const n of ['SCR_chaos_loop_layout','SCR_chaos_debug_select'])vm.runInContext(hex(fs.readFileSync(path.join(root,`scripts/${n}/${n}.gml`),'utf8')),c);
c.room_exists=()=>true;const entries=c.chaos_debug_entries();eq(entries.filter(e=>e.enabled).length,15);eq(entries.slice(12,15).map(e=>e.enabled),[true,true,true]);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/implementation-manifest.json')));
const census=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/object-census.json')));
for(let act=1;act<=3;act++){
 h.reset();c.room=c['ROM_chaos_aqz'+act];const a=manifest.acts['aqz'+act];w.roomWidth=a.dimensions_pixels[0];w.roomHeight=a.dimensions_pixels[1];w.cam={x:0,y:a.descriptor.start.ram_d2d8,w:256,h:192};
 c.chaos_level_install_layout();c.chaos_level_apply_loops();c.chaos_level_spawn_objects();eq(g.chaosMapWidth,a.dimensions_cells[0]);
 const records=census.acts['aqz'+act].records;const active=records.filter(r=>['0x0C','0x10','0x18','0x30','0x3F','0x3C','0x3D','0x59'].includes(r.type_id));eq(g.chaosSpawnedIndices,active.map(r=>r.index));
 if(act===3)eq(g.chaosAqz59.record[1],1856);
 const p=h.newPlayer(a.descriptor.start.ram_d511,a.descriptor.start.ram_d514,{state:5,move:0});eq(p.chaosCore.zone,4);
 const initialControllers=g.chaosS2.slots.filter(s=>s.type===13).length;eq(initialControllers,act===3?0:2);
 for(let i=0;i<3;i++)h.frame({right:true});eq(g.chaosAqzEnv.calls,act===3?0:3);eq(g.chaosAqzEnv.line,act===3?0:act===1?568:788);
 eq(g.chaosAqzEnv.camera_bottom,-1);eq(g.chaosAqzEnv.death,false);
}
// Shared callbacks call the updater; recovery/clear/charge/routes latch both counters and flag.
for(const state of [5,10,11,14,17,18,30,37,31,40,32,15,19,34]){
 h.reset();c.room=c.ROM_chaos_aqz1;c.chaos_level_install_layout();g.chaosTileIds=Array(4096).fill(254);g.chaosAqzEnv.line=568;
 const p=c.SCR_cc_new(128,600);Object.assign(p,{zone:4,state,next:state,move:1,water:0,state11_active:true,camera_y:500,state11_camera_y:500,held:0,air_active:false,owner_event:0});
 if(state===19){g.chaosRoute19X=c.SCR_chaos_gpz_loop_x();g.chaosRoute19Y=c.SCR_chaos_gpz_loop_y();}
 if(state===34){p.magnitude=0;p.route_progress=0;}
 const frozen=[37,31,40,32,15,19,34].includes(state);c.SCR_cc_tick(p);eq(g.chaosAqzEnv.calls,frozen?0:1);eq(p.water,frozen?0:255);
}
// Partial fine survives recovery, and updater failure does not create a drowning fallback.
{c.room=c.ROM_chaos_aqz1;c.chaos_level_install_layout();const e=g.chaosAqzEnv,b=g.chaosS2,p=c.SCR_cc_new(128,600);e.line=568;e.fine=119;e.coarse=16;b.slots.forEach(s=>s.type=1);c.chaos_aqz_water_update(e,p,b);eq(p.next,31);eq(e.camera_bottom,-1);eq(e.death,false);eq(e.spawns.length,2);}
fs.mkdirSync(path.join(root,'build/aqz-p1'),{recursive:true});fs.writeFileSync(path.join(root,'build/aqz-p1/integration-results.json'),JSON.stringify({status:'PASS',assertions:checks},null,2));console.log('AQZ P1 integration',checks,'assertions PASS');
