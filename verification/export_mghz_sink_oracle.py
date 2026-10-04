"""Export original Z80 sink-routine results, not ROM bytes; Research read-only."""
from pathlib import Path
import sys,json,gzip,hashlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'sonic-chaos-reference-work/tools'))
import mghz_surface_ceiling as M
import level_package as L
import rom as R
rom=L.load_rom(ROOT.parent/'source/Sonic Chaos (Europe).sms')
lab=M.Lab(rom,'mghz1');rows=[]
for block in M.bit6_only_blocks(rom):
    for col in (0,8,16,24,31):
        x=1344+col
        for dy in range(-6,35):
            y=782+dy
            for k in (0,4,12,25,32,200):
                for vy in (-1,0,1792):
                    r=lab.go(x,y,vy=vy,floor=True,prev=R.header(rom,block)['flags'],cur=5,req=5,p24=2,k=k,entry=M.FLOOR_PROJECTION,lookup_first=True,patch={(42,25):block})
                    rows.append([y,vy,k,r['profile'],r['y'],int(r['floor'])])
value={'rom_sha256':hashlib.sha256(rom).hexdigest(),'research_commit':'7315df2b34dcb7c8909644790b1d9ef397322f09','evidence':'controlled original Z80 $7666 -> $6F61/$7010','columns':['y','vy','counter','lookup_profile','result_y','result_floor'],'rows':rows}
dest=ROOT/'verification/mghz-sink-oracle.json.gz'
with dest.open('wb') as f:
    with gzip.GzipFile(fileobj=f,mode='wb',mtime=0) as z:z.write(json.dumps(value,separators=(',',':')).encode())
print(len(rows),'original-routine cases',flush=True)
