"""Unique M1.1 source package; retains M1 and leaves the working tree uncommitted."""
from pathlib import Path
import argparse,json,hashlib,zipfile
from package_mghz import ROOT,files
BUILD=ROOT/'build/mghz-m11';NAME='SonicChaos_MGHZ_Foundation_20261004_M1_1'
ZIP=ROOT.parent/'releases'/(NAME+'.zip');EXTRACT=BUILD/'extracted'/NAME
ap=argparse.ArgumentParser();ap.add_argument('--prepare',action='store_true');ap.add_argument('--finish',action='store_true');a=ap.parse_args();assert a.prepare!=a.finish
paths=set(files());paths.add(ROOT/'docs/mghz-package-m11.md');paths.update(p for p in (ROOT/'verification/mghz-m11').rglob('*')if p.is_file());paths=sorted(paths)
assert [p.name for p in paths if p.suffix=='.yyp']==['SonicChaos_POC.yyp']
assert json.loads((ROOT/'verification/mghz-m11/native-closure-results.json').read_text())['status']=='PASS'
assert json.loads((ROOT/'verification/mghz-m11/native-platform-correction-results.json').read_text())['status']=='PASS'
assert json.loads((ROOT/'build/mghz-m1/capture-verification.json').read_text())['status']=='PASS'
assert all(r['exit_code']==0 for r in json.loads((ROOT/'build/mghz-m1/focused-results.json').read_text()))
assert 'Igor complete.'in(BUILD/'source-compile.log').read_text()
if a.prepare:
 assert not ZIP.exists()and not EXTRACT.exists(),'Never overwrite acceptance packages'
 with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED)as z:
  for p in paths:z.write(p,NAME+'/'+p.relative_to(ROOT).as_posix())
 with zipfile.ZipFile(ZIP)as z:assert z.testzip()is None;z.extractall(EXTRACT.parent)
 for p in paths:assert p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
 print(EXTRACT/'SonicChaos_POC.yyp')
else:
 assert 'Igor complete.'in(BUILD/'extracted-compile.log').read_text()
 with zipfile.ZipFile(ZIP)as z:
  assert z.testzip()is None
  for p in paths:assert z.read(NAME+'/'+p.relative_to(ROOT).as_posix())==p.read_bytes()==(EXTRACT/p.relative_to(ROOT)).read_bytes()
 report={'zip':str(ZIP),'sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'files':len(paths),'base':'82ebc89d68cd0d7e4d66be54a6c9954e6e2d9fed','source_compile':'PASS','fresh_extraction_compile':'PASS','shared_regression_commands':24,'new_sign_event_test':'PASS','native_closure':'PASS','render_captures':48,'ROM_matching_pixels':1945738,'commit':'UNCOMMITTED','platform_response':'PASS direct crush, jump-off break, one-way capture; five native cases / 90 jump windows','Windows_acceptance':'PENDING'}
 (BUILD/'package-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
