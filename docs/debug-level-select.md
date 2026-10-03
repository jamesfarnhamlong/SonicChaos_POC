# Developer level select — Windows handoff

Base: accepted `e3eff51c2470789a3ff85c543d832bec6072b315`, branch `poc/thz1-cleanup`.
This is GameMaker developer infrastructure, not a recovered ROM menu. Windows acceptance passed on 2026-10-03. The selector is accepted developer infrastructure.

1. **Architecture:** `SCR_chaos_debug_select` generates flat entry structs with display zone, act, destination room, enabled status and `act`/`test` classification. `ROM_chaos_debug_select` contains a nonpersistent controller with Create/Step/Draw events. The normal `chaos_acts()` progression table and save-card selection remain unchanged. Later acts currently have `noone` destinations; enable only after supplying an implemented room. Launch also checks `room_exists`, so missing destinations fail safely. DEV TESTS are reserved entries; no test rooms or footwear mechanics were added.
2. **Access:** F10 from the title options or unpaused THZ gameplay. F10 replaces the old in-level act cycle. The legacy `-thz2` parameter now routes zone-goto into the selector. Arrows/D-pad navigate, Space/Enter/controller A/Start confirm, Escape/controller B returns to title. Title initialization resets the developer session and reloads the normal save.
3. **Act table:**

   | Zone | ACT-1 | ACT-2 | ACT-3 |
   |---|---|---|---|
   | Turquoise Hill | `ROM_chaos_thz1` | `ROM_chaos_thz2` | `ROM_chaos_thz3` |
   | Gigalopolis | Unavailable | Unavailable | Unavailable |
   | Sleeping Egg | Unavailable | Unavailable | Unavailable |
   | Mecha Green Hill | Unavailable | Unavailable | Unavailable |
   | Aqua Planet | Unavailable | Unavailable | Unavailable |
   | Electric Egg | Unavailable | Unavailable | Unavailable |

   Rocket Shoes Test, Spring Shoes Test and Future Mechanics / Boss are separate disabled DEV TESTS entries. Gray entries show an unavailable message when confirmed.
4. **Reset:** selector entry destroys the persistent `OBJ_chaos_controls`; every debug launch therefore recreates its power-up timers, monitor queues and effect-allocation flags. Normal room destruction removes player/core, boss/camera controllers, objects, ring flags/surfaces and placement ownership. Debug reset clears checkpoint, attack/jump/spin flags, owner sequence, completion/bonus markers, score, and starts Sonic with three lives. The existing zone Create reinstalls terrain/layout/map width/loops, object population, player spawn and HUD. A debug-only camera initialization uses the existing vertical follow formula immediately, avoiding THZ3's legacy initial Y=550 view. Debug clears do not update `zoneGoto`, and `SCR_save_game` ignores debug sessions. Normal save/progression behavior remains covered by the existing act checks.
5. **Direct-launch checks:** shipped selector, player Create, controls Create, ring-manager Create and zone Create execute in the focused GameMaker host. Sequence: THZ1 → THZ2 → THZ3 → THZ1 → THZ3 → THZ2, with deliberately dirty checkpoints, footwear, rings, boss, camera and clear flags before each launch.

   | Act | Map width | Player origin | Camera at 256×192 | Population | Boss |
   |---|---:|---|---|---|---|
   | THZ1 | 128 | (142,658) | (0,530) | Existing 1672 room instances; 142 terrain rings | None |
   | THZ2 | 128 | (110,398) | (0,270) | 28 loader objects; 133 terrain rings | None |
   | THZ3 | 80 | (110,224) | (0,96) | 7 loader objects; 6 terrain rings | One, HP 8, state -1, camera mode 0 |

   Camera Y depends on view height. Spawns preserve the accepted POC origins; THZ2/3 remain documented DEV_SPAWN / UNVERIFIED adapters. THZ1 room-authored population is checked from its unchanged room resource; engine instance creation/destruction and rendering remain host boundaries. These checks are logic evidence, not Windows gameplay acceptance.
6. **Files changed:** new script GML/YY, selector object Create/Step/Draw/YY, selector room YY, `verification/verify_debug_select.js`, and this report. Modified project registration, title-options Step/Draw, system Create, controls Step, zone Create, `SCR_zone_goto`, `SCR_chaos_level`, and `SCR_save_game`. Canonical data, THZ terrain/object rooms and boss implementation are unchanged.
7. **Focused checks:** `node verification/verify_debug_select.js`, `verify_level_select_acts.js`, `verify_act_completion.js`, `verify_thz3_boss_clear.js`, and `verify_thz3_boss_render.js`; `git diff --check`; Windows VM compile using installed GameMaker runtime 2026.0.0.23. No full suite. Menu navigation is swept from every entry; unavailable launches and debug-save suppression are checked. Source and extracted package compilation are checked for this handoff.
8. **AGENTS.md candidate update:** “Developer level select: F10 on title or unpaused THZ gameplay opens the separate data-driven selector. THZ1/2/3 are enabled; remaining canonical acts and reserved DEV TESTS are disabled. Debug launches start fresh and never write saves or advance progression; return to title to resume normal play.” Windows acceptance passed; Manager-san may consolidate this update. Root AGENTS.md was not edited.

Quick Windows test: open the packaged `SonicChaos_POC.yyp`, F5, then F10 at the title. Launch each THZ act, use F10 to return, and try THZ3 → THZ1 → THZ2 after collecting rings/breaking a power-up monitor. Confirm clean spawn/camera/HUD and an intact THZ3 boss. Check disabled entries and DEV TESTS, then return to title and confirm the normal saved progression is unchanged. Unpause before F10.
