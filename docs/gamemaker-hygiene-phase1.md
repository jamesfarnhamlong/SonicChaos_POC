# GameMaker hygiene Phase 1 â€” review checkpoint (uncommitted)

Branch: `chore/gamemaker-project-hygiene`. Baseline: `6320fbf92fc29c42c49cc553174f744fd39260a9`.

Implemented exactly the approved audit CSV's 390 `Chaos organization` rows. The permanent authority is `verification/chaos_asset_parents.csv`, transcribed without changes from those rows. The optional 71 character-sprite migrations were excluded.

| Type | Resources re-parented |
|---|---:|
| Sprites | 228 |
| GameMaker objects | 104 |
| Scripts | 45 |
| Rooms | 13 |
| Total | 390 |

All 706 registered non-folder resources remain registered at their original names/paths. Added 66 populated virtual folders, giving 156 total. Folder declarations were inserted into `.yyp` without rewriting its existing sections. No existing folder was deleted or relabelled, and there is still no physical `folders/` directory: the folder resources are embedded `.yyp` declarations.

## Safety and verification results

- `verification/verify_project_hygiene.py`: PASS, all registrations/parents/names/paths, exact 390 migration set, physical file-set equality, resource equality except top-level parent, and `.yyp` equality except Folders.
- The same verifier against `build/hygiene/regeneration-d410f67b/phase1-writers`: PASS; all regenerated resources retain approved parents.
- Paired regeneration: **21/21 cases PASS**; all 15 modified metadata writers rerun, including their unchanged dependent foundation wrappers, selector importers and M3 generator. Accepted writers and Phase 1 writers produce identical resource content except approved parents. No historical non-parent regeneration metadata differences were found.
- Generated canonical cache files: **102 files byte-identical** between the accepted-writer and Phase 1-writer copies.
- Complete accepted SEZ S5/shared regression inventory: **58/58 commands PASS**. The initial run passed 55; three parent-unaware source locks were adapted and all three rerun successfully. The complete merged command inventory is `build/sez-s5/full-results.json`, with per-command logs alongside it. The six Research test commands also passed against the verified ROM.
- `git diff --check`: PASS.
- Reviewed tracked changes: 390 `.yy` parent-only changes, one `.yyp` Folders-only change, 15 metadata writers, three metadata-aware verification guards. New files are documentation and hygiene tooling/map; no runtime/resource file additions.
- Negative checks on the source-lock helper: approved parent-only edits pass; a changed sequence/origin value, wrong parent or renamed resource fails.

**Strong-invariant deviations: none in the final project.** Resource names, physical paths, IDs, sprite pixels/origins/bboxes, frames, animation/sequence metadata, GML/events, room contents and gameplay/cache data remain identical to accepted `6320fbf`. The five unusual sprite animation metadata records were preserved exactly except parent. All optional character resources and upstream assets retain their accepted metadata.

One regression asset check rewrote the tracked diagnostic `verification/mghz-m2/footwear-reference-sheet.png` with the installed rendering library. Its generated copy was preserved under `build/hygiene/regression-side-output/`; the tracked file was restored byte-for-byte from the accepted checkpoint. It is not a runtime sprite, and it is not part of the final diff. Original untracked GPZ diagnosis files were preserved.

## Generator consistency

New `POC_notes/chaos_asset_parents.py` reads the approved 390-resource manifest. Metadata constructors select the intended folder by resource name; dump-based writers update only the top-level parent; text-template writers replace only their parent field. No generated gameplay/image/sequence policy changed.

Modified metadata writer files:

- `POC_notes/extract_chaos_level.py`
- `POC_notes/generate_gpz_foundation.py`
- `POC_notes/generate_mghz_footwear.py`
- `POC_notes/generate_sez_s2.py`
- `POC_notes/generate_sez_s4.py`
- `POC_notes/generate_sez_s5.py`
- `POC_notes/import_gpz_boss.py`
- `POC_notes/import_gpz_enemies.py`
- `POC_notes/import_mghz_boss.py`
- `POC_notes/import_state11_graphics.py`
- `POC_notes/import_type09_graphics.py`
- `POC_notes/import_type10_graphics.py`
- `POC_notes/install_thz3_boss_assets.py`
- `POC_notes/register_thz3_boss_resources.py`
- `verification/make_anim_counter_data.py`

The unchanged `generate_mghz_foundation.py` and `generate_sez_foundation.py` reuse the modified GPZ writer, so they inherit the per-resource map instead of the platform template's folder. `generate_mghz_m3.py` reuses the modified footwear dump helper. The selector-01/03 importers reuse the modified type-10 metadata constructor. These dependent paths were all exercised.

`verification/make_anim_counter_data.py` was also updated and rerun. GML-only/pixel-only tools did not require metadata changes, because they preserve the migrated `.yy` parents.

