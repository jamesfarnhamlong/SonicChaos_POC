# AQZ P2 acceptance and terrain regression check

James accepted AQZ P2 A on Windows for AQZ1 $86, AQZ1 $83 and AQZ2 $8B.

AQZ1 collapsing-block side embed is pre-existing/outside P2 scope.

Compared against accepted P1 `7ca3336eed3c204f3c794082c7c91d15f76ec42c`:

- Player core, adapter (including block replacement/bounce), movement, collision profiles, AQZ terrain data and shared crumble contract are source-equivalent after line-ending normalization.
- The entire shared crumble implementation is source-equivalent after removing the four-line conditional dispatch for newly reserved $3F slots. Existing type-$13 dispatch, contact, rider hold, replacement and shard logic are unchanged.
- Player terrain collision and projection still execute before the object phase. P2 adds only its $3F object callbacks; it does not reorder player terrain passes.
- The executable harness compares 80 existing core/breakable/crumble functions and 4,096 side-break inputs (both sides, all velocity high bytes, fractional extremes, posture flags) against P1: identical responses.

Reproduce with `node verification/verify_aqz_p2_terrain_preservation.js`.
This establishes P2 non-involvement in the reported terrain paths; no fix or empirical collision adjustment was made. The exact Windows embed scenario was not separately reproduced because its coordinates/input trace were not supplied.

The accepted package retains its recorded source/extraction compile and launch checks and full 78/78 regression command results (including the accepted P1 75-command suite). Acceptance finalization additionally reruns focused P2, shared crumble and P1 integration checks. ZIP/build/diagnostic debris is excluded from the commit. Existing unrelated untracked files are left alone.

P3 types $3C/$3D and boss types $59-$5D remain untouched. Stop after pushing `poc/aqz-p2-platform-3f`.
