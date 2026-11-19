#!/usr/bin/env python3
"""B5 sallet V11: independent reconstruction informed by Walters 51.470 multi-view originals.
The prior v1-v6 generators and all game assets remain untouched. NOT_APPROVED.
"""
import bpy, math, os, hashlib, json, random, struct
from mathutils import Vector
from pathlib import Path
rng=random.Random(470)
out=Path("render-output/b5-knights/sallet_v11").resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
parts=[]
def mat(name,rgb,metal=0.0,rough=.65,tex=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*rgb,1)
 p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if tex is not None:
  node=m.node_tree.nodes.new("ShaderNodeTexImage");node.image=tex
  m.node_tree.links.new(node.outputs["Color"],p.inputs["Base Color"])
 return m
# No repeated sine wave/grid in the weathered metal color: fine sparse random non-periodic pits.
tex=bpy.data.images.new("original_worn_steel_v11",width=256,height=256,alpha=False)
pix=[]
for y in range(256):
 for x in range(256):
  # Spatial patina patches / sparse forging marks rather than equal-size black speckles.
  tiny=rng.uniform(-.007,.007)
  broad=.019*math.sin(x*.023+y*.019)*math.cos(y*.032-x*.014)
  field=.014*math.sin(x*.041-y*.037)
  pit= rng.random()<.003
  abrasion= .017 if (abs((x*.31+y*.049)%43-21.5)<.30 and rng.random()<.25) else 0
  c=max(.18,min(.58,.39+tiny+broad+field-(rng.uniform(.045,.10) if pit else 0)+abrasion))
  pix.extend((c*.98,c*1.01,c*1.065,1))
tex.pixels[:]=pix;tex.pack()
steel=mat("01 patinated satin steel crown",(.35,.36,.39),.80,.49,tex)
weathered=mat("01b lower nape aged forged steel",(.26,.275,.297),.73,.67,tex)
bright=mat("02 restrained worn steel arris",(.35,.37,.40),.82,.40)
recess=mat("03 black unlit eye gap and inner shell",(.025,.030,.038),.04,.93)
bronze=mat("04 aged bronze pivot and rivets",(.32,.255,.15),.71,.46)
interior=mat("05 aged oxidized dark interior steel",(.089,.078,.075),.46,.79)
def make(name,verts,faces,material=steel,smooth=True,solid=0):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
 me.materials.append(material);parts.append(ob)
 uv=me.uv_layers.new(name="forged steel UV")
 for poly in me.polygons:
  poly.use_smooth=smooth
  for i in poly.loop_indices:
   v=me.vertices[me.loops[i].vertex_index].co
   uv.data[i].uv=((v.x+.13)/.26,(v.z+.01)/.29)
 if solid:
  md=ob.modifiers.new("real thin forged metal shell","SOLIDIFY");md.thickness=solid
 be=ob.modifiers.new("restrained edge finish","BEVEL");be.width=.001;be.segments=2
 we=ob.modifiers.new("weighted normals","WEIGHTED_NORMAL")
 return ob
N=96
# Dimensions from original 25.5cm H, 22.5cm W, 39.6cm D.
# +Y is face/front; -Y is the sweeping neck tail. z from .015 to .270.
# More section rings around the visor and a progressive backward sweep.
# Radius and fore/aft position are tuned to maintain an unbroken bowl rather than V7's square cavity.
rings=[(.032,.087,.089,-.273),(.047,.100,.099,-.263),(.064,.106,.109,-.244),
       (.080,.110,.115,-.212),(.094,.111,.118,-.183),(.103,.112,.119,-.164),
       (.115,.112,.121,-.149),(.125,.112,.121,-.142),
       (.137,.111,.121,-.132),(.150,.110,.119,-.121),
       (.171,.106,.116,-.115),(.191,.100,.108,-.110),
       (.207,.090,.100,-.103),(.225,.077,.087,-.089),
       (.235,.067,.077,-.081),(.248,.051,.058,-.057),
       (.258,.038,.043,-.043),(.267,.019,.020,-.022),
       (.271,.004,.006,-.006)]
