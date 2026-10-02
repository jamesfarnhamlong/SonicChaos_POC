# Canonical attack posture and THZ badnik contact

Research: `docs/player-attack-badnik-audit.md` (28485aa). Mirror: `POC_notes/rom-cache/player-attack-badnik.json` (`verification/make_attack_badnik_data.py`).
Check: `node verification/verify_attack_posture.js` (resolvers vs the Research regions, a `$48BC` model over 2,240 input combinations, the attack-bit lifetime through the real core, and the shipped
type `$21` / `$27` Step events through the real adapter; 95,988 assertions).

Sonic attacks iff `$D503` bit 1 (`core.move & 2`, published as `global.chaosAttackPosture`) **or** the power-up `$D532 == 6` (`global.powerInv`). Airborne is neither necessary nor sufficient.
`global.playerJump` (`move & 3`) stays what it was - an airborne/physics predicate - and no enemy decision reads it any more.

| Consumer | Before | Now |
|---|---|---|
| type `$27` defeat | `playerJump \|\| spin \|\| spindash \|\| playerSuper \|\| powerInv` | `chaos_type27_resolve`: overlap and (bit 1 or `powerInv`) |
| type `$27` non-attacking contact | no effect | raises `$D520` (staged, promoted after the player's pass); `$48BC` hurts in the **next** update |
| type `$27` rebound | none | via `$48BC`: above Y speed -3.0 (floor flag cleared, airborne), below +0.5 (not in state 9), side none; `powerInv` clears the contact (no rebound) |
| type `$21` | stomp / `playerJump` attack / immediate hazard | `chaos_type21_resolve`: stomp (`playerY <= objY-4`, any posture) before the attack test; side / low contact defeats when attacking (no rebound, no `SCR_physics_jump_objects`), else request `$D3B0` (hurt next update) |
| `$21` stomp | also set `global.playerJump` | -6.75, state `$0B`, attack bit cleared, spring-flight physics only |
| monitor `$10` | `spin \|\| playerJump \|\| spindash` | bit 1 only (invincibility alone does nothing) |
| breakable `$47` step | `move & 2 \|\| spin object \|\| playerJump \|\| spindash` | bit 1 and not in `$0F/$10/$15/$1A` |
| sample `OBJ_badniks` contact | `!playerJump && !spindash` -> immediate legacy hurt | `!(bit 1 \|\| powerInv)` -> shared request path |
| `$D532 == 6` | `powerInv` mixed with `playerSuper` | `powerInv` only (`playerSuper` has no ROM counterpart and is gone from enemy decisions) |

Shared damage path: `SCR_cc_damage_gate` (`$48BC`) = invulnerability countdown -> hurt-bit -> invincibility -> request `$D3B0` -> contact `$D520` with / without bit 1. Objects stage `$D520` / `$D3B0`
(`SCR_chaos_attack`), the object phase promotes them after the player's pass, the next player update consumes them. `SCR_cc_hurt_rom` is the single hurt entry. Unchanged airborne consumers:
`SCR_physics_*`, `OBJ_chaos_controls` checkpoint gate, legacy spin object.

Adapters / assumptions: Step events of `$21` / `$27` still run in GameMaker's Step order (not provably after the player); staging makes the one-update timing independent of it, but the bit they read
may be the previous update's. A stale `$D520` is cleared while Sonic is invulnerable (the ROM keeps it; unobservable in tests so far). Hurt in state `$11` keeps the POC's existing cancel path.
