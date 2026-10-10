# AQZ P4 I — original attack flow, right-edge main entry, sliding curved salvo

Uncommitted on `poc/aqz-p4-boss-59-5d`, based on accepted P3
`1b089a5fdfa31acc27c8f06866ae66f091c3d455`. Windows acceptance pending.
Canonical AQZ inputs remain Research `89641f8093e62401cd81f94e6ac889422f600472`.
Current Research main `c4c389c28fe686713d9371fb925f60eb4014191c` has unchanged AQZ
caches and boss runtime oracle.

## Main entry and lower fight

Canonical main boss WORLD1856 minus settled LOCKED_CAMERA1727 is screenX129,
which is EDGE(RIGHT,-127) at256. At348 that relationship gives221. After the
six children finish and the original65-callback wait expires, the existing
state7 ->8 transition applies +92px to the runtime main-boss X while it is still
above the view (WORLDY14). Its saved/source X remains1856, the ROM-derived
placement/cache is unchanged, and the camera target was already computed from
the original source anchor. Child allocation and initialization are unaffected.
The main boss then performs its original smooth vertical entrance. The existing
+18 render registration places its visible anchor around239, roughly7.5 blocks.
This position is derived from the original edge relationship, not a tile guess.

G's body targets44..311 and speed265/256 are retained. Player traversal remains
16..339. The real descending helper still contacts both extremes in the body
fixture; collision remains the original combined28px horizontal reach. Vertical
arc, requested states, HP, cooldown and feedback are unchanged. There are no
player walls or additional hops. Width256 still enters at129 and uses its
original160/256 jump speed and byte/cache patrol boundaries.

The reverse $5D experiment is removed: every shot uses VX=-576/256=-2.25,
canonical attached source(-8,-32), original vertical steering and collision,
forced hurt and original artwork orientation. No right-going draw mirror or
allocation-time direction selection remains. G/H reverse fire is classified
as a rejected/provisional experiment for the later all-boss review; historical
packages/documentation are retained as evidence, not active acceptance targets.

The wide firing goal now uses only the left-going relationship P+143, bounded
to44..311. Every natural launch releases that waypoint back to the existing
body approach. This prevents a bounded firing waypoint from persisting forever
when Sonic stands behind it. No script shot or new movement state is added.

Range boundary is explicit: for floor SonicY238 and sourceY159, the first floor
contact is movement60, 135px left of the source. A boss at maximum311 has source303
and first floor X168, with unchanged12px combined contact reach. The restored
left-going $5D therefore does not itself threaten far-right Sonic339. Going
behind it is intentionally safer again. The wider body approach keeps the boss
engaged, and the original upper $5C attack has separate right-side coverage.
I does not claim that canonical left-only $5D can cover the full348 floor.

## Upper salvo: preserve approach identities

James clarified that $5C retains its recovered left/right curved returns;
the reverse-fire rollback applies to the separate lower $5D. H's additive X
bias could reverse an early curve segment and has been removed.

At each upper state14 entry, latch a translation from a valid player snapshot:

`T = clamp(floor(playerWorldX) - cameraX - 128, 0, 92)`

This selects an approximately eight-block region: canonical window0..256 shifts
to48..304 for a central player, or92..348 for a right-side player. The useful
canonical player interval16..247 likewise shifts to108..339 at the rightmost
selection. The real curved contact band is wider than its floor endpoint union;
selection is validated through actual contact calls, not sprite bounds.

All seven script allocations retain their source offsets, order and timing.
Parameters0..5 retain their original Y starts, vertical velocities, angle/turn
sequence, frame selection and delays16/48/80/112/144/176. Parameter6 retains its
original out-of-view sentinel and completion role, including delay208.

Each real shot's intended floor-intersection X is its canonical intersection
plus T. Top returns translate their initial X by T. Side returns start at the
actual outside edges (-16 or348+16), avoiding an interior warp-in. To reach the
translated floor target in the same vertical curve time, compute a single
positive horizontal scale from the recovered trajectory:

`gain = (translatedFloorX - runtimeStartX) / (canonicalFloorX - canonicalStartX)`

