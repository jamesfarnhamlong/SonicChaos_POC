# GameMaker hygiene Phase 2: intentionally retained character sprites

**Windows/IDE accepted** on `chore/gamemaker-project-hygiene`.
Baseline: accepted Phase 1 `7119b8f81848d853abd5ad735c1b9b6103796a5a`.

These resources are intentionally preserved for possible future character work.
Their presence, upstream sprite-selector wiring, and folder labels do **not**
mean Tails, Knuckles or Super Sonic are supported by the current Sonic Chaos POC.
This change adds no playable-character behavior.

## Resource changes

Re-parented all **71** optional retained-character sprites identified by the audit.
All names, existing character parents and upstream selector references agree on
their identities. All 71 are also registered in the retained upstream
`sms_project_backup.yyp`. No candidate was ambiguous; none was left behind.

| Category | Sprites | Composition |
|---|---:|---|
| Knuckles | 30 | 16 normal / 14 super |
| Tails | 29 | 15 normal / 14 super |
| Super Sonic | 12 | Super-form sprites |

Every changed resource differs only in its top-level `parent`. The exact mapping
is `verification/retained_character_parents.csv`. Normal and super forms of Tails
and Knuckles share a retained-character folder to avoid unnecessary nesting;
their existing resource names still identify the forms.

The 390-resource Phase 1 Chaos organization is unchanged, including its five
unusual-animation sprite records. Existing normal Sonic sprites remain in their
current folder; the Chaos-specific state-11 sprite remains in its Phase 1 Shared
Player folder. No empty `Characters/Sonic` or `Other/Legacy` categories were added.
Other upstream character-related icons, masks, powers, scripts, objects and
timelines are outside this 71-sprite migration and remain untouched.

## Virtual folders

Added exactly five virtual declarations inside `.yyp`:

- `folders/Sprites/Characters.yy`
- `folders/Sprites/Characters/Future-Retained.yy`
- `folders/Sprites/Characters/Future-Retained/Knuckles.yy`
- `folders/Sprites/Characters/Future-Retained/Tails.yy`
- `folders/Sprites/Characters/Future-Retained/Super Sonic.yy`

Every new folder has a populated subtree. Folder count is **161**, from 156 after
Phase 1. The non-folder registration set remains **706**. No folder was removed,
no existing folder was relabelled, and no physical resource path changed.

All 90 original upstream folder declarations were reviewed. Their classification,
direct/descendant resource counts and reasons are recorded in
`verification/hygiene_phase2_folder_review.csv`:

| Classification | Folders | Action |
|---|---:|---|
| Clearly useful upstream structure | 76 | Retain |
| Intentionally future-facing structure | 7 | Retain |
| Empty but harmless | 5 | Retain |
| Ambiguous historical label | 2 | Retain |
| Demonstrably obsolete/duplicate | 0 | No removal candidate established |

The five harmless empty type placeholders are **Extensions, Fonts, Paths,
Sequences, Shaders**. They preserve conventional engine resource-type structure;
removing them offers no material clarity benefit.

Seven character folders now have empty subtrees: `Sprites/Player/Knuckles` and
its `Normal`/`Super` children, `Sprites/Player/Tails` and its `Normal`/`Super`
children, and `Sprites/Player/Sonic/Super`. These are deliberately retained
upstream character-folder skeletons for provenance and possible future engine
work. The populated Future-Retained folders identify where this POC now keeps
the actual alternative-character sprites. Do not infer asset deletion from the
old folders being empty.

The two `Chao Emeralds` labels remain ambiguous historical spelling, with
populated sprite/object resources; no rename is part of character scope.
`Sprites/tilesets` holds source sprite art while `Tile Sets` holds the actual
tile-set resource, so these are useful distinct categories rather than duplicate
folders. Sparse Badniks/Collisions folders remain useful upstream structure.
All 66 Phase 1 additions are preserved without alteration.

## Generator ownership

No current ROM importer/generator was found producing these 71 sprites or
emitting their former character-parent paths. Their upstream descriptor
registrations and selector scripts establish retained engine provenance, rather
than Chaos ROM-generated ownership. Generic project/package copies are copies
of existing resources, not independent sprite generators.

**Generators touched: none.** Phase 1's generator sources, helper and parent
authority remain identical to accepted Phase 1. No paired generator rerun is
required for a newly generated retained-character family because none was
identified. The existing isolated Phase 1 regenerated copy was checked again
with the hygiene verifier and its approved Chaos parents still pass. This is a
check of retained Phase 1 evidence, not a claim of a fresh generator rerun.

## Verification

The extended `verification/verify_project_hygiene.py` detects the Phase 2 manifest
and defaults to the accepted Phase 1 baseline. It checks registrations, parent
existence/names, duplicate names/paths, the exact 71-resource scope, physical file
paths, parsed parent-only resource differences, and `.yyp` equality except its
folder declarations. In Phase 2 it permits no generator changes and checks the
Phase 1 Chaos parent authority is unchanged. Existing Phase 1 mode remains
available when inspecting a project without the retained-character manifest.

- Hygiene verifier: **PASS** against accepted Phase 1.
- Registered non-folder resources and physical resource file set: **identical**.
- Phase 1 Chaos hierarchy: **unchanged**.
- Art, origins, bounding boxes, playback, frames, animation/sequence metadata,
  GML, events, room contents and runtime/gameplay data: **unchanged**.
- Complete accepted regression batch: **58/58 commands PASS**, freshly rerun for Phase 2. Logs and the full command inventory are in `build/sez-s5/`.
- `git diff --check`: **PASS** at the final review checkpoint.

James inspected the retained-character hierarchy in GameMaker and successfully
compiled/launched the project. Phase 2 is Windows/IDE accepted. No permissions
were changed.

## Before/after character tree

```text
BEFORE
Sprites/Player
  Sonic
    Normal                 [existing normal Sonic sprites]
    Super                  [12 sprites]
  Tails
    Normal                 [15 sprites]
    Super                  [14 sprites]
  Knuckles
    Normal                 [16 sprites]
    Super                  [14 sprites]

AFTER
Sprites/Characters/Future-Retained
  Tails                    [29 preserved sprites]
  Knuckles                 [30 preserved sprites]
  Super Sonic              [12 preserved sprites]
Sprites/Player
  Sonic/Normal             [unchanged]
  Sonic/Super              [empty upstream skeleton retained]
  Tails/Normal, Super      [empty upstream skeletons retained]
  Knuckles/Normal, Super   [empty upstream skeletons retained]
Sprites/Sonic Chaos       [entire Phase 1 organization unchanged]
```

No art was deleted and no dormant resource was labelled unused from a static
reference search. No playable-character work or broader engine cleanup started.

Final strong-invariant deviations: **none**. The asset verification suite rewrote
its tracked diagnostic `verification/mghz-m2/footwear-reference-sheet.png`; its
generated output was preserved in `build/hygiene-phase2/regression-side-output/`
and the tracked diagnostic was restored byte-for-byte from accepted Phase 1.
It is not part of the final change set. Original untracked GPZ diagnosis files
remain untouched. Phase 2 is accepted by James. No further cleanup or playable-character work has started.
