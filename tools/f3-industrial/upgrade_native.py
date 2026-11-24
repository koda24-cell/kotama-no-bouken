"""Enhance a preserved native prototype; retain its original component geometry."""
import json,hashlib,math
from pathlib import Path

def build(asset,e):
 c,bpy,box,rod,scar=[e[k]for k in ['c','bpy','box','rod','scar']]
 concrete,moss,rust,asphalt,fracture,dark,steel,rng,Vector=[e[k]for k in ['concrete','moss','rust','asphalt','fracture','dark','steel','rng','Vector']]
 key=asset.removeprefix('native_');root=Path(__file__).resolve().parents[2];folder=root/'assets/3d/dungeons/b3_industrial_candidates/native_originals';receipt=json.loads((folder/'manifest.json').read_text());row=next(r for r in receipt['models']if r['key']==key);path=folder/(key+'.glb')
 assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256']
 bpy.ops.import_scene.gltf(filepath=str(path));original=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert original
 for o in original:
  if o.data.users>1:o.data=o.data.copy()
 raw_positions=sum(len(o.data.vertices)for o in original)
 def positions_hash():return hashlib.sha256(json.dumps([[[*v.co]for v in o.data.vertices]+[[*row]for row in o.matrix_world]for o in original]).encode()).hexdigest()
 original_geometry_hash=positions_hash()
 bark=c.material('f3_native_aged_bark',(.145,.12,.08,1),.98)
 leaf=c.material('f3_native_olive_leaf',(.10,.19,.07,1),.92)
 # Material replacement and metric UVs leave every original vertex and component intact.
 for o in original:
  for slot in o.material_slots:
   role=slot.material.name.removeprefix('f3_native_').split('.')[0]if slot.material else 'concrete'
   slot.material={'concrete':concrete,'stone':moss,'paving':asphalt,'soil':moss,'rust':rust,'bark':bark,'leaf':leaf,'dark':dark,'gold':rust}.get(role,concrete)
  c.uv_world(o,1.35)
 # Add hardware, spalling skin and contact debris onto the actual concrete faces.
 faces=[]
 for o in original:
  if not any(s.material==concrete for s in o.material_slots):continue
  normal=o.matrix_world.to_3x3().inverted().transposed()
  for f in o.data.polygons:
   n=(normal@f.normal).normalized();p=o.matrix_world@f.center
   if abs(n.z)<.2 and f.area>.25 and .35<p.z<5:faces.append((p,n,f.area))
 rng.shuffle(faces)
 for j,(p,n,area)in enumerate(faces[:14]):
  tangent=n.cross(Vector((0,0,1))).normalized();up=Vector((0,0,1));width=min(.27,math.sqrt(area)*.22);height=width*rng.uniform(1.2,2.0)
  # Thin asymmetric flaked rim; no floating damage blocks and no wholesale mesh replacement.
  pts=[p+n*.004+tangent*x+up*z for x,z in[(-width,-height*.30),(-width*.65,height*.55),(width*.31,height*.72),(width,height*.08),(width*.57,-height*.55)]]
  center=p+n*.006
  v=[tuple(q)for q in pts]+[tuple(center)]
  o=c.mesh('localized exposed aggregate weather skin',v,[(k,(k+1)%5,5)for k in range(5)],fracture);c.uv_world(o,.35)
  if j%3==0:
   rod('short corroded bar visible at spall',p+up*height*.6+n*.014,p-up*height*.4+tangent*.035+n*.018,.012,rust,8)
 if key=='utilityPole':
  for z in[.42,2.2,3.9]:
   for x in[-.095,.095]:box('added pole strap clamp',(x,-.11,z),(.045,.075,.14),rust,.008)
  c.tube('disconnected supply cable',[(.23,.08,4.65),(.38,.04,3.85),(.27,.03,3.43)],.012,dark,8)
 elif key=='abandonedTransitStop':
  for x in[-1.1,0,1.1]:
   box('corroded canopy lap plate',(x,0,2.68),(.22,.18,.025),rust,.008)
   for dx in[-.06,.06]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.018,depth=.016,location=(x+dx,0,2.70));bpy.context.object.name='canopy rivet';bpy.context.object.data.materials.append(steel)
 elif key in['ruinedBuilding','collapsedOverpass']:
  # Contact chips sit at the original ground plane rather than hanging in mid-air.
  corners=[o.matrix_world@Vector(p)for o in original for p in o.bound_box];minz=min(p.z for p in corners)
  for j in range(12):
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(rng.uniform(-1.5,1.5),rng.uniform(-.9,.9),minz+.06));o=bpy.context.object;o.name='grounded concrete contact chips';o.scale=(rng.uniform(.05,.17),rng.uniform(.05,.13),rng.uniform(.025,.06));o.data.materials.append(fracture);c.uv_world(o,.25)
 elif key=='steelWreck':
  for j in range(4):
   c.tube('frayed reinforcing cable',[(j*.24-.4,.05,1.4),(j*.22-.4,-.05,.9),(j*.19-.4,-.09,.4)],.01,rust,8)
 assert sum(len(o.data.vertices)for o in original)==raw_positions
 assert positions_hash()==original_geometry_hash
 return {'preservedNativeVertices':raw_positions,'sourceFile':str(path.relative_to(root)),'sourceSha256':row['sha256'],'geometryPreserved':True,'originalGeometryHash':original_geometry_hash}
