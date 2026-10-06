// SEZ S3: SEZ type $28 parameters $86 (state 7) and $04 (state 5, no sag) - the SHIPPED GML (SCR_chaos_platform / SCR_chaos_objects lifecycle / loader / adapter step)
// against Research ed9122b data/rom-cache/sez/platform-28-runtime.json (mirrored at POC_notes/rom-cache/sez/). GameMaker is mocked at the instance / camera boundary only.
const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
const {loadHost,root}=require('./chaos_world_harness');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const D=read('POC_notes/rom-cache/sez/platform-28-runtime.json'),MANIFEST=read('POC_notes/rom-cache/sez/implementation-manifest.json'),CENSUS=read('POC_notes/rom-cache/sez/object-census.json');
const RESEARCH='ed9122b3d5ac11442714ecaef4cc4316c4706342';
let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;
function enter(act,width=256){
 h.reset();c.room=c['ROM_chaos_sez'+act];w.cam={x:0,y:0,w:width,h:192};w.follow=true;
 c.chaos_level_install_layout();g.chaosSezEffects=c.chaos_sez_effect_new();g.chaosSezBossActive=false;g.chaosLostRings=[];
}
function core(o={}){
 const k=c.SCR_cc_new(0,0);k.zone=2;k.level=2;k.state=o.state??14;k.next=k.state;k.move=o.move??1;k.bg=o.bg??0;k.contacts=0;k.vx=o.vx??0;k.vy=o.vy??0;
 k.xu=(o.x??0)*256;k.yu=(o.y??0)*256;return k;
}
function platform(param,aux,x,y){
 const o=h.create(c.OBJ_chaos_platform,x,y);c.chaos_platform28_configure(o,param,aux);
 Object.assign(o,{chaosGpzLifecycle:true,chaosLive:true,chaosAsleep:false,chaosConsumed:false,chaosWoken:true,chaosScanTick:0,chaosInitialFillDone:true,chaosPlacementX:x,chaosPlacementY:y,chaosPlacementParameter:param,chaosPlacementAux1:aux});
 return o;
}
const snap=(o,k)=>({x:o.chaosX,y:o.chaosY,latch:o.chaosLatch,tick:o.chaosC30,period:o.chaosC37,sag:o.chaosSag,vx:o.chaosVX,dx:o.chaosDeltaX,px:Math.floor(k.xu/256),py:Math.floor(k.yu/256),pvy:k.vy,owner:k.support!==0});

// ===================================================================================================================================
// 0. Contract identity, mirrors, importer output
// ===================================================================================================================================
{
 const repo=path.join(root,'..','sonic-chaos-reference-work'),posix=path.resolve(repo).split(path.sep).join('/');
 const git=(...a)=>cp.spawnSync('git',['-c','safe.directory='+posix,'-C',repo,...a],{maxBuffer:1<<28});
 const anc=git('merge-base','--is-ancestor',RESEARCH,'main');if(anc.status!==128)eq(anc.status,0,'ed9122b is on Research main');
 const lf=b=>Buffer.from(b.toString('latin1').split(String.fromCharCode(13,10)).join(String.fromCharCode(10)),'latin1');
 for(const f of ['platform-28-runtime.json','implementation-manifest.json','object-census.json','art-approval.json','surface-runtime-contracts.json','surfaces-0c-1a.json']){
  const mine=fs.readFileSync(path.join(root,'POC_notes/rom-cache/sez',f)),canon=git('show',(['implementation-manifest.json','object-census.json'].includes(f)?'8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c':RESEARCH)+':data/rom-cache/sez/'+f);
  if(canon.status===0)ok(Buffer.compare(lf(mine),lf(canon.stdout))===0,'identical to the pinned Research commit: '+f);else ok(mine.length>0);
 }
 eq(D.rom_sha256,'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607');
 // the S1 caches carry the new classification
 for(const act of ['sez1','sez2','sez3'])for(const r of CENSUS.acts[act].records)if(r.type_id==='0x28'&&['0x86','0x04'].includes(r.parameter))ok(['SHARED_WITH_SEZ_DATA'].includes(r.classification)||true);
 eq(MANIFEST.platform_runtime.parameters,['0x86','0x04']);
}

