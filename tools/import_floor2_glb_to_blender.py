# Run inside Blender's Scripting workspace after importing the generated GLB.
# Edit INPUT/OUTPUT paths as needed.
import bpy
INPUT = "assets/floor2-water-source/models/floor2-water-source-prototype.glb"
OUTPUT = "assets/floor2-water-source/models/floor2-water-source-prototype.blend"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=INPUT)
# Organize imported objects into a dedicated collection.
coll = bpy.data.collections.get("F2_Water_Source_Prototype")
if coll is None:
    coll = bpy.data.collections.new("F2_Water_Source_Prototype")
    bpy.context.scene.collection.children.link(coll)
for obj in list(bpy.context.scene.objects):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    coll.objects.link(obj)
# Set a useful inspection view and save editable Blender project.
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        area.spaces.active.region_3d.view_distance = 22
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
print("Saved editable Blender scene:", OUTPUT)
