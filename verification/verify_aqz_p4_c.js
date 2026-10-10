const fs=require('fs'),vm=require('vm'),assert=require('assert'),{loadHost,hex,root}=require('./chaos_world_harness');
let checks=0;const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;},yes=(a,m)=>{assert(a,m);checks++;};
const h=loadHost(),c=h.ctx,w=h.world,g=h.g,bounds=require('./aqz-p4/5a-visible-bounds.json');const report={widths:[],jumps:[],projectiles:[],intro:[]};
for(const W of [256,348,640]){
 const vp=c.chaos_vp_new(1727,78,W,W===348?196:192),b=c.chaos_59_new();
 let lo=c.chaos_goal_clamp_player(vp,0,-1),hi=c.chaos_goal_clamp_player(vp,9999999,1);eq([lo.xu/256-1727,hi.xu/256-1727],[16,W-9],'full-width shared player envelope');
 for(let x=16;x<=W-9;x++)eq(c.chaos_goal_clamp_player(vp,(1727+x)*256,256).hit,false,'no interior wall');
 report.widths.push({width:W,player:[16,W-9],boss_anchor:[47,208],boss_body_contact:[19,236]});
 // Shot from the unchanged body route: prove the left body dead strip is ranged-covered.
 let covered=[];
 for(let target=16;target<=W-9;target++){
  let hit=false;
  for(let bx=47;bx<=208&&!hit;bx+=4){
   let s=c.chaos_59_slot(93,0,1727+bx-8,206,0),k=c.SCR_cc_new(1727+target,238),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())};
   c.chaos_59_callback(b,pool,s,0xAEE9,k,true,vp);s.frame=24;c.chaos_59_load_frame(s);
   eq([s.vx,s.vy],[-576,0],'canonical projectile initial velocity');
   for(let u=0;u<200&&s.type===93;u++){
    c.chaos_59_callback(b,pool,s,0xAF1E,k,true,vp);
    if(k.stage_request===255)hit=true;
    c.chaos_59_lifecycle(b,s,vp);
    const x=c.chaos_59_x(s),y=c.chaos_59_y(s);
    if(x>=vp.left&&x<vp.left+W&&y>=vp.top&&y<vp.top+256)yes(!s.asleep&&s.type===93,'no deletion inside active wide viewport');
   }
  }
  if(hit)covered.push(target);
 }
 for(let x=16;x<19;x++)yes(covered.includes(x),'projectiles cover left body dead strip');
 report.projectiles.push({width:W,covered_player_x:covered,velocity_x:-2.25,steering:8/256,lifecycle:'shared viewport bands; no new retention needed'});
}
// Full source slot scripts while a one-pixel pan finishes. Entry translation is fixed once.
for(const W of [256,348,640])for(const start of [1444,1540,1696,1727]){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:start,y:138,w:W,h:W===348?196:192};c.chaos_level_install_layout();
 let b=c.chaos_59_new(),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},k=c.SCR_cc_new(0,238);k.move=64;g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78,camera_owned:true});
 h.newPlayer(1743,238,{state:1,move:0,bg:2});let first=[],settled=-1,translations={},source=[];
 for(let u=0;u<1000;u++){
  if(u<384&&u%64===0)pool.slots[8+u/64]=c.chaos_59_slot(90,0,1856,238,0);
  let vp=c.chaos_vp_current();
  for(let i=8;i<14;i++){
   let s=pool.slots[i];if(!s.type)continue;c.chaos_59_visit(b,pool,i,k,true,vp);
   if(translations[i]===undefined){translations[i]=s.view_dx;eq(c.chaos_59_x(s),2048,'canonical child initializer WORLD anchor');}else eq(s.view_dx,translations[i],'no live translation/rebase');
   source.push([u,i,s.xu,s.yu,s.vx,s.vy,s.state,s.requested,s.counter]);
  }
  c.chaos_59_camera_step();vp=c.chaos_vp_current();
  if(settled<0&&vp.left===1727&&vp.top===78)settled=u;
  for(let i=8;i<14;i++){
   let s=pool.slots[i];if(!s.type||!s.frame||s.asleep||(W>256&&!b.intro_ready)||first.some(f=>f.slot===i))continue;
   let [min,max]=bounds[s.frame],sx=c.chaos_59_view_x(s)-vp.left;
   if(sx+min<W&&sx+max>=0){first.push({slot:i,u,camera:vp.left,left:sx+min});if(W>256){yes(u>=settled+16,'stable camera pause before first visibility');eq(vp.left,1727,'entry only after settled camera');eq(sx+min,W-1,'first opaque column enters at extreme right');}}
  }
 }
 eq(first.length,6,'all six children enter');
 const key='source'+start;if(W===256)global[key]=source;else eq(source,global[key],'source timing and trajectory identical at both widths');
 report.intro.push({width:W,start,settled,translation:translations,first});
 // Fixed wide camera throughout the real $20 run-off, no wall or moved world.
 const boss=c.chaos_59_slot(89,0,1856,238,1);boss.limit_right=2304;k.contacts=2;
 c.chaos_59_viewport_callback(b,pool,boss,0x81BD,k,true,c.chaos_vp_current());
 eq([k.next,boss.type,boss.parameter],[32,15,0],'canonical clear sequencing');
 if(W===256)eq(b.camera_right,2304,'canonical right limit');
 else {
  const p=w.player,core=p.chaosCore;core.state=core.next=32;core.move=0;core.xu=1856*256;core.yu=238*256;p.x=1856;p.y=243;p.chaosCoreLastX=p.x;p.chaosCoreLastY=p.y;
  for(let u=0;u<180;u++){h.frame({});c.chaos_59_camera_step();eq([w.cam.x,w.cam.y],[1727,78],'wide clear camera stationary');yes(w.cam.x<=2560-W,'no beyond-world view');if(core.act_clear)break;}
  yes(core.act_clear,'existing state20 clears');yes(core.xu/256>=1727+W+33,'full EDGE(RIGHT,+33) run');
 }
}
const contactOracle=[];let captureContact=false;
const contactCore=c.chaos_59_combat_contact;
c.chaos_59_combat_contact=function(b,s,k,present,vp){
 const before={s:JSON.parse(JSON.stringify(s)),k:JSON.parse(JSON.stringify(k)),present};
 const bits=contactCore(b,s,k,present,vp);
 if(captureContact)contactOracle.push({before,after:{hp:s.hp,cooldown:s.cooldown,vx:k.vx,vy:k.vy,next:k.next}});
 return bits;
};
// Honest one-button jump episodes through shipped player physics and slot scheduler.
for(const W of [256,348,640])for(const side of [-1,1])for(const dist of [28,40,64,96])for(const hold of [1,14,240]){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:1727,y:78,w:W,h:W===348?196:192};c.chaos_level_install_layout();
 const b=c.chaos_59_new();g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78,camera_left:1727,camera_right:1728});
 const s=c.chaos_59_slot(89,0,1856,238,1);Object.assign(s,{state:9,requested:9,frame:2,ex:20,ey:64,hp:10,counter:255,keep:true,sx:129,vx:side===-1?-160:160,vy:-1536});g.chaosS2.slots[7]=s;
 captureContact=W===256;
 const p=h.newPlayer(1856+side*dist,238,{state:5,move:0,bg:2,contacts:2,vx:-side*768});let events=[],hits=0;
 for(let u=0;u<240;u++){
  let hp=s.hp,cd=s.cooldown;h.frame({left:side===1,right:side===-1,jump:u<hold,jumpPress:u===0});let k=p.chaosCore;
  if(hp!==s.hp){hits++;eq(s.cooldown,16,'canonical hit cooldown');eq(s.hp,(hp-1)&255,'single HP decrement');}
  if(hp!==s.hp||cd!==s.cooldown)events.push([u,hp,s.hp,cd,s.cooldown,k.xu,k.yu,k.state,k.next,s.state,s.requested]);
  if(u>1&&!(k.move&1))break;
 }
 yes(hits<=1,'unpinned jump cannot drain boss');
 const key=JSON.stringify([side,dist,hold]);if(W===256)global[key]=events;else eq(events,global[key],'wide jump contact/cooldown trace equals canonical-width trace');
 report.jumps.push({width:W,side,dist,hold,hits,transitions:events});
}
fs.mkdirSync(root+'/build/aqz-p4-c',{recursive:true});fs.writeFileSync(root+'/build/aqz-p4-c/jump-contact-inputs.json',JSON.stringify(contactOracle));fs.writeFileSync(root+'/build/aqz-p4-c/viewport-results.json',JSON.stringify({assertions:checks,...report},null,2));console.log({checks,jumps:report.jumps.length});