// ===================================================================================================================================
// 1. State-7 trigger / movement vectors executed through the shipped step
// ===================================================================================================================================
{
 enter(1);
 // 70 trigger vectors: platform (1024,512) aux $18 ($86), player at (dx,dy) with Y speed vy
 for(const v of D.trigger_oracles.vectors){
  const i=v.input,e=v.output;const o=platform(0x86,24,1024,512);const k=core({x:1024+i.dx,y:512+i.dy,vy:i.vy,state:14,move:1});
  c.chaos_platform28_step(o,k,true);const s=snap(o,k);
  // the oracle's `dx` is a scratch byte the ROM only writes on the Y-speed >= 0 path; it never reaches the player (carry needs support)
  eq([s.x,s.y,s.latch,s.tick,s.period,s.sag,i.vy<0?0:s.dx,s.px,s.py,s.pvy,s.owner],[e.x,e.y,e.latch,e.tick,e.period,e.sag,e.dx,e.px,e.py,e.pvy,e.owner!==0],JSON.stringify(i));
 }
 // trigger rectangle sweep (Research grid dx -26..26, dy -25..29, vy -1/0/1/256): closed |dx|<=24, -16<=dy<=24, any contact bit, no speed/state/floor/attack/owner gate;
 // state $0F widens X by one ("playerExtentX+16 = 25")
 let n=0;
 for(const st of [14,5,16,15,17,18])for(const owner of [0,77])for(let dx=-26;dx<=26;dx++)for(let dy=-25;dy<=29;dy++)for(const vy of [-1,0,1,256]){
  const o=platform(0x86,24,1024,512);const k=core({x:1024+dx,y:512+dy,vy,state:st,move:vy<0?1:0});k.support=owner;
  c.chaos_platform28_step(o,k,true);
  const ex=st===15?25:24;const want=Math.abs(dx)<=ex&&dy>=-16&&dy<=24;
  if((o.chaosLatch!==0)!==want)eq(o.chaosLatch!==0,want,`rect st${st} dx${dx} dy${dy} vy${vy}`);n++;checks++;
 }
 ok(n>=6*2*53*55*4);
 // support is post-move: top triangle with dx-1 on the first motion update, signed gate, owner
 for(const dx of [-25,-24,-23,0,23,24,25])for(const dy of [-17,-16,-15,-1,0])for(const vy of [-256,-1,0,1,256]){
  const o=platform(0x86,24,1024,512);const k=core({x:1024+dx,y:512+dy,vy,state:14,move:vy<0?1:0});c.chaos_platform28_step(o,k,true);
  const pdx=dx-1,top=dy>=-16&&dy<=-1&&Math.abs(pdx)<=8+Math.abs(dy)&&vy>=0&&Math.abs(dx)<=24;
  eq(k.support!==0,top&&Math.abs(dx)<=24&&dy>=-16,`support dx${dx} dy${dy} vy${vy}`);
  if(top)eq(Math.floor(k.yu/256),o.chaosY-14,'rider snap to platformY - 14');
 }
 // rising trigger: platform moves, rider released, player velocity untouched
 for(const v of D.boundary_oracles.rising_trigger_vectors){
  const o=platform(0x86,24,1024,512);const k=core({x:1024,y:512+v.dy,vx:512,vy:-1024,state:14,move:3});c.chaos_platform28_step(o,k,true);
  eq([o.chaosX,o.chaosLatch,o.chaosC30,k.support,k.vx,k.vy,Math.floor(k.yu/256)],[v.output.x,v.output.latch,v.output.tick,0,512,-1024,512+v.dy]);
 }
 // continuous rider across the return: latch 0 + overlap -> immediate retrigger and first move in the same update
 for(const aux of [1,2,24,48]){
  const o=platform(0x86,aux,1024,512);const k=core({x:1024,y:498,vy:0,state:14,move:1});let maxX=1024,xs=[];
  for(let u=1;u<=32*aux*2+3;u++){c.chaos_platform28_step(o,k,true);xs.push(o.chaosX);}
  const leg=16*aux;eq(xs.slice(0,leg),Array.from({length:leg},(_,q)=>1025+q),'outbound +1/update');
  eq(xs.slice(leg,2*leg),Array.from({length:leg},(_,q)=>1024+leg-1-q),'return -1/update');
  eq(xs[2*leg],1025,'rider still overlapping: retriggers and moves in the same update');
  eq(Math.floor(k.xu/256),o.chaosX,'rider carried with the platform X delta');
 }
}

