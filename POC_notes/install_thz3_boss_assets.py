"""Install Research's ROM-derived PNG export as deterministic GameMaker sprites.

Run the Research exporter with --png first, then pass that output directory here.
No ROM bytes or substitute artwork enter the POC repository.
"""
import copy
import hashlib
import json
import sys
import uuid
from pathlib import Path
from chaos_asset_parents import chaos_parent
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'sonic-chaos-reference-work/build/thz3-boss-support'
TEMPLATE = json.loads((ROOT / 'sprites/SPR_chaos_object_18/SPR_chaos_object_18.yy').read_text())
SETS = {
    'SPR_chaos_boss_50': ([f'boss_frame{i}.png' for i in range(1, 7)], 40, 48, 20, 48),
    'SPR_chaos_boss_50_mirror': ([f'boss_mirrored_frame{i}.png' for i in range(1, 5)], 40, 48, 20, 48),
    'SPR_chaos_boss_50_flash': ([f'boss_frame{i}.png' for i in range(1, 7)], 40, 48, 20, 48),
    'SPR_chaos_boss_50_mirror_flash': ([f'boss_mirrored_frame{i}.png' for i in range(1, 5)], 40, 48, 20, 48),
    'SPR_chaos_boss_puff_34': ([f'puff34_frame{i}.png' for i in range(1, 5)], 16, 16, 8, 16),
    'SPR_chaos_boss_sparkle_0A': ([f'sparkle0a_frame{i}.png' for i in (5, 6)], 16, 16, 8, 16),
    'SPR_chaos_boss_poof_0F': ([f'poof0f_frame{i}.png' for i in (7, 8, 9)], 16, 16, 8, 16),
}
assets = []
object50 = json.loads((ROOT / 'POC_notes/rom-cache/thz3/object-50.json').read_text())
palette = object50['graphics']['palette']
flash_rows = object50['controlled_execution']['palette_flash_command_7']['per_call_D48F_D490_step_counter']
assert flash_rows[3][:2] == [63, 63] and flash_rows[7][:2] == [53, 32]


def sms_rgba(value):
    return ((value & 3) * 85, ((value >> 2) & 3) * 85, ((value >> 4) & 3) * 85, 255)


def flash_palette(image):
    old = {sms_rgba(int(palette['differs_at_colors'][str(index)]['boss_palette_0C'], 16))
           for index in (13, 14)}
    white = sms_rgba(flash_rows[3][0])
    count = 0
    for y in range(image.height):
        for x in range(image.width):
            if image.getpixel((x, y)) in old:
                image.putpixel((x, y), white)
                count += 1
    assert count > 0, 'boss frame uses palette entries 13/14'
    return image


def guid(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'sonic-chaos-thz3-boss/' + key))


for name, (files, width, height, ox, oy) in SETS.items():
    sprite = copy.deepcopy(TEMPLATE)
    sprite['%Name'] = sprite['name'] = sprite['sequence']['%Name'] = sprite['sequence']['name'] = name
    sprite['width'] = width
    sprite['height'] = height
    sprite['bbox_left'] = sprite['bbox_top'] = 0
    sprite['bbox_right'] = width - 1
    sprite['bbox_bottom'] = height - 1
    sprite['sequence']['xorigin'] = ox
    sprite['sequence']['yorigin'] = oy
    sprite['sequence']['length'] = float(len(files))
    sprite['sequence']['playbackSpeed'] = 0.0
    sprite['parent'] = chaos_parent(name)
    layer = guid(name + '/layer')
    sprite['layers'][0]['%Name'] = sprite['layers'][0]['name'] = layer
    dest = ROOT / 'sprites' / name
    (dest / 'layers').mkdir(parents=True, exist_ok=True)
    sprite['frames'] = []
    keys = []
    for index, filename in enumerate(files):
        frame = guid(name + '/' + filename)
        img = Image.open(SOURCE / filename).convert('RGBA')
        assert img.width <= width and img.height <= height, filename
        canvas = Image.new('RGBA', (width, height))
        canvas.alpha_composite(img, ((width - img.width) // 2, height - img.height))
        if name.endswith('_flash'):
            flash_palette(canvas)
        (dest / 'layers' / frame).mkdir(parents=True, exist_ok=True)
        for path in (dest / (frame + '.png'), dest / 'layers' / frame / (layer + '.png')):
            canvas.save(path)
        assets.append({'sprite': name, 'source': filename, 'frame': frame,
                       'palette_flash': name.endswith('_flash'),
                       'sha256': hashlib.sha256((dest / (frame + '.png')).read_bytes()).hexdigest()})
        sprite['frames'].append({'$GMSpriteFrame': 'v1', '%Name': frame, 'name': frame,
                                 'resourceType': 'GMSpriteFrame', 'resourceVersion': '2.0'})
        key = copy.deepcopy(TEMPLATE['sequence']['tracks'][0]['keyframes']['Keyframes'][0])
        key['id'] = guid(name + '/key/' + str(index))
        key['Key'] = float(index)
        key['Channels']['0']['Id'] = {'name': frame, 'path': f'sprites/{name}/{name}.yy'}
        keys.append(key)
    sprite['sequence']['tracks'][0]['keyframes']['Keyframes'] = keys
    (dest / (name + '.yy')).write_text(json.dumps(sprite, indent=2) + '\n')
    print(name, len(files), 'ROM-derived frames')
(ROOT / 'POC_notes/rom-cache/thz3/boss-sprite-assets.json').write_text(json.dumps({'source_tool': 'tools/thz3_boss_support.py --png', 'assets': assets}, indent=2) + '\n')
