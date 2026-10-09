const fs=require('fs'),path=require('path'),assert=require('assert');
const {loadHost,root}=require('./chaos_world_harness');
const D=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/enemies-3c-3d-runtime.json')));
const h=loadHost(),c=h.ctx,g=h.g;let checks=0,rows=0;
function eq(a,b,m){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;}
function slot(p){let s=c.chaos_aqz_slot(parseInt(p.type_id,16),parseInt(p.parameter,16),p.world_x,p.world_y,p.index);Object.assign(s,{enemy:true,placement:{spent:false},origin_y:p.world_y,counter:0,script_state:-1,asleep:true});return s;}
function cmp(s,e,label){for(const [k,key] of Object.entries({state:'current',requested:'requested',frame:'frame',timer:'duration',x:'x',y:'y',vx:'vx',vy:'vy',counter:'counter',parameter:'parameter',token:'token',callback:'callback'}))eq(s[k],e[key],label+' '+k);eq([s.xu&255,s.yu&255],e.fractions,label+' fractions');eq([s.ex,s.ey],e.extent,label+' extents');rows++;}
// All 30 original creator/callback vectors, all natural parameters, 240 calls each.
for(const v of D.placements){const s=slot(v.placement);for(const e of v.rows){s.asleep=!!(e.flags4&64);c.chaos_aqz_enemy_script(s);c.chaos_aqz_enemy_callback(s,{},false,e.frame_clock);cmp(s,e,'placement '+v.placement.act+'/'+v.placement.index+' call '+e.u);}}
for(const v of D.boundaries['3c_parity_sleep']){const p=D.placements[0].placement,s=slot(p),k=c.SCR_cc_new(p.world_x,p.world_y-4);s.callback=v.cb;s.asleep=!!v.sleep;s.ex=3;s.ey=13;c.chaos_aqz_enemy_callback(s,k,true,v.clock);eq(s.y,v.output.y);eq(k.stage_request,v.output.D3B0);eq(k.stage_contact!==0,v.output.D520!==0);}
// Exact origin/counter/sleep boundary sweep, including equality and signed speed.
for(const v of D.boundaries['3d_origin_counter']){const p=D.placements.find(v=>v.placement.type_id==='0x3D').placement,s=slot(p);Object.assign(s,{callback:0x932b,y:p.world_y+v.dy,yu:(p.world_y+v.dy)*256,vx:192,vy:v.vy,counter:v.counter,requested:v.requested,asleep:!!v.sleep});c.chaos_aqz_enemy_callback(s,{},false,0);for(const k of ['x','y','vx','vy','counter','requested'])eq(s[k],v.output[k],k+' origin boundary');eq([s.xu&255,s.yu&255],v.output.fractions);}
// Original shared overlap and forced-hurt/defeat vectors for every visible frame.
for(const typ of ['3C','3D'])for(const v of D.contact[typ].reactions){const p=D.placements.find(v=>v.placement.type_id==='0x'+typ).placement,s=slot(p),k=c.SCR_cc_new(p.world_x+v.dx,p.world_y+v.dy);Object.assign(s,{asleep:false,frame:v.frame,ex:3,ey:typ==='3C'?13:21});k.move=v.f3;k.state=14;g.powerInv=v.selector===6;c.score=0;c.chaos_aqz_enemy_contact(s,k,true,0);eq(k.stage_request,v.output.D3B0,'forced hurt');eq(k.stage_contact!==0,v.output.D520!==0,'contact');if(k.stage_contact)eq(k.stage_nib,v.output.D521,'classification');eq(s.placement.spent,v.output.type===15,'defeat distinction');}

// All natural original loader/scheduler trajectories: camera, IRQ/scan phase are oracle inputs.
const G=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/enemies-3c-3d-game-checks.json')));let naturalRows=0;
for(const v of G.placements){
 h.reset();c.room=c['ROM_chaos_aqz'+(v.placement.act+1)];c.chaos_level_install_layout();
 const e=g.chaosAqzEnv,b=g.chaosS2,p=v.placement;
 c.chaos_aqz_enemy_register([p.index,p.world_x,p.world_y,parseInt(p.type_id,16),parseInt(p.flags,16),parseInt(p.parameter,16)]);
 // AQZ2 #10 is already live in the exported game start snapshot; initialize from that observed boundary.
 if(v.rows[0].o.length){const o=v.rows[0].o[0],s=slot(p),rec=e.enemies[0];Object.assign(s,{placement:rec,state:o.state,requested:o.req,script_state:o.state,frame:o.frame,timer:o.dur,pc:2,callback:o.callback,ex:o.extent[0],ey:o.extent[1],vx:o.vx,vy:o.vy,parameter:o.parameter,asleep:!!(o.f4&64)});b.slots[o.slot]=s;Object.assign(rec,{slot:o.slot,occupied:true,initial:true});}
 for(const r of v.rows){if(r.u===1&&v.rows[0].o.length)continue;
  const prior=e.enemies[0],live=prior.occupied?b.slots[prior.slot]:null,px=live&&live.type?live.x:p.world_x,py=live&&live.type?live.y:p.world_y;let cam=px-(r.u<=12?320:100);if(cam<0)cam=px+64;h.world.cam={x:cam,y:Math.max(0,py-100),w:256,h:192};const vp=c.chaos_vp_current();e.d12f=r.clock;e.d2e2=r.ev.includes('creator')?0:1;
  if(r.ev.includes('objects')){for(const s of b.slots)if(s.enemy&&s.type)c.chaos_aqz_enemy_visit(e,b,s,{},false,vp);if(e.d2e2===0)c.chaos_aqz_enemy_scan(e,b,vp);}
  const rec=e.enemies[0],s=rec.occupied?b.slots[rec.slot]:null;
  eq(!!s&&s.type!==0,r.o.length>0,'natural live '+p.index+'/'+r.u);
  if(r.o.length){const o=r.o[0];for(const [k,key] of Object.entries({type:'type',state:'state',requested:'req',frame:'frame',timer:'dur',x:'x',y:'y',vx:'vx',vy:'vy',counter:'counter',parameter:'parameter',token:'token'}))eq(s[k],o[key],'natural '+p.index+'/'+r.u+' '+k);eq(s.asleep,!!(o.f4&64),'natural asleep '+p.index+'/'+r.u);eq([s.xu&255,s.yu&255],o.fractions,'natural fractions');}
  naturalRows++;
 }
}

