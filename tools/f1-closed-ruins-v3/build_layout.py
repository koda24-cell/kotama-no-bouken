"""Explicit closed-ruins revision of the immutable opt-in trial descriptor."""
from pathlib import Path
import json,hashlib,math,random,copy,functools
ROOT=Path(__file__).resolve().parents[2];OLD='assets/3d/dungeons/b1_sacred_forest_candidates/';NEW='assets/3d/dungeons/b1_closed_ruins_v3/';LEG='assets/3d/dungeons/b1_ancient_forest/'
l=json.loads((ROOT/OLD/'scene/game-layout-trial.json').read_text());rng=random.Random(73030);grid=l['beforeFingerprint']['saveCriticalData']['map'];w,h=28,18
@functools.lru_cache(None)
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
l['presentationRevision']='closed_ruins_v3';l['approvalStatus']='pending_user_art_review';l['revisionSources']=[]
def source(id,file):
    l['revisionSources'].append(dict(id=id,file=file,sha256=sha(file)));return id,file
sources={}
for id in ['v3_moss_veil','v3_shade_understory','v3_root_rubble','v3_collapse_oculus','v3_eroded_bank']:
    sources[id]=source(id,NEW+'props/'+id+'.glb')
for id,file in [('legacy_root_ceiling',LEG+'modules/mod_ceiling_roots_4m.glb'),('legacy_pillar',LEG+'modules/mod_pillar_corner.glb')]:sources[id]=source(id,file)
manifest=json.loads((ROOT/OLD/'manifest.json').read_text());sources.update({r['id']:(r['id'],OLD+r['file']) for r in manifest['assets']})
props=[]
def add(id,asset,pos,rot=0,scale=None,role='environment_cluster'):
    aid,file=sources[asset];row=dict(id=id,assetId=aid,file=file,position=pos,rotationY=rot,scale=scale or [1,1,1],role=role,sourceSha256=sha(file));props.append(row);return row
# Preserve interaction models in native game, and retain authored small props.
for p in l['candidatePropPlacements']:
    if p['assetId'] in ['sacred_cedar_tree','forest_fern_cluster','forest_shrub_cluster']:continue
    if p['id']=='root_approach_torii':p.update(position=[58,0,12],rotationY=-math.pi/2,tile=[14,3],scale=[1,.8,1]);p.pop('clearance',None)
    if p['assetId']=='sacred_hokora_shrine':p.update(position=[52,0,12],rotationY=math.pi/2,tile=[13,3]);p.pop('clearance',None)
    props.append(p)
for wall in l['boundaryWallPlacements']:
    if wall['id']=='wall_13_4_up':wall['scale']=[1,1,1]
    if wall.get('zone')=='sealed_corridor':wall['scale']=[1,1.25,1]
for n,(px,pz,ry) in enumerate([(x*4,z,ry) for x in range(w) for z,ry in [(-2,0),(h*4-2,math.pi)]]+[(x,z*4,ry) for z in range(h) for x,ry in [(-2,math.pi/2),(w*4-2,-math.pi/2)]]):
    aid,file=sources['mod_sacred_wall_4m'];l['boundaryWallPlacements'].append(dict(id='closed_perimeter_'+str(n),assetId=aid,file=file,position=[px,0,pz],rotationY=ry,scale=[1,1.25,1],sourceSha256=sha(file),role='sealed_outer_shell'))
# Suppress visible tan checkerboard: retain physical soil selection, but cover
# across the 4m boundaries with non-grid irregular low moss surfaces.
for z in range(1,h-1):
  for x in range(1,w-1):
    if grid[z][x]=='~':continue
    for j in range(2 if grid[z][x]!='#' else 1):
      px=x*4+rng.uniform(-1.5,1.5);pz=z*4+rng.uniform(-1.5,1.5)
      add(f'moss_{x}_{z}_{j}','v3_moss_veil',[px,.012+rng.random()*.007,pz],rng.random()*math.tau,[rng.uniform(1.05,1.65),1,rng.uniform(1.15,1.8)])
    if grid[z][x]!='#':
      # Plants near cell boundaries; keep the core standing/interacting space legible.
      count=2 if grid[z][x] in '*,' else 1
      for j in range(count):
        side=-1 if (x+z+j)%2 else 1
        add(f'shade_{x}_{z}_{j}','v3_shade_understory',[x*4+side*rng.uniform(1.2,1.65),.015,z*4+rng.uniform(-1.55,1.55)],rng.random()*math.tau,[rng.uniform(.8,1.3),rng.uniform(.8,1.2),rng.uniform(.8,1.3)])
    elif any(0<=x+dx<w and 0<=z+dz<h and grid[z+dz][x+dx]!='#' for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]):
      # Blocked islands become solid architectural/root mass instead of open dirt.
      if (x+2*z)%3==0:add(f'pillar_{x}_{z}','legacy_pillar',[x*4,0,z*4],rng.random()*math.tau,[1.2,1,1.2])
      if (x+z)%4==0:add(f'shrub_{x}_{z}','forest_shrub_cluster',[x*4+.6,.02,z*4-.3],rng.random()*math.tau,[.9,.9,.9])
      add(f'rubble_{x}_{z}','v3_root_rubble',[x*4,0,z*4],rng.random()*math.tau,[1.25,1.5,1.2])
      for j in range(2):add(f'blocked_shade_{x}_{z}_{j}','v3_shade_understory',[x*4+rng.uniform(-1.5,1.5),.025,z*4+rng.uniform(-1.5,1.5)],rng.random()*math.tau,[1.7,1.6,1.7])
