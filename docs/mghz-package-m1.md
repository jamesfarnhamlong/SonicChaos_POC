# MGHZ Windows Package M1 — pending James acceptance

Base: `82ebc89d68cd0d7e4d66be54a6c9954e6e2d9fed` (accepted collectable lost rings).
Canonical Research main: foundation/art `ac04dfe4d3d7aedea394948811da67eba83782bd`,
oil/ceiling spikes `7315df2b34dcb7c8909644790b1d9ef397322f09`.
Local ROM SHA-256 verified: `eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`.
No ROM is shipped. No POC commit or Windows gameplay acceptance is claimed.

## Implemented foundation

F10 now enables MGHZ1/2/3. Layouts are generated from canonical rows, with canonical
starts/cameras, dimensions 4096×1024, 4096×1024, 3840×768 and strides 128/128/120.
MGHZ1/2 preserve the original unloaded index 4095. The existing `$C001` address
guard remains; padding entries are adapter storage, never loaded terrain.

Bank-relative mapping resolution, approved terrain/palettes, the green CRAM-zero
backdrop, generic priority foreground, 169/136/83 ordinary terrain rings and
0/6/0 mapped rings are integrated. Terrain rings upload four canonical frames at
eight updates each to the MGHZ destination. Imported headers include replacement
blocks. `$9B/$9C` surface `$0D` breaks to `$9D`; intact art is a mutable overlay
above the replacement base, so disappearing opaque pixels are actually removed.
Surface `$19`, twists 2/3, upright/horizontal/diagonal springs and supported
`$28` parameters `$83/$89/$05/$0A` consume the existing researched shared code.
Mapped moving spikes, supported non-Rocket monitors and MGHZ1/2 signs use MGHZ
VRAM/palette art. The signs select the existing odd-zone `$A962` prize rows and
shared timer-stop/pan/player-state `$20`/clear overlay path.

### Oil: source-traced behavior

`surface_counter` is `$D3BC`, `special & 2` is player `+$24` bit 1.
The surface `$1B` handler only sets that bit and increments the byte counter on
`frame_counter & 3 == 0`. The sink branch applies to previous flags bit6-only
and retained bit1, after the strip-fall bypass; it adjusts the probe row by +4
without looking up a new profile, and projects `Y - penetration + counter`.
It retains the source's deep capture and counter wrap. Rising contact returns
without changing floor support. No viscosity, speed/direction changes or weaker
jump is added. Jump/ordinary-fall/strip-fall reset the counter, retain bit1;
surface 0 clears bits 0/1, while surfaces 6/7 do not. Sinking remains grounded;
counter 25 (23 with +9 integration) naturally causes repeated block-height
plunges. The shared signed-screen-Y death rule ends it.

### Ceiling spikes: source-traced behavior

Both `$3E/$3F` share the imported geometry. Ceiling/head, floor/foot, side and
hazard-exempt ceiling paths remain distinct. Head probe `(X,Y-6)` accepts rows
0..24 inclusively and observes floor/Y-speed/owner gates. It projects down,
then directly invokes shared hurt when appropriate. Current hurt state keeps
projection only; movement bit7 takes ordinary +1.0 bounce. Power-up invincibility
is not an exemption for the direct MGHZ terrain hurt entry. The foot path can
hurt a non-rising supported landing, or any sample when already grounded.
Sides use the decoded upper-half wall profile and never damage. Shared ring loss,
real lost rings, blinking and death are reused without a boss-specific effect.

### Scenery: ROM effects with an explicit renderer adapter

Effects 2/3 retain the original slot-init event phase and ten-update CRAM writes.
White per-palette-index pixel masks tint only background entries 4/11 in both
terrain and priority passes. This applies exact SMS CRAM RGB values rather than
colouring an entire terrain bitmap. Effect `$0E` retains initial static VRAM,
then the two overlapping 64-byte uploads to `$1A8/$1A9` at four-update intervals.
Both normal/priority masks preserve canonical mapping flips and priority.
`global.chaosMghzBossActive` is the future `$D44E` hook: it freezes the whole strip
slot, including countdown. `global.chaosMghzPaletteControl` exposes the `$D492`
dispatcher gate. Palette cycles remain active while only the boss hook is set.
Neither hook is hardcoded inside the animation routine.

## Adapters and limits

