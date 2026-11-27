"""V3 city assets; individually rendered in the pinned Blender/ClamAV gateway."""
def build(asset,e):
 import json,math
 from mathutils import Vector,Matrix
 c,bpy,box,rod,scar=[e[k]for k in ['c','bpy','box','rod','scar']]
 if asset=='v3_memory_monument':
  from licensed_gltf_v2 import load
  objects,raw=load(c,bpy,e['scan'],'gothic_statue',resolution='2k')
  meshes=[o for o in objects if o.type=='MESH'];assert meshes
  count=sum(len(o.data.vertices)for o in meshes)
  corners=[o.matrix_world@Vector(p)for o in meshes for p in o.bound_box]
  lo=Vector([min(p[k]for p in corners)for k in range(3)])
  hi=Vector([max(p[k]for p in corners)for k in range(3)]);size=hi-lo;center=(lo+hi)*.5
  scale=6.4/size.z
  transform=Matrix.Translation((-center.x*scale,-center.y*scale,1.5-lo.z*scale))@Matrix.Diagonal((scale,scale,scale,1))
  original={o:o.matrix_world.copy()for o in meshes}
  for o in meshes:o.parent=None;o.matrix_world=transform@original[o]
  assert sum(len(o.data.vertices)for o in meshes)==count
  for i,(w,d,h) in enumerate([(7.4,6.8,.30),(6.85,6.25,.30),(6.25,5.65,.32),(5.65,5.05,.58)]):
   z=sum([.30,.30,.32,.58][:i])+h/2
   body=box('weathered monumental step '+str(i),(0,0,z),(w,d,h),e['concrete'],.045)
   for side in [-1,1]:
    scar(body,(side*(w/2-.035),-d*.30,z+h*.34),(.35,.46,.27),(.16,side*.27,.09))
   # Broken substrate remains in situ: smaller lodged stones, never a neat row.
   for k in range(4):
    x=(-1 if k%2 else 1)*(w/2-.15-e['rng'].random()*.18)
    q=box('spalled edge aggregate',(x,-d*.35+e['rng'].random()*.35,z+h*.35),(.11,.16,.08),e['fracture'],.01)
    q.rotation_euler=(.1,.2,e['rng'].random()*math.pi)
  box('deep commemorative panel',(0,-2.54,1.15),(2.5,.04,.35),e['dark'],.01)
  for x in [-.85,0,.85]:
   rod('cast bronze memory line',(x,-2.573,1.04),(x+.16,-2.573,1.26),.012,e['rust'],10)
  # Moss grows in sheltered ledges, rather than tinting the whole plinth green.
  for k in range(13):
   x=-3.15+6.3*e['rng'].random();y=-2.9+e['rng'].random()*.22
   patch=box('sheltered moss on chipped ledge',(x,y,.315),(.18+e['rng'].random()*.34,.18,.025),e['moss'],.02)
   patch.rotation_euler.z=e['rng'].random()*2
  (c.OUT/'sources/monument-v3-provenance.json').write_text(json.dumps({'status':'NOT_APPROVED','asset':'gothic_statue','license':'CC0','sourceURL':'https://polyhaven.com/a/gothic_statue','originalVertices':count,'verticesRemoved':0,'uvPreserved':True,'sculptHeightMeters':6.4,'plinthHeightMeters':1.5,'design':'Large civic monument in white flower court; interaction anchor at front edge, not on a blocking route'},indent=2))
 else:raise ValueError('Asset not implemented: '+asset)