The regeneration runner creates two isolated accepted-resource copies, uses accepted versus Phase 1 writers on shared verified inputs, and checks physical outputs, parsed non-parent resource fields, non-folder `.yyp` fields, and content bytes. It never regenerates in the active project. Historical Research pins were honored in its local clone: MGHZ boss at `e0f42f8`, SEZ foundation at `8b7fc8a`, then current canonical `53e9095` for the pinned-blob follow-ups. No Research files/branches were changed and no evidence checks were weakened.

Reproduce with:

```text
python verification/verify_project_hygiene.py
python verification/verify_hygiene_regeneration.py --research <Research checkout> --rom <verified local ROM>
python verification/run_sez_s5_checks.py
```

Use Python with Pillow and the Research runtime packages, plus Node on PATH, as required by the accepted suites. The regeneration runner additionally consumes the existing Research exports `build/poc-type09/09`, `build/gpz-enemy-approval`, `build/gpz51-correction` and `build/thz3-boss-support`. Its default ROM location is local-only. `build/hygiene/` is ignored and contains the isolated outputs/local ROM copy; none should be staged or included in a test package.

Results: `build/hygiene/regeneration-d410f67b/results.json`, `cache-equivalence.json` and each old/new generator log. The small normal verifier checks the baseline and current parents; `--generated-root` checks the actual regenerated copy. Running both verifies generator reproduction rather than making a claim from source searches.

## Verification guards

Three historical tests used `git diff --quiet` over entire resource directories. This rejected intentional `.yy` parents before considering gameplay. Their only test change is replacing those broad guards with `asset_parent_invariant.js`: non-`.yy` changes still fail, only manifested `.yy` parents are allowed, the resulting parent must equal the approved map, and all remaining metadata must deep-equal the original checkpoint. Existing gameplay assertions and their original baseline revisions remain intact. This is hygiene verification tooling, not a gameplay-code change.

## Folder findings and retained structure

| Location | Before direct resources | After direct resources |
|---|---:|---:|
| Sprites/Collisions | 219 | 13 |
| Objects/Collisions | 100 | 13 |
| Sprites/Badniks | 18 | 1 |
| Objects/Badniks | 17 | 2 |
| Scripts root | 40 | 0 |

Scripts root remains a populated container for upstream descendants and the new hierarchy. Sprites root's three loose Chaos block sprites migrated; its descendants remain populated. Objects root's debug selector migrated; its descendants remain populated. These zero-direct-resource containers are not orphan folders.

Five fully empty legacy categories remain deliberately: **Extensions, Fonts, Paths, Sequences, Shaders**. No additional fully empty legacy subtree was produced by this migration. No added folder is empty across its subtree. Sparse upstream Collisions/Badniks categories, `Chao Emeralds`, `Sprites/tilesets`, character folders and all legacy/engine folders remain untouched for Manager review.

## Concise before/after tree

```text
BEFORE
Sprites
  Collisions [219: helpers + terrain + many zone enemies/bosses/effects]
  Badniks [18: enemies + monitors/sign/effects/boss support]
  Player / Level Objects / root blocks
Objects
  Collisions [100: helpers + terrain hosts + controllers]
  Badniks [17: actual GM objects including non-enemy helpers]
  root debug selector / Level Objects
Scripts
  root [40 Chaos resources] / Player/Physics [mixed]
Rooms
  Zones [14, including 12 Chaos acts] / Menus [including Chaos selector]

AFTER
Sprites/Sonic Chaos
  Shared: Objects / Player / Terrain / Effects / Legacy-Prototypes/Collision Helpers
  THZ / GPZ / MGHZ / SEZ: populated Terrain / Objects / Enemies / Bosses / Effects
Scripts/Sonic Chaos
  Core / Player-Collision / Level-Import / Shared Objects / Debug
  THZ / GPZ / MGHZ / SEZ: populated Data / Runtime
Objects/Sonic Chaos
  Controllers / GameMaker Objects / Legacy-Prototypes / Debug
  Terrain Hosts: Shared / THZ / GPZ / MGHZ / SEZ
Rooms/Sonic Chaos
  Shared / THZ / GPZ / MGHZ / SEZ / Debug
Existing upstream and character categories: retained
```

Only populated categories from the approved CSV exist; the abbreviated tree is not a promise of every subcategory under every zone. The CSV remains the exact path authority, including its Shared placement for names that do not carry an explicit zone. `GameMaker Objects` describes actual registered GMObject resources; scripts/structs can implement ROM object systems without any matching GameMaker object. Asset Browser organization is not a ROM-object census.

## GameMaker validation

James confirmed Windows acceptance on 7 October 2026: opened the cleaned project in GameMaker, inspected the Asset Browser, compiled successfully and confirmed the project appears fine.

