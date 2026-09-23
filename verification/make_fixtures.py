"""Generate differential fixtures from original Z80 instructions, not a Python physics clone.
Usage: PYTHONPATH=<z80 deps> python make_fixtures.py ROM REFERENCE_ROOT
Writes fixtures.json and exports exact movement tables to the GameMaker script.
"""
import json, random, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(sys.argv[2]).resolve()/'tools'))
from rom import load, s16, SHA256
from oracle import Oracle
r = load(sys.argv[1]); rng = random.Random(145)
tables = [[[s16(int.from_bytes(r[a+i*4+j:a+i*4+j+2], 'little')) for j in (0,2)]
           for i in range(32)] for a in (0x429d,0x431d,0x439d,0x441d,0x449d,0x451d)]
mods = [s16(int.from_bytes(r[a:a+2], 'little')) for a in range(0x459d,0x45b3,2)]
angles = [b-256 if b >= 128 else b for b in r[0x200:0x300]]
twist_handlers = [[int.from_bytes(r[0x314fd+variant*56+i*2:0x314ff+variant*56+i*2], 'little')
                   for i in range(28)] for variant in range(4)]
out = HERE.parent/'scripts/SCR_chaos_core_data/SCR_chaos_core_data.gml'
out.parent.mkdir(exist_ok=True)
out.write_text('// Exported from checked SMS 1.2 ROM; see verification/make_fixtures.py\n'
    'function SCR_chaos_core_data() {\n    global.chaosMovementTables = '+json.dumps(tables)+';\n'
    '    global.chaosSurfaceDeltas = '+json.dumps(mods)+';\n'
    '    global.chaosAngleTable = '+json.dumps(angles)+';\n'
    '    global.chaosTwistHandlers = '+json.dumps(twist_handlers)+';\n}\n')

def put(o, c):
    for name,addr in [('xu',0xd510),('yu',0xd513)]:
        val=c.get(name,200*256);o.mem[addr:addr+3]=val.to_bytes(3,'little')
    for name,addr in [('vx',0xd516),('vy',0xd518),('maximum',0xd373),
                      ('input_delta',0xd375),('surface_delta',0xd377)]:
        o.word(addr,c.get(name,1024 if name=='maximum' else 0))
    for name,addr in [('state',0xd501),('next',0xd502),('move',0xd503),('bg',0xd522),
                      ('contacts',0xd523),('objects',0xd521),('support',0xd3c0),
                      ('player_flags',0xd504),('plane',0xd525),('previous',0xd36c),
                      ('modifier',0xd369),('water',0xd443),('held',0xd137),('pressed',0xd147)]:
        o.mem[addr]=c.get(name,5 if name in ('state','next') else 0)
    o.word(0xd174, (o.word(0xd511)-100)&65535)

def get(o, fields):
    vals={name:int.from_bytes(bytes(o.mem[addr:addr+3]),'little') for name,addr in [('xu',0xd510),('yu',0xd513)]}
    vals.update({name:s16(o.word(addr)) for name,addr in [('vx',0xd516),('vy',0xd518),('maximum',0xd373),('input_delta',0xd375),('surface_delta',0xd377)]})
    vals.update({name:o.mem[addr] for name,addr in [('state',0xd501),('next',0xd502),('move',0xd503),('bg',0xd522),('contacts',0xd523),('previous',0xd36c),('modifier',0xd369),('plane',0xd525)]})
    return {k:vals[k] for k in fields}

fixtures=[]
def case(name, c, addr, fields, args=None, extra=None):
    o=Oracle(r);put(o,c)
    if extra:
        for addr2,val in extra.items():o.mem[addr2]=val
    o.call(addr)
    fixtures.append(dict(fn=name,initial=c,args=args or [],expected=get(o,fields)))

for _ in range(1200):
    x=rng.randrange(-64,4200);y=rng.randrange(-40,1100);plane=rng.randrange(2)
    o=Oracle(r);s=o.collision_sample(x,y-18,plane=plane)
    fixtures.append(dict(fn='lookup',initial={},args=[x,y,plane],expected=dict(
        tile=s['tile'],flags=s['flags'],vertical=s['vertical'],horizontal=s['horizontal'],ax=s['x'],ay=s['y'])))
for kind,entry in [(9,0x6a75),(20,0x6a90)]:
 for tile in [48,49,54,56]:
  for state in [5,11,17,28]:
   for bg in [0,2]:
    for vy in [-256,0,1792]:
     c=dict(state=state,next=state,bg=bg,vy=vy,vx=128)
     case('spring',c,entry,['vx','vy','next','move','bg','maximum'],[kind,tile],{0xd36b:tile})

for _ in range(750):
    c=dict(vx=rng.randrange(-2048,2049),state=rng.randrange(30),held=rng.choice([0,4,8,12]),
           water=rng.randrange(2),modifier=rng.randrange(11)*2,surface_delta=47)
    case('input',c,0x4141,['input_delta','surface_delta'])
for _ in range(750):
    c=dict(xu=rng.randrange(0x1000000),vx=rng.randrange(-32768,32768),
        input_delta=rng.randrange(-128,129),surface_delta=rng.randrange(-47,48),maximum=rng.choice([1024,1536]),contacts=rng.randrange(16))
    case('x',c,0x402a,['xu','vx','input_delta'])
