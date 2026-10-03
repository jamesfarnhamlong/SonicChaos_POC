# GPZ regular enemies — Windows package D

Research main: `d214c60ccf04f62634c4565f4abf38ec63ae77c6`.
POC base: `b07c6d391e0a6818f51c61dc2629453d045701c4`, branch `poc/thz1-cleanup`.
Status: **Windows package D accepted by James on 2026-10-03** for `$25`, `$2C`
and ordinary `$0F` defeat smoke in the tested GPZ1/2 scope, including sprite
composition/orientation and gameplay behavior. All 20 focused checks and both
source/fresh-extraction compilation passed. Root AGENTS and Research are unchanged.

## Implemented

Canonical GPZ1/2 placement rows now dispatch `$25` and `$2C`: GPZ1 has 5/4,
GPZ2 has 7/3; GPZ3 has neither. Coordinates, parameters, flags, art bases and ROM
provenance remain the approved data. The GPZ1 `(928,878)` `$25` stays below the
768px room; its reachability remains unresolved and it is excluded from playable
patrol replay claims.

`$25` uses unsigned-word left bound `placementX - parameter*16`, signed -0.5
initial X velocity, +2 Y velocity, strict integer overshoot reversal and the
generic +18 floor probe. No player gravity or `$21` falling/top-stomp branch is
introduced. The older bounded THZ object-floor adapter omits the upper-cell
correction of shared `$70E7`; the GPZ helper consumes the existing shared floor
projection instead. All 6,364 callback samples for the 11 in-room placements match
original `$B535/$B573` execution on the canonical act layouts. The 600-update
original state-engine replay also matches two-frame/eight-update animation,
position, velocity and direction. A reversal requests the opposite state; facing
changes on its next state-entry update, not early on the reversal update.

`$2C` inherits the shipped `$27` event/state movement code, configured with its
own 12x16 mapping extents and GPZ art. GPZ parameter/bit4 are zero throughout;
forced mirrors are excluded. The post-move strict 64px trigger, 129-callback
oscillator and pre-move >=384 player-distance deletion remain unchanged.
Its child event completes the scheduler lifetime tail even when contact returns
early. Initial creation/wake and ongoing lifetime use canonical viewport bands;
the accepted THZ retention adapter is not extended to either GPZ enemy.

Both run after the final player/terrain pass, before staged contact promotion.
Shared `$6328 -> $5F3D` contact uses Sonic 8x24 (9x24 in state `$0F`), attack bit1
or invincibility selector6. Ordinary damage/rebound is left to the next player
update. Enemy defeat removes the placement shell permanently for that room
session, retaining occupancy until act reset; ordinary lifetime deletion keeps
the shell available for canonical recreation. GPZ defeat uses the approved
ordinary parameter-zero `$0F` smoke sequence, not the sample-engine explosion
or an immediate jump call. The sequence is generated from Research state1,
including initial blank, nonuniform frame durations and final blank deletion.

## Approved PNG references and imports

The exact approved boards are copied byte-for-byte into the package:

- [`type-25-approval.png`](../verification/gpz-enemies/approved/type-25-approval.png)
- [`type-2c-approval.png`](../verification/gpz-enemies/approved/type-2c-approval.png)
- [`support-approval.png`](../verification/gpz-enemies/approved/support-approval.png)
- [`51-stack-registration.png`](../verification/gpz-enemies/approved/51-stack-registration.png)
- [`51-sequence-summary.png`](../verification/gpz-enemies/approved/51-sequence-summary.png)
- [`51-mode-direction.png`](../verification/gpz-enemies/approved/51-mode-direction.png)

Sources are Research `build/gpz-enemy-approval/` and corrected
`build/gpz51-correction/`, frozen by `approved-art-manifest.json`. The earlier
rejected `type-51-approval.png` is not used.

[`imported-sprites.png`](../verification/gpz-enemies/imported-sprites.png) shows
all imported frames enlarged 3x for inspection. Only this review board crops
and enlarges art; **all 26 imported sprite PNGs and GameMaker layer PNGs match
the approved source file bytes exactly**. There is no asset repaint, crop,
runtime bitmap mirror or second whole-image flip. Sprite origin stays `(64,56)`;
enemy/smoke draw registration is `(+1,+18)`, separate from gameplay anchors.
`$25` selects approved normal/mirrored mappings with scale +1.

Staged resources: `$51` frames1..11, `$34` frames1..4, `$0A` frames5/6 and `$0F`
frames7..9. The exact corrected composition cache accompanies them: normal stack
is parameter0 head above balls1/2/3; mode2 ball4 is a separate documented variant;
throws3->2->1, regrowth1->2->3; frames10/11 belong to landing dust. These resources
are registered in the project, but **no `$51` dispatch/contact/health/phases,
arena, defeat or clear path is implemented**. Staged support art has no new boss
runtime wiring. Dedicated Research runtime audit remains required.

## Verification and Windows acceptance

`verification/run_gpz_enemy_checks.py` runs the bounded 20-command batch,
including 317,624 new enemy assertions, exact approved PNG/source/layer hashes,
existing THZ/GPZ traversal, art, rings, boss, selector, attack and viewport checks,
and `git diff --check`. New ROM traces are reproducible with Research's `.venv`
Python and `verification/make_gpz_enemy_oracles.py`; every invocation verifies
the local ROM SHA-256 `eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`.
ROM bytes and build debris are excluded from the source ZIP.

The harness now honors GML `exit`, supports inherited events and GPZ object-phase
dispatch. An existing floating `$21` contact-only fixture now explicitly supplies
a supported object pose; it previously ran through a floor-loss `exit` ignored
by JavaScript. The ring baseline comparison normalizes both sides against the
already-accepted GPZ art integration. Selector counts include regular enemies.
These fixture corrections do not alter accepted THZ gameplay.

Windows review route (acceptance is limited to the tested GPZ1/2 scope):
open the sole `SonicChaos_POC.yyp` from a fresh package extraction. Use F10 to
launch GPZ1 and GPZ2. Compare `$25` floor registration, two-frame patrol and
both orientations/bounds; check ordinary hurt and attacking/invincible defeats
from above, below and either side. Check `$2C` exhaust/orientation, trigger,
vertical oscillation, departure and 384px deletion. Verify defeated enemies
stay defeated while backtracking, reset on a fresh act, and ordinary lifecycle
deletion recreates from canonical placements. Check smoke sequence and pipe
priority. GPZ3 should still have no `$51` boss. THZ1 remains the control fixture.

The durable acceptance record is `verification/gpz-enemies-acceptance.json`.
Package SHA-256: `b4dfb0bc63532099d5a56047f706d5df3fa0a51669eea21d60120b734fb71fd0`. The accepted runtime/art files were
rechecked against the fresh extraction before checkpointing. ZIPs and build logs
remain local and excluded from Git.

AGENTS candidate update: record regular GPZ `$25/$2C`
and ordinary `$0F` support accepted; `$51` art staged but runtime audit pending;
do not extend THZ lifecycle retention to GPZ implicitly.
