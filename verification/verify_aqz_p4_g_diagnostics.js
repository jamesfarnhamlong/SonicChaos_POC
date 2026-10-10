const fs=require('fs'),assert=require('assert'),{loadHost,root}=require('./chaos_world_harness');let checks=0;const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;},yes=(a,m)=>{assert(a,m);checks++;};
const h=loadHost(),c=h.ctx,w=h.world,g=h.g;let files={},handle=0,handles={};
c.file_text_open_append=p=>{handles[++handle]=p;files[p]??='';return handle;};c.file_text_write_string=(h,t)=>files[handles[h]]+=t;c.file_text_writeln=h=>files[handles[h]]+='\n';c.file_text_close=h=>delete handles[h];c.json_stringify=JSON.stringify;c.is_struct=v=>v!==null&&typeof v==='object';c.get_timer=()=>123456;c.game_save_id='test-sandbox/';c.vk_f11=122;c.vk_f12=123;
function run(on){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:1727,y:78,w:348,h:196};c.chaos_level_install_layout();const b=c.chaos_59_new();g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78,camera_left:1727,camera_right:1728});const s=c.chaos_59_slot(89,0,1856,238,1);Object.assign(s,{state:17,requested:17,frame:2,ex:20,ey:64,hp:10,counter:0,keep:true,sx:129});g.chaosS2.slots[7]=s;const p=h.newPlayer(1727+339,238,{state:5,move:0,bg:2,contacts:2});
 g.chaosAqzCombatTrace={active:on,case_index:0,path:'combat.jsonl',rows:[],seq:0,player:p.chaosCore};const rows=[];
 for(let u=0;u<400;u++){h.frame({});c.chaos_59_camera_step();c.chaos_59_diag_frame();rows.push({boss:JSON.parse(JSON.stringify(s)),player:JSON.parse(JSON.stringify(p.chaosCore)),slots:JSON.parse(JSON.stringify(g.chaosS2.slots))});}
 return rows;
}
eq(run(false),run(true),'logging enabled/disabled produces identical gameplay per update');
let rows=files['combat.jsonl'].trim().split('\n').map(JSON.parse);
for(const event of ['update','allocation','callback-before','callback-after','body-helper-before','body-helper-after','projectile-helper-before','projectile-helper-after','lifecycle'])yes(rows.some(r=>r.event===event),'event '+event);
for(const r of rows.filter(r=>r.event==='body-helper-after')){yes(Number.isInteger(r.data.result),'numeric helper result');yes(r.data.snapshot.player!==-4,'actual player snapshot');}
const shot=rows.find(r=>r.event==='allocation'&&r.data.type===93);yes(shot,'real shot allocation logged');eq([shot.data.world_y,shot.data.source.state,shot.data.source.frame],[159,10,3],'allocation source state/frame and positions');
g.chaosAqzCombatTrace.case_index=-1;
for(const name of ['A-left','B-right','C-central']){c.keyboard_check_pressed=k=>k===122;c.chaos_59_diag_keys();yes(g.chaosAqzCombatTrace.path.includes(name),'F11 case label');c.keyboard_check_pressed=k=>k===123;c.chaos_59_diag_keys();eq(g.chaosAqzCombatTrace.active,false,'F12 flush/stop');}
eq(Object.keys(handles).length,0,'no open file handles');
fs.mkdirSync(root+'/build/aqz-p4-g',{recursive:true});fs.writeFileSync(root+'/build/aqz-p4-g/diagnostic-results.json',JSON.stringify({status:'PASS',assertions:checks,combat_rows:rows.length},null,2));console.log({checks,combat_rows:rows.length});
