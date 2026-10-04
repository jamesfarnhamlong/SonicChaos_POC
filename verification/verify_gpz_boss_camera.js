// Accepted 256 control plus explicit native widescreen camera adapters.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert').strict;
const {loadHost,root,hex}=require('./chaos_world_harness');
const file=path.join(root,'verification/gpz-boss/e2-camera-control.json');
function setup(width,height){const h=loadHost(),c=h.ctx;c.room=c.ROM_chaos_gpz3;
 h.world.roomWidth=2560;h.world.roomHeight=512;h.world.follow=false;
 const o=h.create(c.OBJ_chaos_object_51,1728,270);o.chaosBoss51.active=true;
 const p=h.newPlayer(1800,270,{state:1,move:0,contacts:2});return {h,c,b:o.chaosBoss51,p,width,height};}
function control(old=false){const a=setup(256,192),rows=[];
 if(old)vm.runInContext(hex(fs.readFileSync(path.join(root,'build/gpz-boss-e1/extracted/SonicChaos_GPZ3_Boss_51_20261003_E1/scripts/SCR_chaos_gpz_boss/SCR_chaos_gpz_boss.gml'),'utf8')),a.c);
 for(const mode of [1,2,3,4])for(const start of [[1400,64],[1690,140]]){
  a.h.world.cam={x:start[0],y:start[1],w:256,h:192};a.b.camera_mode=mode;a.b.camera_left=1200;a.b.camera_right=1920;
  for(let t=0;t<80;t++){a.c.chaos_51_camera_step();rows.push([mode,...start,t,a.h.world.cam.x,a.h.world.cam.y,a.b.camera_left]);}
 }return rows;}
if(process.argv.includes('--record-control')){
 fs.writeFileSync(file,JSON.stringify({source:'Windows-accepted E.1 256x192 fixture',rows:control(true)},null,2)+'\n');
}
assert.deepEqual(control(),JSON.parse(fs.readFileSync(file)).rows,'256 camera byte-for-byte control');
const a=setup(348,196),{c,b,h,p}=a;let checks=640;
assert.equal(c.chaos_51_fight_camera_y(348,196),112);checks++;
assert.equal((196-(288-112))*360/196,20*360/196);checks++;
for(const height of [192,196,218,360])assert.equal(c.chaos_51_fight_camera_y(256,height),96);
assert.equal(c.chaos_51_fight_camera_y(290,218),96);
for(const mode of [1,2,3,4])for(const start of [[1300,64],[1700,140]]){
 h.world.cam={x:start[0],y:start[1],w:348,h:196};b.camera_mode=mode;b.camera_left=1279;b.camera_right=1920;
 for(let t=0;t<450;t++){
  const before=[h.world.cam.x,h.world.cam.y,p.chaosCore.xu,p.chaosCore.yu];
  c.chaos_51_camera_step();const cap=mode===2||mode===3?1:4;
  assert(Math.abs(h.world.cam.x-before[0])<=cap);assert(Math.abs(h.world.cam.y-before[1])<=cap);
  assert.deepEqual([p.chaosCore.xu,p.chaosCore.yu],before.slice(2));checks+=3;
 }
 if(mode===2||mode===3)assert.deepEqual([h.world.cam.x,h.world.cam.y],[1571,112]);
 b.viewport_w=348;b.viewport_h=196;
 if(mode===2||mode===3){const s=c.chaos_51_slot(0xD700,81,0,1856,270);c.chaos_51_callback(b,s,0x9AF7,p.chaosCore,false);assert.equal(s.pc,0x9A90);}
}
console.log(`GPZ E.2 camera: ${checks} checks; exact 256 fixture, native 348x196 Y112, bounded wide handoffs, actor coordinates intact PASS`);
// Native object-follow may overwrite the normal zone Y between frames. First
// takeover must start at the previously DISPLAYED view, not that intermediate Y.
b.active=false;h.world.cam={x:1292,y:137,w:348,h:196};c.chaos_51_camera_step();
b.active=true;b.camera_owned=false;b.camera_mode=1;h.world.cam.y=169;
p.x=1493;p.y=267;c.chaos_51_camera_step();
assert(Math.abs(h.world.cam.y-137)<=4);assert(Math.abs(h.world.cam.x-1292)<=4);