Standalone Igor successfully loaded and linked the migrated project. It then failed before GML compilation with the known `GMAssetCompiler.dll` permission error (compiler status -1; wrapper's recorded exit 1). No permissions were modified. Logs: `build/hygiene/compile/compile.log`, `compile.exit`. This is not a successful compile/build.

Phase 1 is accepted by James. Phase 2 character/legacy cleanup has not started.

## Exact added folder declarations

- `folders/Objects/Sonic Chaos.yy`
- `folders/Objects/Sonic Chaos/Controllers.yy`
- `folders/Objects/Sonic Chaos/Debug.yy`
- `folders/Objects/Sonic Chaos/GameMaker Objects.yy`
- `folders/Objects/Sonic Chaos/Legacy-Prototypes.yy`
- `folders/Objects/Sonic Chaos/Terrain Hosts.yy`
- `folders/Objects/Sonic Chaos/Terrain Hosts/GPZ.yy`
- `folders/Objects/Sonic Chaos/Terrain Hosts/MGHZ.yy`
- `folders/Objects/Sonic Chaos/Terrain Hosts/SEZ.yy`
- `folders/Objects/Sonic Chaos/Terrain Hosts/Shared.yy`
- `folders/Objects/Sonic Chaos/Terrain Hosts/THZ.yy`
- `folders/Rooms/Sonic Chaos.yy`
- `folders/Rooms/Sonic Chaos/Debug.yy`
- `folders/Rooms/Sonic Chaos/GPZ.yy`
- `folders/Rooms/Sonic Chaos/MGHZ.yy`
- `folders/Rooms/Sonic Chaos/SEZ.yy`
- `folders/Rooms/Sonic Chaos/THZ.yy`
- `folders/Scripts/Sonic Chaos.yy`
- `folders/Scripts/Sonic Chaos/Core.yy`
- `folders/Scripts/Sonic Chaos/Debug.yy`
- `folders/Scripts/Sonic Chaos/GPZ.yy`
- `folders/Scripts/Sonic Chaos/GPZ/Data.yy`
- `folders/Scripts/Sonic Chaos/GPZ/Runtime.yy`
- `folders/Scripts/Sonic Chaos/Level-Import.yy`
- `folders/Scripts/Sonic Chaos/MGHZ.yy`
- `folders/Scripts/Sonic Chaos/MGHZ/Data.yy`
- `folders/Scripts/Sonic Chaos/MGHZ/Runtime.yy`
- `folders/Scripts/Sonic Chaos/Player-Collision.yy`
- `folders/Scripts/Sonic Chaos/SEZ.yy`
- `folders/Scripts/Sonic Chaos/SEZ/Data.yy`
- `folders/Scripts/Sonic Chaos/SEZ/Runtime.yy`
- `folders/Scripts/Sonic Chaos/Shared Objects.yy`
- `folders/Scripts/Sonic Chaos/THZ.yy`
- `folders/Scripts/Sonic Chaos/THZ/Data.yy`
- `folders/Scripts/Sonic Chaos/THZ/Runtime.yy`
- `folders/Sprites/Sonic Chaos.yy`
- `folders/Sprites/Sonic Chaos/GPZ.yy`
- `folders/Sprites/Sonic Chaos/GPZ/Bosses.yy`
- `folders/Sprites/Sonic Chaos/GPZ/Effects.yy`
- `folders/Sprites/Sonic Chaos/GPZ/Enemies.yy`
- `folders/Sprites/Sonic Chaos/GPZ/Objects.yy`
- `folders/Sprites/Sonic Chaos/GPZ/Terrain.yy`
- `folders/Sprites/Sonic Chaos/MGHZ.yy`
- `folders/Sprites/Sonic Chaos/MGHZ/Bosses.yy`
- `folders/Sprites/Sonic Chaos/MGHZ/Effects.yy`
- `folders/Sprites/Sonic Chaos/MGHZ/Enemies.yy`
- `folders/Sprites/Sonic Chaos/MGHZ/Objects.yy`
- `folders/Sprites/Sonic Chaos/MGHZ/Terrain.yy`
- `folders/Sprites/Sonic Chaos/SEZ.yy`
- `folders/Sprites/Sonic Chaos/SEZ/Bosses.yy`
- `folders/Sprites/Sonic Chaos/SEZ/Effects.yy`
- `folders/Sprites/Sonic Chaos/SEZ/Enemies.yy`
- `folders/Sprites/Sonic Chaos/SEZ/Objects.yy`
- `folders/Sprites/Sonic Chaos/SEZ/Terrain.yy`
- `folders/Sprites/Sonic Chaos/Shared.yy`
- `folders/Sprites/Sonic Chaos/Shared/Effects.yy`
- `folders/Sprites/Sonic Chaos/Shared/Enemies.yy`
- `folders/Sprites/Sonic Chaos/Shared/Legacy-Prototypes.yy`
- `folders/Sprites/Sonic Chaos/Shared/Legacy-Prototypes/Collision Helpers.yy`
- `folders/Sprites/Sonic Chaos/Shared/Objects.yy`
- `folders/Sprites/Sonic Chaos/Shared/Player.yy`
- `folders/Sprites/Sonic Chaos/Shared/Terrain.yy`
- `folders/Sprites/Sonic Chaos/THZ.yy`
- `folders/Sprites/Sonic Chaos/THZ/Bosses.yy`
- `folders/Sprites/Sonic Chaos/THZ/Effects.yy`
- `folders/Sprites/Sonic Chaos/THZ/Terrain.yy`