v=[]
for j,(z,rx,front,back) in enumerate(rings):
 for i in range(N):
  a=2*math.pi*i/N
  side=math.cos(a);fwd=math.sin(a)
  # Independently loft front and back, leaving a smooth single-shell tail.
  y=front*max(0,fwd)+back*max(0,-fwd)
  x=rx*side
  # Gentle forged step in the actual bowl geometry around the low rear nape.
  # Small, directional flanging of the hem with a crisp break across adjacent rings.
  if fwd < -.18 and j in (0,1,2,3):
   lip=(.0035,.0070,.0034,0.0)[j]
   x += (1 if side>=0 else -1)*lip*abs(side)
   y -= lip*abs(fwd)*.45
  # Tail's tip recedes at centreline in the rear and flares laterally only near rim.
  if j<4 and fwd<0:
   y+=(1-abs(side))*.013
  v.append((x,y,z))
faces=[]
for j in range(len(rings)-1):
 for i in range(N):
  a=2*math.pi*(i+.5)/N
  # Actual opening forward; the visible visor will be separate, pivoted at temples.
  if j==6 and math.sin(a)>.36:continue
  k=j*N+i;q=j*N+(i+1)%N
  faces.append((k,q,q+N,k+N))
faces.append(tuple((len(rings)-1)*N+i for i in range(N)))
bowl=make("01 continuous bowl with integrated flared rear forged lip",v,faces,steel)
# Locally rougher steel inside the lower nape area, not uniform global rust.
bowl.data.materials.append(weathered)
for p in bowl.data.polygons:
 zc=sum(bowl.data.vertices[vi].co.z for vi in p.vertices)/len(p.vertices)
 yc=sum(bowl.data.vertices[vi].co.y for vi in p.vertices)/len(p.vertices)
 if zc<.095 and yc<-.105:
  p.material_index=1
# V8 visor: a lower metal mask that follows the bowl, closing the old square opening.
# Narrow slit exists in the bowl itself around z .115-.125, not between floating slab pieces.
def visor(name,rows,halfwidth,material=steel):
 V=[];K=80
 for z,scale,forward in rows:
  for i in range(K+1):
   t=i/K*2-1
   x=halfwidth*t*scale
   # Smooth wrap: front central ridge gently proud, lateral edges nearly flush with bowl.
   # Shallower formed plate. Curved vertical relief and rounded temple edge:
   # thin lower lip follows the natural forehead, not a parallel straight rectangle.
   y=forward + .013*(1-t*t) - .010*t*t
   dz=(-.007*abs(t)**2 if z<.09 else -.002*abs(t)**2)
   V.append((x,y,z+.0025*(1-t*t)+dz))
 F=[]
 for j in range(len(rows)-1):
  for i in range(K):
   k=j*(K+1)+i;F.append((k,k+1,k+K+2,k+K+1))
 return make(name,V,F,material,False,.0028)
# A single curved visor below the slit, not V7's double projecting bands.
visor("02 hinged curved lower visor",[(.071,.58,.082),(.088,.88,.104),(.107,.99,.116),(.115,1,.119)],.111)
# Thin weathered slit backliner only, hides light through the eye slit, not a black rectangular hole.
visor("03 recessed eye-shadow backing",[(.114,.85,.106),(.126,.85,.107)],.101,recess)
# The upper brow is now the continuous bowl itself; no extra detached upper strip.
def curve(name,pts,thick,material):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=thick;c.bevel_resolution=2
 s=c.splines.new("POLY");s.points.add(len(pts)-1)
 for i,p in enumerate(pts):s.points[i].co=(*p,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);parts.append(o)
