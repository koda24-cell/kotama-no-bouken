"""Authored F1/3F corridor topology. Preserves fixed native identity coordinates."""
from pathlib import Path
import json,re,collections
ROOT=Path(__file__).resolve().parents[2];old=json.loads((ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-trial.json').read_text())['beforeFingerprint']['saveCriticalData']['map']
g=[list('#'*28) for _ in range(18)]
def path(points):
 for (x,z),(a,b) in zip(points,points[1:]):
  assert x==a or z==b
  for yy in range(min(z,b),max(z,b)+1):
   for xx in range(min(x,a),max(x,a)+1):g[yy][xx]=','
# Hand-authored main itinerary, rather than a random rectangular courtyard.
path([(1,16),(1,15),(5,15),(5,11),(1,11),(1,7),(5,7),(5,3),(9,3),(9,5),(13,5),(13,1),(19,1),(19,5),(23,5),(23,1),(22,1)])
for p in [[(3,15),(3,14)],[(3,11),(3,13)],[(1,9),(3,9)],[(5,5),(7,5)],[(9,3),(9,1),(7,1)],[(9,5),(9,6),(10,6)],[(13,3),(12,3)],[(17,1),(17,3),(15,3)],[(19,5),(19,7),(21,7)],[(13,5),(13,11),(19,11),(19,9),(21,9),(21,11),(23,11),(23,9)],[(23,11),(23,12)],[(23,1),(25,1),(25,3)],[(23,3),(24,3)],[(21,9),(22,9)],[(1,15),(2,15)]]:path(p)
# Retain the native pool footprint, now viewed from a compressed gallery.
for z,row in enumerate(old):
 for x,c in enumerate(row):
  if c=='~':g[z][x]='~'
for x,z,c in [(22,1,'B'),(24,3,'S'),(10,6,'T'),(22,9,'?'),(23,12,'b'),(3,14,'a'),(1,16,'<'),(2,15,'P')]:g[z][x]=c
# Little boss antechamber only; no continuous open courts elsewhere.
g[2][22]='_';g[2][23]='_';g[3][23]='_'
rows=[''.join(r) for r in g];blocked=set('#~ST?ab');walk={(x,z) for z,r in enumerate(rows) for x,c in enumerate(r) if c not in blocked}
seen={(2,15)};q=collections.deque(seen)
while q:
 x,z=q.popleft()
 for p in [(x-1,z),(x+1,z),(x,z-1),(x,z+1)]:
  if p in walk and p not in seen:seen.add(p);q.append(p)
assert seen==walk,sorted(walk-seen)
for x,z in [(24,3),(10,6),(22,9),(23,12),(3,14)]:assert any(p in walk for p in [(x-1,z),(x+1,z),(x,z-1),(x,z+1)])
assert (22,1) in seen and (1,16) in seen
oldtext='\n'.join('        '+json.dumps(r) + (',' if i<len(old)-1 else '') for i,r in enumerate(old))
file=ROOT/'data/field-maps.js';s=file.read_text();assert s.count(oldtext)==1
newtext='\n'.join('        '+json.dumps(r) + (',' if i<len(rows)-1 else '') for i,r in enumerate(rows));file.write_text(s.replace(oldtext,newtext))
degree=lambda p:sum(n in walk for n in [(p[0]-1,p[1]),(p[0]+1,p[1]),(p[0],p[1]-1),(p[0],p[1]+1)])
report={'scope':'Authored topology; original fixed object identities/positions retained','map':rows,'reachableWalkCells':len(walk),'deadEnds':sum(degree(p)==1 for p in walk),'junctionCells':sum(degree(p)>=3 for p in walk),'waterCells':11,'nativeSaveLoadFallback':'Existing field-persistence rejects saved positions inside walls and uses native start; save schema unchanged','shrineDeadEnd':{'playerTile':[12,3],'shrineWorld':[44,0,12],'toriiWorld':[50,0,12]},'bossConnected':True}
(ROOT/'tools/f1-layer-v4/map-plan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='map'}))
