"""Mirror the Research player attack / badnik cache (28485aa) into the POC (trimmed). Usage: python verification/make_attack_badnik_data.py [research json]"""
import hashlib, json, sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
src = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / "sonic-chaos-reference-work" / "data" / "rom-cache" / "player-attack-badnik.json"
raw = src.read_bytes(); d = json.loads(raw)
drop = {"routines", "sites", "evidence_classes", "natural_timelines", "contact_trials", "setter_effects", "d503_model", "d532_model", "power_up_controlled", "update_order", "frame_event_order"}
out = {"source": "sonic-chaos-reference-work data/rom-cache/player-attack-badnik.json @ 28485aa", "source_sha256": hashlib.sha256(raw).hexdigest(),
       "trimmed": "routines, sites, evidence_classes, natural_timelines, contact_trials, setter_effects, d503_model, d532_model, power_up_controlled, update_order and frame_event_order omitted"}
out.update({k: v for k, v in d.items() if k not in drop})
(root / "POC_notes/rom-cache/player-attack-badnik.json").write_text(json.dumps(out, indent=1) + "\n")
print("ok", out["source_sha256"])