# A creased but controlled forged central comb, broader at the crown then knife-thin.
# Faceted curve catches a narrow highlight rather than making the entire head angular.
curve("05 sharpened continuous forged medial comb",
 [(0,.095,.18),(0,.084,.213),(0,.057,.243),(0,.017,.268),
  (0,-.048,.265),(0,-.085,.233),(0,-.116,.176)],.0013,bright)
def rivet(name,at,r,material=bronze):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=at)
 o=bpy.context.object;o.name=name;o.scale=(r,r,r*.49)
 o.data.materials.append(material);parts.append(o)
for side in (-1,1):
 rivet("06 functional visor pivot "+str(side),(side*.111,.002,.151),.0074)
 # Small edge rivets match physical tail-to-bowl connection.
 for j,y in enumerate((-.145,-.179,-.217)):
  rivet("07 rear nape plate fastening "+str(side)+" "+str(j),(side*(.090-j*.008),y,.086-j*.015),.0028)
# V11: sharpness is integrated into the original bowl's formed lip; no detached bright strips.
# Rear guard inside shallow face: non-textured dark protective metal backing.
# Preview-only lighting / ground are not exported.
bpy.ops.object.select_all(action="DESELECT")
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in parts if o.type=='MESH')
bpy.ops.export_scene.gltf(filepath=str(out/"sallet_v11.glb"),export_format="GLB",use_selection=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(out/"sallet_v11.blend"))
for o in parts:o.select_set(False)
ground=mat("preview floor",(.067,.069,.087))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.006))
g=bpy.context.object;g.dimensions=(1.6,1.6,.012);g.data.materials.append(ground)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("studio world")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.18,.20,.23,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.52
for name,loc,watts,size in [("large soft key",(-1.3,1.4,2.1),47,1.7),("cool fill",(1.1,.8,1.5),27,1.6),("rim",(0,-1.1,1.8),55,1.5)]:
 l=bpy.data.lights.new(name,'AREA');l.energy=watts;l.shape="DISK";l.size=size
 o=bpy.data.objects.new(name,l);bpy.context.collection.objects.link(o)
 o.location=loc;o.rotation_euler=(Vector((0,-.058,.14))-o.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=.55
scene=bpy.context.scene;scene.camera=cam;scene.render.engine="CYCLES";scene.cycles.samples=36
scene.cycles.use_denoising=False
for layer in scene.view_layers:
 if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
views=[("front",(0,1.45,.37)),("left",(-1.5,0,.34)),("right",(1.5,0,.34)),
       ("back",(0,-1.5,.37)),("angle",(1.1,1.2,.47)),("top",(0,0,1.6))]
for name,pos in views:
 cam.location=pos;cam.rotation_euler=(Vector((0,-.064,.146))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(out/(name+".png"))
 bpy.ops.render.render(write_still=True)
checks={}
files=[out/"sallet_v11.glb",out/"sallet_v11.blend"]+[out/(name+".png") for name,_ in views]
for f in files:checks[f.name]=hashlib.sha256(f.read_bytes()).hexdigest()
manifest={"approval":"NOT_APPROVED","game_integrated":False,"source_sha":os.environ.get("GITHUB_SHA"),
"run_id":os.environ.get("GITHUB_RUN_ID"),"source":"tools/b5-knights/build_sallet_v11.py",
"reference":"Walters Art Museum Visored Sallet 51.470 (CC0 11-view gallery)",
"reference_url":"https://art.thewalters.org/object/51.470/",
"dimensions_reference_cm":{"height":25.5,"width":22.5,"depth":39.6},
"views":[n for n,_ in views],"component_count":len(parts),"files_sha256":checks,
"art_review":"V11 integrated flange in bowl geometry, local weathering and reduced detached highlights; artist review pending."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(out/"progress.json").write_text(json.dumps({"iteration":11,"approval":"NOT_APPROVED","checkpoint":"sallet_v11.blend",
"next":"Check V11 rear hem continuity and satin steel against real Walters views; artistic approval still pending"},indent=2))
print("SALLET_V11_RENDERED_SIX_VIEWS",checks)
