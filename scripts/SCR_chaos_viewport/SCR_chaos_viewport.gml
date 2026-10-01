// Shared viewport-semantics adapter. Plain numbers only, so verification/verify_viewport_adapter.js executes this shipped code.
// Source: sonic-chaos-reference-work docs/viewport-semantics-audit.md (0f73ec0) and data/rom-cache/viewport-semantics.json.
//
// The original game mixes four kinds of rule. Each system states which one it uses instead of embedding "256" arithmetic:
//   WORLD(x)            canonical world coordinate; never widened (placements, terrain, contact boxes, level data)
//   EDGE(LEFT/RIGHT, n) n pixels from the visible left/right edge (original: cam+n / cam+256+n); RIGHT follows the REAL view width
//   CENTER(n)           n pixels from the view centre (original: cam+128+n)
//   PLAYER_DIST(n)      |x - playerX| compared with n; NOT a viewport rule, never widened
//   LOCKED_CAMERA(c)    while the camera is frozen at c, a screen-X compare is the fixed world X c+k
//
// A "view" is {left, top, w, h}: the live camera rectangle in world pixels. Nothing here knows an act, a room or an object type.
#macro CHAOS_VP_LEFT 0
#macro CHAOS_VP_RIGHT 1
#macro CHAOS_VP_SMS_W 256
// Generic object lifecycle (placement scan $8000 / lifetime routine $61E1): margins beyond each edge, class D in the audit.
#macro CHAOS_LIFE_WAKE_MARGIN 32
#macro CHAOS_LIFE_OUTER_MARGIN 96
// The vertical central band is 256 tall in the ROM (taller than the 192-line screen). Horizontal widening does not change it.
#macro CHAOS_LIFE_VERTICAL_WINDOW 256

function chaos_vp_new(cp_left, cp_top, cp_w, cp_h) {
    return {left: cp_left, top: cp_top, w: cp_w, h: cp_h};
}

/// The live GameMaker camera (view 0). Whole pixels, like the ROM's committed camera ($D174/$D176).
function chaos_vp_current() {
    var cp_cam = view_camera[0];
    return chaos_vp_new(floor(camera_get_view_x(cp_cam)), floor(camera_get_view_y(cp_cam)),
        camera_get_view_width(cp_cam), camera_get_view_height(cp_cam));
}

/// WORLD(x): the identity. It exists so a call site says "this is canonical world space, deliberately not viewport-relative".
function chaos_vp_world(cp_x) {
    return cp_x;
}

/// EDGE(side, n) as a world X. RIGHT is the exclusive right edge (left + width); the last visible column is RIGHT - 1.
function chaos_vp_edge(cp_vp, cp_side, cp_n) {
    if (cp_side == CHAOS_VP_LEFT) return cp_vp.left + cp_n;
    return cp_vp.left + cp_vp.w + cp_n;
}

/// CENTER(n) as a world X.
function chaos_vp_center(cp_vp, cp_n) {
    return cp_vp.left + floor(cp_vp.w / 2) + cp_n;
}

/// Inverse of CENTER: the camera left edge that puts world X cp_world_x at CENTER(cp_n).
function chaos_vp_left_for_center(cp_w, cp_world_x, cp_n) {
    return cp_world_x - floor(cp_w / 2) - cp_n;
}

/// PLAYER_DIST(n): |a - b| < n and |a - b| >= n. Independent of any view.
function chaos_vp_dist_lt(cp_a, cp_b, cp_n) {
    return abs(cp_a - cp_b) < cp_n;
}
function chaos_vp_dist_ge(cp_a, cp_b, cp_n) {
    return abs(cp_a - cp_b) >= cp_n;
}

/// LOCKED_CAMERA(c): a view whose left edge is the frozen camera c. EDGE/CENTER of it are fixed world X values.
function chaos_vp_locked(cp_c, cp_w) {
    return chaos_vp_new(cp_c, 0, cp_w, 0);
}

/// Generic lifecycle band for a coordinate lying cp_out pixels beyond one edge of the central window (cp_out < 0 = inside).
/// 0 inside; 1 awake margin (32); 2 sleep/create ring (32..96); 3 deletion. Same numbers as ROM map $8146 for a 256 px window.
function chaos_vp_band_beyond(cp_out) {
    if (cp_out < 0) return 0;
    if (cp_out < CHAOS_LIFE_WAKE_MARGIN) return 1;
    if (cp_out < CHAOS_LIFE_OUTER_MARGIN) return 2;
    return 3;
}

