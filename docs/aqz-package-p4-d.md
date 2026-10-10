# AQZ P4 D - wide patrol and floor-level threat, pending Windows acceptance

Base remains accepted P3 `1b089a5fdfa31acc27c8f06866ae66f091c3d455` on
`poc/aqz-p4-boss-59-5d`. All P4 work is uncommitted. B and C combat adapters
are rejected. C's stable child entrance, smooth main entrance and locked wide
clear/run-off are retained. Research source is pinned canonical
`89641f8093e62401cd81f94e6ac889422f600472`; no cache/placement is modified.

## Explicit horizontal route adapter

The recovered stop compares cached screen X against48 and208, using an 8-bit
mask. A wide cached coordinate cannot use that mask: e.g. X300 would wrap to44
and stop incorrectly. `chaos_59_patrol_stop` preserves that exact expression
at width256. At wider widths it uses the full cached screen coordinate and
stops leftward motion below48, rightward motion at `EDGE(RIGHT,-48)`.
The existing -0.625 step overshoots48 to integer anchor47 on the left. Scripts,
player-facing decisions, X speed, Y speed/gravity, vertical routes and timing
are unchanged. Wider traversal naturally requires more existing jump cycles;
there is no rescaling/teleporting of anchors and no speed increase.

| Logical width | Player screen range | Patrol anchors | Body contact at floor Y238 | Edge refuges, left/right |
|---|---|---|---|---|
|256|16..247|47..208|19..236|3 / 11 px|
|348 (normal Windows 348x196)|16..339|47..300|19..328|3 / 11 px|
|640 (additional fixture)|16..631|47..592|19..620|3 / 11 px|

Add1727 to these X values for world coordinates. Canonical object anchors,
placement records, collision extents and script records remain unchanged.
There is no B clamp, extra player wall or widened collision geometry. C retained
body floor coverage19..236 in the348 view, leaving103 permitted X positions to
its right (237..339); D reduces that right refuge to the canonical11 positions.

## Actual floor-Y threat trace

The new fixture executes real boss script records, record/inline callbacks,
19-slot allocation, projectile movement/lifecycle and cached renderer X updates.
It records a body threat ONLY when the actual combat helper is invoked, with
Sonic's anchor at WORLD Y238. Shipped player/terrain physics confirms integer
floor Y238 at the arena edges, patrol endpoints and samples every16px for256/348
(the resting fixed-point value in these fixtures is238.3125). It records missile threat only during the actual
forced-hurt helper call after projectile movement. It does not infer threat
from an aggregate sprite/patrol bounding rectangle. State, frame, exact fixed-
point X/Y/speeds, extents and all floor X hits are recorded per helper call.
A ghost player directs the boss toward the left/right sides without altering
source scripts or taking damage; independent ordinary-player probes measure
contact. Each directional trace runs2000 callbacks.

The low/body phase can still clip Sonic at X19 and at RIGHT-20. Ranged state10
also has genuine floor-contact body callbacks at these extremes (e.g. body
anchor47 or RIGHT-48, body Y216, player Y238). Exact closed-interval collision
is unchanged. The extreme player-edge refuges remain canonical-sized.

An exhaustive stationary-player sweep runs1800 callbacks for EVERY permitted
floor X at width256 and348. Only these positions avoid both body and missile:

- width256:16..18 and237..247
- width348:16..18 and329..339

The same result holds when measuring ranged state10 body callbacks plus its
missiles. Thus no additional widescreen camping strip remains. This is a
controlled contact/range oracle, not a claim that every X is hit simultaneously
or that Sonic cannot dodge attacks.

## $5D: wider source route, no gameplay/lifecycle edit

C's projectile test used a synthetic floor-adjacent launch Y206. That is
insufficient for the requested actual-phase coverage. D captures naturally
allocated shots from the real state10 scripts: source Y159, X=bossX-8.
At the right extreme the firing source is X200/292/584 for widths256/348/640.
The actual projectile floor-hit unions are:

| Width | Missile-only floor-hit union | Ranged body plus missile union |
|---|---|---|
|256|16..77|16..236|
|348|16..169|16..328|
|640|16..461|16..620|

The missile-only union increases by exactly the added viewport width. The
left-only shot still does not hit the region behind its firing source, just
as at256; missile-only coverage is not claimed to span the whole viewport.
During the complete ranged phase the unchanged low body callbacks cover that
region. This combined phase and the stationary-player sweep establish that
the former large permanently safe wide strip is gone.

VX=-2.25, fixed initial steering selector, +/-8/256 steering increment, extents,
forced hurt and deletion-on-asleep are unchanged. The existing lifecycle uses
the actual wide RIGHT edge and does not delete inside its active viewport.
There is no additional width-dependent range/lifetime failure to repair, so
no speculative retention adapter is added. No rear-firing shot or new attack.

## Preserved C presentation and clear

C's single fixed child-phase translation and16-update settled-camera gate
are retained exactly. Six children enter through the actual right edge after
the camera settles, with source scripts/movement and spacing intact. The main
boss entry is unchanged. The player retains the full shared viewport limits.
The settled wide camera stays at1727,78 after defeat while state $20 runs through
EDGE(RIGHT,+33), with no player clamp during run-off and no beyond-world view.
Width256 retains canonical camera-limit/freeze behavior. Floor-bit gate, timer,
$0A/0, $0F/0, successor5/0, allocator, HP/cooldown/contact, $5C parameter6 and
lost-ring scatter are unchanged.

216 one-button jump episodes test left/right approaches to both patrol extremes
and the central start, four distances and three hold durations, at all widths.
They log each HP/cooldown transition; each episode must produce at most one hit.
Their 1044 canonical-width contact calls are replayed through the original ROM
$AAB5 (5220 HP/cooldown/rebound/state assertions).

The identity verifier permits exactly one change to A's recovered callback:
the horizontal stop expression now calls the explicit width-aware helper.
All other protected A core functions/data/art match, and nine C entrance,
contact/position, lifecycle and camera functions match C exactly. Canonical
width256 route decisions are swept separately, including byte-wrap cases.

Reproduce with `verification/run_aqz_p4_d_checks.py` using Research Python and
bundled Pillow. Full P1-P3/P4, navigation, hygiene, diff checks, source/fresh
compile and startup evidence is under ignored `build/aqz-p4-d`. The full floor
traces and stationary-player sweep are in `viewport-results.json` there.
No commit before James's Windows acceptance. Stop at P4 D.

## Verification totals

87/87 regression commands PASS. Focused P4 checks: runtime61,751; wide/floor/
entry/jump fixtures1,787,152; ROM jump replay5,220; assets1,048,717; identity179
(total2,903,019 assertions). All216 one-button jump episodes produce0 or1 hit.
41 natural player/terrain samples confirm floor Y238. Source compilation and
startup PASS; fresh-package compilation/startup and SHA256 are recorded in
`build/aqz-p4-d/package-report.json` after final packaging.
