const assert=require('assert');const {loadHost}=require('./chaos_world_harness');
for(const act of [1,2])for(const spin of [false,true]) {
 const h=loadHost(null),c=h.ctx,g=h.g;c.room=c[`ROM_chaos_mghz${act}`];c.chaos_level_install_layout();
 const record=c[`SCR_chaos_mghz${act}_objects`]().find(r=>r[3]===0x18);
 const p=h.newPlayer(record[1],record[2],{state:5,move:0,vx:256});p.object_index=c[spin?'OBJ_player_char_spin':'OBJ_player_char'];
 c.instance_find=(type)=>type===c.OBJ_player || type===p.object_index?p:c.noone;
 c.instance_exists=o=>typeof o==='object' || o===c.OBJ_player || o===p.object_index;
 assert.strictEqual(c.chaos_goal_player(),p);
 const sign=h.newInstance('OBJ_chaos_object_18',record[1],record[2]);
 assert.strictEqual(sign.chaosPrizeTableCpu,0xA962);
 let contacts=0,child=null;c.chaos_goal_begin=()=>contacts++;
 c.instance_create=(x,y,obj)=>{assert.strictEqual(obj,c.OBJ_chaos_object_19);child=h.newInstance('OBJ_chaos_object_19',x,y);return child;};
 h.runEvent(sign,'objects/OBJ_chaos_object_18/Step_0.gml');assert.strictEqual(contacts,1);
 assert.strictEqual(sign.chaosSign.state,4);
 for(let n=0;n<131;n++)h.runEvent(sign,'objects/OBJ_chaos_object_18/Step_0.gml');
 assert.ok(child);p.chaosGrounded=true;
 for(let n=0;n<148;n++)h.runEvent(child,'objects/OBJ_chaos_object_19/Step_0.gml');
 assert.strictEqual(p.chaosCore.next,32);
 assert.strictEqual(c.chaos_current_act_number(),act);
 p.object_index=-999;assert.strictEqual(c.chaos_goal_player(),c.noone,'death/other objects excluded');
}
console.log('PASS shared sign and child events for both playable object variants, MGHZ1/2');