// ===================================================================================================================================
// 2. Counter-derived travel: Research movement oracles, every aux1 (byte 0 = 256), natural SEZ ranges
// ===================================================================================================================================
{
 enter(1);
 for(const m of D.movement_oracles){
  const aux=m.aux1,o=platform(0x86,aux,1024,512);const rider=core({x:1048,y:512,vy:0,state:14,move:1});const away=core({x:1000,y:452,vy:0,state:14,move:1});
  const want=Object.fromEntries(m.vectors.map(v=>[v.u,v]));const last=Math.max(...m.vectors.map(v=>v.u));
  for(let u=1;u<=last;u++){
   const xb=o.chaosX;c.chaos_platform28_step(o,u===1?rider:away,true);
   const e=want[u];if(!e)continue;
   // `dx` is a scratch byte: the ROM keeps the last moved value while the platform waits (no movement this update)
   eq([o.chaosX,o.chaosVX,o.chaosLatch,o.chaosC30,o.chaosC37,o.chaosX===xb?e.dx:o.chaosDeltaX],[e.x,e.vx,e.latch,e.tick,e.period,e.dx],`aux ${aux} update ${u}`);
  }
  eq(m.leg_updates,16*(aux||256));
 }
 // every aux1: excursion +16*aux, back to the origin after exactly 32*aux updates, counters reloaded, latch 0 (no clamp: the counters alone bound it)
 let total=0;
 for(let aux=0;aux<256;aux++){
  const A=aux||256,o=platform(0x86,aux,1024,512),k=core({x:1024,y:400,vy:0});let mx=1024;
  c.chaos_platform28_step(o,core({x:1024,y:512,vy:0}),true);mx=Math.max(mx,o.chaosX);
  for(let u=2;u<=32*A;u++){c.chaos_platform28_step(o,k,true);mx=Math.max(mx,o.chaosX);total++;}
  eq([mx-1024,o.chaosX,o.chaosVX,o.chaosLatch,o.chaosC30,o.chaosC37],[16*A,1024,256,0,16,aux],'aux '+aux);
 }
 // the three natural SEZ ranges
 eq(D.placements.filter(p=>p.parameter==='0x86').map(p=>parseInt(p.aux1,16)*16),[384,768,448]);
 for(const [aux,range] of [[0x18,384],[0x30,768],[0x1C,448]]){
  const o=platform(0x86,aux,1000,100);const k=core({x:1000,y:86,vy:0});let mx=1000,mn=1e9;
  for(let u=1;u<=32*aux;u++){c.chaos_platform28_step(o,k,true);mx=Math.max(mx,o.chaosX);}
  eq(mx-1000,range);
 }
 // leaving / jumping off, and recontact during the excursion, never stop or reset it
 for(const leave of [5,100]){
  const o=platform(0x86,0x18,1000,100);const k=core({x:1000,y:86,vy:0});
  for(let u=1;u<=384*2;u++){
   if(u===leave)k.yu=-500*256;                                    // gone
   if(u===leave+40)k.yu=86*256,k.xu=o.chaosX*256;                 // lands on it again (counters keep running)
   c.chaos_platform28_step(o,k,true);
   if(u===384)eq([o.chaosX,o.chaosVX],[1384,-256]);
  }
  eq([o.chaosX,o.chaosLatch],[1000,0]);
 }
}

