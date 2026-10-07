# Portable Test Navigation — Windows accepted

Base `c90a0117e529dfbed7cf4b150823eaeee525972d`, branch
`chore/portable-test-navigation`. P3 was Windows accepted by James on 2026-10-07. These are developer UI adapters.
No asset organization, canonical data, gameplay, room content or save format changes.

Title: START GAME / LEVEL SELECT / OPTIONS, Up/Down wraps, face1 confirms.
The existing 30-update fade and alarms dispatch Start Game to data select,
Level Select through `chaos_debug_open()`, and Options to its existing room.
Selection is held during the fade. F10 remains the direct selector shortcut.

Pause: RESUME GAME / LEVEL SELECT / BACK TO TITLE, Up/Down wraps, face1
confirms. Resume retains activation/audio/fade behavior. Level Select calls
`chaos_debug_open()` which activates all instances and stops audio before changing
room. Back to Title retains its existing eight-update alarm destination.

Selector: existing D-pad navigation, face1 or Start launches, face2/B returns
to Title. Gameplay Start opens the existing pause menu. No direct gamepad polling
was added; menus use `SCR_buttons()`.

Debug completion: the first shared `chaos_act_complete()` arms a 90-update delay
(1.5 seconds at 60 Hz), ticked only by in-level controls. This is a developer UI
adapter, not ROM results timing. The shared debug-open path cancels pending returns;
launch resets the timer and act runtime. Repeated completion cannot rearm it.
Normal completion retains its existing progression/save path. Debug completion
retains progression/save suppression. Game Over retains its 90-update Title return;
the return timer cannot tick outside levels. Title clears session and pending return
before loading the saved game.

Validation: `verify_portable_navigation.js` executes shipped events and
`SCR_buttons()` with keyboard input disabled (242 assertions). Existing selector,
completion and full SEZ S5 regression batch are also run. These are logic tests;
engine teardown, rendering, native gamepad input and compiled gameplay need Windows
acceptance. James confirmed IDE compile/launch, all controller flows listed below,
normal progression, Game Over, F10 shortcuts and no stale gameplay state. The hygiene verifier's `--generated-root .` mode checks the accepted
hierarchy for subsequent development; its default mode audits the historical
metadata-only migration and rejects unrelated GML edits by design.

Windows checklist (controller only): Title Level Select; navigate and launch an
implemented act; Start to pause; select Level Select; launch another act; complete
and wait for selector; B to Title; normal Start Game; exhaust lives and verify
Game Over returns to Title after 90 ticks. Check saved progression is unchanged by
debug completion and reload. Separately verify F10 at Title/unpaused gameplay.
Compile/launch both source and fresh ZIP extraction in the GameMaker IDE if Igor
cannot execute GMAssetCompiler.dll. P3 acceptance completed; commit/push authorized by James.

Accepted package: releases/SonicChaos_Portable_Test_Navigation_20261007_P3.zip

SHA-256: d695a75437dfa465118089b37fedf6e8e9cf5921b1fad655aaeaa8fd98fac958

Automated checks: full batch 58/58 commands, portable navigation 242 assertions,
SEZ runtime 645,284 assertions, SEZ assets 408 assertions; selector/act-table,
hygiene and git diff --check passed.