The accepted 348×196 logical widescreen view remains. Canonical placements,
collision anchors and data are unchanged. Existing viewport/lifecycle/clear
adapters remain shared. MGHZ vertical follow now caps camera travel at seven
logical pixels per update, preserving the recovered oil plunge/death mechanism;
the follow target and view-height limits otherwise remain the GameMaker adapter.
The test clock is 60 Hz; original PAL/lag/global-effect-clock alignment is still
unverified. Effect phase is verified relative to slot initialization only.

Mapped `$21/$24/$2E/$2F/$56/$57/$58` remain inactive and counted. Rocket Shoes
monitor parameter 4 is also inactive. Raw records remain in generated data for
future work; no excluded gameplay or substitute art is implemented. MGHZ3 has
no boss or completion trigger. Breakable fragment type `$07` art/timer remains
unresolved as in the shared accepted implementation; fragments are not invented.
Existing results graphics/audio/prize polish remain deferred.

## Reproduce and verify

Use a Pillow-enabled Python 3.8+ for the importer/assets/captures, the Research
venv for the Z80 oracle export, and Node for unchanged-GML checks:

```
python POC_notes/generate_mghz_foundation.py --research ../sonic-chaos-reference-work --rom "../source/Sonic Chaos (Europe).sms"
../sonic-chaos-reference-work/.venv/Scripts/python.exe verification/export_mghz_sink_oracle.py
python verification/run_mghz_checks.py
python verification/capture_mghz.py --name <unique-fixture-directory>
# Compile/run that isolated project using installed GameMaker VM.
python verification/verify_mghz_capture.py
python verification/package_mghz.py --prepare
# Compile the freshly extracted single .yyp.
python verification/package_mghz.py --finish
```

Focused mechanics: 639,035 assertions including 88,560 exported original Z80
sink results, inclusive spike boundary sweeps, cadence/reset/plunge fixtures,
twists/springs/breakables, all effect event streams, pause/resume and exclusions.
Assets: 249 block comparisons and 11,070 runtime cells; imported cache equality,
palette/VRAM hashes, all ring/strip frames, both priority passes and a nonaligned
mapping negative control. Shared lost-ring, THZ and GPZ regression checks are
included in the 22-command focused batch. Historical ring renderer equality
tests normalize the new zone sprite selectors without changing their probes.

`build/mghz-m1/` holds focused logs, compile logs, package hash/report, actual
native captures and verification sheets. Capture cameras are controlled fixtures;
they prove render parity, not manual gameplay acceptance. Fixture-only save
suppression, file sandbox override, forced input and capture events never ship.

Native render verification: 48 captures at 256×224 and 348×196; all 1,945,738
tested terrain pixels match independent ROM composition exactly (HUD, player,
mapped sprites and ring overlays omitted). Separate native oil runs retain actual
camera/player updates: both widths plunge at update 99, counter 25, and replace
the player with the death object at update 101; camera steps never exceed 7.
This is the existing GameMaker follow-target/post-movement death timing, not a
claim of identical SMS whole-frame timing (Research's fixture requests death
four updates after plunge). Compare this adapter timing during Windows acceptance.
The 52 Research MGHZ tests also passed with the verified local ROM, without skips.

## James's Windows acceptance

Open the ZIP's single project, press F10 from title/unpaused gameplay and launch
MGHZ1/2/3. Compare starts and scenery with approved Research boards. Traverse
upper/lower routes, springs, breakables and platforms; test MGHZ2 twist both ways.
Test oil at MGHZ1 `(1344..1663,800)` / MGHZ2 `(224..671,928)`: stand, move, roll,
jump out, allow a full sink/plunge, and restart. Compare its pace with SMS.
Test ceiling spikes from below and via foot contact, then recover/recollect lost
rings. Compare priority strips and palette cycling. MGHZ1/2 sign-clear should
use the shared completion overlay. MGHZ3 foundation ends without a boss/clear.
All findings remain uncommitted pending this acceptance.

## AGENTS candidate updates

- Lost-ring base `82ebc89` is accepted; MGHZ M1 is now implemented but pending
  Windows gameplay acceptance.
- Research `7315df2` closes the oil and ceiling-spike gates; replace their old
  "research required" statements at the next accepted milestone.
- F10 enables the three MGHZ foundation acts. Footwear/enemies/boss remain deferred.
