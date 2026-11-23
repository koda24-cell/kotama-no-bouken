"""Clearance of actual runtime V6 rock/wall placements against native walking lanes."""
from pathlib import Path
import json,sys,hashlib,itertools
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/f1-closed-ruins-v3'))
from verify_clearance import Geometry,bounds,placement_matrix,point,route_sweeps,overlap
report=json.loads((ROOT/'docs/reviews/f1-v6-game/verification.json').read_text());assert report['passed']
cache={};results=[]
for floor in report['natureGeometry']:
 assert floor and floor['version']==6
 sources={s['name']:s for s in floor['sources']}
 for s in sources.values():
  raw=(ROOT/s['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==s['sha256']
  if s['name']not in ['sedge','trifoliate','fern']and s['file']not in cache:cache[s['file']]=bounds([v for t in Geometry(raw,s['file']).triangles for v in t])
 grid=floor['map'];walk={tuple(t)for t in floor['walkTiles']}
 layout={'beforeFingerprint':{'saveCriticalData':{'map':grid}},'navigation':{'navigationSolidTiles':[[x,z]for z,row in enumerate(grid)for x in range(len(row))if(x,z)not in walk]}}
 sweeps=route_sweeps(layout);bad=[]
 for row in floor['placements']:
  s=sources[row['assetId']];lo,hi=cache[s['file']];matrix=placement_matrix(row);world=bounds([point(matrix,p)for p in itertools.product(*zip(lo,hi))])
  hits=[i for i,sweep in enumerate(sweeps)if overlap(world,sweep['bounds'])]
  if hits:bad.append({'assetId':row['assetId'],'position':row['position'],'sweeps':hits})
 results.append({'floor':floor['floor']+1,'hardPlacements':len(floor['placements']),'nativeRouteSweeps':len(sweeps),'overlaps':bad})
assert len(results)==3 and not any(r['overlaps']for r in results),results
out={'passed':True,'scope':'Additional V6 rocks and 2F replacement walls only. Actual placements read from real game; all ancestor GLB transforms retained. Conservative transformed source AABBs versus native 1.8m-wide routes at Y=.12..2.1m. Existing scene clearance, soft foliage and stairs are checked separately.','sourceGameReportSha256':hashlib.sha256((ROOT/'docs/reviews/f1-v6-game/verification.json').read_bytes()).hexdigest(),'floors':results}
(ROOT/'docs/reviews/f1-v6/additional-hard-asset-clearance.json').write_text(json.dumps(out,indent=2));print(out)
