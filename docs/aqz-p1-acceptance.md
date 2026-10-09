# AQZ P1 Windows acceptance

James/Manager accepted AQZ P1 F2 on 2026-10-09.

Package: `SonicChaos_AQZ_P1_20261009_F2.zip`

SHA-256: `ed39bb99c4d1c1e3ee4b76e2c2e77814c059146f22728504dd64f4e3fb004bce`

The accepted scope comprises three-act foundation, water/environment presentation and gameplay, bubbles/air/drowning, terrain-ring cadence, canonical player frames and animation scheduler, facing/$D448, falling ceiling-spring probes, mapped-spring post-player timing, and shared weak-spring/THZ3 tumble behavior. The F3 movement audit is accepted source-side evidence and made no runtime changes. Historical package reports retain their original review status; this record supersedes that status.

Underwater movement/skim may subjectively feel faster/more sensitive than original gameplay, but controlled native POC values currently match the ROM for movement modifiers, skim threshold and updater cadence. Do not tune without a reproducible ROM/POC discrepancy.

Native diagnostic captures remain local, outside the checkpoint. The source regression runner runs without those captures; `--native-registration` explicitly adds the local compiled-Draw comparison, with an alternative capture accepted by the standalone verifier's `--capture` option. Summary evidence and reproduction tools are retained.

P2 types remain filtered; no P2 implementation is included.

Checkpoint verification: 75/75 regression commands passed (74 source checks plus the explicit local native-registration check); F3 native/adapter comparisons passed 149,288 assertions; AQZ3 replay passed 480 updates x 13 fields; project hygiene and staged/working-tree `git diff --check` passed. Shipping runtime remains byte-identical to accepted F2.
