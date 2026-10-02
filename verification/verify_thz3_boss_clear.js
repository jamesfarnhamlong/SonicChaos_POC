// End-to-end THZ3 boss-clear trace through the shared POC results/progression handoff.
// The next playable zone and ROM results screen are not present in this POC.
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const {loadHost}=require('./chaos_world_harness.js');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/thz3/implementation-manifest.json')));
const oracle=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/thz3-boss-support.json')));
const fixture=oracle.part_b.b6_defeat_act_clear.variants.rows.find(r=>r.variant==='rings_47');
const worldWidth=manifest.reused_ordinary_systems.terrain.size_px[0];
assert.equal(worldWidth,2560);
assert.equal(manifest.defeat_and_clear.state_4_updates,148);
assert.equal(manifest.arena_and_camera.act_clear_threshold.rule.includes('EDGE(RIGHT,+33)'),true);

function run(viewWidth,attackAtHandoff=false) {
    const host=loadHost(null),h=host.ctx,g=host.g,w=host.world;
    h.room=host.ids.ROM_chaos_thz3;
    w.roomWidth=worldWidth;w.roomHeight=512;w.cam={x:1679,y:78,w:viewWidth,h:192};w.follow=false;
    h.room_width=worldWidth;h.room_height=512; // host's initial room constants are THZ1's 4096x1024
    h.chaos_level_install_layout();
    assert.equal(g.chaosMapWidth*32,worldWidth,'the active act supplies the terrain edge');
    g.chaosBeyondMapOpen=true;
    assert.equal(h.SCR_cc_lookup(worldWidth-1,256,0).index!==-1,true,'last THZ3 column remains canonical terrain');
    assert.equal(h.SCR_cc_lookup(worldWidth,256,0).index,-1,'state $20 opens the first beyond-map column');
    g.chaosBeyondMapOpen=false;
    let saveCalls=0;h.SCR_save_game=()=>{saveCalls++};
    g.chaosComplete=false;g.zoneGoto=3;g.minutes=0;g.seconds=0;g.ring=47;
    const boss=host.create(host.ids.OBJ_chaos_object_50,1936,238);
    const b=boss.chaosBoss;
    b.state=6;b.state_age=16;b.xu=1760*256;b.y=238;b.hp=1;b.frame=1;
    b.camera_mode=3;b.camera_x=1679;b.camera_y=78;
    const player=host.newPlayer(1735,238,{state:1,move:2,bg:2,contacts:2});
    const c=player.chaosCore;
    h.chaos_boss_runtime_phase();
    assert.equal(b.state,4,'eighth hit enters state 4 on the contact update');
    assert.equal(b.hp,0);
    // Aligned conversion fixture: Research measured the flag from grounded X=1800.
    c.xu=1800*256;c.yu=238*256;c.vx=0;c.vy=0;c.state=1;c.next=1;c.move=attackAtHandoff?2:0;c.bg=2;c.contacts=2;
    c.previous=h.SCR_cc_lookup(1800,256,0).flags; // aligned grounded ROM fixture, including the prior floor tile
    h.SCR_chaos_core_publish(player);
    h.SCR_chaos_core_sprites(player);
    const rows=[];
    let emitter=null,firstClear=-1,firstBeyondProbe=-1;
    const row=(update,mark)=>({update,mark,bossState:b.state,bossTimer:b.state_age,defeatAge:b.defeat_age,
        type0A:emitter?{type:emitter.chaosType,parameter:emitter.chaosParameter,age:emitter.chaosAge}:null,
        sparkleCount:w.created.filter(x=>x[3]?.chaosType===10&&x[3]?.chaosParameter===255).length,
        playerState:c.state,requestedState:c.next,playerX:Math.floor(c.xu/256),playerY:Math.floor(c.yu/256),
        playerVX:c.vx,playerVY:c.vy,moveFlags:c.move,floorFlags:c.bg,contactFlags:c.contacts,
        attackBit:!!(c.move&2),playerSprite:Object.entries(host.ids).find(([,id])=>id===player.sprite_index)?.[0]??player.sprite_index,
        playerFrame:player.image_index,playerImageSpeed:player.image_speed,playerDrawX:player.x,playerDrawY:player.y,
        cameraX:w.cam.x,cameraY:w.cam.y,state20:c.state===32,inputLocked:c.state===32,
        autoRunVelocity:c.vx,actClear:c.act_clear,resultsOverlay:!!g.chaosComplete,
        clearDelta:Math.floor(c.xu/256)-w.cam.x,clearThreshold:h.chaos_goal_clear_dx(w.cam.w),
        cameraMode:b.camera_mode,timerStopped:!!g.chaosGoalContact,
        savedAct:g.zoneGoto,progressionSaveCalls:saveCalls,
        canonicalNextZone:'zone 1 act 0',actualNextRoomAvailable:false});
    rows.push(row(0,'final_hit'));
    for(let update=1;update<=148;update++) {
        h.chaos_boss_runtime_phase();rows.push(row(update,update===148?'defeat_ends':null));
    }
    assert.equal(b.state,5,'148 state-4 updates');
    h.chaos_boss_runtime_phase();
    emitter=w.created.map(x=>x[3]).find(x=>x?.chaosType===10&&x.chaosParameter===0);
    assert(emitter,'type $0A parameter 0 created on conversion');
    assert.equal(c.next,32,'state $20 requested on conversion');
    assert.equal(b.camera_mode,4,'boss camera released on conversion');
    assert.equal(g.chaosBossBonus.steps,fixture.d2a6_steps,'Research bonus fixture');
    rows.push(row(149,'conversion'));
    for(let update=150;update<600;update++) {
        host.frame({});h.chaos_boss_camera_step();
        host.runEvent(emitter,'objects/OBJ_chaos_boss_effect/Step_0.gml');
        if(c.act_clear&&!g.chaosComplete){firstClear=update;h.chaos_act_complete();}
        const current=row(update,c.act_clear&&firstClear===update?'clear_flag_results_handoff':null);
        if(firstBeyondProbe<0&&current.playerX+9>=worldWidth)firstBeyondProbe=update;
        rows.push(current);
        if(c.act_clear)break;
    }
    const last=rows.at(-1);
    assert.equal(rows[150].playerState,32,'state $20 begins one update after conversion');
    assert.equal(rows[149].playerY,rows[150].playerY,'grounded handoff has no one-update vertical drop');
    assert.equal(rows[150].playerY,rows[151].playerY,'first auto-run frame stays floor registered');
    assert.equal(rows[149].requestedState,32,'state $20 request precedes first update');
    assert.equal(rows[150].playerVX,16,'first state $20 update accelerates once');
    assert.equal(rows[150].playerSprite,'SPR_player_walk','first state $20 update uses run-off mapping even if attack bit remains');
    assert.equal(rows[150].attackBit,attackAtHandoff,'sprite choice does not rewrite the canonical attack bit');
    assert.equal(rows[150].inputLocked,true,'state $20 ignores player input');
    assert.equal(firstBeyondProbe,322,'first THZ3 beyond-map side probe');
    assert.equal(rows[322].playerX,2553,'no projection to old X=2551 stall');
    assert(last.actClear,'shared state $20 reaches its clear flag');
    assert(last.resultsOverlay,'shared completion message is enabled');
    assert.equal(saveCalls,1,'shared progression save runs once');
    assert.equal(last.cameraX,worldWidth-viewWidth,'released camera reaches the act-specific right limit');
    assert.equal(last.clearThreshold,viewWidth+33,'clear remains EDGE(RIGHT,+33)');
    assert(last.clearDelta>=last.clearThreshold,'clear threshold is reached');
    assert(last.playerX>=worldWidth+33,'run goes beyond the canonical world edge');
    assert(last.sparkleCount>0,'type $0A emits the recovered sparkle trail');
    assert(rows.every(r=>!r.timerStopped),'THZ3 never requests the sign timer stop');
    const marks=rows.filter((r,i)=>r.mark||i>0&&(
        r.playerState!==rows[i-1].playerState||r.cameraX===worldWidth-viewWidth&&rows[i-1].cameraX!==r.cameraX));
    return {viewWidth,firstClear,firstBeyondProbe,markers:marks,last,updates:rows};
}

const canonical=run(256),wide=run(640),attackHandoff=run(256,true);
assert.equal(canonical.last.playerX,wide.last.playerX,'world clear position is independent of viewport width');
fs.writeFileSync(path.join(__dirname,'thz3-boss-clear-trace.json'),JSON.stringify({
    historicalFirstDivergence:{update:322,oldPlayerX:2551,oldStopUpdate:323,reason:'4096 px beyond-map guard on THZ3 2560 px layout'},
    canonical,widescreen:wide,attackHandoff:{conversion:attackHandoff.updates[149],firstState20:attackHandoff.updates[150],last:attackHandoff.last}
},null,2)+'\n');
console.log(`THZ3 BOSS CLEAR CHECKS PASSED (256/640 px; flag at update ${wide.firstClear}; X=${wide.last.playerX}; shared results/progression handoff)`);
