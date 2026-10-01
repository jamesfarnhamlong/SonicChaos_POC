"""Mirror the Research spring-interaction cache (198b959) into the POC (trimmed). Usage: python verification/make_spring_data.py [research json]"""
import hashlib, json, sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
src = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / "sonic-chaos-reference-work" / "data" / "rom-cache" / "spring-interaction.json"
raw = src.read_bytes(); d = json.loads(raw)
drop = {"routines", "state_reach", "terrain_handler_table", "evidence_classes"}
out = {"source": "sonic-chaos-reference-work data/rom-cache/spring-interaction.json @ 198b959", "source_sha256": hashlib.sha256(raw).hexdigest(),
       "trimmed": "routines, terrain_handler_table, state_reach and evidence_classes omitted; every fixture the POC checks is kept"}
out.update({k: v for k, v in d.items() if k not in drop})
(root / "POC_notes/rom-cache/spring-interaction.json").write_text(json.dumps(out, indent=1) + "\n")
print("ok", out["source_sha256"])
