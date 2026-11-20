import bpy, math, os, json
from mathutils import Vector
out=os.environ.get("OUTPUT_DIR","render-output/star-smoke")
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
points=[]
for i in range(10):
 a=math.pi/2+i*math.pi/5
 r=1.0 if i%2==0 else 0.43
 points.append((r*math.cos(a),r*math.sin(a)))
depth=0.16
verts=[(x,y,z) for z in (-depth,depth) for x,y in points]
faces=[tuple(reversed(tuple(range(10)))),tuple(range(10,20))]
for i in range(10):
 j=(i+1)%10
 faces.append((i,j,j+10,i+10))
mesh=bpy.data.meshes.new("StarMesh");mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("Star_5_Point",mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bev=obj.modifiers.new("Rounded_edges","BEVEL");bev.width=0.045;bev.segments=3
norm=obj.modifiers.new("Weighted_normals","WEIGHTED_NORMAL")
mat=bpy.data.materials.new("WarmGold");mat.diffuse_color=(0.95,0.62,0.09,1);mat.use_nodes=True
bs=mat.node_tree.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(0.95,0.62,0.09,1);bs.inputs["Metallic"].default_value=0.45;bs.inputs["Roughness"].default_value=0.28
obj.data.materials.append(mat)
bpy.ops.object.modifier_apply(modifier=bev.name)
bpy.ops.object.modifier_apply(modifier=norm.name)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out+"/star.blend"))
bpy.ops.export_scene.gltf(filepath=os.path.abspath(out+"/star.glb"),export_format="GLB",use_selection=True)
world=bpy.context.scene.world;world.color=(0.12,0.12,0.12)
def point_light(name,loc,power):
 data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=4
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc
point_light("Key",(1,-3,5),550);point_light("Fill",(-3,2,2),350)
bpy.ops.object.camera_add();cam=bpy.context.object;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.render.film_transparent=True
for name,loc in [("front",(0,-0.01,5)),("side",(4,-0.01,0.25)),("angle",(2.5,-3,4))]:
 cam.location=loc;direction=Vector((0,0,0))-cam.location;cam.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
 cam.data.type="ORTHO";cam.data.ortho_scale=2.9
 scene.render.filepath=os.path.abspath(out+"/"+name+".png");bpy.ops.render.render(write_still=True)
with open(out+"/manifest.json","w") as f:json.dump({"blender":bpy.app.version_string,"approval":"NOT_APPROVED","asset":"test five-point star"},f,indent=2)
print("STAR_SMOKE_SUCCESS",bpy.app.version_string)