for _ in range(750):
    c=dict(yu=rng.randrange(0x1000000),vy=rng.randrange(-32768,32768),state=rng.choice([5,10,11,17,27,28]),
        move=rng.randrange(4),bg=rng.randrange(4),water=rng.randrange(2),support=rng.randrange(2),modifier=rng.randrange(11)*2)
    case('y',c,0x4097,['yu','vy'])
for vx in [-1536,-1025,-256,-1,0,1,127,256,952,1024,1536]:
 for contact in [0,2]:
  for state in [5,27]:
   for prev in [0,14]:
    for tile in [30,31,32,34]:
     c=dict(vx=vx,vy=0,state=state,next=state,bg=contact,contacts=contact)
     case('ramp',c,0x69b2,['vx','vy','next','move','bg','maximum'],[prev,tile],{0xd36a:prev,0xd36b:tile})
for _ in range(1000):
    x=rng.randrange(32,4064); y=rng.randrange(32,970); plane=rng.randrange(2)
    c=dict(xu=x*256+17,yu=y*256+121,vy=rng.choice([-1920,-256,0,288,1792]),
        previous=rng.choice([0,129,130,146,65,87,156]),plane=plane,bg=rng.choice([0,2]))
    o=Oracle(r);put(o,c);sample=o.collision_sample(x,y,plane=plane)
    o.call(0x6f61)
    fixtures.append(dict(fn='project_floor',initial=c,args=[dict(tile=sample['tile'],flags=sample['flags'],
        modifier=sample['modifier'],vertical=sample['vertical'],horizontal=sample['horizontal'],ax=sample['x'],ay=sample['y'],index=sample['map_address']-0xc001)],
        expected=get(o,['yu','bg','modifier'])))
for _ in range(1200):
    x=rng.randrange(32,4064);y=rng.randrange(32,970);plane=rng.randrange(2)
    c=dict(xu=x*256+17,yu=y*256+121,vy=-256,plane=plane,bg=0)
    o=Oracle(r);put(o,c);s=o.collision_sample(x,y,dy=-24,plane=plane)
    if s['flags']&31 in (5,13,19,20,21,28):continue
    o.call(0x73c9)
    fixtures.append(dict(fn='ceiling',initial=c,args=[],expected=get(o,['yu','vy','bg'])))
entries={1:0x36c6,2:0x36f0,3:0x3713,4:0x3759,5:0x3783,6:0x384d,
         7:0x386f,8:0x389a,9:0x38c5,10:0x3901,11:0x393b,14:0x3a37,
         15:0x39e6,16:0x3a23,27:0x38d1,28:0x3955}
for state,entry in entries.items():
 for _ in range(80):
    held=rng.choice([0,1,2,4,8,12,16,20,24])
    c=dict(xu=200*256,yu=654*256,state=state,next=state,
        vx=rng.choice([-1100,-1024,-256,-32,-1,0,1,31,256,1024,1100]),
        vy=rng.choice([0,256,1792]),held=held,pressed=0,
        previous=129,bg=2,contacts=2,move=3 if state in (9,10,16,27,28) else (1 if state in (11,14) else 0))
    case('tick',c,entry,['xu','yu','vx','vy','state','next','move','bg','contacts','modifier','input_delta','surface_delta','maximum'])
for raw in range(128):
 for phase in range(32):
  for right,entry in [(True,0x71b2),(False,0x7257)]:
   c=dict(xu=500*256+17,bg=0)
   o=Oracle(r);put(o,c);o.word(0xd358,320+phase);o.mem[0xd364]=129;o.mem[0xd367]=raw;o.call(entry)
   fixtures.append(dict(fn='project_side',initial=c,args=[dict(flags=129,horizontal=raw,ax=320+phase),right],expected=get(o,['xu','bg'])))

o=Oracle(r);initial=dict(xu=320*256,yu=654*256,vx=1024,state=5,next=5,bg=2,contacts=2,previous=129,held=8)
put(o,initial);trace=[]
fields=['xu','yu','vx','vy','state','next','move','bg','contacts','previous','modifier']
for tick in range(48):
    o.mem[0xd501]=o.mem[0xd502];o.word(0xd174,o.word(0xd511)-100);o.call(0x3fef)
    trace.append(get(o,fields))
spring=Oracle(r);spring.mem[0xc001:0xd000]=bytes(4095)
sinitial=dict(xu=200*256,yu=800*256,vy=-1920,state=11,next=11,move=1)
put(spring,sinitial);flight=[]
for tick in range(160):
    spring.mem[0xd501]=spring.mem[0xd502];spring.call(0x393b if spring.mem[0xd501]==11 else 0x3fef)
    flight.append(get(spring,['yu','vy','state','next','move','bg']))
(HERE/'fixtures.json').write_text(json.dumps(dict(rom_sha256=SHA256,cases=fixtures,
    ramp=dict(initial=initial,trace=trace),spring=dict(initial=sinitial,trace=flight)),separators=(',',':')))
print('Generated',len(fixtures),'subroutine fixtures, 48 ramp and 160 spring updates')
