#!/usr/bin/env python3
"""Stage 5 ruined knight: separate Gothic breastplate V1, review-only."""
import bpy,math,json,hashlib,os,random
from mathutils import Vector
from pathlib import Path
out=Path("render-output/b5-knights/gothic_breastplate_v6").resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
random.seed(1478)
parts=[]
def mat(name,rgb,metal=.83,rough=.48,texture=None,rough_tex=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*rgb,1);p.inputs["Metallic"].default_value=metal
 p.inputs["Roughness"].default_value=rough
 if texture:
  t=m.node_tree.nodes.new("ShaderNodeTexImage");t.image=texture
  m.node_tree.links.new(t.outputs["Color"],p.inputs["Base Color"])
 if rough_tex:
  t=m.node_tree.nodes.new("ShaderNodeTexImage");t.image=rough_tex
  t.image.colorspace_settings.name="Non-Color"
  m.node_tree.links.new(t.outputs["Color"],p.inputs["Roughness"])
 return m
# V22 sallet shared source: same generated grime image, oxide/soot formulas
# and independently baked GLB PBR baseColor/roughness, not only viewport nodes.
# The GitHub Action decoded the exact approved helmet's source webp pixels.
image_source=Path("render-output/b5-knights/helmet_grime_source_v6.png")
assert image_source.is_file(),"V22 shared grime source PNG missing"
src=bpy.data.images.load(str(image_source.resolve()),check_existing=False)
assert tuple(src.size)==(256,256)
dirty=list(src.pixels)
random.seed(470)
al=[];roughdata=[]
for yy in range(256):
 for xx in range(256):
  i=(yy*256+xx)*4
  tiny=random.uniform(-.007,.007)
  broad=.019*math.sin(xx*.023+yy*.019)*math.cos(yy*.032-xx*.014)
  field=.014*math.sin(xx*.041-yy*.037)
  pit=random.random()<.003
  abrasion=.017 if (abs((xx*.31+yy*.049)%43-21.5)<.30 and random.random()<.25) else 0
  c=max(.18,min(.58,.39+tiny+broad+field-(random.uniform(.045,.10) if pit else 0)+abrasion))
  base=(c*.98,c*1.01,c*1.065)
  patch=math.sin(xx*.021+yy*.028)*math.sin(xx*.029-yy*.009)
  worn=.14 if (xx>178 and yy<85) else 0
  rawrough=max(.25,min(.86,.53+.18*patch+random.uniform(-.025,.025)-worn))
  dr,dg,db=dirty[i:i+3]
  lum=.24*dr+.66*dg+.10*db
  oxide=max(0.,min(1.,(dr-db)*6.5))
  soot=max(0.,min(1.,(.23-lum)*3.7))
  z=yy/255.
  dirt=max(.16,min(.82,.28+.25*(1-z)+.31*oxide+.12*soot))
  target=(min(1.,dr*1.12),dg*(1-.22*oxide),db*(1-.36*oxide))
  shade=1-.15*oxide-.13*soot-.08*(1-z)
  al.extend([max(0,min(1,(base[k]*(1-dirt)+target[k]*dirt)*shade)) for k in range(3)]+[1.])
  r=max(.29,min(.95,rawrough+.09*dirt+.26*oxide+.16*soot))
  roughdata.extend((r,r,r,1.))
al_image=bpy.data.images.new("SalletV22 matching breastplate albedo",width=256,height=256,alpha=False)
al_image.pixels[:]=al;al_image.filepath_raw=str(out/"v22_matched_albedo_v6.png");al_image.file_format="PNG";al_image.save();al_image.pack()
rough_image=bpy.data.images.new("SalletV22 matching roughness",width=256,height=256,alpha=False)
rough_image.pixels[:]=roughdata;rough_image.filepath_raw=str(out/"v22_matched_roughness_v6.png");rough_image.file_format="PNG";rough_image.save();rough_image.pack()
src.pack()
steel=mat("V22 matched worn forged steel PBR",(.34,.35,.36),.82,.49,al_image,rough_image)
edge=mat("V22 softened edge metal",(.29,.30,.31),.80,.57,al_image,rough_image)
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
# Refine the loft to form pressed flutes as real steel surface, not tubes.
base_rings=rings
rings=[]
for j in range(len(base_rings)-1):
 a,b=base_rings[j],base_rings[j+1]
 for q in range(3):
  f=q/3
  rings.append(tuple((1-f)*a[k]+f*b[k] for k in range(len(a))))
