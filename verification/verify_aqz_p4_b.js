// Historical rejected B clamp fixture. Superseded by verify_aqz_p4_c.js.
const fs=require('fs'),path=require('path'),assert=require('assert'),{loadHost,root}=require('./chaos_world_harness');
const h=loadHost(),c=h.ctx,w=h.world,g=h.g;let checks=0,envelopes=[];
function eq(a,b,m){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;}
function yes(a,m){assert(a,m);checks++;}
w.roomWidth=2560;w.roomHeight=512;
const meta=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/art-approval.json')));
// Approved opaque SAT bounds, in coordinates relative to the canonical anchor.
const child=meta.subjects['5A-child'];
for(let W of [256,348,640]){
 const vp=c.chaos_vp_new(1727,78,W,192),b=c.chaos_59_new(),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},s=c.chaos_59_slot(90,0,1856,238,0),k=c.SCR_cc_new(1743,238);pool.slots[8]=s;b.viewport_w=W;
 let first=null,trajectory=[];
 // Run the shipped slot scheduler, initialization, scripts, movement and lifecycle.
 for(let u=0;u<300;u++){
  c.chaos_59_visit(b,pool,8,k,true,vp);
  eq(s.view_dx,W-256,'explicit EDGE translation');
  if(u===0)eq([c.chaos_59_x(s),c.chaos_59_view_x(s)-vp.left],[2048,W+65],'source anchor / entry edge');
  const sx=c.chaos_59_view_x(s)-vp.left;
  if(!s.asleep&&s.frame!==0){
   // These frames have approved pieces; the source registration adds +1 X.
   const f=child.frames.find(f=>f.frame===s.frame);
   yes(!!f,'approved visible frame');
   const [minX,maxX]=require('./aqz-p4/5a-visible-bounds.json')[s.frame];
   if(first===null&&sx+minX<W&&sx+maxX>=0)first={u,left:sx+minX,right:sx+maxX};
  }
  trajectory.push([s.xu,s.yu,s.vx,s.vy,s.state,s.requested,s.hp,s.counter,s.cooldown]);
 }
 yes(first!==null,'child enters');eq(first.left,W-1,'first visible entry at rightmost column');
 if(W===256)global.referenceTrajectory=trajectory;else eq(trajectory,global.referenceTrajectory,'all child source motion/timing unchanged');
 b.main_arena=true;
 let clamp=c.chaos_59_clamp_player(b,vp,-100000,1),right=c.chaos_59_clamp_player(b,vp,10000000,1);
 eq([clamp.xu/256-vp.left,right.xu/256-vp.left],W===256?[16,247]:[19,236],'player envelope');
 for(let x=19;x<=236;x++){
  const bossX=Math.min(208,Math.max(47,x)),boss=c.chaos_59_slot(89,0,vp.left+bossX,160,0),player=c.SCR_cc_new(vp.left+x,160);boss.ex=20;boss.ey=64;
  yes(c.chaos_59_bits(boss,player)!==0,'unchanged geometry reaches every wide allowed X');
 }
 const bound=c.chaos_59_camera_bound(2560,W);eq(bound,2560-W,'world right edge');
 const core=c.SCR_cc_new(1856,238),boss=c.chaos_59_slot(89,0,1856,160,1);boss.limit_right=2304;core.contacts=2;
 c.chaos_59_viewport_callback(b,pool,boss,0x81BD,core,true,vp);eq([b.camera_right,core.next,boss.type,boss.parameter],[bound,32,15,0],'clear adapter without sequence change');eq(g.chaosBossNextAct,{zone:5,act:0});
 // Sweep both sides of the bound; camera output and state20 threshold remain edge-relative.
 for(let cam=bound-8;cam<=bound+8;cam++){
  b.camera_left=1727;b.camera_right=bound;let next=c.chaos_59_post_clear_x(b,W,Math.min(cam,bound),3000,false);yes(next<=bound,'post-clear camera bound');
 }
 eq(c.chaos_goal_clear_dx(W),W+33,'state20 full right-edge run-off');
 envelopes.push({width:W,player_before:[16,W-9],player_after:W===256?[16,247]:[19,236],boss_anchor:[47,208],boss_contact:[19,236],child_entry:W+65,first_visible:first,camera_right:bound,clear_dx:W+33});
}
// Exercise the actual camera driver at and beyond the world boundary.
for(let W of [256,348,640]){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;c.chaos_level_install_layout();const b=c.chaos_59_new();g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:4,camera_left:1727,camera_right:2560-W,camera_owned:true});h.newPlayer(2400,238,{state:32});
 for(let x of [1727,2560-W-1,2560-W,2560-W+32]){w.cam={x,y:78,w:W,h:192};c.chaos_59_camera_step();yes(w.cam.x<=2560-W,'actual camera output respects world edge');}
}
// Exact state20 clear threshold at the corrected final camera boundary.
for(let W of [256,348,640])for(let dx of [W+32,W+33]){
 const k=c.SCR_cc_new(2560-W+dx,238);k.state=32;k.next=32;k.camera_x=2560-W;k.clear_dx=c.chaos_goal_clear_dx(W);g.chaosMapWidth=80;
 c.SCR_cc_state32_tick(k);eq(k.act_clear,dx===W+33,'state20 clears only beyond full world right edge+33');
}
// Measure extrema from real main-boss jumps and cached renderer-X feedback.
for(let W of [256,348,640]){
 let seen=new Set();
 for(let side of [19,236]){
  const b=c.chaos_59_new(),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},s=c.chaos_59_slot(89,0,1856,238,1),k=c.SCR_cc_new(1727+side,238),vp=c.chaos_vp_new(1727,78,W,192);
  Object.assign(s,{state:9,requested:9,vx:-160,vy:-1536,hp:10,keep:true,sx:129});pool.slots[7]=s;
  for(let i=0;i<1800;i++){c.chaos_59_visit(b,pool,7,k,true,vp);s.sx=c.chaos_59_x(s)-vp.left;seen.add(s.sx);k.xu=(1727+side)*256;k.yu=238*256;}
 }
 eq([Math.min(...seen),Math.max(...seen)],[47,208],'measured unchanged boss route');
 for(let x=47;x<=208;x++)yes(seen.has(x),'route visits every integer anchor');
}
// Translation carries the original child box and facing comparison as one unit.
for(let W of [256,348,640])for(let flags of [0,2,64,128])for(let dx of [-13,-12,0,12,13])for(let dy of [-33,-32,0,24,25]){
 const a=c.chaos_59_slot(90,0,2048,238,0),b=c.chaos_59_slot(90,0,2048,238,0);a.ex=b.ex=4;a.ey=b.ey=32;b.view_dx=W-256;
 const ka=c.SCR_cc_new(2048+dx,238+dy),kb=c.SCR_cc_new(2048+W-256+dx,238+dy);ka.move=kb.move=flags;
 eq(c.chaos_59_bits(a,ka),c.chaos_59_bits(b,kb),'translated canonical child contact geometry');c.chaos_59_face(a,ka,128);c.chaos_59_face(b,kb,128);eq(a.vx,b.vx,'translated canonical child facing');
}
// Combat can start before pan arrival: preserve entry from the live right edge.
let panReference=null;
for(let W of [256,348,640]){
 const b=c.chaos_59_new(),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},s=c.chaos_59_slot(90,0,1856,238,0),k=c.SCR_cc_new(1743,238),vp=c.chaos_vp_new(1500,78,W,192);pool.slots[8]=s;b.pan_x=1728;b.pan_y=78;let first=null;
 for(let u=0;u<300;u++){
  c.chaos_59_visit(b,pool,8,k,true,vp);vp.left=c.chaos_59_pan(b,vp,vp.left,78)[0];
  if(!s.asleep&&s.frame!==0){let bounds=require('./aqz-p4/5a-visible-bounds.json')[s.frame],left=c.chaos_59_view_x(s)-vp.left+bounds[0];if(first===null&&left<W)first=[u,left-W];}
 }
 yes(first!==null,'entry while camera pans');yes(first[1]>=-2&&first[1]<=-1,'only edge pixels appear during one-pixel pan');
 if(W===256)panReference=first;else eq(first,panReference,'pan/entry remains canonical relative to right edge');
}
fs.mkdirSync(path.join(root,'build/aqz-p4-b'),{recursive:true});fs.writeFileSync(path.join(root,'build/aqz-p4-b/viewport-results.json'),JSON.stringify({assertions:checks,envelopes},null,2));console.log({checks,envelopes});