# True openings are limited to three sites; cover both route and former garden.
holes={(8,13),(15,8),(13,3)};ceil=[]
for z in range(h):
  for x in range(w):
    if (x,z) in holes:
      aid,file=sources['v3_collapse_oculus'];pos=[x*4,3.5,z*4]
    elif (x+z*3)%7==0:
      aid,file=sources['legacy_root_ceiling'];pos=[x*4,4.3,z*4]
    else:
      aid=None;file=LEG+'modules/mod_ceiling_vault_4m.glb';pos=[x*4,4.25,z*4]
    if 22<=x<=25 and 1<=z<=4:pos[1]=5.1
    row=dict(id=f'closed_roof_{x}_{z}',file=file,position=pos,rotationY=0,scale=[1,1,1],sourceSha256=sha(file))
    if aid:row['assetId']=aid
    else:row['reuseExisting']=True
    ceil.append(row)
# Connected sacred axis; cedar only in one genuine roof opening.
add('root_lightwell_cedar','sacred_cedar_tree',[32,0,52],.35,[.65,.8,.65])
# Actual corridor thresholds, not disconnected exhibition arches.
for n,(x,z,rot) in enumerate([(22,60,math.pi/2),(82,16,math.pi/2)]):
    add('closed_threshold_'+str(n),'mod_sacred_arch_4m',[x,0,z],rot,[1,1,1],'traversable_arch_threshold')
# Root curtains cling to the wall-top/soffit in blocked pockets.
for n,p in enumerate(l['boundaryWallPlacements'][::7]):
    x,y,z=p['position'];add('vines_'+str(n),'hanging_forest_vines',[x,3.8,z],p.get('rotationY',0),[.8,.65,.8])
# Eroded bank follows only the 16 external water-cell edges.
water={(x,z) for z,row in enumerate(grid) for x,c in enumerate(row) if c=='~'}
edge=0
for x,z in sorted(water):
  for dx,dz,rot in [(0,-1,0),(1,0,-math.pi/2),(0,1,math.pi),(-1,0,math.pi/2)]:
    if (x+dx,z+dz) in water:continue
    # Asset glTF +Z is water side. Rotate +Z toward this tile's interior.
    add('water_bank_'+str(edge),'v3_eroded_bank',[x*4+dx*2,0,z*4+dz*2],rot,[1,1,1],'eroded_water_edge');edge+=1
l['ceilingPlacements']=ceil;l['candidatePropPlacements']=props
for zone in l['zones']:
    zone['ceiling']=True;zone['wallPolicy']='enclosed damp stone, root intrusion and collapsed pockets'
    zone['intent']='Closed mossy ritual ruin; three localized roof openings only, not an open garden.'
    if zone['id']=='sacred_courtyard':zone['nameJa']='苔に埋もれた祭祀回廊'
    if zone['id']=='sealed_corridor':zone['intent']='Boss approach alone has slightly higher roof, enclosed outer walls, unchanged gate/lamp.'
covered=sum(1 for p in l['floorPlacements'] if tuple(p['tile']) not in holes)
l['closedRuinsV3']={'roof':{'roofModules':len(ceil),'openingCount':3,'openings':[list(t) for t in sorted(holes)],'coveredWalkFloorCells':covered,'walkFloorCells':len(l['floorPlacements']),'walkFloorCoverage':covered/len(l['floorPlacements']),'eyeMeters':1.6},'sacredAxis':{'torii':[58,0,12],'shrine':[52,0,12],'distanceMeters':6},'lightPockets':[{'position':p,'color':c,'intensity':min(30,i*2),'distance':d} for p,c,i,d in [([8,2.5,61],0x9abf8c,8,18),([28,2.6,59],0x8cac87,9,17),([51,3.2,12],0xc4cf9b,16,18),([60,3,32],0x8eb69a,16,22),([84,2.6,18],0xb2ba8b,10,18),([94,3,10],0x9dbea5,12,18),([32,3.5,52],0xc0c99b,10,18),([80,2.6,45],0x8fa78d,8,17)]],'waterBankSegments':edge,'visualApproval':'pending_user_review'}
l['integrationHandoff'].append('Closed ruins v3: source map and native identities preserved; individual new assets; compare real eye-level evidence.')
# Historical original estimate applies to v2 only; no stale clearance claim.
l['assetGeometryVerification']={'status':'requires_v3_actual_geometry_review','originalV2EvidenceRetainedIn':'game-layout-trial.json'}
l['performanceEstimate']={'status':'pending_actual_browser_measurement','realDevicePerformanceApproved':False}
path=ROOT/OLD/'scene/game-layout-v3.json';path.write_text(json.dumps(l,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'file':str(path),'props':len(props),'roof':l['closedRuinsV3']['roof'],'extraSources':len(l['revisionSources']),'waterBanks':edge}))