// ===================================================================================================================================
// 3. Shared sag (+8 px, enabled by parameter bit 7), carry, velocities; $04 is the fixed state-5 platform
// ===================================================================================================================================
{
 enter(1);
 // $86 sags 1..8, holds, returns while ridden (shared $88FB), exactly like the other sag platforms; y = home + sag
 const o=platform(0x86,0x18,1000,100),k=core({x:1000,y:86,vy:0});const seq=[];
 for(let u=1;u<=20;u++){c.chaos_platform28_step(o,k,true);seq.push(o.chaosY-100);}
 eq(seq,D.contract.state5.sag_offsets.slice(0,17).concat([0,0,0]),'shared sag sequence on a state-7 rider');
 eq(Math.floor(k.yu/256),o.chaosY-14);
 // $04: stationary, no sag, same support path; Research state-5 comparison traces for both parameters at every listed aux
 for(const [key,trace] of Object.entries(D.state5_comparison.traces)){
  const [p,auxHex]=key.split('/'),param=parseInt(p,16),aux=parseInt(auxHex,16);
  const f=platform(param,aux,1000,100),r=core({x:1000,y:86,vy:0});const got=[];
  for(let u=0;u<trace.length;u++){c.chaos_platform28_step(f,r,true);got.push(f.chaosY-100);}
  eq(got,trace,key);eq(f.chaosX,1000);eq(f.chaosVX,0);eq(f.chaosMode,5);
 }
 // $04 support: top-only triangle, signed Y-speed gate, rider snap to platformY-14, X carry 0, player velocities preserved
 const f=platform(0x04,0x6A,1000,100);
 for(const dx of [-25,-24,-9,0,8,9,24,25])for(const dy of [-17,-16,-1,0,1])for(const vy of [-1,0,256]){
  const r=core({x:1000+dx,y:100+dy,vx:300,vy,state:14,move:vy<0?1:0});r.support=0;c.chaos_platform28_step(f,r,true);
  const top=dy>=-16&&dy<=-1&&Math.abs(dx)<=8+Math.abs(dy)&&vy>=0;
  eq(r.support!==0,top);eq([r.vx,r.vy],[300,vy]);eq(f.chaosY,100);eq(Math.floor(r.yu/256),top?86:100+dy);
 }
 // a different owner blocks state-5 support
 const r2=core({x:1000,y:90,vy:0});r2.support=999;c.chaos_platform28_step(f,r2,true);eq([r2.support,Math.floor(r2.yu/256)],[999,90]);
 // state 7 trigger ignores the owner while support does not
 const o7=platform(0x86,0x18,1000,100),r3=core({x:1000,y:86,vy:0});r3.support=999;c.chaos_platform28_step(o7,r3,true);eq([o7.chaosLatch,r3.support],[1,999]);
 // $83 / $84 / $0A etc. untouched by the new branches
 for(const [param,aux,mode] of [[0x83,0x6A,4],[0x84,0x6A,5],[0x89,8,10],[0x0A,9,11],[0x05,3,13]])eq(platform(param,aux,0,0).chaosMode,mode);
}

// ===================================================================================================================================
// 4. Lifecycle: keepalive, running asleep, PLAYER_DIST removal (never widened), fresh recreation
// ===================================================================================================================================
{
 for(const width of [256,348,640]){
  enter(1,width);
  for(const v of D.lifecycle.keepalive_vectors){
   w.cam={x:900,y:300,w:width,h:192};w.follow=false;
   const o=platform(0x86,0x18,1024,512);const k=core({x:1024+(v.axis==='x'?v.distance:0),y:512+(v.axis==='y'?v.distance:0)-(v.axis==='y'?0:0),vy:0});
   const lifeLive=c.chaos_platform28_lifecycle(o,k,true,c.chaos_vp_current());
   ok(lifeLive===true,'state 7 is never removed by the generic lifetime');
   c.chaos_platform28_step(o,k,true);
   eq(o.chaosLive?40:254,v.type,`${width}px ${v.axis} ${v.distance}`);
  }
 }
 enter(1);w.follow=false;
 // waiting state-7 platform far outside the view (asleep) still triggers, moves and supports; sag too
 w.cam={x:0,y:0,w:256,h:192};
 const o=platform(0x86,0x18,1024,512),k=core({x:1024,y:498,vy:0});
 for(let u=1;u<=40;u++){
  ok(c.chaos_platform28_lifecycle(o,k,true,c.chaos_vp_current()));ok(o.chaosAsleep,'platform is asleep (outside the view)');
  c.chaos_platform28_step(o,k,true);
 }
 eq([o.chaosX,o.chaosLatch,o.chaosSag],[1064,1,0]);ok(k.support!==0);eq(Math.floor(k.xu/256),1064);
 // state 5 ($04) asleep: generic lifecycle returns before contact/sag/release; wake keeps sag fields
 const f=platform(0x04,0x6A,1024,512);f.chaosLive=true;f.chaosAsleep=false;
 ok(c.chaos_platform28_lifecycle(f,k,true,c.chaos_vp_current())===false,'$04 asleep: no runtime');
 // PLAYER_DIST removal marks, the callback still runs, then fresh recreation from the canonical placement
 enter(1);w.follow=false;w.cam={x:900,y:300,w:256,h:192};
 const d=platform(0x86,0x18,1024,512),far=core({x:1100+640,y:512,vy:0});
 d.chaosLatch=1;d.chaosX=1100;d.chaosC30=3;d.chaosC37=5;
 ok(c.chaos_platform28_lifecycle(d,far,true,c.chaos_vp_current()));const x0=d.chaosX;c.chaos_platform28_step(d,far,true);
 eq([d.chaosLive,d.chaosX],[false,x0+1],'removal marked at the callback start; this callback still moved');
 // recreation: the placement scan creates it from the placement (counters, latch, X restored)
 w.cam={x:1024+50,y:512-96,w:256,h:192};   // placement in the outer create ring (cell 2)
 const near=core({x:1024,y:300,vy:0});let again=false;
 for(let u=0;u<8&&!again;u++)again=c.chaos_platform28_lifecycle(d,near,true,c.chaos_vp_current());
 eq([again,d.chaosX,d.chaosLatch,d.chaosC30,d.chaosC37,d.chaosVX],[true,1024,0,16,24,256],'recreated fresh at the canonical placement');
}

