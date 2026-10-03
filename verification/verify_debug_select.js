// Executes shipped selector helpers/events and zone Create. GameMaker room destruction,
// inherited sprite setup, rendering, and camera host APIs are mocked; Windows remains acceptance.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const {loadHost, hex, root} = require('./chaos_world_harness');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const yy = p => JSON.parse(rd(p).replace(/,\s*([}\]])/g, '$1'));
const h = loadHost(null), c = h.ctx, g = h.g, w = h.world;
let nextRoom, writes = 0, controls, rings;
Object.assign(c, {ROM_chaos_debug_select: 9001, ROM_menu_title: 9002,
    OBJ_chaos_controls: 9003, OBJ_chaos_ring_manager: 9004, OBJ_effect_fade_in: 9005,
    game_set_speed: () => {}, gamespeed_fps: 0, SCR_screen: () => {},
    room_exists: v => [h.ids.ROM_chaos_thz1,h.ids.ROM_chaos_thz2,h.ids.ROM_chaos_thz3,h.ids.ROM_chaos_gpz1,h.ids.ROM_chaos_gpz2,h.ids.ROM_chaos_gpz3].includes(v),
    room_goto: v => {nextRoom = v;}, instance_activate_all: () => {}, audio_stop_all: () => {},
    ini_open: () => {writes++;}, ini_write_real: () => {}, ini_close: () => {},
    score: 0, string: String, vk_escape: 27, surface_exists: () => false});
Object.assign(c.e__VW, {WView: 3, HView: 4, VBorder: 5});
c.__view_get = field => ({1:w.cam.x,2:w.cam.y,3:w.cam.w,4:w.cam.h})[field];
c.SCR_player_view = () => {};
vm.runInContext(hex(rd('scripts/SCR_chaos_debug_select/SCR_chaos_debug_select.gml')), c);
for (const n of ['SCR_chaos_loop_layout','SCR_chaos_ring_data','SCR_chaos_type09_data'])
    vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)),c);
