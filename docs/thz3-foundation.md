# THZ3 non-boss foundation

Data: Research `main` @ 28485aa, `data/rom-cache/levels/thz3/*.json` vendored byte-identically in `POC_notes/rom-cache/levels/thz3/`.
`POC_notes/generate_chaos_level_data_thz3.py` emits `scripts/SCR_chaos_level_thz3_data` (layout, 6 terrain rings, 3 type-`$09`, 10-record object census, start words) and asserts every pinned hash.
`POC_notes/extract_chaos_level.py --act thz3` renders the terrain from the ROM (local only) into three 1024-wide sprites (the thz2 control run reproduces the accepted sprites).
`POC_notes/import_type10_selector01.py` renders the type-`$10` selector-`$01` art with the Research renderer. Check: `node verification/verify_thz3_foundation.js`.

* **Map stride.** THZ3 is 80 x 16 cells; the ROM row-offset stride equals the width, so `global.chaosMapWidth` (128 / 128 / 80, set by `chaos_level_install_layout`) feeds `SCR_cc_lookup`, the ring probe
  and the loop scan. Columns past the width wrap into the next row exactly as in the ROM; rows past the 1,280 loaded cells read the empty block (the loader leaves that RAM uninitialised: UNRESOLVED).
* **Terrain.** All 77 blocks occur in THZ1/THZ2 with identical headers; surface types 0,1,2,3,7,9,13,20,23,24 are all handled by the shared core. No new mechanism.
* **Population.** `$26` x4 (strong), `$10` parameter 1 (+10 rings, selector-`$01` art), `$1B` at its canonical anchor (752,128) (same rules, base Y = placement Y), 3 type-`$09`, 6 terrain rings.
  The `$50` boss is counted as unsupported and never created.
* **Room / act table.** `ROM_chaos_thz3` (2560 x 512, terrain object + zone object only); third entry of `chaos_acts()`; F10 cycles THZ1 -> THZ2 -> THZ3. There is no act clear (no sign in THZ3).
* **Player start.** Raw words 110,224, same `DEV_SPAWN / UNVERIFIED` treatment as THZ2.
* **Not included / unresolved.** Boss and its support objects, the THZ3 act-clear chain, the RAM content past the loaded cells, THZ3 `$1B` lifecycle (same unresolved lifecycle as THZ1), no Windows observation of THZ3 yet.
