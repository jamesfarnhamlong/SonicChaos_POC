# GPZ1–3 Windows test milestone — 2026-10-03

**Package A failed Windows acceptance due to severe asset corruption.** The
following original milestone report is retained as history, not an acceptance
claim. Research correction `bbcef38a4463b4054d5dbeeede197d9c7b1b8238` now
supersedes the provisional asset diagnosis. Package B is regenerated through
the corrected canonical decoder; the local pointer override is removed. See
`gpz-asset-diagnosis.md`. Windows acceptance is still pending.

Uncommitted implementation on `poc/thz1-cleanup`, starting from accepted POC
`42aaa5032cef385284a00d0c1b7a0e7714747b4b`. Canonical Research main:
`ee477ea5884b4a3b5c108d31e3192c24ea22f609`. Research was read-only.
Automated checks establish implementation/data agreement; complete traversal and
visible fidelity remain subject to James's Windows acceptance. No commit yet.

1. **GPZ1 traversal:** functional F10 launch; 5120×768, width 160, canonical
   player `(110,384)`, camera `(0,272)`. Terrain, ordinary objects and sign-clear
   chain installed. Complete human traversal remains unverified.
2. **GPZ2 traversal:** functional F10 launch; 4096×1024, width 128, player
   `(110,448)`, camera `(0,336)`. Preserves the ROM's 4095 loaded-cell ceiling.
   Ceiling springs and ordinary clear are active. Complete human traversal unverified.
3. **GPZ3 traversal:** functional F10 launch; 2560×512, width 80, player
   `(187,352)`, camera `(75,240)`. Foundation reaches the preserved boss region;
   no `$51`, child chain, arena lock or fabricated sign-clear is instantiated.
   Reaching that region by ordinary play remains a Windows check.
4. **Importer:** `POC_notes/generate_gpz_foundation.py` reads the reviewed manifest,
   its four hash-pinned dependencies and verified local ROM. It generates layouts,
   both profile planes, placements, rings, GPZ palette sprites, chunked terrain
   and rooms. Rooms contain only terrain and zone controllers; placement coordinates
   come exclusively from the manifest. No ROM file is packaged.
5. **Terrain / `$1C`:** canonical raw profile tables installed per act. Existing
   effective-height-32 floor rule retained. Underside now uses the recovered
   `$746E` strict boundary and profile projection, rather than rejecting `$1C`.
   All twelve `$8C..$97` blocks are covered by underside sweeps. This remains
   terrain collision, without an additional isometric collision system.
6. **`$28/$83`:** shared triangular support/speed gate and carry reused. One sag
   cycle, delay 80, phase `$FF` on update 81, gravity `$0030` from update 82,
   first integer descent update 84, falling movement before support/carry.
   Triggered deletion permanently consumes the placement for that act. Untriggered
   deletion recreates from its original record. Fresh act resets the ledger.
7. **`$28/$89`:** independent state-10 horizontal movement, weight sag, contact,
   X carry and post-movement reversal counter. Original ROM trajectories cover
   all three canonical auxiliary periods, ridden and unridden, over two cycles.
8. **`$05` touch-start:** the canonical placement is type `$28`, parameter `$05`.
   State 13 classifies contact and requests state 6; movement/carry begins on its
   subsequent callback. State 6 retains its contact-start gate and reversal order.
   Original ROM trajectories verify ridden and unridden behavior.
9. **Springs:** GPZ diagonal Y is −5.5; THZ remains −7.0. GPZ2 ceiling contact,
   raw profile extent, projection, `(4.0,5.5)` launch, state `$1B` and attack
   posture follow Research. Shared mapped spring mechanics are unchanged.
   GPZ uses decoded palette art; the accepted cap/extension drawing adapter is
   retained, with the decoded cap on its existing canvas. Parked player descent,
   sideways presentation and facing oscillation work is untouched.
