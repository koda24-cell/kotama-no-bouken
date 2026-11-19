#!/usr/bin/env python3
"""Stage 5 ruined knight: separate Gothic breastplate V1, review-only."""
import bpy,math,json,hashlib,os,random
from mathutils import Vector
from pathlib import Path
out=Path("render-output/b5-knights/gothic_breastplate_v2").resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
random.seed(1478)
parts=[]
def mat(name,rgb,metal=.83,rough=.48):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*rgb,1);p.inputs["Metallic"].default_value=metal
 p.inputs["Roughness"].default_value=rough
 return m
steel=mat("worn cold forged steel",(.19,.215,.24),.78,.61)
edge=mat("restrained worn rib highlight",(.245,.258,.27),.78,.55)
black=mat("oxidized recessed back steel",(.11,.115,.12),.55,.77)
rust=mat("old oxidation on concealed lower rim",(.24,.145,.11),.55,.70)
def mesh(name,vert,faces,material=steel,thickness=.0022):
 me=bpy.data.meshes.new(name);me.from_pydata(vert,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(material)
 for p in me.polygons:p.use_smooth=True
 if thickness:
  s=ob.modifiers.new("forged steel thickness","SOLIDIFY");s.thickness=thickness;s.offset=-1
 be=ob.modifiers.new("small forged bevel","BEVEL");be.width=.0008;be.segments=2
 ob.modifiers.new("normal continuity","WEIGHTED_NORMAL")
 uv=me.uv_layers.new(name="front steel UV")
 for p in me.polygons:
  for li in p.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co
   uv.data[li].uv=((v.x+.26)/.52,(v.z-.84)/.64)
 parts.append(ob);return ob
# Real late Gothic breastplates have a wide curved upper breast, narrowing waist,
# collar scoop, shoulder strap mounts and underarm cutaways (not a rectangular box).
# Model only the breastplate proper, no fauld/arms/helmet yet.
rings=[
 # z, half width, top front depth, shoulder/armhole cutout factor
 (0.875,.172,-.102,0.00),
 (0.898,.175,-.104,0.00),
 (0.960,.163,-.114,0.00),
 (1.015,.172,-.123,0.00),
 (1.075,.191,-.142,0.00),
 (1.135,.214,-.167,0.00),
 (1.195,.234,-.179,0.00),
 (1.255,.243,-.176,0.00),
 (1.315,.238,-.162,0.00),
 (1.365,.224,-.147,0.00),
 (1.405,.206,-.131,0.00),
 (1.448,.192,-.111,0.00)]
N=56;verts=[];faces=[]
for j,(z,w,forward,_) in enumerate(rings):
 for i in range(N+1):
  t=(i/N)*2-1
  # Broad compound curvature through the pectorals; flatter near the ribs.
  volume=(1-t*t)**.72
  y=forward-.042*volume
  # sharp but restrained integral keel flowing into plackart region.
  keel=max(0,1-abs(t)/.16)*(.004 if z<1.20 else .002)
  y-=keel
  # anatomically higher outer shoulder straps and shallow scooped neck
  localz=z
  if j>=10:
   p=(j-9)/2
   shoulder_raise=.034*(abs(t)**3)*p
   neck_scoop=.074*(1-abs(t)**1.75)*p
   localz+=shoulder_raise-neck_scoop
  # arm openings swept upward toward armpits; not a rectangular cutout
  if j>=7 and abs(t)>.84:
   localz-=(j-6)/5*.031*((abs(t)-.84)/.16)
  # subtle directional compressed forged facets on lower chest, never stripes
  if z<1.25:
   y+=.0035*max(0,(z-.97)/.28)*abs(t)**2
  verts.append((w*t,y,localz))
for j in range(len(rings)-1):
 for i in range(N):
  k=j*(N+1)+i
  faces.append((k,k+1,k+N+2,k+N+1))
breast=mesh("01 continuous forged breastplate anatomical shell",verts,faces,steel,.0026)
# Rolled rim at V neckline follows top of main plate. A curve is geometrically
# attached to the actual top vertices and deliberately small, NOT raised trim.
def curve(name,pts,rad,material):
 c=bpy.data.curves.new(name,"CURVE");c.dimensions="3D";c.bevel_depth=rad;c.bevel_resolution=3
 sp=c.splines.new("POLY");sp.points.add(len(pts)-1)
 for i,p in enumerate(pts):sp.points[i].co=(*p,1)
 ob=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(ob);c.materials.append(material);parts.append(ob)
top=verts[(len(rings)-1)*(N+1):(len(rings))*(N+1)]
curve("02 folded neck and strap rolled arris",[p for p in top],.0019,edge)
bottom=verts[:N+1]
curve("03 turned lower waist rim",[p for p in bottom],.0023,edge)
# Broad pressed arc-ribs are placed ON the existing surface with small relief;
# NOT decorative floating solid rods. Two split groups, asymmetrical wear.
for sign in (-1,1):
 for channel in range(3):
  points=[]
  for k in range(22):
   z=1.15+(k/21)*.19
   x=sign*(.034+channel*.019+(k/21)*(.090+channel*.009))
   t=x/(.219-(z-1.20)*.13)
   t=max(-.98,min(.98,t))
   # Reconstruct the ACTUAL breastplate front surface at this x and z.
   # V1 used a fixed offset, causing ribs to sink behind the steel shell.
   j=next((q for q in range(len(rings)-1) if rings[q][0]<=z<=rings[q+1][0]),len(rings)-2)
   f=(z-rings[j][0])/(rings[j+1][0]-rings[j][0])
   w=(1-f)*rings[j][1]+f*rings[j+1][1]
   front=(1-f)*rings[j][2]+f*rings[j+1][2]
   tr=max(-.99,min(.99,x/w))
   # Reflect the V1 keel so the flutes sit OUTSIDE, not on the interior face.
   keel=max(0,1-abs(tr)/.16)*(.004 if z<1.20 else .002)
   surf=front-.042*(1-tr*tr)**.72-keel
   # 4mm outside the 2.6mm steel plate + thin rib radius; thin formed relief.
   y=surf-.0045
   points.append((x,y,z))
  curve("04 restrained gothic flute %s %d"%(sign,channel),points,.00165,edge)
def rivet(name,xyz,rad=.0045):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=rad,location=xyz)
 o=bpy.context.object;o.name=name;o.scale=(1,.48,1);o.data.materials.append(black);parts.append(o)
