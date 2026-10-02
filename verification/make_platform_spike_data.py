"""Mirror the Research platform/spike collision cache (54cbd3a) into the POC (trimmed). Usage: python verification/make_platform_spike_data.py [research json]"""
import hashlib, json, sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
src = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / "sonic-chaos-reference-work" / "data" / "rom-cache" / "platform-spike-collision.json"
raw = src.read_bytes(); d = json.loads(raw)
drop = {"routines", "evidence_classes", "poc_comparison", "terrain_surface_classes", "damage_gate_48bc", "state_matrix"}
out = {"source": "sonic-chaos-reference-work data/rom-cache/platform-spike-collision.json @ 54cbd3a", "source_sha256": hashlib.sha256(raw).hexdigest(),
       "trimmed": "routines, evidence_classes, poc_comparison, terrain_surface_classes, damage_gate_48bc and state_matrix omitted; every fixture the POC checks is kept"}
out.update({k: v for k, v in d.items() if k not in drop})
(root / "POC_notes/rom-cache/platform-spike-collision.json").write_text(json.dumps(out, indent=1) + "\n")
print("ok", out["source_sha256"])
