# AQZ P4 E — combat approach and firing-source adapter

Uncommitted on `poc/aqz-p4-boss-59-5d`, based on accepted P3
`1b089a5fdfa31acc27c8f06866ae66f091c3d455`. Windows acceptance is pending.
Canonical Research remains pinned to
`89641f8093e62401cd81f94e6ac889422f600472`.

## Why D's numerical patrol was insufficient

D widened the stop from208 toRIGHT-48, but kept the approach's player-facing
decision. Its natural shots launch at bossX-8, Y159. With VX=-2.25 and downward
steering+8/256, the first floor overlap with Sonic at Y238 is move60: shot Y214,
X displacement135, horizontal reach12. From boss RIGHT-48, the furthest right
floor hit is RIGHT-179. The player can reach RIGHT-9: a170px missile gap remains.
Lifetime extension alone cannot change this geometry.

A uniform horizontal stretch was tried in an isolated harness and discarded:
it moved contact opportunities farther apart and introduced a new camping
position. E leaves X speed, Y speed/gravity and the existing jump/state sequence
unchanged. No extra hop, attack, cooldown change or player wall is introduced.

## Explicit GameMaker/widescreen route

At256, the original cached-byte patrol decision, facing target and projectile
lifecycle execute unchanged. At wider widths:

- The left stop remains below48, producing anchor47.
- The right approach limit is EDGE(RIGHT,+122). This is the former RIGHT-48
  plus the170px ballistic gap. The boss can move smoothly outside the view
  during its existing approach/fire sequence; it is never teleported there.
- When Sonic occupies the added right combat space, beyond canonical contact
  union208+20+8=236, the existing facing decision approaches
  `min(playerX+170, EDGE(RIGHT,+122))`. The170px lead places a stationary floor
  target in the unchanged missile's descending contact path. Equality at the
  capped right target faces right, retaining the source at its endpoint.
- All horizontal integration in body/jump, ranged and hit-reaction states uses
  the same current position, speed and right limit. This replaces D's stop-only
  widening with a coherent approach/source route. The wider route is driven by
  Sonic's position; it does not force a fixed repeated tour of the whole arena.
- The wide stop reads live route X. Original renderer-cached X stops updating
  when a keepalive boss is asleep outside the render band, so that cache cannot
  govern an offscreen firing approach. The256 decision retains its original
  cache and byte semantics exactly.

These are runtime adapters, not recovered ROM facts. Canonical placement,
source/cache coordinates and script records are unchanged. Runtime boss X
naturally changes through the existing velocity integrator. Collision geometry
is unchanged. At348 the permitted approach endpoints are47..470; at640 they
are47..762. Their portions inside the active view cover the wide fight.

## Minimal $5D entry retention

At the right approach endpoint, natural shot source is EDGE(RIGHT,+114), Y159.
The source is beyond the ordinary32px awake margin. E retains only a newly
launched `$5D` in the bounded right source band32..114 until it enters the
ordinary awake band. The114 bound follows directly from the approach limit+122
and canonical spawn offset-8. The existing vertical band still applies; after entry,
ordinary sleep/delete behavior resumes. The shot is not rendered or collided
at a translated position, and no lifetime timer is added.

VX=-2.25, steering selector/increments, collision, forced hurt and source spawn
offset remain byte-identical to A. There is no mirror, rear shot or randomness.
At348, source462 reaches floor-contact right edge339. At640, source754 reaches631.

## Practical floor-level validation

`verify_aqz_p4_e.js` runs shipped player/terrain physics and the slot scheduler,
starting at normal state17. An ordinary non-attacking player waits up to2400
frames at **every** permitted integer floor X. Actual contacts, death, first
body contact positions/Y, phases, frames and elapsed time are recorded. There
is no persistent synthetic hurt flag or ghost in this acceptance sweep.

| Width | Player range | Actual safe waiting positions | Right-side refuge |
|---|---|---|---|
|256|16..247|16..18,237..247|11px, canonical|
|348|16..339|16..18|none|
|640|16..631|16..18|none|

The full traces record actual body contact near both edges, rather than inferring
floor threat from an overall X union. At the extreme left, the original3px refuge
remains; X19 is lethal. Right-side players are threatened during the approach
and by the ranged source route. This is bounded deterministic evidence, with
Windows feel/play still requiring James's acceptance.

The sweep covers1172 ordinary waiting positions across the three widths. An
additional32 endpoint checkpoints start the boss at either approach extreme
and verify that waiting remains threatened after an earlier chase.

A separate missile-contribution fixture suppresses only boss-body overlap at
that helper, leaving real player movement/hurt, scripts and natural allocations
active. This isolation is **not** used for the ordinary camping result. All103
added right-side X positions237..339 at348 and seven additional640 targets are
hit by real missiles, including339 and631. Every actual projectile callback
checks canonical VX. Natural source positions and hit counts are recorded.

Actual movement fixtures traverse both player edges at all three widths.
216 continuous jump episodes check both approaches, three boss start positions,
four distances and three hold durations; each produces at most one HP decrement.
Every width256 contact is independently replayed through original ROM `$AAB5`.
Wide event times may legitimately differ when the route no longer stops at
RIGHT-48; the canonical contact/cooldown contract itself is unchanged.

## Retained presentation/core and reproduction

C's settled-camera16-update pause, all six clean right-edge child entrances,
smooth main entrance and locked wide post-defeat camera are retained. State20
still runs through EDGE(RIGHT,+33) with no wall, camera pan or black void.
The clear floor gate, timer,0A/0,F/0,successor5/0, allocator, child HP/signals,
5C parameter6, boss HP/contact/cooldown and all P1-P3 systems are untouched.
Shared hurt and lost-ring code are untouched; the four-ring observation remains
a separate reported issue.

Run `verification/run_aqz_p4_e_checks.py` with Research Python and bundled Pillow.
The full batch includes navigation, hygiene, diff checks, P1-P3 and P4 core/ROM
oracles. `package_aqz_p4_e.py` requires source compile/startup evidence and creates
one uniquely named project package with byte-verified extraction. Source and
fresh package compile/startup evidence and complete fixture traces are under
ignored `build/aqz-p4-e`. No commit until Windows acceptance; stop at P4 E.

The final batch passes87/87 commands and1,671,992 focused assertions, including
1044 canonical contact calls replayed through the ROM (5220 assertions).
