"""Unapproved deterministic volume fog/miasma tiled Cycles QA scene."""
import bpy
from pathlib import Path
out=Path("render-output/qa-volume-tiles").resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
def surface(name,color,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*color,1)
 if emission:
  p.inputs["Emission Color"].default_value=(*color,1)
  p.inputs["Emission Strength"].default_value=emission
 return m
stone=surface("dark-stone",(0.12,0.13,0.19))
glow=surface("violet-emission",(0.55,0.10,0.9),3.0)
for x in (-3.2,0,3.2):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,1,3.1))
 o=bpy.context.object;o.scale=(1.1,1.2,5.8);o.data.materials.append(stone)
for x in (-2.1,2.1):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=0.65,location=(x,-0.2,4))
 bpy.context.object.data.materials.append(glow)
def volume(name,color,density,loc,scale):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=m.node_tree.nodes;n.clear();o=n.new("ShaderNodeOutputMaterial")
 v=n.new("ShaderNodeVolumePrincipled")
 v.inputs["Color"].default_value=(*color,1)
 v.inputs["Density"].default_value=density
 n.links.new(v.outputs["Volume"],o.inputs["Volume"])
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 obj=bpy.context.object;obj.name=name;obj.scale=scale;obj.data.materials.append(m)
volume("violet-miasma",(0.23,0.08,0.35),0.11,(0,-1.0,3.2),(9,3.5,5.4))
volume("low-cold-fog",(0.4,0.55,0.8),0.065,(0,-2.8,1.0),(10,2.2,1.9))
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.use_denoising=True
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.image_settings.color_depth="8"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(out/"volume_probe.blend"))
print("VOLUME_QA_PROBE_SAVED NOT_APPROVED")
