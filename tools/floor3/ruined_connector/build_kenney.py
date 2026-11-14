"""Import real CC0 Kenney staircase and retain original V1 as separate baseline."""
exec(compile(open('/work/tools/floor3/ruined_connector/build.py').read(),'build.py','exec'))
source='/work/tools/floor3/ruined_connector/external/kenney-stairs.glb'
assert os.path.isfile(source),'Kenney staircase GLB missing'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
imported=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert imported,'Imported GLB has no meshes'
# Preserve exact source mesh, transform as a group to the modular 2m tile.
from mathutils import Vector
from mathutils import Matrix
minv=Vector((min((o.matrix_world @ Vector(c)).x for o in imported for c in o.bound_box),min((o.matrix_world @ Vector(c)).y for o in imported for c in o.bound_box),min((o.matrix_world @ Vector(c)).z for o in imported for c in o.bound_box)))
maxv=Vector((max((o.matrix_world @ Vector(c)).x for o in imported for c in o.bound_box),max((o.matrix_world @ Vector(c)).y for o in imported for c in o.bound_box),max((o.matrix_world @ Vector(c)).z for o in imported for c in o.bound_box)))
center=(minv+maxv)*.5;size=maxv-minv
# Source stair orientation unknown; normalize horizontal footprint and stair rise while keeping source topology.
sx=1.68/max(size.x,.001);sy=1.86/max(size.y,.001);sz=.92/max(size.z,.001)
for o in imported:
 o.matrix_world=Matrix.Translation(Vector((-center.x*sx,-center.y*sy,-center.z*sz))) @ Matrix.Diagonal(Vector((sx,sy,sz,1))) @ o.matrix_world
 o.name='Kenney CC0 staircase original mesh '+o.name
# Add non-destructive ruin detail around the original mesh.
rng=random.Random(2124)
for side in (-1,1):
 x=side*.83
 for y in (-.84,.80):
  z=-.22+(y+.84)*.48
  rod('slender damaged railing post',(x,y,z),(x,y,z+.73),.024,rust)
 rod('rusted sloping handrail',(x,-.84,.49),(x,.80,1.26),.028,rust)
for i in range(18):
 x=rng.uniform(-.75,.75);y=rng.uniform(-.85,.85);z=-.35+(y+.85)*.52
 rubble('loose stone near original stair',(x,y,z),(.045,.045,.03),edge)
export('floor3_ruined_connector_kenney_cc0_stairs')
print('FLOOR3_KENNEY_STAIRS_RENDER_COMPLETE')
