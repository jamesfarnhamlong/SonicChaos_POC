// Focused boss presentation oracle. Gameplay state and contact are exercised elsewhere.
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const root=path.resolve(__dirname,'..');
const research=path.resolve(root,'../sonic-chaos-reference-work/data/rom-cache/thz3/object-50.json');
const local=path.join(root,'POC_notes/rom-cache/thz3/object-50.json');
assert(fs.readFileSync(local).equals(fs.readFileSync(research)),'type $50 Research cache mirror');
const oracle=JSON.parse(fs.readFileSync(local));
const assets=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/thz3/boss-sprite-assets.json'))).assets;
const {loadHost}=require('./chaos_world_harness.js');
const host=loadHost(null),h=host.ctx;
let checks=0;
const eq=(a,b,label)=>{assert.equal(a,b,label);checks++};
const sprites={
    normal:JSON.parse(fs.readFileSync(path.join(root,'sprites/SPR_chaos_boss_50/SPR_chaos_boss_50.yy'))),
    mirrored:JSON.parse(fs.readFileSync(path.join(root,'sprites/SPR_chaos_boss_50_mirror/SPR_chaos_boss_50_mirror.yy'))),
    normalFlash:JSON.parse(fs.readFileSync(path.join(root,'sprites/SPR_chaos_boss_50_flash/SPR_chaos_boss_50_flash.yy'))),
    mirroredFlash:JSON.parse(fs.readFileSync(path.join(root,'sprites/SPR_chaos_boss_50_mirror_flash/SPR_chaos_boss_50_mirror_flash.yy')))
};
const names={normal:'SPR_chaos_boss_50',mirrored:'SPR_chaos_boss_50_mirror',
    normalFlash:'SPR_chaos_boss_50_flash',mirroredFlash:'SPR_chaos_boss_50_mirror_flash'};
const project=JSON.parse(fs.readFileSync(path.join(root,'SonicChaos_POC.yyp')));
for(const [orientation,sprite] of Object.entries(sprites)) {
    eq(sprite.width,40,`${orientation} sprite width`);eq(sprite.height,48,`${orientation} sprite height`);
    eq(sprite.sequence.xorigin,20,`${orientation} X origin`);eq(sprite.sequence.yorigin,48,`${orientation} Y origin`);
    assert(project.resources.some(r=>r.id.name===names[orientation]),`${orientation} project resource`);checks++;
    for(const [index,frame] of sprite.frames.entries()) {
        const file=path.join(root,'sprites',names[orientation],frame.name+'.png');
        assert(fs.existsSync(file),`${orientation} frame ${index+1} exists`);checks++;
        const png=fs.readFileSync(file);
        eq(png.readUInt32BE(16),40,`${orientation} PNG width ${index+1}`);
        eq(png.readUInt32BE(20),48,`${orientation} PNG height ${index+1}`);
        assert(assets.some(a=>a.sprite===names[orientation]&&a.frame===frame.name),`${orientation} frame ${index+1} imported from ROM`);checks++;
    }
}
eq(sprites.normal.frames.length,6,'six normal mappings');
eq(sprites.mirrored.frames.length,4,'four mirrored mappings');
eq(sprites.normalFlash.frames.length,6,'six flashed normal mappings');
eq(sprites.mirroredFlash.frames.length,4,'four flashed mirrored mappings');
const perState=oracle.graphics.frames_by_orientation.per_state;
for(const state of oracle.states) {
    const expected=perState[state.state];
    const data=h.chaos_boss_mapping_data(state.state);
    const records=state.script.filter(op=>op.op==='record');
    eq(data.records.length,records.length,`state ${state.state} record count`);
    eq(data.mirrored,expected.orientation==='mirrored',`state ${state.state} orientation`);
    for(let i=0;i<records.length;i++) {
        eq(data.records[i][0],records[i].duration,`state ${state.state} record ${i} duration`);
        eq(data.records[i][1],records[i].frame,`state ${state.state} record ${i} mapping`);
        if(records[i].frame) {
            const sprite=data.mirrored?sprites.mirrored:sprites.normal;
            assert(records[i].frame<=sprite.frames.length,`state ${state.state} frame ${records[i].frame} imported`);checks++;
        }
    }
    const back=state.script.find(op=>op.op==='loops_back');
    eq(data.loop,back?records.findIndex(op=>op.cpu===back.target):0,`state ${state.state} loop selector`);
    const valid=new Set(expected.frames);
    for(let age=0;age<256;age++) {
        const chosen=h.chaos_boss_mapping(state.state,age);
        assert(valid.has(chosen.frame),`state ${state.state}, age ${age}: valid ROM mapping`);checks++;
        if(state.state>=6) assert(chosen.frame>0,`live state ${state.state}, age ${age}: drawable`);
    }
}
const bounds=oracle.graphics.frames[1].bounds_unmirrored;
const visibleRows=oracle.graphics.registration.visible_rows_rel_anchor_for_frames_1_2;
eq(h.CHAOS_BOSS_DRAW_Y_OFFSET,visibleRows[0]-bounds.min_y,'shared ROM registration Y offset');
const model=h.chaos_boss_new();
eq(h.chaos_boss_draw_y(model),model.y+18,'draw Y separately derived from world anchor');
eq(h.chaos_boss_draw_y(model)-sprites.normal.sequence.yorigin,model.y+visibleRows[0],'top ROM pixel row');
eq(h.chaos_boss_draw_y(model)-1,model.y+visibleRows[1],'bottom ROM pixel row');

