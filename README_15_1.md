# Windows Act 1 POC 15.1 — canon layout pass

POC 15.1 makes placement provenance enforceable and adds no graphics.

## Corrections

- Removed the five Open Sonic sample badniks. Their positions were deliberately
  provisional and do not correspond to decoded Chaos object records.
- Removed the fabricated yellow finish sign. The ROM has an undecoded type `$18`
  record at `(3960,558)`; the POC will not draw a replacement until that object is
  identified.
- Restored object `$26` initialization: its runtime anchor moves 12 pixels down
  from the object-stream coordinate before extension and retraction. The fixed
  spring contact window now follows the original object-Y-minus-28 comparison.
  This fixes the activated weak spring appearing too high beside the lower-route
  moving spike.

The weak spring record at `(1912,864)` and moving-spike record at `(1936,864)`
are both present in the original object stream. Their adjacency is canonical;
the spring is normally concealed.

## ROM-specific cache

`POC_notes/rom-cache/` contains metadata only: all 53 THZ1 object records, the
interaction-bearing layout cells, their source offsets, and the required ROM
hash. It includes no ROM, graphics, palette, or audio bytes. Only decoded object
types `$1B`, `$26`, and `$28` receive names. Unknown types are not instantiated.

Run the placement audit from the project root:

```text
python verification/verify_v151_layout.py
```

The audit checks all nine terrain springs, four concealed springs, four moving
spikes, six platforms, 142 rings, and four ring monitors against the cache. It
also rejects sample badniks, the fake finish sign, and a missing `$26` anchor
shift.

Physics and player animation are otherwise unchanged from POC 15.
