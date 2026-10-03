// Execute actual shipped Draw/Step events with render calls recorded.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {loadHost,root}=require('./chaos_world_harness');
const h=loadHost(null),c=h.ctx,g=h.g;
c.room=c.ROM_chaos_gpz2;c.chaos_level_install_layout();
Object.assign(c,{SPR_ring:90001,SPR_chaos_gpz_terrain_ring:90002,
  sprite_get_number:s=>s===90002?4:6,ceil:Math.ceil,
  surface_exists:()=>true,surface_get_width:()=>256,surface_get_height:()=>192,
  surface_set_target:()=>{},surface_reset_target:()=>{},draw_clear_alpha:()=>{},
  draw_surface:()=>{},c_black:0,vk_f8:0,vk_f9:0});
h.world.cam={x:1500,y:440,w:256,h:192};
const record=c.SCR_chaos_gpz2_terrain_rings().find(r=>r[1]===1624&&r[2]===488);
const inst={chaosRingFrame:0,chaosRingGlobalFrame:0,chaosRingSurface:1,
  chaosRingSourceCount:1,chaosRingRecords:[record],chaosRingActive:[true],
  chaosRingExpectedThisFrame:[false],chaosRingDrawnThisFrame:[false],
  chaosRingRenderX:0,chaosRingRenderY:0,chaosType09SourceCount:0,
  chaosType09State:[],chaosRingMode:0,chaosRingDumpRequested:false};
let draws=[];c.draw_sprite=(sprite,frame,x,y)=>draws.push({sprite,frame,x,y});
for(let update=0;update<96;update++) {
  inst.chaosRingGlobalFrame=update;
  h.runEvent(inst,'objects/OBJ_chaos_ring_manager/Step_0.gml');draws=[];
  h.runEvent(inst,'objects/OBJ_chaos_ring_manager/Draw_0.gml');
  assert.deepStrictEqual(draws,[{sprite:90002,frame:Math.floor(update/8)%4,x:124,y:48}]);
}
// Accepted THZ control: inherited six-frame visual cycle is preserved.
c.room=c.ROM_chaos_thz1;inst.chaosRingFrame=0;
for(let update=1;update<=48;update++) {
  h.runEvent(inst,'objects/OBJ_chaos_ring_manager/Step_0.gml');
  assert.strictEqual(inst.chaosRingFrame,(update*.25)%6);
}
// Exercise actual generic foreground event, including camera cull and mutation.
c.room=c.ROM_chaos_gpz1;c.chaos_level_install_layout();
h.world.cam={x:864,y:256,w:256,h:64};
const foreground={chaosTerrainForegroundSprite:90003};
c.draw_sprite_part=(sprite,frame,sx,sy,w,height,x,y)=>draws.push({sprite,frame,sx,sy,w,height,x,y});
draws=[];h.runEvent(foreground,'objects/OBJ_chaos_terrain_foreground/Draw_0.gml');
assert.strictEqual(draws.length,16);
for(const d of draws) {
  const block=g.chaosTileIds[d.y/32*g.chaosMapWidth+d.x/32];
  assert.strictEqual(d.sx,(block%16)*32);assert.strictEqual(d.sy,Math.floor(block/16)*32);
  assert.strictEqual(d.w,32);assert.strictEqual(d.height,32);
}
const index=8*g.chaosMapWidth+27;g.chaosTileIds[index]=70;
draws=[];h.runEvent(foreground,'objects/OBJ_chaos_terrain_foreground/Draw_0.gml');
assert.strictEqual(draws[0].sx,6*32);assert.strictEqual(draws[0].sy,4*32);
for(const act of ['gpz1','gpz2','gpz3']) {
  const create=fs.readFileSync(path.join(root,'objects','OBJ_chaos_'+act+'_terrain','Create_0.gml'),'utf8');
  assert(create.includes('instance_create_depth(0,0,-60,OBJ_chaos_terrain_foreground)'));
}
const depths=fs.readFileSync(path.join(root,'scripts/__global_object_depths/__global_object_depths.gml'),'utf8');
assert(/global\.__objectDepths\[\d+\]\s*=\s*-50;\s*\/\/ OBJ_player_char\r?\n/.test(depths),'foreground -60 follows imported player -50');
console.log('PASS: 96 GPZ ring draw frames, 48 unchanged THZ updates, generic priority camera draw and live replacement');
