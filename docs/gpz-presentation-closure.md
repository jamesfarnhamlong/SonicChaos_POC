# GPZ priority rendering and terrain-ring animation

Uncommitted POC adapter changes; Research and gameplay are unchanged.

## Canonical priority -> GameMaker layer

`generate_gpz_foundation.py` retains each mapping attribute's `$1000` bit
in a 512x512 block atlas. Each priority 8x8 cell copies its original RGBA;
all other atlas pixels are transparent. Original terrain chunks remain
unchanged at depth 100. A generic foreground renderer at depth -60 draws
the current camera's block cells after Sonic (depth -50). It reads current
`chaosTileIds`, so replacement blocks also select their current priority mask.
Mapping priority is independent of the collision plane. No pipe coordinates,
player registration, collision offsets, mapping pixels or placements change.

The long GPZ1 pipe at X864..1631, Y256/288 now has its priority-marked opaque
pixels above Sonic. Transparent holes remain open. Ordinary Draw ordering
preserves the subsequent HUD Draw GUI pass; this does not use Draw End.
Only GPZ installs the adapter in this package; accepted THZ presentation remains
unchanged. The object/atlas interface is reusable by later canonical generators.

## Ordinary terrain ring source

The four-frame GPZ terrain resource was incorrectly built from type-$09
ordinary object mappings, while the manager issued the inherited six-frame
`SPR_ring` cycle. Neither expanding it with object sparkle frames nor wrapping
the index describes ordinary terrain animation.

Existing Research archived `SonicChaos.asm` has `LoadRingArtPointers` and
routine `_LABEL_7450A_58`. The local canonical ROM SHA-256 is verified by the
generator and independent pixel test. GPZ descriptor file `$2B00` contains
`00 80 5D 85 80 29`: source bank `$1D:$855D` (file `$7455D`), VRAM destination
`$2980`, tile IDs `$14C..$14F`. Blocks `$42/$43` select exactly those tiles.
The loader's RingArt table at `$2A9A` selects GPZ's act table `$2AC0`;
all three act pointers resolve to `$2B00`. Generator and independent tests
verify this path, rather than assuming the first act's descriptor is shared.

Routine file `$7450A` / bank `$1D:$850A` returns unless `$D12F & 7 == 0`,
increments `$D351`, wraps at 4, and copies 128 bytes from
`$D399 + $D351*128` to `$D39B`. This establishes **four rendered terrain
frames, eight updates per frame**. The generator now renders block `$42`'s
upper-left 16x16 quadrant after each actual 128-byte VRAM upload. The GPZ manager
uses this four-state schedule; no frame clamping, invented graphics, or extra
sparkle frames. Type-$09 normal/sparkle timing and terrain pickup are unchanged.
This uses the existing POC act-local animation clock; absolute phase against the
ROM's global `$D12F` clock is not claimed. Accepted THZ visual timing is preserved.

## Checks and acceptance

`verify_gpz_presentation.py` checks 295,936 priority-mask pixels across all
three act block sets, exact original background+overlay composition, synthetic
player occlusion with transparent holes, unchanged terrain chunks and all four
ring frames using an independent planar decoder of the verified ROM.
`verify_gpz_presentation.js` executes shipped ring events for 96 GPZ draw
updates, 48 unchanged THZ updates, and the foreground event with camera culling
and a live terrain replacement. `verify_gpz_assets.py` retains the existing
bank-correct mapping and object controls; corrected terrain-ring frames have
their own ROM oracle rather than a package-A equality assertion.

The independent pixel test also produces
`verification/gpz-art-sanity/pipe-priority-preview.png`: the pictured GPZ1 pipe
with the actual Sonic walk sprite composited before/after the priority pass.
The pipe covers Sonic in its opaque priority cells and leaves him visible
through the transparent opening. This is a deterministic rendering fixture;
Windows play observation is still the final acceptance check.

Windows visual acceptance remains required for the horizontal pipe and the
lift-adjacent terrain-ring trail. No new package or commit is made here.
GameMaker LTS runtime `2026.0.0.23` source compilation passes (`Igor complete`,
exit 0); log: `build/gpz-presentation-compile.log`. `git diff --check` passes.
Relevant pickup regressions also pass: 511,407 terrain-ring assertions and
12,680 type-$09 assertions. Their source locks now permit the authorized
terrain frame-selector integration while retaining all collection geometry,
draw coordinates and type-$09 animation; the focused presentation test checks
the canonical GPZ schedule and accepted THZ schedule directly.

AGENTS candidate update: GPZ ordinary terrain rings use the original four-frame
animated VRAM upload (tiles `$14C..$14F`, eight updates per frame), separately
from type-$09's object mapping and sparkle sequence. Mapping `$1000` priority
is retained in a generic POC foreground layer independently of collision plane.
