import bpy, math, json, os, hashlib
from mathutils import Vector
OUT=os.environ.get("OUTPUT_DIR","/work/outputs/tech01")
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=16
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.world.color=(.25,.25,.25)
assert bpy.app.version[:2] == (5,3), f"Blender 5.3 required, got {bpy.app.version_string}"
def mat(stylized):
 m=bpy.data.materials.new("rock_stylized" if stylized else "rock_baseline");m.diffuse_color=(.34,.32,.28,1);m.use_nodes=True
 nt=m.node_tree;bs=nt.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(.34,.32,.28,1);bs.inputs["Roughness"].default_value=.7
 if stylized:
  tex=nt.nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=3;tex.inputs["Detail"].default_value=4;tex.inputs["Roughness"].default_value=.55
  ramp=nt.nodes.new("ShaderNodeValToRGB");ramp.color_ramp.elements[0].position=.22;ramp.color_ramp.elements[0].color=(.16,.15,.13,1);ramp.color_ramp.elements[1].position=.78;ramp.color_ramp.elements[1].color=(.55,.5,.42,1)
  nt.links.new(tex.outputs["Fac"],ramp.inputs["Fac"]);nt.links.new(ramp.outputs["Color"],bs.inputs["Base Color"])
  fine=nt.nodes.new("ShaderNodeTexNoise");fine.inputs["Scale"].default_value=35;fine.inputs["Detail"].default_value=2
  bump=nt.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.12;bump.inputs["Distance"].default_value=.015
  nt.links.new(fine.outputs["Fac"],bump.inputs["Height"]);nt.links.new(bump.outputs["Normal"],bs.inputs["Normal"])
 return m
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=(0,0,0))
rock=bpy.context.object;rock.name="Rock";rock.scale=(1.2,.9,.8)
for v in rock.data.vertices:
 v.co.x*=1+.07*math.sin(v.co.y*7+v.co.z*3)
rock.data.materials.append(mat(False))
bpy.ops.object.camera_add(location=(3.2,-5.5,2.6));cam=bpy.context.object;scene.camera=cam
def aim(obj,p):obj.rotation_euler=(Vector(p)-obj.location).to_track_quat("-Z","Y").to_euler()
aim(cam,(0,0,0))
bpy.ops.object.light_add(type="AREA",location=(0,-3,5));bpy.context.object.data.energy=650;bpy.context.object.data.shape="DISK";bpy.context.object.data.size=4
results=[]
for style in (False,True):
 rock.data.materials.clear();rock.data.materials.append(mat(style))
 for name,xyz in [("front",(0,-5,2)),("side",(5,0,2)),("angle",(3.2,-5.5,2.6)),("top",(0,-.01,6))]:
  cam.location=xyz;aim(cam,(0,0,0))
  filename=("after" if style else "before")+"_"+name+".png"
  scene.render.filepath=os.path.join(OUT,filename);bpy.ops.render.render(write_still=True)
  results.append(filename)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,"tech01.blend"))
with open(os.path.join(OUT,"manifest.json"),"w") as f:json.dump({"recipe":"R01","blender":bpy.app.version_string,"images":results,"status":"NOT_APPROVED","note":"Blender render only; GLB PBR bake and Three.js pending"},f,indent=2)
