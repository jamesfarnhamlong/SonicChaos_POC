// Runs shipped GML against canonical SEZ data; host mocks only GameMaker APIs.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert'),vm=require('vm');
const {loadHost,root,hex}=require('./chaos_world_harness');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const M=read('POC_notes/rom-cache/sez/implementation-manifest.json'),C=read('POC_notes/rom-cache/sez/object-census.json');
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world; let checks=0;
const eq=(a,b,msg)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),msg);checks++;};
const sha=a=>crypto.createHash('sha256').update(Buffer.from(a)).digest('hex');
g.chaosSezEffects=c.chaos_sez_effect_new();
c.room=c.ROM_chaos_sez1;let platformDraw;
c.draw_sprite=(sprite,frame,x,y)=>platformDraw=[sprite,frame,x,y];
h.runEvent({x:784,y:384,sprite_index:c.SPR_chaos_sez_platform,image_index:0,chaosGpzLifecycle:true,chaosLive:true,chaosAsleep:false,chaosConsumed:false},'objects/OBJ_chaos_platform/Draw_0.gml');
eq(platformDraw,[c.SPR_chaos_sez_platform,0,784,384],'SEZ approved SAT canvas draws at its canonical anchor');
vm.runInContext(hex(fs.readFileSync(path.join(root,'scripts/SCR_chaos_debug_select/SCR_chaos_debug_select.gml'),'utf8')),c);
c.room_exists=id=>Object.keys(h.ids).some(n=>n.startsWith('ROM_chaos_')&&h.ids[n]===id);
const entries=c.chaos_debug_entries();eq(entries.length,21);eq(entries.filter(e=>e.enabled).length,12);
eq(entries.slice(6,9).map(e=>[e.enabled,e.room]),[1,2,3].map(n=>[true,c[`ROM_chaos_sez${n}`]]));
for(const [key,a] of Object.entries(M.acts)) {
 h.reset(); c.room=c[`ROM_chaos_${key}`];c.chaos_level_install_layout();
 const ids=c[`SCR_chaos_${key}_tile_ids`]();
 eq(c.chaos_in_level(),true);eq(c.chaos_current_act_number(),Number(key.slice(-1)));
 eq([a.descriptor.layout.width_cells,a.descriptor.layout.height_cells],[128,32]);
 eq(a.layout.runtime_written_cells,4095);eq(ids.length,4096);eq(ids[4095],254);
 eq(sha(ids.slice(0,4095)),a.layout.runtime_cells_sha256);eq(g.chaosMapWidth,128);
 eq(c[`SCR_chaos_${key}_start`](),a.start.player_anchor);eq(c[`SCR_chaos_${key}_camera`](),a.start.camera);
 eq(c.chaos_level_type09(),[]);eq(c.chaos_level_terrain_rings().map(r=>r.slice(1,3)),a.rings.terrain.map(r=>[r.world_x,r.world_y]));
 const rows=c.chaos_level_object_rows(), recs=C.acts[key].records;
 eq(rows.map(r=>r.slice(0,9)),recs.map(r=>[r.index,r.world_x,r.world_y,...['type_id','flags','parameter','aux0','aux1','rom_offset'].map(k=>parseInt(r[k],16))]));
 c.chaos_level_spawn_objects();
 for(const t of [0x10,0x18,0x1b,0x26,0x2f])eq(g.chaosSpawnedByType[t],recs.filter(r=>parseInt(r.type_id,16)===t).length,'shared spawn '+key+' '+t);
 eq(g.chaosSpawnedByType[0x28],recs.filter(r=>r.type_id==='0x28'&&['0x83','0x84','0x86','0x04'].includes(r.parameter)).length);
 for(const t of [0x20,0x23])eq(g.chaosSpawnedByType[t],recs.filter(r=>parseInt(r.type_id,16)===t).length,'S4 enemy records '+key+' '+t);
 for(const t of [0x54,0x55,0x13])eq(g.chaosSpawnedByType[t],0,'pending type '+t);
 eq(g.chaosSkippedByType[0x28],recs.filter(r=>r.type_id==='0x28'&&!['0x83','0x84','0x86','0x04'].includes(r.parameter)).length);
 for(const b of a.blocks)for(let plane=0;plane<2;plane++){const d=b.headers[plane];eq(g[`chaosHeaders${plane}`][b.block_id],[d.flags,d.modifier,d.vertical,d.horizontal]);}
 // All loaded cells and all four quadrant boundaries; last cell is unreachable.
 for(let i=0;i<4096;i++)for(const off of [0,15,16,31]) {
  const s=c.SCR_cc_lookup(i%128*32+off,Math.floor(i/128)*32+off,0);
  eq(s.index,i===4095?-1:i);if(i<4095){eq(s.tile,ids[i]);const d=g.chaosHeaders0[ids[i]];eq([s.flags,s.modifier,s.vertical,s.horizontal],[d[0],d[1],d[2][off],d[3][off]]);}
 }
 for(const width of [256,348,640]) {
  w.cam.w=width;w.cam.x=0;w.cam.y=a.start.camera[1];
  const p=h.newPlayer(...a.start.player_anchor,{state:1,move:0});eq([p.chaosCore.zone,p.chaosCore.level],[2,2]);
  for(const r of rows.filter(r=>r[3]===0x26 && r[5]&128))eq(c.chaos_spawn_type26(r).chaosSpan,(r[5]&127)*16);
 }
 // Intact breakables mutate once; all source placements stay canonical.
 for(let i=0;i<4095;i++)if(ids[i]===155||ids[i]===156){c.SCR_chaos_break_block(i);eq(g.chaosTileIds[i],157);}
 for(let i=0;i<4095;i++)if(ids[i]===71){const before=g.ring;c.SCR_chaos_break16_block(i);eq([g.chaosTileIds[i],g.ring],[70,before+10]);c.SCR_chaos_break16_block(i);eq(g.ring,before+10);}
 eq(sha(g.chaosSourceTileIds.slice(0,4095)),a.layout.runtime_cells_sha256,'mutations never rewrite source');
 const room=read(`rooms/ROM_chaos_${key}/ROM_chaos_${key}.yy`);
 eq([room.roomSettings.Width,room.roomSettings.Height],a.dimensions_pixels);
 eq(room.layers.flatMap(l=>l.instances||[]).map(i=>i.objectId.name).sort(),[`OBJ_chaos_${key}_terrain`,'OBJ_chaos_zone'].sort());
}
// Effect 5: compare every event to recovered routine events and sweep all pause bytes.
const events=M.level_effects.effects['5'].first_events;
let e=c.chaos_sez_effect_new();
for(let i=0;i<24;i++){const old=e.image;c.chaos_sez_effect_step(e,false,0);if(events.some(v=>v.update===i))eq(e.image,1+(Math.floor((i+1)/3)+1)%2);else eq(e.image,old);}
for(let pause=1;pause<256;pause++)for(let tick=0;tick<6;tick++){
 e={frame:0,tick,image:2};c.chaos_sez_effect_step(e,pause,0);eq([e.tick,e.image],[tick,2]);
}
e=c.chaos_sez_effect_new();c.chaos_sez_effect_step(e,false,1);eq([e.tick,e.image],[0,0]);
// Retention must exactly reduce to the existing viewport model, including vertical deletion.
for(const width of [256,348,640])for(const woken of [false,true]) {
 w.cam={x:500,y:300,w:width,h:192};const vp=c.chaos_vp_current();
 for(let x=-100;x<1300;x++)for(const y of [203,204,268,300,524,651,652]) {
  const o={chaosLive:true,chaosAsleep:true,chaosWoken:woken,chaosSezRecreated:false};
  const cell=c.chaos_vp_retained_cell(vp,x,y,false,woken);
  eq(c.chaos_sez_mapped_awake(o,x,y),cell<2);eq(o.chaosLive,cell!==3);eq(o.chaosAsleep,cell>=2);
 }
}
// Sign prize parity and the real sign/child events, both ordinary acts.
for(const act of [1,2]) {
 h.reset();c.room=c[`ROM_chaos_sez${act}`];c.chaos_level_install_layout();
 const r=c.chaos_level_object_rows().find(r=>r[3]===0x18);
 const p=h.newPlayer(r[1],r[2],{state:5,move:0,vx:256});
 const sign=h.newInstance('OBJ_chaos_object_18',r[1],r[2]);eq(sign.chaosPrizeTableCpu,0xA919);eq(sign.sprite_index,c.SPR_chaos_sez_sign);
 let contacts=0,child=null;c.chaos_goal_begin=()=>contacts++;
 const old=c.instance_create;c.instance_create=(x,y,type)=>{eq(type,c.OBJ_chaos_object_19);return child=h.newInstance('OBJ_chaos_object_19',x,y);};
 h.runEvent(sign,'objects/OBJ_chaos_object_18/Step_0.gml');eq(contacts,1);
 for(let n=0;n<131;n++)h.runEvent(sign,'objects/OBJ_chaos_object_18/Step_0.gml');eq(!!child,true);p.chaosGrounded=true;
 for(let n=0;n<148;n++)h.runEvent(child,'objects/OBJ_chaos_object_19/Step_0.gml');eq(p.chaosCore.next,32);c.instance_create=old;
}
const out={status:'PASS',assertions:checks,acts:3,loader_cells:12285,ring_quadrants:276,research:'a20082675cdfc25289b9dd7fe49440c55877c14d'};
fs.mkdirSync(path.join(root,'build/sez-s1'),{recursive:true});fs.writeFileSync(path.join(root,'build/sez-s1/runtime-results.json'),JSON.stringify(out,null,2)+'\n');console.log(out);
