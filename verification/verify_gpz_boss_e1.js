// E.1 adapters exercise shipped GML; movement remains checked against Research.
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const {loadHost,root}=require('./chaos_world_harness');
const h=loadHost(),c=h.ctx,w=h.world;
c.room=c.ROM_chaos_gpz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;
const o=h.create(c.OBJ_chaos_object_51,1728,270),b=o.chaosBoss51;b.active=true;
h.newPlayer(1800,270,{state:1,move:0,contacts:2});
let checks=0;const eq=(a,z)=>{assert.deepEqual(a,z);checks++;};
// Both pan and locked modes converge, preserve the same right edge and ready gate.
for(const width of [256,640])for(const mode of [2,3]){
 w.cam={x:1100,y:170,w:width,h:192};b.camera_mode=mode;
 for(let i=0;i<600;i++)c.chaos_51_camera_step();
 eq([w.cam.x,w.cam.y,w.cam.x+width],[1663-(width-256),96,1919]);
 b.viewport_w=width;const s=c.chaos_51_slot(0xD700,81,0,1856,270);
 c.chaos_51_callback(b,s,0x9AF7,w.player.chaosCore,false);eq([s.timer,s.pc],[1,0x9A90]);
 eq(c.chaos_51_x(b.head),1728); // camera never writes controller coordinates
}
// Every 16-bit anchor retains the exact original split-byte rule at 256.
b.viewport_w=256;
for(let x=0;x<65536;x++)for(const left of [false,true]){
 const s=c.chaos_51_slot(0xD740,81,1,x,270);s.frame=7;
 eq(c.chaos_51_detached_remove(b,s,left),left?((x&255)<64&&(x>>8)<7):((x&255)>=128&&(x>>8)>=7));
}
// Both sides, both directions, all detached frames: delete only after alpha
// pixels leave the viewport. Include a temporarily unframed 640 view as well.
const bounds=[[-10,12],[-9,12],[-9,13],[-9,12],[-11,13],[-10,11],[-10,11]];
for(const viewLeft of [1279,1663])for(let frame=3;frame<=9;frame++)for(const left of [false,true]){
 b.viewport_w=640;b.camera_x=viewLeft;const [l,r]=bounds[frame-3];
 for(let x=viewLeft-20;x<=viewLeft+660;x++){
  const s=c.chaos_51_slot(0xD740,81,1,x,270);s.frame=frame;
  eq(c.chaos_51_detached_remove(b,s,left),x+r<=viewLeft||x+l>=viewLeft+640);
 }
}
// Adapter cannot change arc/slide integration, mode acceleration or bounce.
for(const pc of [0x9FD2,0xA005,0xA06A,0xA087])for(const mode of [0,1,2])for(const y of [230,270]){
 const a=c.chaos_51_new(),z=c.chaos_51_new();a.head.mode=z.head.mode=mode;
 z.viewport_w=640;z.camera_x=1279;
 const s=c.chaos_51_slot(0xD740,81,1,1800,y),t=c.chaos_51_slot(0xD740,81,1,1800,y);
 s.frame=t.frame=7;s.vx=t.vx=pc===0x9FD2||pc===0xA06A?-384:384;s.vy=t.vy=-256;
 c.chaos_51_callback(a,s,pc,w.player.chaosCore,false);c.chaos_51_callback(z,t,pc,w.player.chaosCore,false);
 eq([t.xu,t.yu,t.vx,t.vy],[s.xu,s.yu,s.vx,s.vy]);
}
// Clear presentation trace: request is deferred; the active $20 handler owns
// right facing and run animation even when inherited move bits still attack.
const traces=[];
for(const state of [1,9,15,30])for(const width of [256,640]){
 const a=loadHost(),q=a.ctx,v=a.world,g=a.g;q.room=q.ROM_chaos_gpz3;
 v.roomWidth=2560;v.roomHeight=512;v.follow=false;v.cam={x:1663-(width-256),y:96,w:width,h:192};
 q.chaos_level_install_layout();g.minutes=1;g.seconds=0;g.ring=20;g.chaosDebugSession=true;
 const obj=a.create(q.OBJ_chaos_object_51,1728,270),boss=obj.chaosBoss51;boss.active=true;boss.camera_mode=3;
 const p=a.newPlayer(1800,270,{state,move:state===1?0:2,vx:-256,contacts:2,bg:2});
 const core=p.chaosCore;core.player_flags=16;p.image_xscale=-1;
 core.previous=q.SCR_cc_lookup(1800,288,0).flags;q.SCR_chaos_core_sprites(p);p.image_index=2;
 const rows=[];
 const snap=phase=>rows.push({phase,state:core.state,requested:core.next,animation:core.anim?JSON.parse(JSON.stringify(core.anim)):null,
  sprite:p.sprite_index,sprite_name:Object.keys(q).find(k=>k.startsWith('SPR_')&&q[k]===p.sprite_index),frame:p.image_index,movement_flags:core.move,player_flags:core.player_flags,
  facing:p.image_xscale,vx:core.vx,vy:core.vy,x:core.xu,y:core.yu});
 snap('before_floor_gate');q.chaos_51_callback(boss,boss.head,0x9D26,core,true);snap('requested_20');
 eq(core.state,state);eq(core.next,32);eq(rows[1].sprite,rows[0].sprite);
 for(let i=0;i<6;i++){a.frame({left:true,down:true});snap('player_update_'+i);
  eq([core.state,core.next,p.image_xscale,p.image_angle],[32,32,1,0]);
  eq(p.sprite_index,q.SPR_player_walk);eq(core.vy,0);
 }
 eq(rows[2].frame,rows[0].sprite===q.SPR_player_walk?2:0); // reset only on sprite change
 traces.push({state,width,rows});
}
fs.mkdirSync(path.join(root,'verification/gpz-boss'),{recursive:true});
fs.writeFileSync(path.join(root,'verification/gpz-boss/e1-transition-trace.json'),JSON.stringify(traces,null,2)+'\n');
console.log(`GPZ E.1: ${checks} checks; 256/640 framing, exhaustive 256 deletion, both 640 edges, motion parity and clear presentation PASS`);