10. **`$16/$19`:** `$16` floor gates, −4.25 bounce, ten-ring reward and `$47->$46`
    mutation follow the original routine. Side break follows the recovered gate.
    Replacement transparency removes the intact overlay rather than painting
    transparency over old pixels. Surface `$19` identity/profile data remains
    canonical; its unresolved consumer produces no guessed mutation/reward chain.
    GPZ1 has 21 such cells; GPZ2 has 24. Traversal dependence needs Windows feedback.
11. **Rings / spikes / monitors:** GPZ1 84 terrain + 8 visible/32 hidden `$09`;
    GPZ2 239 terrain + 10/20; GPZ3 4 terrain + 5/0. Accepted `$753E`, strict `<12`
    and animation parity unchanged. Static spikes and GPZ2's mapped `$1B` reuse
    accepted contact/order. Supported monitor selectors 1,2,3,4,6 use GPZ art.
    Rocket Shoes runtime is retained for testing, including its known fidelity
    deviations; the historical ring issue still needs reproduction in the later
    footwear milestone. No new footwear mechanics or Spring Shoes were added.
12. **Act clear:** GPZ1/2 reuse `$18->$19->player $20->clear/results` infrastructure.
    Exact alternate `$A962` rows and table identity are generated and attached to
    signs. Shared mechanics and previously deferred prize/results presentation
    are unchanged. GPZ3 has no ordinary clear. Debug launches suppress saves.
13. **Skipped objects:** GPZ1 indices 17–25 (`$25/$2C`); GPZ2 22–31 (`$25/$2C`);
    GPZ3 index 9 (`$51`). Raw records remain in generated canonical data.
    All other safe/integration-ready records are handled, including ring-manager
    records: GPZ1 52, GPZ2 52, GPZ3 8 total placements.
14. **Background:** extracted static tilemap, mapping and palette are rendered;
    transparent deck pixels remain transparent. Dynamic palette, tile animation,
    scrolling and presentation behind that deck are unresolved and deferred.
    No substitute background or speculative parallax is supplied.
15. **Debug selector:** GIGALOPOLIS ACT 1/2/3 enabled through the accepted fresh-act
    pathway. Nine mixed THZ/GPZ launches verify widths, starts/cameras, profile
    resets, power-up reset, clear state, consumed placements, ring data and boss
    exclusion without save/progression writes.
16. **Focused checks:** GPZ foundation 8,666 assertions, including 3,968 original
    platform trajectory rows and 1,020 original `$16` gate cases; spring 170,493;
    platform/spike 19,990 direct plus 65 oracle checks; terrain ring 511,407;
    `$09` 12,680; monitor contact 3,233 grid cells plus 15 projections; monitor
    Step selectors 1,2,3,4,6; ordinary clear 5,856 contact cells and shared-chain
    cases; attack 95,988; signed death 381; act table, debug resets and THZ3 boss
    clear controls pass. `git diff --check` passes. Source and fresh extracted
    package compilation results are recorded in the external build report.
    No full historical suite was run.
17. **Windows package:** one unique ZIP under workspace `releases`, one top-level
    project folder, exactly `SonicChaos_POC.yyp`, no backup project, ROM or build
    debris. Exact ZIP path/SHA and compiler results are in the accompanying
    `build/gpz-foundation/package-report.json` and delivery message.
18. **Unresolved:** Windows full traversal/visible registration; surface `$19`
    consumers; dynamic background; enemy and GPZ3 boss milestones; existing Rocket
    Shoes and parked player presentation issues. No automated pass is claimed
    as final gameplay acceptance. If `$19` prevents traversal, report that narrow
    route to Research rather than inventing a consumer.
19. **AGENTS candidates after acceptance:** update current POC checkpoint and six
    enabled debug acts; record GPZ canonical profiles/start metadata and importer;
    clarify that `$05` denotes type `$28` parameter `$05`; record GPZ ceiling/
    diagonal spring distinctions and `$83` consumption/reset semantics; retain
    explicit `$19`, dynamic-background, enemy/boss and footwear deferrals.

Windows test: use F10 from title or unpaused gameplay, choose GIGALOPOLIS ACT
1/2/3, and test the requested terrain, platform, spring, ring, spike, monitor,
clear/boss-boundary and THZ→GPZ→THZ routes. Enemy/boss absence is expected.