Both numerator and denominator have the same direction. Scale only the original
angle-table VX by that positive gain; VY and four-movement-call turning cadence
remain exact. The observed gain is bounded below4; every tested update preserves
the original horizontal sign. This is an explicit348 initial-trajectory adapter,
not a canonical $5C speed claim. It neither mirrors/swaps parameter roles nor
continuously follows Sonic. The gain and selected band never change during a
shot. Width256 uses gain1 and unmodified re-entry positions.

All324 usable stationary X positions receive upper-projectile contact in each
of three complete phases. Nine representative no-input player/core/terrain
fixtures also receive natural hurt/death. Separate fixtures prove that player
movement after selection cannot retarget delayed or launched missiles, every
vertical/angle curve and completion request remains identical to256, and
allocation order/cadence is unchanged.

## H crash: actual scheduler path

`OBJ_chaos_zone` End Step calls `SCR_chaos_objects_phase` even after Sonic's
instance changes to `OBJ_player_death`. That function only accepts char/spin
instances as live core owners, so it passes cp_c=noone / cp_have=false into the
shared19-slot scheduler. Boss scripts, timers and support signals continue.
H called `chaos_59_salvo_begin` unconditionally at $AB8D and $ABCB and dereferenced
cp_c.xu. Its prior fixtures stopped at death and the JS boundary did not model
GameMaker's changed instance type or numeric-field exception.

I captures the valid post-player core anchor before the main-boss script visit.
The controller retains the snapshot and its update number through player absence.
Upper entry latches from that snapshot; no X=0 substitution or skipped targeting
is used. Combat cannot naturally enter the boss sequence without an earlier
valid snapshot. An impossible missing-snapshot state reports an explicit error
rather than inventing a target.

The focused regression loads archived H and models the real GameMaker death
instance change and noone-field exception. It reproduces the crash at update372
through $ABCB. I runs that identical no-input/death scheduler path for1100 updates
without error. Another fixture covers $5B exit signaling into $AB8D with Sonic
absent. A CLI-only native GameMaker fixture also executes both $AB8D/$ABCB with
noone and verifies the retained snapshot/target, using isolated structs. Retained JSONL diagnostics now identify P4 I and include salvo shift,
trajectory gain and target; F11/F12 capture behavior is unchanged.

## AQZ3 backdrop, independent presentation correction

Original-game AQZ3 boot and90 further frames consistently report VDP R7=0,
CRAM[16]=$10, CRAM[0]=$10 and water flag0. R7 selects the sprite palette's zero
entry16. SMS CRAM bits yield RGB(0,0,85). Cached palette10 entry0 at ROM file
0x3B6ED and background palette25 entry0 at0x3B7DD both contain$10. Boss sprite
palette16 entry0 at0x3B74D also retains$10.

The POC already contains those palette bytes. Its terrain draw, however, painted
a solid make_color_rgb(1,1,1) rectangle while the indexed-texture shader was bound.
That tint is a vertex color, not an indexed texture pixel decoded by the shader;
it produces a near-black fill beneath transparent scenery. The room also enables
GameMaker's normal buffer clearing, but the opaque terrain fill is the immediate
visible layer. There are33134 transparent pixels in the348x196 fight-view crop.

AQZ3 now paints opaque RGB(0,0,85) before binding the indexed shader, then draws
unchanged terrain/dynamic art. The importer emits that same draw event exactly.
The verifier reboots the original ROM and checks palette bytes, register state,
transparent art and actual generated draw-source equality. No screenshot color
was sampled. AQZ1/2 and all water/palette mechanics are untouched.

## Deliverable validation

The current full runner is `verification/run_aqz_p4_i_checks.py` (also the generic
P4 runner). It preserves accepted P1-P3 and canonical P4 core, plus current I
body/jump, original-direction projectiles, upper salvo, natural absent-player
flow, backdrop and G entrance/clear regressions. Rejected bidirectional coverage
expectations remain in historical fixtures and are not active I assertions.
Source and freshly extracted package are compiled and launched independently;
`build/aqz-p4-i/package-report.json` records totals and SHA-256. Windows acceptance
remains pending. No subsequent milestone is started.
