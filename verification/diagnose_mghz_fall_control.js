// Diagnostic only. Execute current and accepted shared GML on identical data.
// 82ebc89 has no MGHZ room: the comparison injects canonical MGHZ profiles/layout
// into a GPZ host room, without replacing any player/contact/platform function.
const fs=require('fs'),path=require('path'),assert=require('assert');
// Memoize git-show reads in this diagnostic process (fixed ref, many event calls).
// The host and all executed GML are otherwise identical to the shared harness.
const Module=require('module'),hostFile=path.join(__dirname,'chaos_world_harness.js');
const cachedHost=new Module(hostFile,module);cachedHost.filename=hostFile;cachedHost.paths=module.paths;
cachedHost._compile(fs.readFileSync(hostFile,'utf8').replace('function source(ref, rel) {','const referenceCache=new Map();\nfunction source(ref, rel) {\n if(ref && referenceCache.has(ref+rel))return referenceCache.get(ref+rel);').replace("return r.status === 0 ? r.stdout.toString('utf8') : null;","const value=r.status===0?r.stdout.toString('utf8'):null;referenceCache.set(ref+rel,value);return value;"),hostFile);
const {loadHost,root}=cachedHost.exports;
const base='82ebc89d68cd0d7e4d66be54a6c9954e6e2d9fed';
const seed=loadHost();seed.ctx.room=seed.ctx.ROM_chaos_mghz1;seed.ctx.chaos_level_install_layout();
const data={ids:seed.g.chaosTileIds,headers0:seed.g.chaosHeaders0,headers1:seed.g.chaosHeaders1};
const hosts=[loadHost(base),loadHost()];
function install(h){h.ctx.room=h.ctx.ROM_chaos_gpz2;h.world.roomHeight=1024;h.world.roomWidth=4096;h.g.chaosMapWidth=128;h.g.chaosHeaders0=JSON.parse(JSON.stringify(data.headers0));h.g.chaosHeaders1=JSON.parse(JSON.stringify(data.headers1));}
hosts.forEach(install);
function run(h,{x=3568,y=366,vx=256,monitor=true,monitorX=3568,monitorY=814,input='right',state=5,frames=160,platforms=[],empty=false,layout='mghz1'}){
 h.reset();h.g.chaosCrushDeathPhase=0;h.g.chaosTileIds=empty?Array(4096).fill(254):data.ids.slice();h.g.chaosBrokenCells=[];
 install(h);
 if(layout==='gpz2')h.ctx.chaos_level_install_layout();
 if(empty)h.g.chaosTileIds=Array(4096).fill(254);
 h.world.follow=false;
 const p=h.newPlayer(x,y,{state,vx,vy:0,move:state===5?0:1,bg:state===5?2:0,contacts:state===5?2:0});const c=p.chaosCore;
 c.previous=h.ctx.SCR_cc_lookup(x,y+18,0).flags;c.special=state===20?1:0;
 if(monitor){const o=h.newInstance('OBJ_chaos_object_10',monitorX,monitorY);Object.assign(o,{chaosParameter:1,chaosState:2,chaosActive:true,chaosAsleep:false,chaosInitialFillDone:true,chaosWoken:true,stepPath:'objects/OBJ_chaos_object_10/Step_0.gml'});h.world.badniks.push(o);}
 for(const [ox,oy]of platforms){const o=h.newInstance('OBJ_chaos_platform',ox,oy);h.ctx.chaos_platform28_configure(o,0x83,0);h.world.platforms.push(o);}
 const rows=[];let stage='';const contacts=[],terrain=[];const box=h.ctx.SCR_chaos_box_contact,project=h.ctx.SCR_cc_project_floor;
 h.ctx.SCR_cc_project_floor=(cc,s)=>{const before={y:cc.yu/256,previous:cc.previous,special:cc.special,state:cc.state,next:cc.next,vy:cc.vy,owner:cc.support,floor:cc.bg&2};project(cc,s);terrain.push({before,after:{y:cc.yu/256,floor:cc.bg&2,contacts:cc.contacts},block:s.tile,flags:s.flags,probe:[s.ax,s.ay]});};
 h.ctx.SCR_chaos_box_contact=(...a)=>{const b=box(...a);if(stage==='monitor')contacts.push({bits:b,player:[a[0],a[1]],object:[a[2],a[3]]});return b;};
 const runEvent=h.runEvent;h.runEvent=(o,e)=>{stage=e.includes('object_10/Step')?'monitor':'';const result=runEvent(o,e);stage='';return result;};
 for(let tick=0;tick<frames&&!p.dead;tick++){
  contacts.length=0;terrain.length=0;h.world.cam.x=Math.max(0,Math.min(3840,c.xu/256-128));h.world.cam.y=Math.max(0,Math.min(832,c.yu/256-96));const before={x:c.xu/256,y:c.yu/256,state:c.state,next:c.next,vx:c.vx,vy:c.vy,special:c.special,move:c.move,contacts:c.contacts};
  const inp=input==='alternate'?(tick%16<8?'left':'right'):(input==='escape'?(tick<95?'right':'left'):input);
  h.frame({left:inp==='left',right:inp==='right'});
  const s=h.ctx.SCR_cc_lookup(Math.floor(c.xu/256),Math.floor(c.yu/256)+18,c.plane);
  rows.push({tick,before,x:c.xu/256,y:c.yu/256,state:c.state,next:c.next,move:c.move,airborne:!!(c.move&1),attack:!!(c.move&2),floor:c.bg&2,contacts:c.contacts,input:inp,held:c.held,input_delta:c.input_delta,vx:c.vx,vy:c.vy,owner:c.support,special:c.special,foot:{block:s.tile,surface:s.flags&31,flags:s.flags,vertical:s.vertical},monitor:contacts.slice(),terrain:terrain.slice(),dead:!!p.dead});
 }
 h.ctx.SCR_chaos_box_contact=box;h.ctx.SCR_cc_project_floor=project;h.runEvent=runEvent;
 return rows;
}
const cases=[];
function compare(name,opt){const rows=hosts.map(h=>run(h,opt));const equal=JSON.stringify(rows[0])===JSON.stringify(rows[1]);const diffs=rows[0].map((r,i)=>JSON.stringify(r)!==JSON.stringify(rows[1][i])?i:-1).filter(i=>i>=0);cases.push({name,setup:opt,identical:equal,first_difference:diffs[0]??null,accepted:rows[0],current:rows[1]});return cases.at(-1);}
for(const x of [3312,3408,3504,3552,3568])for(const input of ['left','right','alternate'])compare(`strip-${x}-${input}`,{x,input,monitor:true,vx:256,frames:150});
for(const input of ['left','right','alternate'])compare(`monitor-right-${input}`,{x:3586,y:782,state:14,input,monitor:true,vx:0,frames:80});
// Distinguish requested special fall from ordinary fall: same two shared $28/$83
// support systems in empty terrain, with closed-interval support geometry intact.
for(const state of [14,20])for(const input of ['left','right','alternate'])compare(`platforms-${state}-${input}`,{x:1024,y:450,state,input,monitor:false,vx:0,platforms:[[1024,500],[1024,600]],empty:true,frames:120});
// Genuine accepted GPZ2 layout controls, with no MGHZ-data injection.
for(const input of ['left','right','alternate'])compare(`accepted-gpz2-strip-${input}`,{layout:'gpz2',x:528,y:686,vx:256,input,monitor:false,frames:90});
for(const input of ['left','right','alternate'])compare(`accepted-gpz2-monitor-${input}`,{layout:'gpz2',x:3460,y:780,vx:256,state:14,input,monitor:true,monitorX:3472,monitorY:878,frames:140});
compare('mghz-monitor-disabled',{x:3504,input:'right',monitor:false,vx:256,frames:150});
compare('mghz-monitor-escape-left',{x:3504,input:'escape',monitor:true,vx:256,frames:150});
compare('accepted-gpz2-monitor-disabled',{layout:'gpz2',x:3460,y:780,vx:256,state:14,input:'right',monitor:false,frames:140});
const report={base,method:'Shipped GML via shared host. Canonical MGHZ1 data injected into both GPZ host rooms; controlled input/start, no ROM data mutation.',cases};
fs.mkdirSync(path.join(root,'verification/mghz-m11'),{recursive:true});fs.writeFileSync(path.join(root,'verification/mghz-m11/fall-control-diagnosis.json'),JSON.stringify(report,null,2)+'\n');
for(const t of cases){const r=t.current;const repeated=r.filter(a=>a.monitor.some(m=>m.bits===4));console.log(JSON.stringify({name:t.name,identical:t.identical,first_difference:t.first_difference,state_runs:[...new Set(r.map(q=>q.state))],special_fall_updates:r.filter(q=>q.state===20).length,monitor_right_contacts:repeated.length,first_monitor:repeated[0],last:r.at(-1)}));}
