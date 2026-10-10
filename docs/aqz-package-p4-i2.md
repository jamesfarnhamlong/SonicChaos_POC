# AQZ P4 I2 — final accepted milestone / backdrop audit

P4 I gameplay is Windows accepted. I2 changes presentation only: AQZ1 and AQZ2
terrain backdrop fills, plus the reproducible foundation generator. Boss, player,
collision, camera, water physics, shared hurt and ring scatter remain byte-identical
to the accepted I package.

The verified Sonic Chaos Europe v1.2 ROM was booted into both acts. Controlled
camera placements exercise above-water, split-raster and fully submerged palette
states. Samples after original IRQ `$0683` and palette restore `$1CD2` show VDP
register 7 = 0 and CRAM entry 16 = `$10` in every mode. Thus the actual SMS backdrop
is constant RGB `(0,0,85)` in both acts. Background CRAM entry 0 changes between
`$10`, `$14` and `$05`; it is not the VDP backdrop entry. No screenshot sampling.

The old vertex-only `(1,1,1)` rectangle inside the indexed-texture shader produced
near black. Both acts now paint their opaque recovered backdrop before binding
the terrain palette shader, matching accepted AQZ3. Water palette/raster rendering
is unchanged. The audit also checks all three generated terrain Draw events and
byte-compares existing files against the accepted I archive, with only these
presentation changes and their generator/verifier allowed. A trailing blank line in the historical C verifier is removed for staged diff hygiene; its contents otherwise match I.

Validation: full accepted regression batch, navigation, project hygiene,
original-ROM palette checks, source and freshly extracted package compilation,
native startup and accepted absent-player / diagnostic IO self-tests. Detailed
results are generated under ignored `build/aqz-p4-i2/`.

Final package: `SonicChaos_AQZ_P4_20261010_I2_final.zip`, one top-level project folder
and exactly one YYP. Gameplay acceptance carries forward from P4 I.
