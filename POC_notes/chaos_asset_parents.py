"""Approved Asset Browser parents; no gameplay, image or sequence policy."""
import csv
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PARENTS = {row['name']: row for row in csv.DictReader(
    (ROOT / 'verification/chaos_asset_parents.csv').open(encoding='utf-8'))}


def chaos_parent(name):
    path = PARENTS[name]['parent']
    return {'name': path.rsplit('/', 1)[1][:-3], 'path': path}


def set_chaos_parent(value):
    """Change only a resource's top-level parent, never nested metadata."""
    if isinstance(value, dict) and value.get('name') in PARENTS:
        if value.get('resourceType') in ('GMSprite', 'GMObject', 'GMScript', 'GMRoom'):
            value['parent'] = chaos_parent(value['name'])
    return value


def parent_text(text, name):
    """Keep template formatting/IDs intact when a writer uses text substitution."""
    text, count = re.subn(r'"parent"\s*:\s*\{[^{}]*\}',
                         '"parent": ' + json.dumps(chaos_parent(name)), text, count=1)
    if count != 1:
        raise ValueError('Expected one parent in resource template: ' + name)
    return text
