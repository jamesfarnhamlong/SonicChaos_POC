// Measurements of platform ($28) behaviour taken THROUGH the real adapter / shared core of a loaded host (see chaos_world_harness.js). The same probes run against the
// accepted checkpoint (old POC replay) and against the working tree (verifier); expectations live in the callers, sourced from the Research cache.
const ROW = (idx, x, y, param, aux1) => [idx, x, y, 0x28, 0, param, 0x6A, aux1, 0, 0];
const LIFTS = {thz1_1: ROW(1, 592, 464, 0x0A, 0x09), thz1_2: ROW(2, 3664, 512, 0x0A, 0x0D), thz2_1: ROW(1, 552, 720, 0x0A, 0x19), thz2_2: ROW(2, 3672, 608, 0x0A, 0x13)};
const SAGS = {thz1_3: ROW(3, 1040, 384, 0x84, 0)};

function fresh(host, keep) { host.reset(); host.isolate(keep || []); host.world.cam.x = 0; host.world.cam.y = 0; }
function mkPlatform(host, row) { return host.ctx.chaos_spawn_type28(row); }
function advance(host, n) { for (let i = 0; i < n; i++) host.frame({}); }          // no player present -> only the world runs

/// Post-pass placement: the player's anchor and Y speed AFTER its own pass of the next frame are exactly (x, y, vyPost) (airborne, state 14, gravity 48).
function placePost(host, x, y, vyPost, extra = {}) {
    const p = host.newPlayer(x, y, {state: 14, move: 1, vy: vyPost - 48});
    p.chaosCore.xu = x * 256; p.chaosCore.yu = y * 256 - vyPost; p.chaosCoreLastX = p.x = x; p.y = (p.chaosCore.yu / 256) + p.chaosAnchorOffset; p.chaosCoreLastY = p.y;
    Object.assign(p.chaosCore, extra); return p;
}
const anchor = p => [Math.floor(p.chaosCore.xu / 256), Math.floor(p.chaosCore.yu / 256)];
const ownerOf = (host, p, plat) => p.chaosSupport === plat;

/// Which (dx, dy) relative to the platform anchor are supported after ONE update with post-pass Y speed vyPost (platform at rest, moving platforms handled by caller).
function supportRegion(host, row, vyPost, range = {dx: [-30, 30], dy: [-30, 12]}, setup) {
    const cells = [];
    for (let dy = range.dy[0]; dy <= range.dy[1]; dy++) for (let dx = range.dx[0]; dx <= range.dx[1]; dx++) {
        fresh(host); const plat = mkPlatform(host, row); if (setup) setup(plat);
        const py = plat.y + dy;                                   // reference = the platform Y the contact test sees (state 5: pre-sag rest Y)
        const p = placePost(host, plat.x + dx, py, vyPost); host.frame({});
        cells.push([dx, dy, ownerOf(host, p, plat)]);
    }
    return cells;
}

/// Drop from above onto a platform (centre) and let him settle; returns the per-update trace relative to the platform.
function landFromAbove(host, row, opt = {}) {
    fresh(host); const plat = mkPlatform(host, row); (opt.setup || (() => {}))(plat);
    const startDy = opt.startDy ?? -60, vy0 = opt.vy ?? 0;
    const p = host.newPlayer(plat.x + (opt.dx ?? 0), plat.y + startDy, {state: 14, move: 1, vy: vy0});
    const trace = [];
    for (let i = 0; i < (opt.frames ?? 80); i++) {
        host.frame(opt.input ? opt.input(i, p, plat) : {});
        trace.push({f: i + 1, x: anchor(p)[0], y: anchor(p)[1], vy: p.chaosCore.vy, vx: p.chaosCore.vx, state: p.chaosCore.state, move: p.chaosCore.move, bg: p.chaosCore.bg, contacts: p.chaosCore.contacts,
            supported: ownerOf(host, p, plat), platY: plat.y, dy: anchor(p)[1] - plat.y});
    }
    return {p, plat, trace};
}
module.exports = {ROW, LIFTS, SAGS, fresh, mkPlatform, advance, placePost, anchor, ownerOf, supportRegion, landFromAbove};
