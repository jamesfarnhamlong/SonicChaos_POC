"""One-shot, assertion-guarded mechanical migration of a copied v14 project."""
import json, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(rel,old,new):
    p=root/rel;s=p.read_text();assert old in s,(rel,old[:90]);p.write_text(s.replace(old,new))
adapter=root/'scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'
original=(root/'objects/OBJ_player_char/Step_0.gml').read_text()
damage=original[original.index('/// Deaths\n'):]
adapter.write_text(adapter.read_text()+'\nfunction SCR_chaos_sample_damage() {\n'+damage+'\n}\n')
for obj in ['OBJ_player_char','OBJ_player_char_spin']:
    edit(f'objects/{obj}/Step_0.gml','if (room == ROM_chaos_thz1 && SCR_chaos_player_begin(id)) exit;',
        'if (room == ROM_chaos_thz1) { SCR_chaos_adapter_step(id); exit; }')
    edit(f'objects/{obj}/Step_2.gml','if (room == ROM_chaos_thz1 && SCR_chaos_player_end(id)) exit;',
        'if (room == ROM_chaos_thz1) { SCR_chaos_adapter_end(id); exit; }')
    edit(f'objects/{obj}/Create_0.gml','if (room == ROM_chaos_thz1) SCR_chaos_player_init(id);',
        'if (room == ROM_chaos_thz1) { SCR_chaos_player_init(id); SCR_chaos_core_attach(id); }')
edit('scripts/SCR_physics_jump_objects/SCR_physics_jump_objects.gml',
    'function SCR_physics_jump_objects() {',
    'function SCR_physics_jump_objects() {\n    if (room == ROM_chaos_thz1 && variable_instance_exists(id,"chaosCore")) { chaosQueuedBounce = true; return; }')
for obj in ['OBJ_chaos_spring_48','OBJ_chaos_spring_49','OBJ_chaos_spring_51','OBJ_chaos_spring_54','OBJ_chaos_spring_56']:
    p=root/f'objects/{obj}/Step_0.gml'
    p.write_text('// 14.5: terrain spring contact and impulse now dispatch exclusively in SCR_chaos_core.\n'
                 '// This instance retains its map sprite only; no overlapping bbox launch.\n')
for kind in ['normal','weak']:
    p=root/f'objects/OBJ_chaos_object_spring_26_{kind}/Step_0.gml'
    p.write_text('''// Object $26 remains a provisional adapter, separate from decoded terrain springs.
if (cooldown > 0) cooldown--;
if (cooldown == 0 && instance_exists(OBJ_player_char)) {
    var cp_p = instance_nearest(x+16,y+16,OBJ_player_char);
    if (cp_p.bbox_right >= x-2 && cp_p.bbox_left <= x+33 &&
        cp_p.bbox_bottom >= y-2 && cp_p.bbox_top <= y+31) {
        if (SCR_chaos_object_spring(cp_p,launch_y)) {
            cooldown = 20;
            if (global.music == 1) audio_play_sound(SFX_sonic_spring,10,false);
        }
    }
}
''')
# Delete superseded v14 terrain projection and End Step integration, keeping object adapters.
p=root/'scripts/SCR_chaos_motion/SCR_chaos_motion.gml';s=p.read_text()
s=s[s.index('// Chaos v08:'):]
start=s.index('function SCR_chaos_player_end(');end=s.index('// One grounded probe',start)
s=s[:start]+s[end:]
s=s.replace('SCR_chaos_rom_lookup(', 'SCR_cc_lookup(')
needle='    var cp_cam = view_camera[0];'
assert needle in s
s=s.replace(needle,'''    // Debug teleport is explicit placement: reset both fixed-point coordinates and contacts.
    if (variable_instance_exists(cp_p,"chaosCore")) {
        var cp_c = cp_p.chaosCore;
        cp_c.xu = round(cp_px*256); cp_c.yu = round((cp_py-cp_p.chaosAnchorOffset)*256);
        cp_c.vx = round(cp_vx*256); cp_c.vy = 0; cp_c.move = 0;
        cp_c.state = 5; cp_c.next = 5; cp_c.bg = 0; cp_c.contacts = 0;
        cp_c.modifier = 0; cp_c.plane = cp_p.chaosPlane;
        cp_c.previous = SCR_cc_lookup(cp_px,cp_c.yu/256+18,cp_c.plane).flags;
    }
'''+needle)
p.write_text(s)
# Initializer still passes an explicit plane, as required by the pure lookup.
edit('objects/OBJ_chaos_controls/Draw_0.gml','THZ v14 |','THZ v14.5 |')
edit('objects/OBJ_chaos_controls/Draw_0.gml','var footy = p.bbox_bottom;',
     'var footy = variable_instance_exists(p,"chaosCore") ? p.chaosCore.yu/256+18 : p.bbox_bottom;')
edit('objects/OBJ_chaos_controls/Draw_0.gml',
     '" speed="+string_format(p.hspeed,1,1)+","+string_format(p.vspeed,1,1)',
     '" speed="+string_format(variable_instance_exists(p,"chaosCore") ? p.chaosCore.vx/256 : p.hspeed,1,2)+","+string_format(variable_instance_exists(p,"chaosCore") ? p.chaosCore.vy/256 : p.vspeed,1,2)')
edit('objects/OBJ_chaos_controls/Draw_0.gml','" state="+string(p.chaosMotionState)',
     '" state="+string(p.chaosMotionState)+(variable_instance_exists(p,"chaosCore") ? " ->"+string(p.chaosCore.next)+" flags="+string(p.chaosCore.contacts)+" unported="+string(p.chaosCore.unsupported) : "")')
# Correct the data length, not only the bounds check.
p=root/'scripts/SCR_chaos_motion_data/SCR_chaos_motion_data.gml';s=p.read_text()
m=re.search(r'global\.chaosTileIds = (\[[^;]+\]);',s);tiles=json.loads(m[1]);assert len(tiles)==4096
s=s[:m.start(1)]+json.dumps(tiles[:4095],separators=(',',':'))+s[m.end(1):];p.write_text(s)
# Register new resources in BOTH project entry points.
template=json.loads((root/'scripts/SCR_chaos_motion/SCR_chaos_motion.yy').read_text())
names=['SCR_chaos_core','SCR_chaos_core_data','SCR_chaos_adapter']
for name in names:
    resource=dict(template);resource['name']=resource['%Name']=name
    (root/f'scripts/{name}/{name}.yy').write_text(json.dumps(resource,indent=2)+'\n')
for p in root.glob('*.yyp'):
    s=p.read_text();needle='"resources": ['
    if needle not in s:needle='"resources":['
    assert needle in s,p
    rows='\n'+''.join('    '+json.dumps({'id':{'name':n,'path':f'scripts/{n}/{n}.yy'}})+',\n' for n in names)
    p.write_text(s.replace(needle,needle+rows,1))
print('14.5 integration applied; original v14 was not modified.')
