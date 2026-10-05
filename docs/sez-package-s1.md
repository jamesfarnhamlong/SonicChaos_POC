# SEZ S1 foundation — Windows acceptance pending

Research main `a20082675cdfc25289b9dd7fe49440c55877c14d`; accepted POC base
`472c7b97644b15f0785653653f30020d34eb63a7`. Work is deliberately uncommitted.

Open `SonicChaos_POC.yyp` in GameMaker LTS2026. F10 at the title screen or
unpaused gameplay opens the selector; Sleeping Egg acts 1, 2 and 3 are enabled.
R restarts an act. Debug launches suppress save/progression writes.

The importer regenerates terrain, layouts, both collision-header planes, palettes,
terrain rings, effect-5 overlays and shared art from the verified Europe v1.2 ROM.
It checks Research main, all block mappings/pixel hashes and the entire approved
visual contract. No stale SEZ exports or authored placements are used. The mapping
formula remains `bank * 0x4000 + CPU pointer - 0x8000`; SEZ's table is $2A40
bytes into its bank and cannot use table-relative conversion.

Each act is 128×32 / 4096×1024. Only cells 0..4094 are loaded/rendered/collidable;
index 4095 is an unloaded sentinel. Ring quadrants total 54/180/42. Ring uploads
use tiles $14D..$150 every eight updates. Effect 5 alternates tile $158 every
three unpaused updates, retaining the initial VRAM image until the first upload.
Its absolute phase against the SMS global clock remains unresolved. The pure
effect helper supports boss/dispatcher pause; S1 has no active SEZ boss.

S1 enables mapped $26 (including $88/$8C spans), terrain springs, monitors
$10 parameters 1/2/4/6, Rocket Shoes, Spring Shoes with SEZ base $94/palette $08,
$1B moving spikes, $28 parameters $83/$84, breakable surface $0D, ramp $12,
block $47 and floor spike $3D. SEZ1/2 use the accepted sign/child/state-$20 chain
and the THZ-parity prize table $A919, through the existing completion overlay.
SEZ3 has four supported placements and no sign or completion route in S1.

Canonical anchors and collision profiles are unchanged. The accepted post-wake
horizontal retention adapter is reused for manifest-proven generic EDGE objects
($10/$26/$1B/$28/$2F); it reduces to canonical bands at width 256, does not extend
vertical bands and does not change initial create/wake. Deleted placement shells
reset the physics/phase on recreation. $83's accepted consumed-platform rule stays
in force. The spring cap/coil and spike reveal presentation remain the accepted
GameMaker adapters, with SEZ-colored ROM art. This is not an SMS slot interpreter.

Pending runtime is explicitly disabled/countable: surfaces $0C and $1A retain
their decoded geometry/art but perform no speculative crumble/boost action;
type $13, platforms $28/$86 and $28/$04, enemies $20/$23 and boss $54/$55 are not
created. Their absent hazards/support can make a route easier or incomplete.
Effect 5 still animates $A7 without enabling its pending booster behavior.
Shared support/effect art is imported under SEZ CRAM. Breakable destruction uses
the accepted immediate cell-replacement adapter; four fragment simulation remains
the pre-existing shared POC omission (approved shard art is imported, no substitute
physics added). The shared monitor push/pull issue and parked player presentation
issues remain deferred as required by the project instructions.

Validation:

- 326,149 S1 shipped-GML assertions: all loader cells/lookup quadrant boundaries,
  headers, placements, exclusions, sign/child events, effect pause/cadence and
  viewport retention at 256/348/640 px.
- 14,547 asset assertions: 170 canonical block records, every loaded backdrop cell,
  foreground priority pixels, four ring frames, effect-5 frames and approved art.
- 34 Research tests / 15,938 ROM-backed sweep checks, no skipped tests.
- Accepted THZ/GPZ/MGHZ regression inventory included at this batch checkpoint.
- 42/42 batch commands passed; four isolated control hosts/source locks were
  extended to recognize the SEZ selector without changing their ROM expectations.
- Fresh extraction is checked byte-for-byte and runs the focused GML checks.
- ROM SHA-256 verified: `eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607`.

Standalone Igor loads/links the source project but fails before GML compilation
with `GMAssetCompiler.dll` permission status -1. Its wrapper exit code is not
compile evidence. No GameMaker IDE was running in this execution session;
source and extracted-package IDE compile/launch remain James's acceptance gate.
The package report records each compile attempt separately.

Suggested Windows pass: verify all three starts and palettes, breakables and rings
on low/high routes, fixed/span springs, Rocket and Spring Shoes (including sign
wake conversion), $83/$84 support and moving spikes, sign clear in acts 1/2,
F10/R reset after footwear/clear, and scroll/backtrack retention at wide view.
Do not accept the missing S2–S5 mechanics as faithful behavior.

No new discrepancy requiring Research was found. The known excluded mechanics,
results presentation, effect absolute phase and shared adapter limitations stay
pending. Root AGENTS.md is untouched; candidate update after Windows acceptance:
SEZ S1 adds three F10 acts from canonical `a200826`, with the 4095-cell ceiling,
$94 shoes and explicit S2–S5 runtime exclusions.

Reproduction (local ROM only): use the bundled Python with Pillow plus the Research
venv's site-packages on PYTHONPATH, run `POC_notes/generate_sez_foundation.py
--research ../sonic-chaos-reference-work --rom "../source/Sonic Chaos (Europe).sms"`,
then `verification/run_sez_s1_checks.py`. The source ZIP excludes ROMs, backups,
build debris, unrelated untracked diagnostics, and contains one project folder
with exactly one .yyp.