rings.append(base_rings[-1])
N=320;verts=[];faces=[]
for j,(z,w,forward,_) in enumerate(rings):
 for i in range(N+1):
  t=(i/N)*2-1
  # Broad compound curvature through the pectorals; flatter near the ribs.
  volume=(1-t*t)**.72
  # Stronger pectoral bulge shaped in the actual mesh, fading toward waist.
  chest=max(0.,min(1.,(z-.99)/.20))*max(0.,min(1.,(1.45-z)/.19))
  broad_bulge=.051+.034*chest
  y=forward-broad_bulge*volume
  # Subtle asymmetric forged plane on left chest, without symmetry-breaking silhouette.
  y-=.0045*chest*math.exp(-((t+.43)/.27)**2)
  # sharp but restrained integral keel flowing into plackart region.
  keel=max(0,1-abs(t)/.21)*(.010 if z<1.20 else .007)
  y-=keel
  # Pressed Gothic forged flutes: geometry is the SAME steel mesh.
  # Three varied ribs on either side; curved from low centre chest outward.
  # Smooth envelope vanishes at both ends, preventing floating bars.
  if 1.145<z<1.345:
   u=(z-1.145)/.20
   envelope=math.sin(math.pi*u)**.80
   xx=w*t
   for sign in (-1,1):
    for channel in range(3):
     offset=.032+channel*.021 + (.095+channel*.010)*u**1.32
     offset+=.007*math.sin(math.pi*u) * (channel/2)
     center=sign*offset
     distance=(xx-center)/.0105
     # Ribs are broad 6-8mm forged folds, not separate cylindrical rods.
     y-=.0068*envelope*math.exp(-.5*distance*distance)
  # anatomically higher outer shoulder straps and shallow scooped neck
  localz=z
  # V4: each z-height controls the shape, NOT the loft ring index.
  # V3 subdivisions multiplied j by three, making 0.6m needle-like wings.
  if z>=1.405:
   p=max(0.0,min(1.0,(z-1.405)/(1.448-1.405)))
   shoulder_raise=.034*(abs(t)**3)*p
   neck_scoop=.074*(1-abs(t)**1.75)*p
   localz+=shoulder_raise-neck_scoop
  # Armpit contour is also bound to the real physical z range.
  if z>=1.255 and abs(t)>.84:
   p=max(0.0,min(1.0,(z-1.255)/(1.448-1.255)))
   localz-=p*.031*((abs(t)-.84)/.16)
  # subtle directional compressed forged facets on lower chest, never stripes
  if z<1.25:
   y+=.0035*max(0,(z-.97)/.28)*abs(t)**2
  verts.append((w*t,y,localz))
for j in range(len(rings)-1):
 for i in range(N):
  k=j*(N+1)+i
  faces.append((k,k+1,k+N+2,k+N+1))
# Fail closed before Blender rendering if the V3 spike/wing pathology regresses.
# This is a geometry bounds check, independent from image quality approval.
zs=[co[2] for co in verts]
xs=[co[0] for co in verts]
assert .84<min(zs)<.90,(min(zs),max(zs))
assert 1.44<max(zs)<1.51,(min(zs),max(zs))
assert .22<max(xs)<.255 and -.255<min(xs)<-.22,(min(xs),max(xs))
breast=mesh("01 continuous forged breastplate anatomical shell",verts,faces,steel,.0026)
# Rolled rim at V neckline follows top of main plate. A curve is geometrically
# attached to the actual top vertices and deliberately small, NOT raised trim.
def curve(name,pts,rad,material):
 c=bpy.data.curves.new(name,"CURVE");c.dimensions="3D";c.bevel_depth=rad;c.bevel_resolution=3
 sp=c.splines.new("POLY");sp.points.add(len(pts)-1)
 for i,p in enumerate(pts):sp.points[i].co=(*p,1)
 ob=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(ob);c.materials.append(material);parts.append(ob)
top=verts[(len(rings)-1)*(N+1):(len(rings))*(N+1)]
curve("02 folded neck and strap rolled arris",[p for p in top],.00135,edge)
bottom=verts[:N+1]
curve("03 turned lower waist rim",[p for p in bottom],.0017,edge)
# Broad pressed arc-ribs are placed ON the existing surface with small relief;
# NOT decorative floating solid rods. Two split groups, asymmetrical wear.
# In V3, the former six floating flute curves were replaced by actual
# low-relief deformations in the upper chest shell vertices (see loft above).
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
bpy.ops.export_scene.gltf(filepath=str(out/"gothic_breastplate_v6.glb"),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"gothic_breastplate_v6.blend"))
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
names=["gothic_breastplate_v6.glb","gothic_breastplate_v6.blend","v22_matched_albedo_v6.png","v22_matched_roughness_v6.png"]+[n+".png" for n,_ in views]
hashes={name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in names}
manifest={"asset":"b5_gothic_breastplate","version":6,"texture_source":"tools/b5-knights/textures/grime_imagegen_v15_256.webp.b64","texture_source_sha256":"7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23","material_match":"Sallet V22 same ImageGen grime and oxide/soot formula, PBR basecolor/roughness GLB-embedded","approval":"NOT_APPROVED","game_integrated":False,"reference":"Met Museum breastplate ca. 1475–85, Cleveland Gothic Breastplate","reference_urls":["https://www.metmuseum.org/art/collection/search/23143","https://www.clevelandart.org/art/1919.63"],"source_sha":os.environ.get("GITHUB_SHA"),"run_id":os.environ.get("GITHUB_RUN_ID"),"source":"tools/b5-knights/build_gothic_breastplate_v6.py","views":[n for n,_ in views],"files_sha256":hashes,"parts":len(parts),"limitations":"front-only chest piece; backplate/fauld not included. V6 smooth wider formed ribs and V22-compatible aged metal, still a separate unapproved plate."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(out/"progress.json").write_text(json.dumps({"approval":"NOT_APPROVED","iteration":6,"next":"visually check front/side/angle/back and improve shape before adding plackart or weathering"},indent=2),encoding="utf8")
print("B5_GOTHIC_BREASTPLATE_V6_SIX_VIEWS",hashes)
