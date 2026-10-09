const fs=require('fs'),assert=require('assert'),{loadHost}=require('./chaos_world_harness');
const h=loadHost(),c=h.ctx;let checks=0;function eq(a,b,msg){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),msg);checks++;}
const assets=JSON.parse(fs.readFileSync('POC_notes/rom-cache/player-spring-airborne-poc-assets.json')).assets;
const names=[...assets.map(a=>a.resource),'SPR_chaos_player_state_11','SPR_chaos_aqz_base_chaos_player_state_11'];
for(const name of names)for(const state of [1,9,11,14,15,16,17,28])for(const next of [state,17,31]){
 const p={x:400,y:405,sprite_index:c[name],chaosAnchorOffset:5,chaosCore:{xu:400*256,yu:400*256,state,next,visual_anim:{active:true,state:11}}};
 const before=JSON.stringify(p);eq(c.chaos_player_draw_registration(p),{x:401,y:418},name);eq(JSON.stringify(p),before,'draw is read-only');
}
for(const name of ['SPR_sonic_spin','SPR_sonic_spin_dash','SPR_sonic_stop','SPR_sonic_falling']){
 const p={x:400,y:405,sprite_index:c[name],chaosCore:{xu:400*256,yu:400*256,state:11,next:17,visual_anim:{active:true,state:11}}};
 eq(c.chaos_player_draw_registration(p),{x:400,y:405},'legacy resource stays legacy even when state is ROM animated');
}
const rom=JSON.parse(fs.readFileSync('verification/aqz-p1/followup-f-rom-controls.json'));
for(const r of rom.water){const e=c.chaos_aqz_env_new(1),p=c.SCR_cc_new(100,600);e.line=568;Object.assign(p,{vx:r.vx,vy:r.vy_before,move:1|r.attack,water:255});c.chaos_aqz_cross(e,p,{slots:[]});eq(p.vy,r.vy_after,'original Z80 signed-high gate');eq(p.water,255);}
// Contact classification and scheduler ownership: top bounce is shared weak state B.
const bossRows=[];
for(const [dx,dy,kind] of [[0,-48,'top'],[28,0,'side'],[0,24,'below']])for(const state of [10,11,14,28])for(const vy of [-1,0,256]){
 const b=c.chaos_boss_new(),p=c.SCR_cc_new(c.chaos_boss_x(b)+dx,b.y+dy);
 Object.assign(p,{state,next:state,move:3,vy,d448:255});c.chaos_player_animation_update(p);
 const bits=c.chaos_boss_contact_bits(b,p),result=c.chaos_boss_contact(b,p,true),request=p.next;
 if(kind==='top'&&vy>=0){eq([result,request,p.d448,p.vy,p.move&2],[2,11,0,-1024,0]);}
 if(kind==='top'&&vy<0)eq(result,0);
 if(kind!=='top')eq(request,27,'side/below use state 1B, not weak bounce');
 c.chaos_player_animation_update(p);
 if(result===2)eq(p.visual_anim.frame,state===11?97:28,'same executing B retains original script until its loop');
 bossRows.push({kind,bits,initial_state:state,vy_before:vy,result,request,d448:p.d448,next_frame:p.visual_anim.frame});
}
// Original SAT rectangle and unchanged imported canvas registration, both facings.
for(const r of rom.renderer){
 const a=assets.find(a=>!a.aqz_indexed&&a.frame===r.frame);
 const meta=JSON.parse(fs.readFileSync(a?`sprites/${a.resource}/${a.resource}.yy`:'sprites/SPR_chaos_player_state_11/SPR_chaos_player_state_11.yy'));
 const sat=r.result;const x=128+1+(r.facing?meta.sequence.xorigin-meta.width:-meta.sequence.xorigin),y=100+18-meta.sequence.yorigin;
 eq(x,Math.min(...sat.sat_x)+1,'R8 terrain relationship');eq(y,Math.min(...sat.sat_y)+18,'R9/SAT terrain relationship');
 eq(meta.width,Math.max(...sat.sat_x)-Math.min(...sat.sat_x)+8);eq(meta.height,Math.max(...sat.sat_y)-Math.min(...sat.sat_y)+16);
}
fs.writeFileSync('build/aqz-p1/followup-f-boss-controls.json',JSON.stringify(bossRows,null,2)+'\n');
// Actual executing-core pipeline, continuously submerged: one updater before movement.
const cadenceHost=loadHost(),cc=cadenceHost.ctx,gg=cadenceHost.g;
cc.room=cc.ROM_chaos_aqz1;cc.chaos_level_install_layout();gg.chaosTileIds=Array(4096).fill(254);gg.chaosAqzEnv.line=568;
const swimmer=cc.SCR_cc_new(100,700);Object.assign(swimmer,{zone:4,state:10,next:10,move:3,water:255,vx:1024,vy:0,camera_y:650,bg:0,contacts:0});
const cadence=[];let order=[];
const waterUpdate=cc.chaos_aqz_water_update,xMove=cc.SCR_cc_x,yMove=cc.SCR_cc_y;
cc.chaos_aqz_water_update=(e,p,pool)=>{order.push('water');const before={state:p.state,d503:p.move,vx:p.vx,high_signed:p.vx>>8,vy:p.vy,y:p.yu/256,calls:e.calls};waterUpdate(e,p,pool);cadence.push({before,after_vy:p.vy,calls:e.calls});};
cc.SCR_cc_x=p=>{order.push('x');return xMove(p);};cc.SCR_cc_y=p=>{order.push('y');return yMove(p);};
for(let u=0;u<30;u++){order=[];cc.SCR_cc_tick(swimmer);eq(order,['water','x','y']);eq(gg.chaosAqzEnv.calls,u+1);eq(swimmer.water,255);const r=cadence[u],b=r.before;eq(r.after_vy,b.vy>=0&&(b.d503&2)&&Math.abs(b.high_signed)>=4?-768:b.vy);}
fs.writeFileSync('build/aqz-p1/followup-f-water-cadence.json',JSON.stringify(cadence,null,2)+'\n');
const out={assertions:checks,rom_gate_vectors:rom.water.length,registered_resources:names.length,result:'PASS'};
fs.writeFileSync('build/aqz-p1/followup-f-results.json',JSON.stringify(out,null,2)+'\n');console.log(out);
