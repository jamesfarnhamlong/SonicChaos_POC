# AQZ P4 B — viewport reconciliation, pending Windows acceptance

Accepted P3 base: 1b089a5fdfa31acc27c8f06866ae66f091c3d455.
Branch: poc/aqz-p4-boss-59-5d. All P4 work remains uncommitted.
P4 A core was Windows accepted; its reference package SHA256 is
2827ed06dbd4c039664626941a0888386f3c898dd7ade8a2ebef9fd3fa89cf9c.
Canonical Research remains 89641f8093e62401cd81f94e6ac889422f600472.

## Entry adapter

$5A initializes at WORLD(2048,238). Settled camera X1727 makes screen X321:
EDGE(RIGHT,+65) at width256. B stores a separate view_dx=W-256 after the
initializer. Canonical xu/yu, source spawn records, scripts, speeds, HP,
cooldowns, fixed-slot signaling and allocation remain unchanged. Drawing,
contact, facing comparison and lifecycle use the translated world X, including
smoke after conversion. This is a viewport/gameplay coordinate adapter, not a
change to the ROM anchor. Translation is zero at256. The shipped scheduler
trace first displays opaque child pixels at the rightmost column on call124
(zero-based fixture u123) for every checked width; canonical motion is identical.

## Arena diagnosis and adapter

P4 A kept the fixed canonical boss cached-screen route while the shared player
clamp widened to the entire view. No additional camera recenter or boss-route
change is needed. Full left/right patrol boundary traces produce integer boss
anchors47..208; unchanged normal Sonic contact reach28 covers X19..236.
This horizontal envelope is a union over the existing route, not a claim of
contact at every X/Y on every callback.

Settled screen coordinates (add1727 for world coordinates):

| Width | A player envelope | B player envelope | Boss anchors A/B | Normal contact A/B | Camera right B |
|---|---|---|---|---|---|
|256|16..247|16..247|47..208|19..236|2304|
|348 (configured 16:9)|16..339|19..236|47..208|19..236|2212|
|640 (additional sweep)|16..631|19..236|47..208|19..236|1920|

The mathematical left gap in A is3px at all widths; the extra wide-only gap is
on the right (103px at348,395px at640). The approximate reported left-strip
width is not reproduced by this horizontal trace. B removes both unreachable
wide margins by intersecting the unchanged boss contact envelope with the player
movement envelope. This deliberately keeps a compact fighting area within the
wide view instead of inventing boss travel. It begins only when main-fight state8
is requested, after the six-child phase; it ends at clear release. No 256 clamp
change. No boss collision widening, velocity/timing/route or HP change.

## Camera and clear

Canonical saved right limit2304 is preserved as source state. The viewport
adapter exposes the restored boundary worldWidth-W:2304/2212/1920. Both the
camera driver and final AQZ camera clamp enforce this boundary, replacing A's
boss bypass. The camera pan target/settle and one-pixel pan are unchanged.

Floor bit1 alone releases clear. Player state20, running timer, $0A/0, boss
$0F/0 and numeric zone5/act0 successor remain unchanged. State20 still uses
EDGE(RIGHT,+33). At the final camera boundary, this is WORLD2593 for all checked
widths; it is not a shortened run. As before, this package adds no SUZ room.

## Verification and Windows checks

Dual/triple-width fixtures exercise actual child scheduler/lifecycle, opaque
sprite entry, identical source trajectory, allowed player/contact envelopes,
clear release, camera output and exact state20 threshold. Protected A core
functions (line-ending normalized), canonical caches and sprites have identity
checks. Full P1/P2/P3/P4 core regressions, navigation, hygiene and diff checks
are retained. Source and extracted package compile/startup are required.

Windows: compare the six-child right-edge entrance, left and right arena edges,
main fight and defeat, then post-clear camera/run-off/results at normal16:9.
Width256 remains the reference. The narrower wide main-fight player envelope is
an explicit adapter requiring gameplay acceptance. Do not commit before James
accepts B. Logs/totals/hash are in ignored build/aqz-p4-b/package-report.json.