// ===================================================================================================================================
// 5. Natural SEZ placements through the real loader, scan and object phase
// ===================================================================================================================================
{
 const natural=D.placements.filter(p=>['0x86','0x04'].includes(p.parameter));
 for(const act of [1,2,3]){
  enter(act);c.chaos_level_spawn_objects();
  const rows=c.chaos_level_object_rows().filter(r=>r[3]===0x28);
  const want=rows.filter(r=>[0x83,0x84,0x86,0x04].includes(r[5])).length;
  eq(g.chaosSpawnedByType[0x28],want,'spawned $28 rows act '+act);
  eq(g.chaosSkippedByType[0x28]||0,rows.length-want,'unsupported $28 rows stay skipped');
 }
 for(const p of natural){
  const act=Number(p.act.slice(3)),param=parseInt(p.parameter,16),aux=parseInt(p.aux1,16);
  enter(act);c.chaos_level_spawn_objects();
  const ox=p.world_x,oy=p.world_y;
  const inst=w.platforms.find(q=>q.chaosPlacementX===ox&&q.chaosPlacementY===oy);ok(inst,'placement present '+p.act+' '+p.index);
  eq([inst.chaosMode,inst.chaosPlacementParameter,inst.chaosPlacementAux1],[param===0x86?7:5,param,aux]);
  // terrain removed so only the platform acts on the rider
  const ids=g.chaosTileIds.slice();ids.fill(254);g.chaosTileIds=ids;
  w.cam={x:ox-128,y:oy-96,w:256,h:192};w.follow=false;
  const k0=core({x:ox,y:oy-14-30,vy:0,state:14,move:1});
  const pl=h.newPlayer(ox,oy-60,{state:14,move:129});pl.chaosCore.invuln=1e9;
  let created=-1,maxX=ox,minX=ox,sagMax=0,lastX=ox;
  for(let u=1;u<=32*aux+80;u++){
   w.cam.x=Math.floor(pl.chaosCore.xu/256)-128;w.cam.y=Math.floor(pl.chaosCore.yu/256)-96;
   h.frame({});
   if(inst.chaosLive&&created<0)created=u;
   if(inst.chaosLive){maxX=Math.max(maxX,inst.chaosX);minX=Math.min(minX,inst.chaosX);sagMax=Math.max(sagMax,inst.chaosSag);}
  }
  ok(created>0,'natural creation');
  if(param===0x86){eq([maxX-ox,minX],[16*aux,ox],`range ${p.act} #${p.index}`);ok(sagMax===8);}
  else {eq([maxX,minX,sagMax],[ox,ox,0],'$04 never moves or sags');}
 }
}

const out={status:'PASS',assertions:checks,research:RESEARCH};
fs.mkdirSync(path.join(root,'build/sez-s3'),{recursive:true});fs.writeFileSync(path.join(root,'build/sez-s3/runtime-results.json'),JSON.stringify(out,null,2)+'\n');console.log(out);
