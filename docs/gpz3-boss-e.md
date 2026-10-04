# GPZ3 $51 — Windows package E

Accepted base: `84c3e108177bca06b490c5857307e02147cb2901` (package D regular enemies).
Canonical runtime: Research `44e0714d16185f213ab1b73822c67e50546ce3f6`.
Approved art: Research `d214c60ccf04f62634c4565f4abf38ec63ae77c6`.
This work is **uncommitted, pending James's Windows acceptance**.

## Art regression and approval boards

The binding Research PNG boards are copied unchanged under
`verification/gpz-enemies/approved/`:

- `51-stack-registration.png`: live head + balls 1/2/3; mode2 ball4 separate.
- `51-sequence-summary.png`: shrink, head-only and below-floor regrowth.
- `51-mode-direction.png`: modes and both throw directions.
- `support-approval.png`: approved $34/$0A support art (ordinary $0F stays separate).

`verification/gpz-boss/poc-boss-sheet.png` renders **actual shipped-GML trace
anchors/frames**, not an authored stack. Fourteen compositions match the Research
fixture pixels exactly. It includes head+3, head+2, head+1, head-only, regrowth,
mode2 head+4, landing dust and left/right arc/slide segments. The thin line marks
the canonical floor anchor Y270, not synthetic terrain. Below-floor regrowth is
shown deliberately. All 17 boss/support source PNGs and their GameMaker layer
PNGs remain byte-identical to the approved files. No runtime bitmap mirror.
Canvas origin (64,56), registration (+1,+18); gameplay anchors remain separate.

## Runtime

The importer reads verified Research caches, all 21 numeric scripts and the
callback-installed tails $9A90/$9C0F. No ROM/image dump is exported. The mapped
$51/$00 placement remains (1728,270); initialization sets runtime head X1856.
The shared placement scan starts the intro at creation, including the outer
band, without a THZ trigger. Player Y **low byte** selects modes0/1/2, HP5/8/10.

The linked head/balls preserve live upper/lower slots, integer-word follow writes
with fractional bytes retained, the 32-entry sway table, requested/active state
ordering, coordinate-dependent throw overflow, odd arc/even slide, exact
split-byte deletion, independent detached lifetimes, dust and regrowth. Same
parameter old/new balls coexist. Attached contact uses the five-slot selector;
state7 head attack hits every class. HP decrements on reaction entry, not contact.
Reaction lasts54 updates, and earliest re-decrement is55..59 by mux phase. Immediate
head Y-4 remains distinct from the existing next-player-update hurt/rebound path.
Detached attacks still force hurt. No THZ health, contact cooldown or phase rules.

Final defeat uses five $34/08 head births and upper-state-driven $10->$11 segment
cascades with $34/04 births. Allocation failure is preserved: the controlled
defeat fixture successfully allocates four of twelve requested segment puffs
because the dynamic slots are occupied. The fourth segment record still deletes
its owner. Head clear waits for floor bit1 after the full recovered sequence;
there is no airborne timeout or $0F conversion. Clear releases right limit1920,
bottom96, removes the head, allocates $0A/00 and requests player32. Timer continues.

## Explicit GameMaker adapters and limits

- A GameMaker controller hosts **19 live slot structs** and draws each live
  segment independently. It dispatches after player/terrain in ascending slot
  order. Dynamic allocation scans slots7..17; HUD/bonus allocation scans0..15.
  Later slots can initialize in the same pass, earlier slots wait until the next
  pass. Deletion clears on the next visit; links refer to slots across reuse.
  Ordinary GameMaker objects are not competing for this boss-owned slot pool.
- Approved PNGs bake dynamic selector14/palette13 presentation; these remain
  explicit controller fields rather than hardware VRAM/CRAM uploads. HUD $12's
  parity-controlled byte slide drives the existing HUD draw offset.
- Camera pan moves1 pixel per axis to LOCKED_CAMERA(1664,96), uses the recovered
  per-axis <4 ready gate and settles at exclusive X1663/Y96. The viewport clamp
  uses existing full-integer LEFT+16..RIGHT-9 semantics at256 and wider views.
  No THZ world arena rectangle, widened controller/floor/throw constants or
  extended projectile lifetime. At640 pixels more arena is visible; this is an
  explicit viewport adapter pending Windows comparison.
- On clear the camera follows within current-left..1919, Y96; shared state32
  uses EDGE(RIGHT,+33). Verified at256/640. This retains the recovered right1920
  release rather than replacing it with a room-width limit.
- Puff scripts, durations, update parity, slot-derived seed and parameter+1
  cycles are preserved. Presentation jitter uses a deterministic local byte
  source and boss update counter in place of the game's global IRQ/RNG history.
  Sound IDs are published through the existing numeric request convention;
  exact hardware sound/VDP replay is not claimed.
- **Existing POC boundary:** shared state32 reaches the completion overlay and
  bonus/sparkles. Research proves subsequent ROM results/tally/MGHZ1 loading;
  POC results-screen assets and playable MGHZ1 remain deferred. The numeric
  destination `{zone:2,act:0}` is retained as `global.chaosBossNextAct`, not a fake
  playable transition. Debug launches never save progression. GPZ3 completion
  displays act3 and does not stop the timer. No substitute results art is added.

## Verification and Windows acceptance

`verification/run_gpz_boss_checks.py` runs24 commands: $51 original-cycle/contact/
reaction/defeat parity, grounded clear at256/640, cache and PNG parity, preview,
regular enemies, GPZ traversal/presentation, THZ control/bee/boss/clear, rings,
attack, viewport and debug reset regressions, plus `git diff --check`.
The boss parity test makes109,895 assertions, including all256 low-byte modes,
the complete1,000-update mode1 cycle, other-mode/direction event snapshots,
5,922 geometry samples, all25 mux cases,560 attached/84 detached contacts,
960 head-hit cases, five recontact phases,360 throw cases,121 camera-ready
samples and all256 floor flag combinations. Source/extracted compile evidence
and ZIP SHA256 are written to ignored `build/gpz-boss/package-report.json`.

Open the sole `SonicChaos_POC.yyp` in package E; F10 -> GPZ3. Compare intro/HUD/
pan, stack/shrink/regrowth/dust, both throw directions, attached/detached contact,
head hits and final grounded clear. Check the running timer and completion overlay.
Use256 as the fidelity control and640 for widescreen acceptance. GPZ1/2 regular
enemies and THZ remain regression controls. Do not commit until acceptance.

## AGENTS candidate update

After Windows acceptance: GPZ3 $51 consumes Research44e0714 and approved artd214c60;
linked modes5/8/10HP, bottom-up throws/regrowth, five-slot contact mux,54-update
reaction, exact defeat cascade and grounded clear are implemented. Preserve the
separate GameMaker scheduler/camera/jitter adapters and deferred results/MGHZ1
boundary. Manager-san should update the accepted checkpoint; root AGENTS is untouched.
