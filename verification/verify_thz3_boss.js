// Focused THZ3 boss oracle: executes shipped pure GML against the mirrored Research cache.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert').strict,crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(read('POC_notes/rom-cache/thz3/implementation-manifest.json'));
const cache=JSON.parse(read('POC_notes/rom-cache/thz3-boss-support.json'));
const research=path.resolve(root,'../sonic-chaos-reference-work/data/rom-cache');
for(const [local,remote] of [['POC_notes/rom-cache/thz3/implementation-manifest.json','thz3/implementation-manifest.json'],['POC_notes/rom-cache/thz3-boss-support.json','thz3-boss-support.json'],['POC_notes/rom-cache/thz3/object-50.json','thz3/object-50.json']])
    assert.equal(sha(read(local)),sha(fs.readFileSync(path.join(research,remote))),`${local} mirrors Research main`);
const generated=read('scripts/SCR_chaos_boss_data/SCR_chaos_boss_data.gml');
assert.equal(cp.spawnSync('node',['POC_notes/generate_thz3_boss_data.js'],{cwd:root}).status,0);
assert.equal(sha(generated),sha(read('scripts/SCR_chaos_boss_data/SCR_chaos_boss_data.gml')),'manifest generator reproducible');
const translate=t=>t.replace(/(?<![\w"])(\$[0-9A-Fa-f]+)/g,(_,h)=>'0x'+h.slice(1)).replace(/#macro (\w+) (\S+)/g,'var $1 = $2;').replace(/\bmod\b/g,'%').replace(/\bdiv\b/g,'/');
const g={}; const ctx=vm.createContext({global:g,floor:Math.floor,abs:Math.abs,max:Math.max,min:Math.min,sign:Math.sign,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),array_length:a=>a.length,noone:-4});
for(const n of ['SCR_chaos_viewport','SCR_chaos_box_contact','SCR_chaos_attack','SCR_chaos_goal','SCR_chaos_boss_data','SCR_chaos_boss'])
    vm.runInContext(translate(read(`scripts/${n}/${n}.gml`).toString()),ctx,{filename:n});
let checks=0; const eq=(a,b,msg)=>{assert.equal(a,b,msg);checks++};
const model=()=>ctx.chaos_boss_new();
const player=(x,y,attack=false,vy=256)=>({xu:x*256,yu:y*256,vx:0,vy,move:attack?2:0,next:1,bg:0,contacts:0,stage_request:0});
const vp=(left,w)=>ctx.chaos_vp_new(left,0,w,192);
// Creation is EDGE(RIGHT,+32..+95), including both endpoints, for both widths.
for(const w of [256,640]) for(let out=30;out<=97;out++) eq(ctx.chaos_boss_creation_band(vp(500,w),500+w+out),out>=32&&out<=95,`creation ${w}/${out}`);
for(const dx of [-161,-160,-159,159,160,161]) for(const dy of [-257,-256,-255,255,256,257])
    eq(ctx.chaos_boss_trigger(model(),1936+dx,238+dy),Math.abs(dx)<160&&Math.abs(dy)<256,`trigger ${dx}/${dy}`);
for(const w of [256,640]) {
    const extra=Math.max(0,w-256),right=1926+extra;
    eq(ctx.chaos_boss_arena_extra(w),extra,`widescreen extra ${w}`);
    eq(ctx.chaos_boss_patrol_right(w),w===256?1879:2282,`right patrol threshold ${w}`);
    for(const [x,want] of [[1693,1695],[1694,1695],[1695,1695],[1696,1696],[right-1,right-1],[right,right],[right+1,right],[right+2,right]]) {
        const c=ctx.chaos_boss_clamp(x*256,x<1800?-1024:1024,w);eq(c.xu,want*256,`arena ${w}/${x}`);
    }
}
{
    const b=model();b.xu=ctx.chaos_boss_patrol_right(640)*256;
    eq(ctx.chaos_boss_contact_bits(b,player(2310,238))!==0,true,'640px clamp at dx=28 is in boss contact');
    eq(ctx.chaos_boss_contact_bits(b,player(2311,238)),0,'dx=29 remains outside boss contact');
    eq(ctx.chaos_boss_patrol_right(256),1879,'256px patrol remains canonical');
}
// Exhaustive inclusive geometry; classify each edge with the exact $6328 axis rule.
for(let dx=-30;dx<=30;dx++)for(let dy=-50;dy<=26;dy++){
    const b=model(),c=player(1936+dx,238+dy,true);
    const got=ctx.chaos_boss_contact_bits(b,c);
    const exp=(Math.abs(dx)<=28&&dy>=-48&&dy<=24);
    eq(got!==0,exp,`box ${dx}/${dy}`);
}
for(const row of cache.part_b.b4_boss_contact.edge_rows){
    const b=model(),c=player(1936+row.dx,238+row.dy,row.posture==='attacker_ball_grounded');
    eq(ctx.chaos_boss_contact_bits(b,c),row.contact_bits,`ROM contact bits ${row.state}/${row.dx}/${row.dy}`);
    const result=ctx.chaos_boss_contact(b,c,row.state!==18);
    const outcome=result===0?(row.contact_bits&&row.state===18?'knockback_no_health':'none'):(result===1?'player_damage_request':result===2?'top_bounce':'hit');
    eq(outcome,row.outcome,`ROM contact outcome ${row.state}/${row.dx}/${row.dy}`);
}
for(const attack of [false,true])for(const inv of [false,true]){
    const b=model(),c=player(1936-25,238,attack); c.invincible=inv;
    const result=ctx.chaos_boss_contact(b,c,true);
    eq(result,attack?3:1,`boss tests attack bit only, inv=${inv}`);
}
{
    const b=model(),c=player(1936-25,238,false);
    eq(ctx.chaos_boss_contact(b,c,true),1);eq(b.cooldown,2);
    eq(ctx.chaos_boss_contact(b,c,true),0);eq(b.cooldown,1);
    eq(ctx.chaos_boss_contact(b,c,true),0);eq(b.cooldown,0);
    eq(ctx.chaos_boss_contact(b,c,true),1);
}
for(const hit of [1,2,3,4,5,6,7,8]){
    const b=model();b.hp=9-hit;b.state=6;
    const c=player(1936-25,238,true);
    ctx.chaos_boss_tick(b,vp(1679,256),c,true);
    eq(b.hp,8-hit,`hit ${hit}`);eq(b.state,hit===8?4:8,`reaction ${hit}`);
}
{
    for(const w of [256,640]) {
        const b=model();b.state=6;b.xu=1900*256;b.camera_x=1679;b.vx=-128;
        let lo=9999,hi=0,cycleHi=0,seen=new Set(),maxSpeed=0;
        for(let i=0;i<1900;i++){ctx.chaos_boss_tick(b,vp(1679,w),null,false);const x=ctx.chaos_boss_x(b);lo=Math.min(lo,x);hi=Math.max(hi,x);if(i>900)cycleHi=Math.max(cycleHi,x);seen.add(b.state);maxSpeed=Math.max(maxSpeed,Math.abs(b.vx));}
        for(const state of [6,9,12,15])assert(seen.has(state),`patrol state ${state} ${w}`);
        assert(lo>=1725&&lo<=1728,`patrol min ${lo} ${w}`);
        const turn=ctx.chaos_boss_patrol_right(w)+8;
        assert(hi>=Math.max(1899,turn-1)&&hi<=Math.max(1900,turn+2),`patrol max ${hi} ${w}`);
        assert(cycleHi>=turn-1&&cycleHi<=turn+2,`patrol right turn ${cycleHi} ${w}`);
        eq(maxSpeed,130,`unchanged canonical boss phase speed ${w}`);
        assert(hi+20<1679+w,`boss remains on visible terrain ${w}`);
    }
}
{
    const b=model();b.state=4;b.hp=0;const c=player(1800,238,false);c.contacts=2;
    for(let i=0;i<148;i++)ctx.chaos_boss_tick(b,vp(1679,256),c,true);
    eq(b.state,5,'148-update defeat');ctx.chaos_boss_tick(b,vp(1679,256),c,true);
    eq(b.state,-2,'floor-gated conversion');eq(c.next,32,'shared state $20 request');eq(b.start_clear,true);
}
for(const row of cache.part_b.b6_defeat_act_clear.variants.rows.filter(x=>x.variant.startsWith('rings_')&&!x.variant.includes('buttons'))){
    const bonus=ctx.chaos_boss_bonus(0,row.rings_decimal);
    eq(bonus.packed,row.d2a6_after_conversion,`${row.variant} packed bonus`);
    eq(bonus.steps,row.d2a6_steps,`${row.variant} bonus steps`);
    eq(row.rings_decimal*10+bonus.steps+500,row.score_after,`${row.variant} total score`);
}
for(const row of cache.part_b.b2_support_objects.controlled.type_0a.param_0_init){
    const t=parseInt(row.time_D2BF_D2C0_bcd,16),r=parseInt(row.rings_D29A_bcd,16);
    const seconds=((t>>12)&15)*600+((t>>8)&15)*60+((t>>4)&15)*10+(t&15);
    const rings=((r>>4)&15)*10+(r&15);
    eq(ctx.chaos_boss_bonus(seconds,rings).packed,row.D2A6_after_init,`$041F time/rings ${row.time_D2BF_D2C0_bcd}/${row.rings_D29A_bcd}`);
}
assert.equal(manifest.boss.states.length,19);assert.deepEqual(Array.from(ctx.chaos_boss_state_ids()).sort((a,b)=>a-b),manifest.boss.states.map(s=>s.state).sort((a,b)=>a-b));
for(const n of ['SPR_chaos_boss_50','SPR_chaos_boss_50_mirror','SPR_chaos_boss_50_flash','SPR_chaos_boss_50_mirror_flash','SPR_chaos_boss_puff_34','SPR_chaos_boss_sparkle_0A','SPR_chaos_boss_poof_0F']){
    const yy=JSON.parse(read(`sprites/${n}/${n}.yy`));for(const f of yy.frames){assert(fs.existsSync(path.join(root,'sprites',n,f.name+'.png')),`${n} ROM frame`);for(const layer of yy.layers)assert(fs.existsSync(path.join(root,'sprites',n,'layers',f.name,layer.name+'.png')),`${n} GameMaker layer`);}
}
for(const a of JSON.parse(read('POC_notes/rom-cache/thz3/boss-sprite-assets.json')).assets)
    eq(sha(read(`sprites/${a.sprite}/${a.frame}.png`)),a.sha256,`${a.sprite} ROM-derived PNG hash`);
const project=JSON.parse(read('SonicChaos_POC.yyp'));
for(const n of ['SCR_chaos_boss_data','SCR_chaos_boss','OBJ_chaos_object_50','OBJ_chaos_boss_effect','SPR_chaos_boss_50','SPR_chaos_boss_50_mirror','SPR_chaos_boss_50_flash','SPR_chaos_boss_50_mirror_flash','SPR_chaos_boss_puff_34','SPR_chaos_boss_sparkle_0A','SPR_chaos_boss_poof_0F'])
    assert(project.resources.some(r=>r.id.name===n),`${n} registered in primary .yyp`);
// Execute the GameMaker-facing object phase and camera adapter with the shared host.
{
    const {loadHost}=require('./chaos_world_harness.js');
    const host=loadHost(null),h=host.ctx;
    h.room=host.ids.ROM_chaos_thz3;
    host.world.cam={x:1600,y:125,w:256,h:192};host.world.roomWidth=2560;host.world.roomHeight=512;
    const boss=host.create(host.ids.OBJ_chaos_object_50,1936,238);
    const p=host.newPlayer(1800,238,{state:1,move:0});p.chaosCore.contacts=2;
    h.chaos_boss_runtime_phase();eq(boss.chaosBoss.state,1,'placement enters at original right-edge ring');
    h.chaos_boss_camera_step();const before=host.world.cam.x;
    host.world.cam.x=before-20;h.chaos_boss_camera_step();eq(host.world.cam.x,before,'no backscroll after creation');
    h.chaos_boss_runtime_phase();eq(boss.chaosBoss.state,2,'strict player trigger locks right scroll');
    h.chaos_boss_camera_step();eq(host.world.cam.x,boss.chaosBoss.camera_right,'camera held during HUD transition');
    for(let i=0;i<100;i++)h.chaos_boss_runtime_phase();
    eq(boss.chaosBoss.camera_mode,3,'HUD child disappearance enables arena pan');
    for(let i=0;i<100;i++){h.chaos_boss_camera_step();if(!Number.isFinite(host.world.cam.x))throw Error(`camera NaN at ${i}, start=${before}, mode=${boss.chaosBoss.camera_mode}, target=${h.CHAOS_BOSS_CAMERA_X}, vp=${JSON.stringify(h.chaos_vp_current())}`);}
    eq(host.world.cam.x,1679,'pan reaches exact locked X');eq(host.world.cam.y,78,'pan reaches exact locked Y');
    eq(host.g.chaosHudSlide<=-49,true,'HUD rows have slid out');
    boss.chaosBoss.state=5;p.chaosCore.contacts=2;host.g.minutes=0;host.g.seconds=10;host.g.ring=47;
    h.chaos_boss_runtime_phase();eq(boss.chaosType,15,'slot converted to type $0F');eq(p.chaosCore.next,32,'conversion requests $20');
    eq(host.g.chaosBossBonus.steps,936,'type $0A computes bonus at conversion');eq(host.g.chaosBossClearScore,1906,'ring + bonus + 500');
    for(let i=0;i<38;i++)h.chaos_boss_runtime_phase();eq(boss.chaosType,255,'converted slot expires after poof');
    const emitter=host.newInstance('OBJ_chaos_boss_effect',0,0);emitter.chaosType=10;emitter.chaosParameter=0;emitter.chaosLife=-1;
    const beforeEffects=host.world.created.length;
    for(let i=0;i<16;i++)host.runEvent(emitter,'objects/OBJ_chaos_boss_effect/Step_0.gml');
    eq(host.world.created.length-beforeEffects,2,'parameter-0 type $0A emits at 8-update cadence');
    eq(host.world.created[beforeEffects][1],Math.floor(p.chaosCore.xu/256),'sparkle follows final player X');
    eq(host.world.created[beforeEffects][2],Math.floor(p.chaosCore.yu/256)-12,'first sparkle at Y-12');
    eq(host.world.created[beforeEffects+1][2],Math.floor(p.chaosCore.yu/256)-8,'second sparkle at Y-8');
    const sparkle=host.newInstance('OBJ_chaos_boss_effect',0,0);sparkle.chaosType=10;sparkle.chaosParameter=255;sparkle.chaosLife=28;
    for(let i=0;i<28;i++)host.runEvent(sparkle,'objects/OBJ_chaos_boss_effect/Step_0.gml');
    eq(!!sparkle.destroyed,true,'parameter-$FF sparkle lifetime 28');
    const poof=host.newInstance('OBJ_chaos_boss_effect',0,0);poof.chaosType=15;poof.chaosLife=38;
    for(let i=0;i<38;i++)host.runEvent(poof,'objects/OBJ_chaos_boss_effect/Step_0.gml');
    eq(!!poof.destroyed,true,'type $0F poof lifetime 38');
}
console.log(`THZ3 BOSS CHECKS PASSED (${checks} assertions; Research caches byte-identical)`);
