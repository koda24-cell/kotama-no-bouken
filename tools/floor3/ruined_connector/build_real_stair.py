"""Import verified CC0 concrete stairs geometry into the existing connector scene."""
import bpy,os
from mathutils import Vector
original=open('/work/tools/floor3/ruined_connector/build.py',encoding='utf-8').read()
needle=" build(kind);export('floor3_ruined_connector_'+kind)"
assert original.count(needle)==1
patch=""" build(kind)
 if kind=='stairs':
  path='/work/tools/floor3/ruined_connector/source/concrete_stair_set.glb'
  if not os.path.isfile(path) or os.path.getsize(path)<1000:
   raise RuntimeError('Required CC0 stair GLB missing')
  # Preserve original rails, rubble and moss; replace only synthetic stair treads.
  for o in list(bpy.context.scene.objects):
   if o.type=='MESH' and o.name.startswith('worn thin concrete tread'):
    bpy.data.objects.remove(o,do_unlink=True)
  before=set(bpy.context.scene.objects)
  bpy.ops.import_scene.gltf(filepath=path)
  added=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
  if not added:raise RuntimeError('CC0 stair GLB has no mesh')
  bpy.context.view_layer.update()
  points=[o.matrix_world@Vector(corner) for o in added for corner in o.bound_box]
  low=Vector((min(p.x for p in points),min(p.y for p in points),min(p.z for p in points)))
  high=Vector((max(p.x for p in points),max(p.y for p in points),max(p.z for p in points)))
  size=high-low
  if min(size)<.001:raise RuntimeError('CC0 stair GLB has invalid dimensions')
  # Fit the original 2x2 modular footprint; preserve source geometry/materials.
  factor=min(1.66/size.x,1.82/size.y,.89/size.z)
  center=(low+high)*.5
  target=Vector((0,0,.06))
  for o in added:
   o.matrix_world.translation=target+factor*(o.matrix_world.translation-center)
   o.scale*=factor
   o.name='CC0 imported concrete stair '+o.name
 export('floor3_ruined_connector_'+kind+'_real')"""
original=original.replace(needle,patch)
original=original.replace("print('FLOOR3_CONNECTOR_RENDER_COMPLETE')","print('FLOOR3_REAL_STAIR_RENDER_COMPLETE')")
exec(compile(original,'real_stair_connector.py','exec'))
