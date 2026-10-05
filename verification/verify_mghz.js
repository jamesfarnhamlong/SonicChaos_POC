// Execute shipped GML against reviewed original-routine caches. No gameplay clone.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {loadHost,root,hex}=require('./chaos_world_harness'),vm=require('vm');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const M=read('POC_notes/rom-cache/mghz/implementation-manifest.json');
const O=read('POC_notes/rom-cache/mghz/surface-1b-ceiling-spikes.json');
const C=read('POC_notes/rom-cache/mghz/object-census.json');
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const sha=a=>crypto.createHash('sha256').update(Buffer.from(a)).digest('hex');
const sinkOracle=JSON.parse(require('zlib').gunzipSync(fs.readFileSync(path.join(root,'verification/mghz-sink-oracle.json.gz'))));
eq(sinkOracle.rom_sha256,M.rom_sha256);
for(const [y,vy,k,profile,resultY,resultFloor] of sinkOracle.rows){
 const p=c.SCR_cc_new(1360,y);Object.assign(p,{previous:0x5b,special:2,surface_counter:k,vy,bg:2});
 c.SCR_cc_project_floor(p,{ax:1360,ay:y+18,vertical:profile,modifier:0,index:3242});
 eq([Math.floor(p.yu/256),!!(p.bg&2)],[resultY,!!resultFloor],'original sink routine');
}
for(const [key,a] of Object.entries(M.acts)) {
 const n=a.layout.runtime_written_cells,ids=c[`SCR_chaos_${key}_tile_ids`]();
 eq(sha(ids.slice(0,n)),a.layout.runtime_cells_sha256,key+' layout');
 eq(ids.slice(n).every(v=>v===254),true);eq(c[`SCR_chaos_${key}_map_width`](),a.descriptor.layout.width_cells);
 eq(c[`SCR_chaos_${key}_start`](),a.start.player_anchor);eq(c[`SCR_chaos_${key}_camera`](),a.start.camera);
 eq(c[`SCR_chaos_${key}_terrain_rings`]().map(r=>r.slice(1,3)),a.rings.terrain.map(r=>[r.world_x,r.world_y]));
 c.room=c[`ROM_chaos_${key}`];c.chaos_level_install_layout();
 for(const b of a.blocks)for(let p=0;p<2;p++){const d=b.headers[p];eq(g[`chaosHeaders${p}`][b.block_id],[d.flags,d.modifier,d.vertical,d.horizontal]);}
 const stride=a.descriptor.layout.width_cells;
 eq(c.SCR_cc_lookup((4095%stride)*32,Math.floor(4095/stride)*32,0).index,-1,'4095 loader guard');
 h.reset();c.chaos_level_spawn_objects();
 for(const t of [0x24,0x2e,0x56,0x57,0x58])eq(g.chaosSpawnedByType[t],0,'excluded '+t);   // M2 consumes $21, $2F and the Rocket monitor
 const rec=C.acts[key].records;
 for(const t of [0x28,0x1b,0x18])eq(g.chaosSpawnedByType[t],rec.filter(r=>parseInt(r.type_id,16)===t).length,'shared '+t);
 for(const t of [0x10,0x21,0x2f])eq(g.chaosSpawnedByType[t],rec.filter(r=>parseInt(r.type_id,16)===t).length,'M2 spawn '+t);
 for(const width of [256,348,640]){w.cam.w=width;const p=h.newPlayer(...a.start.player_anchor,{state:1,move:0});eq([p.chaosCore.zone,p.chaosCore.level],[3,3]);}
}
c.room=c.ROM_chaos_mghz1;c.chaos_level_install_layout();
// Original routine steady-state and plunge fixtures, not invented sink limits.
for(const [key,r] of Object.entries(O.surface_1b.steady_state.cases)){
 const integration=Number(key.split('_')[1]);
 for(let k=0;k<=24;k++){
  const p=c.SCR_cc_new(1360,778+k+integration);Object.assign(p,{previous:0x5b,special:2,surface_counter:k,vy:integration*256,bg:2});
  const s=c.SCR_cc_lookup(1360,Math.floor(p.yu/256)+18,0);c.SCR_cc_project_floor(p,s);
  eq(Math.floor(p.yu/256),r.anchor_y_after_projection_by_counter_0_to_24[k],key+' '+k);eq(p.bg&2,2);
 }
 for(const [k,before,after,step,floor] of r['rows_around_runaway_[counter,anchor_before,anchor_after,step,floor]']){
  const p=c.SCR_cc_new(1360,before+integration);Object.assign(p,{previous:0x5b,special:2,surface_counter:k,vy:integration*256,bg:2});
  c.SCR_cc_project_floor(p,c.SCR_cc_lookup(1360,Math.floor(p.yu/256)+18,0));eq(Math.floor(p.yu/256),after);eq(!!(p.bg&2),floor);
 }
}
// Cadence repeats at frame 0,4,... and never writes velocity, state or attack.
for(let frame=0;frame<256;frame++){
 const p=c.SCR_cc_new(1360,800);Object.assign(p,{zone:3,state:9,next:9,move:2,vx:256,vy:-256,frame_counter:frame,surface_counter:255});
 c.SCR_cc_floor(p);eq(p.surface_counter,(frame&3)?255:0);eq([p.vx,p.vy,p.state,p.next,p.move],[256,-256,9,9,2]);
}
for(const setter of ['SCR_cc_jump','SCR_cc_fall','SCR_cc_strip_suffix']){
 const p=c.SCR_cc_new(1360,800);Object.assign(p,{special:3,surface_counter:20,state:5,next:5,move:0,vx:256,water:0});
 c[setter](p);eq(p.surface_counter,0);eq(p.special&2,2,'oil bit survives setter');
}
// Stale oil bit: verified one-way fixtures preserve counter and lower projection.
for(const [id,r] of Object.entries(O.surface_1b.stale_bit_one_way.results)){
 g.chaosTileIds[25*128+42]=parseInt(id,16);
 for(const [label,values] of Object.entries(r.final_anchor_y_minus_surface_anchor)){
  const special=label==='bit1_clear'?0:2,k=label==='bit1_set_k10'?10:label==='bit1_set_k25'?25:0;
  r.probe_rows_dy.forEach((dy,i)=>{const p=c.SCR_cc_new(1360,782+dy);Object.assign(p,{previous:0x41,vy:1792,bg:2,special,surface_counter:k});c.SCR_cc_project_floor(p,c.SCR_cc_lookup(1360,800+dy,0));eq(Math.floor(p.yu/256)-782,values[i],id+' '+label+' '+dy);});
 }
}
// Exhaustive all four spike paths with canonical profiles and inclusive edges.
c.room=c.ROM_chaos_mghz2;c.chaos_level_install_layout();g.chaosTileIds.fill(254);const index=13*128+30;
for(const block of [62,63]){
 g.chaosTileIds[index]=block;
 for(const vy of [-256,-1,0,256])for(const floor of [0,2])for(const owner of [0,9])for(const inv of [0,128])for(const state of [10,30])
 for(let x=948;x<=1004;x++)for(let y=400;y<=456;y++){
  const p=c.SCR_cc_new(x,y);Object.assign(p,{zone:3,vy,bg:floor,support:owner,move:inv,state,next:state,rings:5,immune:true});
  c.SCR_cc_ceiling(p);
  const hit=x>=960&&x<992&&y>=422&&y<=446&&(owner||(!floor&&vy<0));
  eq(!!p.hurt_pending,!!(hit&&!inv&&state!==30),'head');
  if(hit){eq(Math.floor(p.yu/256),446);if(inv&&state!==30)eq([p.vy,p.bg&1],[256,0],'exempt bounce');}
 }
 const previous={none_00:0,solid_81:0x81,spike_85:0x85};
 for(const [label,r]of Object.entries(O.ceiling_spikes.foot_sweep.results)){
  const [prev,floorPart,vyPart]=label.split('|'),bg=Number(floorPart.split('=')[1])*2;
  const speed=vyPart.includes('rising')?-256:vyPart.includes('fast')?1792:vyPart.includes('descending')?256:0;
  for(let x=960;x<992;x++)for(let row=0;row<32;row++){
   const p=c.SCR_cc_new(x,416+row-18);Object.assign(p,{zone:3,previous:previous[prev.split('=')[1]],bg,vy:speed,rings:5});c.SCR_cc_floor(p);
   const expected=r.hurt.some(([x0,x1,y0,y1])=>x-960>=x0&&x-960<=x1&&row>=y0&&row<=y1);eq(p.hurt_pending,expected,label);
  }
 }
 for(let x=944;x<=1008;x++)for(let row=0;row<32;row++){
  const p=c.SCR_cc_new(x,416+row-6);p.rings=5;c.SCR_cc_sides(p);eq(p.hurt_pending,false,'side never hurts');
 }
}
// Shared zone3 twist entry, springs, breakables on actual MGHZ profiles.
for(const [tile,speed,variant]of [[89,256,2],[115,-1024,3]]){const p=c.SCR_cc_new(0,0);Object.assign(p,{level:3,state:5,vx:speed});eq(c.SCR_cc_twist_enter(p,tile),true);eq([p.next,p.twist_variant],[34,variant]);if(variant===2)eq(p.vx,1280);}
for(const [kind,tile,vy]of [[9,48,-1920],[20,54,-1408],[20,56,-1408]]){const p=c.SCR_cc_new(0,0);Object.assign(p,{zone:3,bg:2,vy:0});c.SCR_cc_spring(p,kind,tile);eq(p.vy,vy);}
for(const tile of [155,156]){g.chaosTileIds[index]=tile;const p=c.SCR_cc_new(960,400);Object.assign(p,{state:9,move:2,vx:1024});c.SCR_cc_break13_side(p,{index},true);eq(g.chaosTileIds[index],157);}
// Original effect event stream, including no-write updates; freeze/resume slots.
let e=c.chaos_mghz_effect_new(),last4=e.cram4,last11=e.cram11,lastStrip=e.strip_frame;
const events={2:[],3:[],14:[]};
for(let u=0;u<200;u++){
 c.chaos_mghz_effect_step(e,false,0);
 if(e.cram4!==last4)events[2].push([u,e.cram4]);
 if(e.cram11!==last11)events[3].push([u,e.cram11]);
 if(e.strip_frame!==lastStrip)events[14].push([u,e.strip_frame===1?0x8e3d:0x8e1d]);
 last4=e.cram4;last11=e.cram11;lastStrip=e.strip_frame;
}
for(const id of [2,3,14]){const r=M.level_effects.effects[id].first_events;eq(events[id].slice(0,r.length),r.map(v=>[v.update,id===14?v.vram_copies[0].source_cpu:v.palette_writes[0].after]),'effect '+id);}
e=c.chaos_mghz_effect_new();for(let u=0;u<40;u++)c.chaos_mghz_effect_step(e,true,0);eq([e.strip_tick,e.strip_frame],[0,0]);eq(e.cram4,40);
for(let u=0;u<4;u++)c.chaos_mghz_effect_step(e,false,0);eq(e.strip_frame,1);
const tick=e.palette_tick,strip=e.strip_tick;for(let u=0;u<20;u++)c.chaos_mghz_effect_step(e,false,1);eq([e.palette_tick,e.strip_tick],[tick,strip]);
// Menu entries expose the three new acts and preserve save/progression table.
c.room_exists=v=>Object.keys(h.ids).some(k=>k.startsWith('ROM_chaos_')&&h.ids[k]===v);
vm.runInContext(hex(fs.readFileSync(path.join(root,'scripts/SCR_chaos_debug_select/SCR_chaos_debug_select.gml'),'utf8')),c);
eq(c.chaos_debug_entries().slice(9,12).map(v=>v.enabled),[true,true,true]);eq(c.chaos_act_count(),3);
const report={status:'PASS',assertions:checks,spike_paths:'head,foot,side,exempt',source:'shipped GML + canonical original-routine caches'};
fs.mkdirSync(path.join(root,'build/mghz-m1'),{recursive:true});fs.writeFileSync(path.join(root,'build/mghz-m1/mechanics-results.json'),JSON.stringify(report,null,2));console.log(report);
