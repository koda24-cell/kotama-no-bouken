"""Extract three contiguous, one-cell bridge modules from approved v04 without changing the source."""
import bpy, bmesh, math, os
from mathutils import Vector
from mathutils import Matrix
ROOT="assets/3d/dungeons/b2_water_source/models/ancient_ice_bridge"
OUT="render-output/b2-bridge-tiles"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(ROOT+"/ancient_ice_bridge_v04.glb"))
source=[o for o in bpy.context.scene.objects if o.type=="MESH"]
if not source: raise RuntimeError("v04 contains no meshes")
bpy.context.view_layer.update()
corners=[o.matrix_world @ Vector(c) for o in source for c in o.bound_box]
mins=[min(v[i] for v in corners) for i in range(3)]
maxs=[max(v[i] for v in corners) for i in range(3)]
# Bridge spans the longest horizontal dimension. Preserve the entire cross-section.
axis=max((0,1),key=lambda i:maxs[i]-mins[i]) if maxs[2]-mins[2] < max(maxs[0]-mins[0],maxs[1]-mins[1]) else max((0,2),key=lambda i:maxs[i]-mins[i])
# For GLB scenes the vertical axis is usually Y; choose the longest of X/Z unless X/Y dominates overwhelmingly.
if maxs[2]-mins[2] > maxs[0]-mins[0] and maxs[2]-mins[2] > maxs[1]-mins[1]: axis=2
else: axis=max((0,2),key=lambda i:maxs[i]-mins[i])
span=maxs[axis]-mins[axis]
if span<0.1: raise RuntimeError("Bridge span too small")
step=span/3
print("BRIDGE_BOUNDS",mins,maxs,"axis",axis,"cell",step)
collections=[]
for idx in range(3):
    low=mins[axis]+idx*step
    high=low+step
    col=bpy.data.collections.new("bridge_tile_%02d"%idx)
    bpy.context.scene.collection.children.link(col)
    for obj in source:
        dup=obj.copy()
        dup.data=obj.data.copy()
        col.objects.link(dup)
        # Convert to world-space mesh so the cutting planes share exact coordinates.
        dup.data.transform(dup.matrix_world)
        dup.matrix_world.identity()
        bm=bmesh.new()
        bm.from_mesh(dup.data)
        normal=Vector((1 if i==axis else 0 for i in range(3)))
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
          dist=0.000001,plane_co=normal*low,plane_no=normal,clear_inner=True,clear_outer=False)
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
          dist=0.000001,plane_co=normal*high,plane_no=normal,clear_inner=False,clear_outer=True)
        bm.to_mesh(dup.data)
        bm.free()
        if len(dup.data.polygons)==0:
            bpy.data.objects.remove(dup,do_unlink=True)
            continue
        # Recenter each tile; the same boundary vertices remain identical after placement.
        for v in dup.data.vertices: v.co[axis]-=low+step/2
    collections.append(col)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in col.objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=next(iter(col.objects),None)
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT+"/bridge_tile_%02d.glb"%idx),
      export_format="GLB",use_selection=True,export_apply=True)
# Original source is untouched. Render assembled tiles and individual views.
for obj in source: obj.hide_render=True
for idx,col in enumerate(collections):
    for obj in col.objects: obj.location[axis]=(idx-1)*step
# Create neutral floor and lighting only for review.
bpy.ops.object.camera_add(location=(span*1.0,-span*1.5,span*0.9))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat("-Z","Y").to_euler()
bpy.context.scene.camera=camera
for loc,power,size in [((span, -span,span),1800,span),((-span,-span,span),1200,span)]:
    bpy.ops.object.light_add(type="AREA",location=loc)
    lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape="DISK";lamp.data.size=size
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=1100;scene.render.resolution_y=780;scene.render.resolution_percentage=100
scene.world.color=(0.22,0.25,0.29)
for name,location in [("angle",(span*1.0,-span*1.5,span*0.9)),("front",(0,-span*1.7,span*0.5)),("side",(span*1.7,0,span*0.5))]:
    camera.location=location
    camera.rotation_euler=(-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=os.path.abspath(OUT+"/"+name+".png")
    bpy.ops.render.render(write_still=True)
with open(OUT+"/dimensions.txt","w") as f:
    f.write("source=v04; axis=%d; span=%.5f; module_width=%.5f\n"%(axis,span,step))
    f.write("Placement: modules 0,1,2 centers at -step,0,+step along axis.\n")