vm.runInContext(rd('scripts/SCR_save_game/SCR_save_game.gml'), c);
const originalCreate = c.instance_create, originalExists = c.instance_exists;
c.instance_exists = o => o === c.OBJ_chaos_controls ? !!controls : o === c.OBJ_chaos_ring_manager ? !!rings : originalExists(o);
c.instance_create = (x,y,o) => {
    if (o === h.ids.OBJ_player_char) {
        const p = h.newPlayer(x,y-5,{state:1,move:0});
        // Run real player Create too, including the real attach/init functions.
        h.runEvent(p,'objects/OBJ_player_char/Create_0.gml'); c.OBJ_player = p;
        return p;
    }
    if (o === c.OBJ_chaos_controls) return controls = h.newInstance('OBJ_chaos_controls',x,y);
    if (o === c.OBJ_chaos_ring_manager) return rings = h.newInstance('OBJ_chaos_ring_manager',x,y);
    return originalCreate(x,y,o);
};
const originalDepth = c.instance_create_depth;
c.instance_create_depth = (x,y,d,o) => o === c.OBJ_chaos_ring_manager ? c.instance_create(x,y,o) : originalDepth(x,y,d,o);
const entries = c.chaos_debug_entries();
assert.equal(entries.length,21);
assert.equal(entries.filter(e=>e.enabled).length,6);
assert.deepEqual(Array.from(entries.slice(0,18),e=>e.act),Array.from({length:18},(_,i)=>i%3+1));
assert.equal(new Set(entries.slice(0,18).map(e=>e.zone)).size,6);
assert(entries.slice(18).every(e=>e.classification==='test' && !e.enabled));
for (const e of entries.filter(e=>!e.enabled)) {
    nextRoom = undefined; assert.equal(c.chaos_debug_launch(e),false); assert.equal(nextRoom,undefined);
}
// Model room teardown from resource persistence. Only controls are persistent.
const persistent = fs.readdirSync(path.join(root,'objects')).filter(n => {
    const p = `objects/${n}/${n}.yy`; return fs.existsSync(path.join(root,p)) && yy(p).persistent;
});
assert.deepEqual(persistent,['OBJ_chaos_controls']);
const selectorCreate = rd('objects/OBJ_chaos_debug_select/Create_0.gml');
assert(selectorCreate.includes('with (OBJ_chaos_controls) instance_destroy();'));
function enterSelector() {
    c.chaos_debug_open(); assert.equal(nextRoom,c.ROM_chaos_debug_select);
    h.reset(); rings = null;
    // Mechanically translate the one GML with/destroy boundary.
    controls = null;
    c.room = c.ROM_chaos_debug_select;
    vm.runInContext(selectorCreate.replace('with (OBJ_chaos_controls) instance_destroy();',''),c);
    assert.equal(w.cam.x,0); assert.equal(w.cam.y,0);
}
// Exhaustive menu navigation from every cell, plus disabled confirm and cancel.
const step = hex(rd('objects/OBJ_chaos_debug_select/Step_0.gml'));
const eventStep = vm.runInContext('(function(){'+step+'})',c);
c.SCR_buttons = () => {};
enterSelector();
for (let i=0;i<21;i++) for (const key of ['Up','Down','Left','Right']) {
    for (const k of ['Up','Down','Left','Right','Space','Start','A']) g['bt'+k+'Press']=false;
    c.selected=i; g['bt'+key+'Press']=true; eventStep();
    assert(c.selected>=0 && c.selected<21);
}
g.btRightPress=false; g.btSpacePress=true; c.selected=18; nextRoom=undefined; eventStep();
assert.equal(nextRoom,undefined); assert(c.message.includes('UNAVAILABLE'));
g.btSpacePress=false; g.btAPress=true; eventStep(); assert.equal(nextRoom,c.ROM_menu_title); g.btAPress=false;
g.zoneGoto=2; g.saveGame=1;
const reports=[];
for (const act of [1,4,2,5,3,6,1,6,2]) {
    const gpz=act>3, local=gpz?act-3:act;
    // Dirty a prior room as if after footwear, goal, boss and checkpoint gameplay.
    Object.assign(g,{checkPoint:true,checkPointX:1900,checkPointY:240,chaosPowerCode:4,chaosPowerTimer:800,
        chaosType05Allocated:true,chaosComplete:true,chaosGoalContact:true,chaosHudSlide:-64,
        chaosBossSparkleOn:true,chaosMapWidth:17,chaosOwnerSeq:99,playerSpinDash:true,ring:99,chaosConsumedPlatforms:[3,5]});
    w.cam.x=1679; w.cam.y=78;
    if(rings) rings.chaosRingActive.fill(false);
    if(w.bosses[0]) {w.bosses[0].chaosBoss.hp=1; w.bosses[0].chaosBoss.camera_mode=3;}
    enterSelector();
    assert(c.chaos_debug_launch(entries[act-1])); assert.equal(nextRoom,entries[act-1].room);
    c.room=nextRoom;
    const roomName=`ROM_chaos_${gpz?'gpz':'thz'}${local}`, room=yy(`rooms/${roomName}/${roomName}.yy`);
    w.roomWidth=room.roomSettings.Width; w.roomHeight=room.roomSettings.Height;
    // Room-authored THZ1 populations are verified from the unchanged room resource;
    // THZ2/3 population creation is executed by the shipped canonical loader.
    const population=room.layers.flatMap(l=>l.instances||[]).map(i=>i.objectId.name);
    h.runEvent({alarm:[]},'objects/OBJ_chaos_zone/Create_0.gml');
    const p=w.player;
    const manifest=gpz?yy('POC_notes/rom-cache/gpz/implementation-manifest.json').acts[`gpz${local}`]:null;
    assert.deepEqual([p.x,p.y],gpz?manifest.start.player_anchor:act===1?[142,658]:act===2?[110,398]:[110,224]);
    assert.equal(g.chaosMapWidth,gpz?manifest.descriptor.layout.width_cells:act===3?80:128);
    assert.equal(w.cam.x,gpz?manifest.start.camera[0]:0); assert.equal(w.cam.y,gpz?manifest.start.camera[1]:Math.max(0,Math.min(Math.round(p.y-w.cam.h/1.5),w.roomHeight-w.cam.h)));
    assert.equal(g.chaosConsumedPlatforms.length,0,'consumed placements reset');
    assert.equal(p.chaosCore.zone,gpz?1:0,'spring zone resets');
    for (const name of ['checkPoint','chaosComplete','chaosGoalContact','chaosBossSparkleOn','chaosType05Allocated','playerSpinDash']) assert.equal(g[name],false,name);
    assert.equal(g.chaosPowerCode,0); assert.equal(g.chaosPowerTimer,0); assert.equal(g.chaosHudSlide,0);
    assert.equal(p.chaosCore.state,1); assert.equal(p.chaosCore.next,1); assert.equal(p.chaosCore.vx,0);
    assert.equal(p.chaosCore.state11_active,false); assert.equal(p.chaosCore.act_clear,false); assert.equal(p.chaosSupport,c.noone);
    assert(rings.chaosRingActive.every(Boolean)); assert(rings.chaosType09Collected.every(v=>!v));
    assert.equal(w.bosses.length,act===3?1:0);
    if(act===3) {assert.equal(w.bosses[0].chaosBoss.hp,8); assert.equal(w.bosses[0].chaosBoss.state,-1); assert.equal(w.bosses[0].chaosBoss.camera_mode,0);}
    if(act===1) {assert(population.includes('OBJ_chaos_object_18')); assert(!population.includes('OBJ_chaos_object_50'));}
    else assert.equal(g.chaosSpawnedIndices.length,gpz?manifest.foundation.instantiate_indices.length+manifest.foundation.integrate_before_instantiating_indices.length-manifest.rings.object09.length+manifest.objects.filter(r=>[37,44].includes(parseInt(r.type_id,16))).length:act===2?28:7);
    c.chaos_act_complete(); assert.equal(g.zoneGoto,2); c.SCR_save_game(); assert.equal(writes,0);
    reports.push({act,mapWidth:g.chaosMapWidth,spawn:[p.x,p.y],camera:[w.cam.x,w.cam.y],
        roomInstances:population.length,loadedObjects:g.chaosSpawnedIndices.length,rings:rings.chaosRingSourceCount,bosses:w.bosses.length});
}
// Returning to the title runs system Create before load; normal progression/save resumes.
assert(rd('objects/OBJ_system/Create_0.gml').indexOf('global.chaosDebugSession = false') < rd('objects/OBJ_system/Create_0.gml').indexOf('SCR_load_game();'));
g.chaosDebugSession=false; g.zoneGoto=1; c.chaos_act_complete(); assert.equal(g.zoneGoto,3); assert.equal(writes,1);
console.log('DEBUG SELECT CHECKS PASSED',JSON.stringify(reports,null,2));
