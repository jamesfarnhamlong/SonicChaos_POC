"""Remove the obsolete room-authored THZ1 terrain-ring instances once."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROOM = ROOT / "rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy"


def gm_json(text):
    return json.loads(re.sub(r",\s*([}\]])", r"\1", text))


def room_rings(data):
    return [
        instance
        for layer in data["layers"]
        for instance in layer.get("instances", [])
        if instance["objectId"]["name"] == "OBJ_ring"
    ]


def remove_instance_object(text, instance_name):
    marker = re.search(
        rf'"%Name"\s*:\s*"{re.escape(instance_name)}"', text
    )
    assert marker, instance_name
    start = text.rfind("{", 0, marker.start())
    assert start >= 0
    depth = 0
    in_string = False
    escaped = False
    end = None
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    assert end is not None
    line_start = text.rfind("\n", 0, start) + 1
    cursor = end
    while cursor < len(text) and text[cursor] in " \t":
        cursor += 1
    if cursor < len(text) and text[cursor] == ",":
        cursor += 1
    if cursor < len(text) and text[cursor] == "\r":
        cursor += 1
    if cursor < len(text) and text[cursor] == "\n":
        cursor += 1
    return text[:line_start] + text[cursor:]


def main():
    text = ROOM.read_text()
    data = gm_json(text)
    rings = room_rings(data)
    if not rings:
        print("THZ1 room already contains zero OBJ_ring instances")
        return
    assert len(rings) == 142, len(rings)
    names = {ring["name"] for ring in rings}

    order_pattern = re.compile(
        r'^[ \t]*\{\s*"name"\s*:\s*"(' +
        "|".join(re.escape(name) for name in sorted(names)) +
        r')"\s*,\s*"path"\s*:\s*"rooms/ROM_chaos_thz1/ROM_chaos_thz1\.yy"\s*\}\s*,?\r?\n',
        re.MULTILINE,
    )
    text, removed_order = order_pattern.subn("", text)
    assert removed_order == 142, removed_order
    for name in names:
        text = remove_instance_object(text, name)

    converted = gm_json(text)
    assert not room_rings(converted)
    remaining_order = {row["name"] for row in converted["instanceCreationOrder"]}
    assert names.isdisjoint(remaining_order)
    ROOM.write_text(text)
    print("removed 142 room-authored OBJ_ring instances and creation-order entries")


if __name__ == "__main__":
    main()
