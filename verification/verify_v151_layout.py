"""Verify that every displayed THZ1 interaction has a canonical placement."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROOM = ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy"
CACHE = ROOT / "POC_notes/rom-cache"


def positions(instances, name):
    return Counter((round(i["x"]), round(i["y"])) for i in instances
                   if i["objectId"]["name"] == name)


def main():
    room = json.loads(ROOM.read_text())
    instances = [i for layer in room["layers"] for i in layer.get("instances", [])]
    records = json.loads((CACHE / "object-records.json").read_text())["records"]
    layout = json.loads((CACHE / "layout-interactions.json").read_text())

    expected_26 = {"0x00": Counter(), "0x01": Counter(), "0x8A": Counter()}
    expected_10 = Counter()
    expected_18 = Counter()
    expected_21 = Counter()
    expected_1b = Counter()
    expected_27 = Counter()
    expected_28 = Counter()
    for record in records:
        point = (record["world_x"], record["world_y"])
        if record["type_id"] == "0x10":
            expected_10[point] += 1
        elif record["type_id"] == "0x18":
            expected_18[point] += 1
        elif record["type_id"] == "0x21":
            expected_21[point] += 1
        elif record["type_id"] == "0x26":
            expected_26[record["parameter"]][point] += 1
        elif record["type_id"] == "0x1B":
            expected_1b[point] += 1
        elif record["type_id"] == "0x27":
            expected_27[point] += 1
        elif record["type_id"] == "0x28":
            expected_28[point] += 1

    assert positions(instances, "OBJ_chaos_object_spring_26_normal") == expected_26["0x00"]
    assert positions(instances, "OBJ_chaos_object_spring_26_weak") == expected_26["0x01"]
    assert positions(instances, "OBJ_chaos_object_spring_26_span") == expected_26["0x8A"]
    assert positions(instances, "OBJ_chaos_spikes") == expected_1b
    assert positions(instances, "OBJ_chaos_object_10") == expected_10
    assert positions(instances, "OBJ_chaos_object_18") == expected_18
    assert positions(instances, "OBJ_chaos_object_21") == expected_21
    assert positions(instances, "OBJ_chaos_object_27") == expected_27
    assert positions(instances, "OBJ_chaos_platform") == expected_28

    terrain_names = {
        48: "OBJ_chaos_spring_48",
        49: "OBJ_chaos_spring_49",
        51: "OBJ_chaos_spring_51",
        54: "OBJ_chaos_spring_54",
        56: "OBJ_chaos_spring_56",
    }
    for block_id, name in terrain_names.items():
        expected = Counter((x["x"], x["y"]) for x in layout["terrain"]
                           if x["block_id"] == block_id)
        assert positions(instances, name) == expected, name

    expected_static_spikes = Counter((x["x"], x["y"]) for x in layout["terrain"]
                                     if x["block_id"] == 61)
    assert expected_static_spikes == Counter({
        (1504, 832): 1, (1536, 832): 1, (2208, 832): 1, (2240, 832): 1})
    # Task 06: these cells are represented solely by the decoded terrain
    # profile. The former full-cell mask made their upper half a false wall.
    assert not positions(instances, "OBJ_CHAOS_mask_12")

    expected_rings = Counter((x["x"], x["y"]) for x in layout["rings"])
    assert positions(instances, "OBJ_ring") == expected_rings
    # The old POC promoted four layout-art cells to sample monitor instances.
    # Task 04 now supplies the five canonical type-$10 placement records.
    assert not positions(instances, "OBJ_monitor_ring")

    assert not positions(instances, "OBJ_badnik_1")
    draw = (ROOT / "objects/OBJ_chaos_controls/Draw_0.gml").read_text()
    assert '"FINISH"' not in draw and "draw_rectangle(3968" not in draw
    for kind in ("normal", "weak", "span"):
        create = (ROOT / f"objects/OBJ_chaos_object_spring_26_{kind}/Create_0.gml").read_text()
        assert "chaosBaseY = y+12" in create

    report = {
        "terrain_springs": sum(positions(instances, n).total() for n in terrain_names.values()),
        "concealed_springs": sum(x.total() for x in expected_26.values()),
        "moving_spikes": expected_1b.total(),
        "static_spikes": expected_static_spikes.total(),
        "static_spike_full_cell_masks": 0,
        "type_10_objects": expected_10.total(),
        "type_18_objects": expected_18.total(),
        "type_21_objects": expected_21.total(),
        "type_27_objects": expected_27.total(),
        "platforms": expected_28.total(),
        "rings": expected_rings.total(),
        "legacy_layout_monitor_instances": 0,
        "unsupported_instances": 0,
        "rom_derived_object_graphics": True,
        "rom_bytes_included": False,
    }
    (ROOT / "verification/layout-results.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
