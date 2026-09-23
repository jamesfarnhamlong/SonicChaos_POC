"""Apply the POC 15.1 canon-only room cleanup deterministically."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROOM = ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy"


def main():
    room = json.loads(ROOM.read_text())
    removed = []
    for layer in room["layers"]:
        kept = []
        for instance in layer.get("instances", []):
            if instance["objectId"]["name"] == "OBJ_badnik_1":
                removed.append(instance["name"])
            else:
                kept.append(instance)
        if "instances" in layer:
            layer["instances"] = kept

    if len(removed) != 5:
        raise AssertionError(f"expected five provisional enemies, found {len(removed)}")
    removed_names = set(removed)
    room["instanceCreationOrder"] = [
        entry for entry in room["instanceCreationOrder"]
        if entry["name"] not in removed_names
    ]
    ROOM.write_text(json.dumps(room, indent=2) + "\n")
    print(f"removed {len(removed)} unsupported sample-enemy placements")


if __name__ == "__main__":
    main()
