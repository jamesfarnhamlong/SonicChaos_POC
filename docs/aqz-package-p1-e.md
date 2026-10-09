# AQZ P1 E — canonical player presentation and spring dispatch

Uncommitted branch `poc/aqz-p1-foundation-water`, accepted base `5d99a38d1f439ac02cd9d3010d09f70cc57aa575`. Research closure accepted at `81b82941e7f44865e0d551484bee82d28d600d43`; AQZ foundation/water caches remain the unchanged accepted A1–A5 data. P2 is untouched.

## Root causes and bounded correction

The inherited sprite adapter collapsed canonical spring/airborne states into a frozen Sonic-2 spring pose, falling art or spin art using flags and `chaosSpringVisual`. It also assigned facing from velocity. The new shared adapter consumes the executing Chaos state and decoded animation script directly. Core movement/attack remain authoritative; legacy jump/spring globals and sprite fields are outputs. No inherited Step/End Step physics rewrite was needed.

AQZ3's obstruction was the missing `$753E -> $749D` ceiling-spring dispatch while falling. The existing rising ceiling pass remains intact. The final special probe samples tile identity at anchorY−8/even or +2/odd and consumes the last terrain sample's vertical profile (the separate `$D368` value), preserving closed profile boundaries. Both `$3A/$3B` can request `$1B`, vx+4, vy+5.5, attack/air bits set. There are no coordinate exceptions, enlarged bounds or catch windows.

Native replay additionally found mapped `$26/$30` contact running before the player in GameMaker Step. It delayed the request/flags by one update at the natural strong spring, although subsequent motion matched. Those three spring object callbacks now run once in the existing post-player object phase. Their geometry, lifecycle, launch and lockout code are unchanged. Step delegates only outside Chaos rooms. The native 480-update comparison now has zero mismatches.

## Presentation and scheduler

`POC_notes/import_player_spring_airborne.py` consumes the accepted `player-spring-airborne.json`, verified local ROM and approved frame PNGs/board. It generates decoded animation opcodes and resources. E adds 18 `SPR_chaos_player_frame_XX` resources: `$01–$06`, `$1C–$21`, `$25–$29`, `$61`. Their PNG bytes and recovered origins are imported unchanged. E also adds 18 `SPR_chaos_aqz_player_frame_XX` companions encoding original palette indices for the existing direct-lookup AQZ shader; these use identical ROM tile composition, canvas, alpha and origin, with no nearest-color or runtime RGB conversion. No replacement artwork.

The visible scheduler runs before the executing player callback, once per player update. It records executing state, script/record address, script position, frame, record counter, loop counter, D448 branch and shared selector D52F. It implements decoded FF00/08/0E/0F/05 operations. `image_speed=0`, `image_index=0`; each approved frame is a separate resource. State changes restart scripts; same-state requests do not. A changed D448 during an executing `$0B` is read only when FF08 is reached again.

| Executing state | Program |
|---|---|
| `$0B`, D448 bit0=0 | Exact 82-update tumble program `$1C–$21` |
| `$0B`, D448 bit0=1 | `$61`, repeated four-update record |
| `$1C` | Tumble, eight updates/frame |
| `$14` | Tumble, four updates/frame |
| `$0E` | `$02,$03,$04,$05,$06,$01`, eight updates/record, exact 232-update program |
| `$09/$0A/$10/$1B` | Recovered 20-entry `$25–$29` selector, air duration3/floor speed table |

Walk/run retain their accepted art but publish the shared numeric selector/frame/counter phase, which carries into spin. Without that D52F continuity, the natural replay's spin frames would differ. Terrain-ring shadow scripts/data and their accepted parity contract remain independently unchanged. The new visible counter supplies the recovered ceiling special probe; terrain-ring collection continues to use its own accepted shadow counter.

Covered states return before generic legacy sprite/facing selection. Facing comes from +$04 bit4: `$0B` held-direction suffix; `$0E/$1C/$14` retain facing; spin reloads use the recovered floor-speed/air-input rule; diagonal launch writes its direction. No claim is made that the older reported rebound oscillation has been visually accepted.

The retained GameMaker mask is explicitly fixed to `SPR_player_mask`; imported art origins/canvas sizes never select engine collision geometry. New art draws at the core anchor, compensating the existing instance-origin offset in Draw only. Core positions, probes and attack bit `$D503 bit1` are unchanged by sprites.

## D448 and shared behavior

Terrain upright, strong `$26/$30` and type `$21` stomp write `$FF`; weak `$26`, THZ3 `$50` top bounce and diagonal write `$00`. No new landing/act-load clear is added. Type `$21` keeps −6.75 launch, terrain upright −7.5, strong mapped −7.375, weak mapped −5, boss top −4. Weak and boss use the same scheduler/assets; no boss-specific visual workaround.

The canonical same-state horizontal behavior is retained: executing `$09` plus another `$09` request continues the ordinary rolling suffix; opposing input can request `$07/$08` and clear attack in that update. There is no spring-wins guard. The ordinary midair `$1C -> $09 -> $0A` path retains its two executing-$09 updates. Attack is never inferred from animation, state name or airborne status.

## Verification

Focused runtime E fixtures cover decoded full animation cycles/branches, same-state non-restart, 60 emulated free-flight vectors, spin/facing reloads, weak/boss/strong/type21/diagonal writers, both ceiling blocks and profile boundaries, special-probe register separation, horizontal suffix behavior and adapter isolation. Exact counts are emitted to `build/aqz-p1/followup-e-results.json` and `player-animation-assets-results.json`.

The hosted and compiled native natural AQZ3 run each match all 480 updates ×13 numeric fields (6,240 values): executing/requested state, D503, frame/counter, integer X/Y, 8.8 speeds, D448, facing and floor. Hosted comparison also matches all ten spring calls on nine updates, including both `$749D` dispatches on update278. Critical falling contacts occur on142/174; the strong `$30` launch request is365 and executing `$0B/$61` begins366. The natural breakable interaction is retained on294.

Native diagnostic copies call shipping routines unchanged and record actual sprite/index/speed after Draw. They cover 980 updates across natural AQZ3, canonical weak spring, boss top bounce and both horizontal-control cases. 7,625 native assertions pass, including zero oracle mismatches. Screenshots were inspected for visible tumble, fall and strong-spring art/origins; diagnostic hooks/captures are excluded from gameplay/package resources. The summary is `verification/aqz-p1/followup-e-native-summary.json`. Preparing native diagnostics requires the prior D source archive in releases; it is a verification-only dependency.

The batch runs 73 commands: all accepted P1 checks, shared THZ/GPZ/MGHZ/SEZ regressions, navigation, hygiene, Research AQZ oracles and all57 accepted player-closure tests. Source and fresh extraction compile using authenticated GameMaker LTS2026 runtime2026.0.0.23. Final counts, package SHA and compile results are recorded in `build/aqz-p1/package-report.json`.

Water palettes/raster, indexed versus IRQ sources, waterline coordinates, shimmer extension, bubble cadence, air/drowning, Rocket duration and ring cadence retain Package C/D behavior. No `$3F/$3C/$3D/$59–$5D` implementation. AQZ2 deferred route observations remain open; AQZ3's shared spring corridor now matches Research numerically, pending Windows play acceptance.

## Review stop

Package E is one top-level source project with one `.yyp`, no ROMs/build debris/parked diagnostics. The 19 GPZ diagnostics and six platform-options directories remain in the workspace. No commit. James/Manager should retest weak/strong/diagonal/horizontal presentation, THZ3 top bounce and the natural AQZ3 spring chain. P2 waits for P1 acceptance.