for sign in (-1,1):
 for z,x,y in ((1.42,.19,-.128),(.895,.151,-.13)):
  rivet("05 shoulder/hem fastening %s %.3f"%(sign,z),(sign*x,y,z))
# Minor material imperfections as direct controlled vertex deformation (not scratches drawn on top)
# Existing weathered sallet texture is deliberately NOT pasted onto this new part:
# match its palette first; tune source-image grime/roughness only after inspecting V1.
bpy.ops.object.select_all(action="DESELECT")
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=breast
bpy.ops.export_scene.gltf(filepath=str(out/"gothic_breastplate_v2.glb"),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"gothic_breastplate_v2.blend"))
for obj in parts:obj.select_set(False)
floor=mat("preview backdrop",(.07,.075,.092),0,.94)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.78))
g=bpy.context.object;g.dimensions=(2,2,.035);g.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("preview world")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.22,.23,.27,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.6
for name,loc,energy,size in [("key",(-1.1,-1.6,2.4),80,1.6),("fill",(1.2,-.4,1.9),36,1.3),("rim",(0,1.2,2.1),70,1.5)]:
 ld=bpy.data.lights.new(name,'AREA');ld.energy=energy;ld.size=size
 l=bpy.data.objects.new(name,ld);bpy.context.collection.objects.link(l)
 l.location=loc;l.rotation_euler=(Vector((0,-.12,1.19))-l.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type="ORTHO";camera.data.ortho_scale=.9
scene=bpy.context.scene;scene.camera=camera;scene.render.engine="CYCLES";scene.cycles.samples=48
scene.cycles.use_denoising=False
for layer in scene.view_layers:
 if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
views=[("front",(0,-2,1.48)),("left",(-2,0,1.45)),("right",(2,0,1.45)),("angle",(1.3,-1.7,1.68)),("back",(0,2,1.48)),("top",(0,-.2,2.45))]
for name,pos in views:
 camera.location=pos;camera.rotation_euler=(Vector((0,-.1,1.15))-camera.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(out/(name+".png"));bpy.ops.render.render(write_still=True)
names=["gothic_breastplate_v2.glb","gothic_breastplate_v2.blend"]+[n+".png" for n,_ in views]
hashes={name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in names}
manifest={"asset":"b5_gothic_breastplate","version":2,"approval":"NOT_APPROVED","game_integrated":False,"reference":"Met Museum breastplate ca. 1475–85, Cleveland Gothic Breastplate","reference_urls":["https://www.metmuseum.org/art/collection/search/23143","https://www.clevelandart.org/art/1919.63"],"source_sha":os.environ.get("GITHUB_SHA"),"run_id":os.environ.get("GITHUB_RUN_ID"),"source":"tools/b5-knights/build_gothic_breastplate_v2.py","views":[n for n,_ in views],"files_sha256":hashes,"parts":len(parts),"limitations":"front-only plate; back side intentionally open pending separate backplate and fauld. V2 fixes V1 hidden flutes, tones down studio glare."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(out/"progress.json").write_text(json.dumps({"approval":"NOT_APPROVED","iteration":2,"next":"visually check front/side/angle/back and improve shape before adding plackart or weathering"},indent=2),encoding="utf8")
print("B5_GOTHIC_BREASTPLATE_V1_SIX_VIEWS",hashes)
