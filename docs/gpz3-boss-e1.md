# GPZ3 $51 — Package E.1

Package E core passed James's Windows acceptance: gameplay, composition,
throws/regrowth, hit feedback, defeat and act completion. E.1 keeps that work
uncommitted above accepted base `84c3e108177bca06b490c5857307e02147cb2901`.
Research main remains `44e0714d16185f213ab1b73822c67e50546ce3f6`.

## Camera framing adapter

Fight pan/lock nominal X target is `1664 - max(0, viewWidth - 256)`; the original
exclusive limit remains target minus one. Settled left/right edges are
1663/1919 at 256 and 1279/1919 at 640. The camera-ready test uses the same adapted
target. Y target remains 96; controller X1856, floor Y270, sway, links, throw
thresholds and clear camera release are unchanged. Additional visible area lies
to the left. This is a GameMaker widescreen camera adapter, not a ROM fact.

## Detached-ball lifecycle adapter

At 256 the exact recovered split-byte predicates remain:

- Left: `(X.low < 64) && (X.high < 7)`.
- Right: `(X.low >= 128) && (X.high >= 7)`.

At wider widths, either throw direction survives while any approved ball pixels
overlap the live horizontal viewport. Removal occurs at `X + rightAlpha <= LEFT`
or `X + leftAlpha >= RIGHT`. Alpha edges come directly from each approved frame,
including origin64 and draw registration+1; verification recalculates these
edges from the imported PNGs. Both left and right boundaries use the same rule.
Launch velocity, acceleration, gravity, bounce and odd/even arc/slide selection
are unchanged. This is a viewport lifecycle adapter, separate from camera framing.

## Clear presentation trace

`$9D26` checks floor, requests `$20` through the existing shared `$4892` adapter,
then the next player update runs the recovered `$83A6` handler. That handler
zeros Y velocity, clears left facing, replaces negative X velocity with zero,
then accelerates right. The existing active-$20 sprite branch owns walk/run
presentation despite retained attack/movement bits. A request alone does not
replace the still-active state's sprite on the preceding update.

`verification/gpz-boss/e1-transition-trace.json` records active/requested state,
shadow-animation state/counter, sprite ID/frame, movement/player flags, facing,
velocities and position for standing, attack/jump, roll and hurt handoffs at
256/640. The full kill/clear test also records those fields around its 262-visit
grounded handoff. Shipped adapter traces show right-facing walk on the first
active-$20 update, frame reset only when the sprite changes, and no transient
spin/fall sprite while active-$20 runs. **No transition timing or presentation
change is made:** the reported Windows glitch is not reproduced by this harness.
GameMaker's automatic image advancement/rendering is not emulated; a repeatable
Windows observation is still needed to identify any remaining visual fault.

## Ring-loss diagnosis

The current core hurt adapter creates one `OBJ_player_lost_b` when
`hurt_scatter > 0`. It is a legacy visual: alpha0.6, first blink-off after two
updates, subsequent four-update blink alarms, vertical speed-8/gravity0.4,
and destruction after80 updates. It has no parent object, pickup event,
ring-increment path, terrain bounce or recoverable-ring collection logic.
These are descriptions of existing POC code, not proposed canonical constants.

Therefore the POC lacks canonical recoverable dynamic lost-ring objects.
The flashing appearance is consistent with this presentation object; it is not
evidence of a recoverable ring being deleted incorrectly. No scatter/recovery
implementation is added before Research's dedicated audit lands. Research main
has no new ring-loss checkpoint at packaging time.

## Art and verification

Approved PNG boards are explicitly retained as:

- `verification/gpz-enemies/approved/51-stack-registration.png`
- `verification/gpz-enemies/approved/51-sequence-summary.png`
- `verification/gpz-enemies/approved/51-mode-direction.png`
- `verification/gpz-enemies/approved/support-approval.png`

Imported/composed preview: `verification/gpz-boss/poc-boss-sheet.png`.
Approved assets are unchanged in E.1; source/layer byte parity and no runtime
bitmap mirror remain checked. Normal head+balls1/2/3, separate mode2 ball4,
throws3->2->1, regrowth1->2->3 and frames10/11 landing dust remain accepted.

The25-command batch includes150,352 E.1 assertions and109,895 canonical boss
assertions, exhaustive 16-bit deletion at256, both640 edges/all detached frames,
motion parity, clear/bonus/completion, art checks and GPZ/THZ regression controls.
Source and freshly ZIP-extracted project compile with GameMaker2026.0.0.23.
Package has one top-level folder and exactly one `.yyp`; ROMs, ZIPs, build output
and unrelated temporary diagnostics are excluded. Compilation/check/hash evidence
is in ignored `build/gpz-boss-e1/package-report.json`.

Windows E.1 checks: fight framing at640 (256 control), balls remaining dangerous
until their pixels leave either edge, and the kill-to-final-run transition.
Ring recovery remains deferred. All Package E/E.1 work remains uncommitted.
