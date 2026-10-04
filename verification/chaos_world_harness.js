// Shared verification harness: runs the SHIPPED GML (working tree, or any git ref such as the accepted checkpoint 7799c34) through the real player adapter
// (SCR_chaos_adapter_step / _end), the shared core and the platform / moving-spike code, with GameMaker mocked at the instance / camera / audio boundary only.
// No gameplay is re-implemented here: this file only supplies the host (instances, camera, input, frame order). Used by
//   verification/replay_legacy_platform_spike.js  (old POC behaviour at 7799c34 replayed against the Research fixtures)
//   verification/verify_platform_spike.js         (current working tree against the same fixtures)
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..');

const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%').replace(/\bdiv\b/g, '/');
function source(ref, rel) {
    if (!ref) { const p = path.join(root, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
    const r = cp.spawnSync('git', ['show', `${ref}:${rel}`], {cwd: root, maxBuffer: 1 << 28});
    return r.status === 0 ? r.stdout.toString('utf8') : null;
}
const SCRIPTS = ['SCR_chaos_motion_data', 'SCR_chaos_core_data', 'SCR_chaos_core', 'SCR_chaos_level_thz2_data', 'SCR_chaos_level_thz3_data', 'SCR_chaos_gpz_data', 'SCR_chaos_anim_counter_data', 'SCR_chaos_anim_counter',
    'SCR_chaos_terrain_ring', 'SCR_chaos_viewport', 'SCR_chaos_placement', 'SCR_chaos_goal', 'SCR_chaos_box_contact', 'SCR_chaos_attack', 'SCR_chaos_spring', 'SCR_chaos_platform', 'SCR_chaos_damage', 'SCR_chaos_spike1b',
    'SCR_chaos_gpz_enemy', 'SCR_chaos_gpz_enemy_data', 'SCR_chaos_motion', 'SCR_chaos_adapter', 'SCR_chaos_objects', 'SCR_chaos_level', 'SCR_chaos_boss_data', 'SCR_chaos_boss', 'SCR_chaos_gpz_boss_data', 'SCR_chaos_gpz_boss'];

/// ref = null -> working tree; otherwise a git ref. Returns a host with .ctx (the VM), .g (globals) and helpers to build worlds.
function loadHost(ref) {
    const g = {music: 0};
    const texts = {};
    for (const n of SCRIPTS) { const t = source(ref, `scripts/${n}/${n}.gml`); if (t !== null) texts[n] = t; }
    const consts = new Set();
    for (const nm of ['OBJ_chaos_object_25','OBJ_chaos_object_2C','OBJ_chaos_gpz_smoke_0F','OBJ_chaos_object_51']) for (const ev of ['Create_0','Step_0','Draw_0']) { const t=source(ref,`objects/${nm}/${ev}.gml`); if(t) for(const m of t.matchAll(/\b(OBJ|SPR|SFX|ROM|TIME|MUS)_\w+/g)) consts.add(m[0]); }
    for (const t of Object.values(texts)) for (const m of t.matchAll(/\b(OBJ|SPR|SFX|ROM|TIME|MUS)_\w+/g)) consts.add(m[0]);
    const world = {player: null, platforms: [], spikes: [], bosses: [], cam: {x: 0, y: 0, w: 256, h: 192}, events: [], audio: 0, created: [], badniks: [], gpzEnemies: [], smoke: [], input: {}, roomWidth: 4096, roomHeight: 1024};
    for (const c of ['OBJ_chaos_spikes', 'OBJ_chaos_platform', 'OBJ_player', 'OBJ_player_char', 'OBJ_player_char_spin', 'ROM_chaos_thz1', 'ROM_chaos_thz2', 'ROM_chaos_thz3']) consts.add(c);
    const ids = {}; let n = 1000; for (const c of consts) ids[c] = n++;
    const objectsByType = () => ({[ids.OBJ_player]: world.player ? [world.player] : [], [ids.OBJ_player_char]: world.player ? [world.player] : [], [ids.OBJ_chaos_platform]: world.platforms, [ids.OBJ_chaos_spikes]: world.spikes, [ids.OBJ_chaos_object_50]: world.bosses.filter(o=>o.object_index===ids.OBJ_chaos_object_50), [ids.OBJ_chaos_object_51]: world.bosses.filter(o=>o.object_index===ids.OBJ_chaos_object_51), [ids.OBJ_chaos_object_25]: world.gpzEnemies.filter(o=>o.object_index===ids.OBJ_chaos_object_25&&!o.destroyed), [ids.OBJ_chaos_object_2C]: world.gpzEnemies.filter(o=>o.object_index===ids.OBJ_chaos_object_2C&&!o.destroyed)});
    const sandbox = Object.assign({}, ids, {
        ev_step:3, ev_step_normal:0,
        event_perform:()=>host.runEvent(host.self,`objects/${nameOf[host.self.object_index]}/Step_0.gml`),
        event_inherited:()=>host.runEvent(host.self,host.activeEvent.replace("OBJ_chaos_object_2C","OBJ_chaos_object_27")),
        global: g, floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max, sign: Math.sign, clamp: (v, a, b) => Math.min(Math.max(v, a), b),
        point_direction:(x,y,xx,yy)=>Math.atan2(y-yy,xx-x)*180/Math.PI,
        array_create: (k, v) => Array(k).fill(v), array_length: a => a.length, array_push: (a, v) => a.push(v), array_copy: (d, di, s, si, k) => { for (let i = 0; i < k; i++) d[di + i] = s[si + i]; },
        variable_global_exists: k => k in g, variable_struct_exists: (o, k) => k in o, variable_instance_exists: (o, k) => o !== null && typeof o === 'object' && k in o, is_array: Array.isArray, noone: -4,
        instance_exists: o => (typeof o === 'object' && o !== null && !o.destroyed) || (typeof o === 'number' && o >= 0 && (objectsByType()[o] || []).length > 0),
        instance_find: (o, i) => (objectsByType()[o] || [])[i] ?? -4,
        instance_number: o => (objectsByType()[o] || []).length,
        instance_create: (x, y, o) => host.create(o, x, y),
        instance_create_depth: (x, y, d, o) => { const i={x,y,object_index:o,chaosAge:0}; world.created.push([o, x, y, i]); return i; },
        instance_destroy: () => { if (host.self) host.self.destroyed = true; },
        instance_change: (o, p) => { world.events.push(['instance_change', o]); if (world.player) world.player.dead = true; }, audio_play_sound: () => { world.audio++; }, place_meeting: () => false,
        sprite_get_bbox_bottom: () => 33, sprite_get_yoffset: () => 20, sprite_get_number: () => 6,
        view_camera: [0], camera_get_view_x: () => world.cam.x, camera_get_view_y: () => world.cam.y, camera_get_view_width: () => world.cam.w, camera_get_view_height: () => world.cam.h,
        e__VW: {Object:0,XView:1,YView:2}, __view_set: (field,view,value) => { if(field===1) world.cam.x=value; if(field===2) world.cam.y=value; },
        SCR_buttons: () => { const i = world.input; g.btUp = !!i.up; g.btDown = !!i.down; g.btLeft = !!i.left; g.btRight = !!i.right; g.btSpace = !!i.jump; g.btSpacePress = !!i.jumpPress; },
        SCR_player_sprites: () => {}, draw_sprite: () => {}, draw_sprite_part: () => {}, draw_set_color: () => {}, draw_line_width: () => {}, make_color_rgb: () => 0, c_white: 0,
        keyboard_check_pressed: () => false, ord: () => 0, vk_f2: 0, parameter_count: () => 0, parameter_string: () => '',
        get room_width() { return world.roomWidth; }, get room_height() { return world.roomHeight; }, room: ids.ROM_chaos_thz1,
    });
    sandbox.hostEnemyEvent=o=>{o.chaosEnemyPhase=true;host.runEvent(o,`objects/${nameOf[o.object_index]}/Step_0.gml`);};
    const ctx = vm.createContext(sandbox);
    // GML `with (o) { f(); }` changes `self` for a called script; JS `with` does not. The one script that relies on it (SCR_chaos_sample_damage) is rewritten
    // mechanically to take the instance and run its body under `with`.
    const selfCalls = t => t.replace(/with \(cp_enemy\) \{ chaosEnemyPhase=true; event_perform\(ev_step,ev_step_normal\); \}/g, 'hostEnemyEvent(cp_enemy);').replace(/with \((\w+)\) \{ SCR_chaos_sample_damage\(\); \}/g, 'SCR_chaos_sample_damage($1);')
        .replace(/function SCR_chaos_sample_damage\(\) \{([\s\S]*?)[\r\n]\}[\r\n]/, 'function SCR_chaos_sample_damage(__s) { with (__s) {$1 } }$&'.replace('$&', ''));
    for (const [nm, t] of Object.entries(texts)) vm.runInContext(selfCalls(hex(t)), ctx, {filename: nm});
    ctx.SCR_chaos_motion_data(); ctx.SCR_chaos_core_data();
    Object.assign(g, {ring: 0, playerSuper: false, playerBlink: false, powerInv: false, powerShield: false, chaosPowerCode: 0, chaosPowerTimer: 0, chaosDamageBlinkTimer: 0, chaosGoalContact: false,
        chaosLoopCenters: [], chaosLoopRows: [], chaosLoopPlanes: [], valGravity: 48 / 256, playerJump: false, playerJumpSpring: false, playerSpinDash: false, playerFly: false,
        chaosBeyondMapOpen: false, chaosBrokenCells: [], player: 1, chaosLastSoundRequest: 0, chaosBossSparkleOn: false, chaosHudSlide: 0});
    const ids1 = g.chaosTileIds.slice(), ids2 = ctx.SCR_chaos_thz2_tile_ids ? ctx.SCR_chaos_thz2_tile_ids().slice() : null;
    const host = {ref, ctx, g, world, ids, ids1, ids2, texts, has: nm => nm in texts};
    const nameOf = Object.fromEntries(Object.entries(ids).map(([k, v]) => [v, k]));
    /// instance_create for the objects this harness hosts (runs the shipped Create_0); anything else is only recorded.
    host.create = (o, x, y) => {
        const nm = nameOf[o];
        if (["OBJ_chaos_object_25","OBJ_chaos_object_2C","OBJ_chaos_gpz_smoke_0F"].includes(nm)) { const i=host.newInstance(nm,x,y); (nm==="OBJ_chaos_gpz_smoke_0F"?world.smoke:world.gpzEnemies).push(i);return i; }
        if (nm === 'OBJ_chaos_platform' || nm === 'OBJ_chaos_spikes' || nm === 'OBJ_chaos_object_50' || nm === 'OBJ_chaos_object_51') { const i = host.newInstance(nm, x, y); (nm === 'OBJ_chaos_platform' ? world.platforms : nm === 'OBJ_chaos_spikes' ? world.spikes : world.bosses).push(i); return i; }
        world.created.push([o, x, y]); return {x, y, object_index: o};
    };

    // Instance events are the SHIPPED event files, evaluated with the instance as the `with` target. A Proxy makes every bare identifier that is not a
    // script / host name resolve to an instance variable, as GameMaker does.
    host.runEvent = (inst, ev) => {
        const code = source(ref, ev); if (code === null) return false;
        const fn = vm.runInContext(`(function(__self){ with (__self) {\n${hex(code).replace(/\bexit;/g,"return;")}\n} })`, ctx, {filename: ev});
        const prox = new Proxy(inst, {has: (t, k) => typeof k === 'string' && (k in t || !(k in sandbox || k in globalThis || k === 'undefined' || k === '__self')), get: (t, k) => k === Symbol.unscopables ? undefined : t[k], set: (t, k, v) => { t[k] = v; return true; }});
        // `id` inside an event is the instance itself
        inst.id = inst; const prevSelf=host.self,prevEvent=host.activeEvent; host.self = inst;host.activeEvent=ev; fn(prox); host.self=prevSelf;host.activeEvent=prevEvent; return true;
    };
    host.newInstance = (objName, x, y) => {
        const inst = {x, y, object_index: ids[objName], visible: true, solid: false, depth: 0, mask_index: -1, image_index: 0, image_speed: 0, sprite_index: -1};
        host.runEvent(inst, `objects/${objName}/Create_0.gml`);
        return inst;
    };
    // The player instance mock: GameMaker position is the sprite origin; bbox comes from the SPR_player_mask bounds (left 16, right 26, top 3, bottom 33, origin 20,20).
    host.newPlayer = (anchorX, anchorY, opt = {}) => {
        const p = {x: anchorX, y: anchorY + 5, hspeed: 0, vspeed: 0, gravity: 0, object_index: ids.OBJ_player_char, image_xscale: 1, image_angle: 0, image_index: 0, image_speed: 0, sprite_index: 0, alarm: [], image_alpha: 1, id: null, releasedLeft: false, releasedRight: false};
        Object.defineProperty(p, 'bbox_left', {get() { return p.x - 4; }}); Object.defineProperty(p, 'bbox_right', {get() { return p.x + 6; }});
        Object.defineProperty(p, 'bbox_top', {get() { return p.y - 17; }}); Object.defineProperty(p, 'bbox_bottom', {get() { return p.y + 13; }});
        p.id = p; world.player = p; ctx.SCR_chaos_player_init(p); ctx.SCR_chaos_core_attach(p);
        const c = p.chaosCore; c.xu = anchorX * 256; c.yu = anchorY * 256; c.state = c.next = opt.state ?? 14; c.move = opt.move ?? 1; c.vy = opt.vy ?? 0; c.vx = opt.vx ?? 0; c.bg = opt.bg ?? 0; c.contacts = opt.contacts ?? c.bg;
        c.previous = opt.previous ?? 0; if (opt.maximum !== undefined) c.maximum = opt.maximum;
        p.chaosCoreLastX = p.x; p.chaosCoreLastY = p.y;
        return p;
    };
    /// One GameMaker frame in event order: Begin Step (controls), Step (controls, player, legacy objects), End Step (player, then the zone object). The legacy tree moves platforms at Begin Step and
    /// spikes in Step; the working tree runs SCR_chaos_objects_phase from the zone's End Step (player pass first, then the object list - the ROM order).
    host.frame = (input = {}) => {
        world.input = input; const p = world.player;
        if (p && !p.dead && world.follow !== false) { world.cam.x = Math.max(0, Math.floor(p.chaosCore.xu / 256) - 128); world.cam.y = Math.floor(p.chaosCore.yu / 256) - 96; }   // keeps the death boundary and the activation band out of the way
        if (!p && world.follow !== false && world.camHint) { world.cam.x = world.camHint[0]; world.cam.y = world.camHint[1]; }
        if (host.has('SCR_chaos_objects')) { /* new order: objects after the player */ }
        else ctx.SCR_chaos_world_begin();
        if (g.chaosDamageBlinkTimer > 0) { g.chaosDamageBlinkTimer--; g.playerBlink = g.chaosDamageBlinkTimer > 0; }
        if (p && !p.dead) ctx.SCR_chaos_adapter_step(p);
        if (!host.has('SCR_chaos_objects')) for (const s of world.spikes) ctx.SCR_chaos_spike_step(s);
        for (const b of world.badniks) if (!b.destroyed) host.runEvent(b, b.stepPath);      // the shipped Step events of type $21 / $27 / monitor (Step order: after the player)
        if (p && !p.dead) ctx.SCR_chaos_adapter_end(p);
        if (host.has('SCR_chaos_objects')) ctx.SCR_chaos_objects_phase();
        world.frameNo = (world.frameNo || 0) + 1;
    };
    host.isolate = (keep = []) => {            // empty terrain everywhere except the listed 32x32 cells [[cx, cy]...] (kept from the act-1 layout)
        const iso = ids1.map(() => 254);
        for (const [cx, cy] of keep) { const i = cy * 128 + cx; iso[i] = ids1[i]; }
        g.chaosTileIds = iso; g.chaosBrokenCells = [];
    };
    host.reset = () => { world.gpzEnemies.length=0;world.smoke.length=0;world.badniks.length = 0; world.platforms.length = 0; world.spikes.length = 0; world.bosses.length = 0; world.events.length = 0; world.created.length = 0; world.player = null; world.frameNo = 0;
        g.ring = 0; g.playerBlink = false; g.chaosDamageBlinkTimer = 0; g.powerShield = false; g.powerInv = false; g.playerSuper = false; g.chaosAttackPosture = false; };
    return host;
}
module.exports = {loadHost, hex, source, root};