/// Horizontal band of a world X against [LEFT, RIGHT) of the live view. Edge distances are preserved at any width: the left bands
/// hang off LEFT, the right bands off RIGHT (never off a fixed 256).
function chaos_vp_band_x(cp_vp, cp_x) {
    if (cp_x < cp_vp.left) return chaos_vp_band_beyond(cp_vp.left - cp_x - 1);
    return chaos_vp_band_beyond(cp_x - chaos_vp_edge(cp_vp, CHAOS_VP_RIGHT, 0));
}

/// Vertical band of a world Y: the ROM's 256 px central window starting at the camera top, unchanged by the view width/height.
function chaos_vp_band_y(cp_vp, cp_y) {
    if (cp_y < cp_vp.top) return chaos_vp_band_beyond(cp_vp.top - cp_y - 1);
    return chaos_vp_band_beyond(cp_y - (cp_vp.top + CHAOS_LIFE_VERTICAL_WINDOW));
}

/// Lifecycle cell of a canonical world anchor: max(horizontal, vertical) band, the ROM's cell(dx,dy) = max(band(dx), band(dy)).
///   3 outside (never created; a live placement-backed object is removed), 2 outer ring (created on any scan, kept asleep),
///   1 / 0 interior (created only during the initial fill; an existing object is awake).
function chaos_vp_lifecycle_cell(cp_vp, cp_x, cp_y) {
    return max(chaos_vp_band_x(cp_vp, cp_x), chaos_vp_band_y(cp_vp, cp_y));
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// GAMEMAKER WIDESCREEN RETENTION ADAPTER (not ROM behaviour). Canonical entry (create at the outer ring, wake at EDGE+-32) is untouched. An object
// that has ALREADY been awake keeps running/existing longer once it is off-screen, by the extra viewport width:
//   widescreen_extra = max(0, viewWidth - 256)    sleep threshold = 32 + extra    delete threshold = 96 + extra   (horizontal, both sides)
// At 256 px the extra is 0 and everything reduces exactly to the canonical bands. Vertical bands are never extended. A true deletion still
// releases the placement slot and the next creation rebuilds from the canonical record.
function chaos_vp_widescreen_extra(cp_vp) {
    return max(0, cp_vp.w - CHAOS_VP_SMS_W);
}
function chaos_vp_band_beyond_retained(cp_out, cp_extra) {
    if (cp_out < 0) return 0;
    if (cp_out < CHAOS_LIFE_WAKE_MARGIN + cp_extra) return 1;
    if (cp_out < CHAOS_LIFE_OUTER_MARGIN + cp_extra) return 2;
    return 3;
}
function chaos_vp_band_x_retained(cp_vp, cp_x) {
    var cp_extra = chaos_vp_widescreen_extra(cp_vp);
    if (cp_x < cp_vp.left) return chaos_vp_band_beyond_retained(cp_vp.left - cp_x - 1, cp_extra);
    return chaos_vp_band_beyond_retained(cp_x - chaos_vp_edge(cp_vp, CHAOS_VP_RIGHT, 0), cp_extra);
}
/// Lifecycle cell with retention. cp_awake: currently awake; cp_woken: has been awake since (re)creation.
///   never woken      -> canonical cell (entry timing, ring deletion unchanged)
///   awake            -> stays awake until the extended sleep threshold, removed at the extended delete threshold
///   asleep but woken -> wakes only at the canonical wake edge, removed only at the extended delete threshold
function chaos_vp_retained_cell(cp_vp, cp_x, cp_y, cp_awake, cp_woken) {
    var cp_base = chaos_vp_lifecycle_cell(cp_vp, cp_x, cp_y);
    if (!cp_woken) return cp_base;
    var cp_ext = max(chaos_vp_band_x_retained(cp_vp, cp_x), chaos_vp_band_y(cp_vp, cp_y));
    if (cp_awake) return cp_ext;
    if (cp_base <= 1) return cp_base;
    return (cp_ext == 3) ? 3 : 2;
}
