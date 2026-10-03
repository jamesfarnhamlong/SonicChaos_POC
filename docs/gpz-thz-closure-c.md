# Windows package C: GPZ/THZ closure

Canonical Research main: `08fb38ca081ac9c1644b9ae8a3d83182d9510450`.
POC base: `42aaa5032cef385284a00d0c1b7a0e7714747b4b`, branch
`poc/thz1-cleanup`. Windows package C was accepted by James on 2026-10-03;
this document accompanies the accepted POC checkpoint.
The existing GPZ mapping/art fixes, priority foreground, terrain-ring animation,
platform presentation and three-act foundation are retained.

## Runtime

The core detects previous **foot** block `$57` -> current `$52`, plane 0,
with projected floor contact. Shared setup snaps integer X to its cell and
Y to cell+4, retains both position fractions, velocities and movement flags,
requests hex `$13` and skips remaining terrain/ring probes on the entry pass.
It needs no registered ordinary-loop origin and has no speed gate.

Canonical gates: GPZ1 `(2080,256)` / `(2560,320)`, GPZ2 `(1888,224)`,
GPZ3 `(768,192)`. The imported bank `$0D:$8DDC/$9140` route uses unsigned
16.8 progress, decelerates 10/256 before 144, switches plane at 144 and
accelerates 12/256 thereafter. Table lookup precedes the 416 success test.
Success requests `$0A`, zeros X speed, uses the current maximum for Y speed,
sets airborne/attack and clears floor. Plane 1 survives ordinary terrain
resumption. Slow unsigned subtraction borrow requests `$1D`, adjusts X by
+8/-2 relative to origin, uses +0.5 Y speed, clears attack/floor and preserves
X speed/plane. Damage runs in the recovered position before the success test;
slow bailout skips it. Route tables include addresses read by audited exit
overshoots and signed-negative controls; arbitrary out-of-range debug speeds
are outside the Research claim. Existing GameMaker run/spin sprites and tangent
rotation are a presentation adapter, not a claim to reproduce SMS loop frames.

Surface `$19` sets the strip bit and increments its byte counter. Dry walking
tests full absolute-speed high-byte equality against the current maximum before
requesting special fall `$14`. Running tests absolute signed high byte against
4, preserving the fractional left/right asymmetry. Idle zero speed remains
supported. Requested `$14` plus retained strip bit bypasses one-way projection,
including other one-way types while the bit persists. Jump/ordinary fall,
empty terrain and walk/run animation selector cleanup release the marker as
recovered. Neither entry nor special fall changes plane.

THZ bee frames are rebuilt from canonical mirrored SAT piece positions and
verified VRAM pixels; each piece keeps its pixels. Draw scale is +1, with the
accepted render registration and gameplay untouched. THZ3 side/below damaging
hits retain current movement/floor/contact flags while requesting `$1B` and
applying existing canonical velocities. The separate top bounce is unchanged.

## Verification and acceptance

`verification/run_gpz_closure_checks.py` records the focused batch under
`build/gpz-closure`. It covers original-code loop traces and controls, all four
gates through the actual player adapter, fractional boundaries, exhaustive
walk/run suffix ranges, support matrices, the preserved GPZ foundation,
pipe priority and live replacement, ring animation/probe timing, exact bee SAT
pixels, grounded/airborne/below/top boss contacts, boss render/clear and debug
selector regressions. Source and freshly extracted ZIP compile with GameMaker
LTS `2026.0.0.23`; package report records ZIP/hash and compilation status.

Open the sole `.yyp` in a fresh extraction. F10 from title or unpaused gameplay
selects THZ1/2/3 or GPZ1/2/3. Compare each GPZ gate at running speed, slow-loop
bailout, GPZ2 `$85/$87` strip in both directions and while releasing input,
pipe occlusion and ring animation. Check the THZ bee assembly and THZ3 grounded
rolling side hits, airborne side/below hits and top bounce. Final visible/gameplay
acceptance was completed by James. GPZ enemies and boss `$51`, dynamic
background and previously deferred player/results presentation remain excluded.

This supersedes the surface-$19/alternate-route unresolved status in earlier
foundation and Windows-B diagnostic reports. Root AGENTS.md is unchanged;
candidate update after acceptance: record reviewed `$13` route and `$19` rules,
the bee composition correction and boss flag-preserving implementation.

James accepted all four alternate routes, surface `$19` run/slow/special-fall
behavior, `$1000` foreground pipe priority, four-frame GPZ terrain-ring animation,
THZ bee composition and THZ3 grounded boss side-hit continuation. No regressions
were observed in the tested scope. All 16 focused checks passed, with source and
freshly extracted package compilation passing on GameMaker LTS `2026.0.0.23`.
The durable acceptance record is `verification/gpz-closure-acceptance.json`;
build logs and Windows ZIPs remain local and excluded from the checkpoint.
