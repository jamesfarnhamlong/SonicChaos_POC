"""Check imported boss mappings against the Research composition metadata and PNG export."""
import hashlib
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
research = root.parent / 'sonic-chaos-reference-work'
cache = json.loads((root / 'POC_notes/rom-cache/thz3/object-50.json').read_text())
assets = json.loads((root / 'POC_notes/rom-cache/thz3/boss-sprite-assets.json').read_text())['assets']
export = research / 'build/thz3-boss-support'
checks = 0
palette = cache['graphics']['palette']
old_colors = {((value & 3) * 85, ((value >> 2) & 3) * 85, ((value >> 4) & 3) * 85, 255)
              for value in (int(palette['differs_at_colors'][str(index)]['boss_palette_0C'], 16) for index in (13, 14))}

for item in assets:
    png = root / 'sprites' / item['sprite'] / (item['frame'] + '.png')
    raw = png.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == item['sha256'], item
    sprite = json.loads((root / 'sprites' / item['sprite'] / (item['sprite'] + '.yy')).read_text())
    with Image.open(png) as image:
        image = image.convert('RGBA')
        assert image.size == (sprite['width'], sprite['height']), png
        if item['sprite'].startswith('SPR_chaos_boss_50'):
            frame = int(item['source'].split('frame')[1].split('.')[0])
            orientation = 'mirrored' if 'mirror' in item['sprite'] else 'normal'
            composed = cache['graphics']['composed_frame_hashes'][f'frame_{frame}_{orientation}']
            assert image.size == (composed['width'], composed['height']), png
            assert sum(pixel[3] > 0 for pixel in image.get_flattened_data()) == composed['opaque_pixels'], png
            assert (sprite['sequence']['xorigin'], sprite['sequence']['yorigin']) == (20, 48), png
            # Mapping envelope is -48..-1. The first frame's transparent top rows
            # remain transparent after import; the shared ROM registration adds +18.
            if frame == 1:
                assert image.getchannel('A').getbbox() == (0, 9, 40, 48), png
            checks += 4
        source = export / item['source']
        if source.exists():
            with Image.open(source) as reference:
                reference = reference.convert('RGBA')
                canvas = Image.new('RGBA', image.size)
                canvas.alpha_composite(reference, ((image.width - reference.width) // 2, image.height - reference.height))
                if item.get('palette_flash'):
                    for y in range(canvas.height):
                        for x in range(canvas.width):
                            if canvas.getpixel((x, y)) in old_colors:
                                canvas.putpixel((x, y), (255, 255, 255, 255))
                assert image.tobytes() == canvas.tobytes(), source
            checks += 1
    checks += 2

print(f'THZ3 BOSS ASSET CHECKS PASSED ({checks} assertions; ROM export pixels preserved)')