// Reproduce the Windows first visible -> invisible transition in the original adapter.
// The player enters the trigger at X=1800; the camera starts at the canonical creation band.
h.room=host.ids.ROM_chaos_thz3;
host.world.cam={x:1600,y:125,w:256,h:192};host.world.roomWidth=2560;host.world.roomHeight=512;
const boss=host.create(host.ids.OBJ_chaos_object_50,1936,238);
const player=host.newPlayer(1800,238,{state:1,move:0});player.chaosCore.contacts=2;
const trace=[];let firstOldInvisible=null,firstVisible=null,firstNewInvisible=null;
for(let update=0;update<500;update++) {
    h.chaos_boss_runtime_phase();h.chaos_boss_camera_step();
    const b=boss.chaosBoss,mapping=h.chaos_boss_mapping(b.state,b.state_age);
    const orientation=mapping.mirrored?'mirrored':'normal';
    const selected=sprites[orientation];
    const oldVisible=b.state>=18&&b.frame!==0;
    const row={update,state:b.state,stateAge:b.state_age,gameplayAnchor:[h.chaos_boss_x(b),b.y],
        instance:[boss.x,boss.y],mappingFrame:mapping.frame,orientation,
        sprite:names[orientation],imageIndex:boss.image_index,resourceExists:!!selected,
        dimensions:[selected.width,selected.height],origin:[selected.sequence.xorigin,selected.sequence.yorigin],
        draw:[boss.x,boss.y],visible:boss.visible,imageAlpha:boss.image_alpha===undefined?1:boss.image_alpha,
        oldAdapterVisible:oldVisible,camera:[host.world.cam.x,host.world.cam.y]};
    trace.push(row);
    if(oldVisible&&firstVisible===null)firstVisible=update;
    if(firstVisible!==null&&!oldVisible&&firstOldInvisible===null)firstOldInvisible=update;
    if(firstVisible!==null&&!boss.visible&&firstNewInvisible===null)firstNewInvisible=update;
    if(firstOldInvisible!==null&&update>=firstOldInvisible+5)break;
}
assert(firstVisible!==null&&firstOldInvisible!==null,'first historical visibility transition reached');checks++;
const at=trace[firstOldInvisible],before=trace[firstOldInvisible-1];
eq(before.state,18,'last original visible state');eq(at.state,6,'first original invisible state');
eq(at.stateAge,0,'first state 6 presentation update');eq(at.mappingFrame,1,'state 6 mapping remains available');
eq(at.visible,true,'repaired adapter still draws on first state 6 update');
eq(firstNewInvisible,null,'repaired adapter never hides before defeat');
const around=trace.slice(Math.max(0,firstOldInvisible-5),firstOldInvisible+6);
const entry=trace.slice(Math.max(0,firstVisible-5),firstVisible+8);
eq(entry[4].visible,false,'last arena setup frame remains blank');
eq(entry[5].state,18,'first boss entry frame starts state 18');
eq(entry[5].mappingFrame,1,'first entry frame uses mapping 1');
eq(entry[5].imageIndex,0,'first entry frame uses GameMaker subimage 0');
for(const frame of entry.slice(5))assert(frame.mappingFrame>0&&frame.resourceExists&&frame.visible,'entry never selects a missing or hidden frame');
fs.writeFileSync(path.join(__dirname,'thz3-boss-render-trace.json'),JSON.stringify({
    startingCamera:[1600,125],playerAnchor:[1800,238],firstVisibleUpdate:firstVisible,
    firstHistoricalInvisibleUpdate:firstOldInvisible,firstHistoricalInvisibleState:at.state,
    aroundEntry:entry,aroundTransition:around
},null,2)+'\n');

// The defeat state deliberately alternates its saved mapping and ROM frame 0.
boss.chaosBoss.state=4;boss.chaosBoss.state_age=0;boss.chaosBoss.defeat_age=0;
boss.chaosBoss.frame=2;boss.chaosBoss.saved_frame=2;
for(let age=0;age<6;age++) {
    h.chaos_boss_runtime_phase();
    eq(boss.visible,age<4,`defeat flicker ${age}`);
    eq(boss.image_index,age<4?1:-1,`defeat image selector ${age}`);
}
for(const mirrored of [false,true]) {
    boss.chaosBoss.state=mirrored?12:6;boss.chaosBoss.state_age=16;boss.chaosBoss.hp=8;
    boss.chaosBoss.xu=1760*256;boss.chaosBoss.mirrored=mirrored;boss.chaosBoss.flash=0;
    player.chaosCore.xu=1735*256;player.chaosCore.yu=238*256;player.chaosCore.move=2;
    h.chaos_boss_runtime_phase();
    eq(boss.chaosBoss.flash,4,`${mirrored?'mirrored':'normal'} hit starts four-update palette flash`);
    eq(boss.sprite_index,mirrored?h.SPR_chaos_boss_50_mirror_flash:h.SPR_chaos_boss_50_flash,'hit selects ROM palette variant');
    for(let age=3;age>=0;age--) {
        h.chaos_boss_runtime_phase();
        eq(boss.chaosBoss.flash,age,'flash countdown');
        eq(boss.sprite_index,age>0?(mirrored?h.SPR_chaos_boss_50_mirror_flash:h.SPR_chaos_boss_50_flash)
            :(mirrored?h.SPR_chaos_boss_50_mirror:h.SPR_chaos_boss_50),'palette restored after four updates');
    }
}
console.log(`THZ3 BOSS RENDER CHECKS PASSED (${checks} assertions; historical disappearance at update ${firstOldInvisible}, state ${at.state})`);