for(const typ of [60,61])for(const state of [14,15])for(let flags=0;flags<256;flags++)for(const inv of [false,true])for(const [dx,dy] of [[0,-21],[0,-13],[0,0],[0,24],[0,25],[-12,0],[12,0],[13,0]]){
 const p=D.placements.find(v=>parseInt(v.placement.type_id,16)===typ).placement,s=slot(p),k=c.SCR_cc_new(p.world_x+dx,p.world_y+dy);Object.assign(s,{ex:3,ey:typ===60?13:21,asleep:false});k.state=state;k.move=flags;g.powerInv=inv;
 const hit=c.chaos_aqz_enemy_contact(s,k,true,0),overlap=!(flags&64)&&Math.abs(dx)<=(state===15?12:11)&&dy>=-s.ey&&dy<=24;
 eq(hit,overlap?(typ===61&&((flags&2)||inv)?2:1):0,'flags/contact geometry');eq(k.stage_request,overlap&&typ===60?255:0,'forced vs attack');
}
for(const typ of [60,61])for(const width of [256,348,640])for(const delta of [-97,-96,-33,-32,0,width-1,width+31,width+32,width+95,width+96]){
 const p={type_id:'0x'+typ.toString(16),parameter:'0x00',world_x:1000+delta,world_y:150,index:1},s=slot(p),vp=c.chaos_vp_new(1000,0,width,192),env=c.chaos_aqz_env_new(1),pool={};s.asleep=false;s.script_state=1;s.state=1;s.requested=1;s.timer=8;s.callback=typ===60?0x9284:0x932b;
 c.chaos_aqz_enemy_visit(env,pool,s,{},false,vp);const life=c.chaos_vp_lifecycle_cell(vp,s.x,s.y);eq(s.asleep,life>=2,'canonical bands at each width');eq(s.type,life===3?254:typ,'no post-awake retention');
}
// Contact returns before dwell, integration and gravity. Sleep freezes active 3D, including dwell.
for(const timer of [0,1,32])for(const asleep of [false,true]){
 const p=D.placements.find(v=>v.placement.type_id==='0x3D').placement,s=slot(p),k=c.SCR_cc_new(p.world_x,p.world_y);Object.assign(s,{asleep,ex:3,ey:21,callback:0x932b,counter:timer,vx:192,vy:-512});k.move=0;g.powerInv=false;
 c.chaos_aqz_enemy_callback(s,k,true,0);eq([s.x,s.y,s.vx,s.vy,s.counter],[p.world_x,p.world_y,192,-512,timer],'sleep/contact freeze');
}
// Canonical cleanup releases a natural token, defeat retains spent occupancy through smoke and backtracking.
for(const defeated of [false,true]){
 h.reset();c.room=c.ROM_chaos_aqz1;c.chaos_level_install_layout();const e=g.chaosAqzEnv,b=g.chaosS2,p=D.placements.find(v=>v.placement.type_id==='0x3D').placement,vp=c.chaos_vp_new(p.world_x-320,p.world_y-100,256,192);
 c.chaos_aqz_enemy_register([p.index,p.world_x,p.world_y,61,0,4]);c.chaos_aqz_enemy_scan(e,b,vp);const r=e.enemies[0],s=b.slots[r.slot];eq(r.occupied,true);
 if(defeated){const k=c.SCR_cc_new(s.x,s.y);k.move=2;g.powerInv=false;Object.assign(s,{asleep:false,ex:3,ey:21});eq(c.chaos_aqz_enemy_contact(s,k,true,0),2);eq(s.type,15);for(let i=0;i<40;i++)if(s.type)c.chaos_aqz_enemy_visit(e,b,s,k,true,vp);}
 else{s.type=254;c.chaos_aqz_enemy_visit(e,b,s,{},false,vp);eq(s.type,255);c.chaos_aqz_enemy_visit(e,b,s,{},false,vp);eq(s.type,0);}
 c.chaos_aqz_enemy_scan(e,b,vp);eq(r.spent,defeated);eq(r.occupied,!defeated);if(!defeated)eq(b.slots[r.slot].parameter,4,'fresh raw initializer delay');
}
fs.mkdirSync(path.join(root,'build/aqz-p3'),{recursive:true});fs.writeFileSync(path.join(root,'build/aqz-p3/runtime-results.json'),JSON.stringify({assertions:checks,oracle_rows:rows,natural_rows:naturalRows},null,2));console.log({checks,rows,naturalRows});
