#!/usr/bin/env python3
"""B5 Knight Gothic Tassets V1: three overlapping articulated lames; NOT_APPROVED."""
import bpy,math,random,hashlib,json,os
from pathlib import Path
from mathutils import Vector
out=Path("render-output/b5-knights/gothic_tassets_v1").resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
parts=[]
def mat(name,color,metal=.82,rough=.54,tex=None,roughmap=None):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*color,1);p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if tex:
  n=m.node_tree.nodes.new("ShaderNodeTexImage");n.image=tex;m.node_tree.links.new(n.outputs["Color"],p.inputs["Base Color"])
 if roughmap:
  n=m.node_tree.nodes.new("ShaderNodeTexImage");n.image=roughmap;n.image.colorspace_settings.name="Non-Color"
  m.node_tree.links.new(n.outputs["Color"],p.inputs["Roughness"])
 return m
source=Path("render-output/b5-knights/helmet_grime_source_tassets_v1.png")
assert source.exists(),"V22 grime pixels must be decoded before any PBR generation"
im=bpy.data.images.load(str(source.resolve()));assert tuple(im.size)==(256,256)
dirty=list(im.pixels);rng=random.Random(470);al=[];rough=[]
for y in range(256):
 for x in range(256):
  i=4*(y*256+x)
  tiny=rng.uniform(-.007,.007)
  broad=.019*math.sin(x*.023+y*.019)*math.cos(y*.032-x*.014)
  field=.014*math.sin(x*.041-y*.037)
  pit=rng.random()<.003
  abrasion=.017 if abs((x*.31+y*.049)%43-21.5)<.30 and rng.random()<.25 else 0
  c=max(.18,min(.58,.39+tiny+broad+field-(rng.uniform(.045,.10) if pit else 0)+abrasion))
  base=(c*.98,c*1.01,c*1.065)
  patch=math.sin(x*.021+y*.028)*math.sin(x*.029-y*.009)
  wrn=.14 if x>178 and y<85 else 0
  rawrough=max(.25,min(.86,.53+.18*patch+rng.uniform(-.025,.025)-wrn))
  dr,dg,db=dirty[i:i+3]
  lum=.24*dr+.66*dg+.10*db
  oxid=max(0,min(1,(dr-db)*6.5));soot=max(0,min(1,(.23-lum)*3.7))
  z=y/255;dirt=max(.16,min(.82,.28+.25*(1-z)+.31*oxid+.12*soot))
  target=(min(1,dr*1.12),dg*(1-.22*oxid),db*(1-.36*oxid))
  shade=1-.15*oxid-.13*soot-.08*(1-z)
  al.extend([max(0,min(1,(base[k]*(1-dirt)+target[k]*dirt)*shade)) for k in range(3)]+[1.])
  r=max(.29,min(.95,rawrough+.09*dirt+.26*oxid+.16*soot))
  rough.extend((r,r,r,1.))
a=bpy.data.images.new("V22 matched tassets color",width=256,height=256,alpha=False)
a.pixels[:]=al;a.filepath_raw=str(out/"v22_matched_tassets_albedo_v1.png");a.file_format="PNG";a.save();a.pack()
r=bpy.data.images.new("V22 matched tassets roughness",width=256,height=256,alpha=False)
r.pixels[:]=rough;r.filepath_raw=str(out/"v22_matched_tassets_roughness_v1.png");r.file_format="PNG";r.save();r.pack()
im.pack()
steel=mat("V22 patinated forged steel",(.35,.36,.39),.82,.49,a,r)
dark=mat("lap undercut dark iron",(.13,.14,.16),.67,.76)
rivetmat=mat("aged steel rivets",(.29,.27,.24),.73,.53)
def mesh(name,verts,faces,material=steel):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(material)
 uv=me.uv_layers.new(name="tassets PBR UV")
 for poly in me.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices:
   v=me.vertices[me.loops[loop].vertex_index].co
   uv.data[loop].uv=((v.x+.3)/.6,(v.z-.30)/.45)
 so=ob.modifiers.new("1.8mm forged sheet","SOLIDIFY");so.thickness=.0018;so.offset=-1
 be=ob.modifiers.new("softened punched metal edge","BEVEL");be.width=.00065;be.segments=2
 ob.modifiers.new("surface normal","WEIGHTED_NORMAL")
 parts.append(ob);return ob
# Backplate V2 lower boundary z ~0.872, halfwidth ~0.172.
# Three independent overlapping rear sheets; lower ones flare over hips.
# Y rear is positive, and uppermost lame tucks underneath the V2 backplate.
# Front-facing paired tassets, first separate component after fauld V2.
# Coordinate +Z up, -Y front; upper hinge tucks below fauld's lowest edge z=.665.
# Each thigh gets two organic forged lames, with sideways flaring and pointed hem.
N=64; H=20
tassets=[]
for side in (-1,1):
 for band in range(2):
  upper,lower=(.690,.475) if band==0 else (.515,.347)
  verts=[];faces=[]
  for j in range(H+1):
   f=j/H
   z=lower+(upper-lower)*f
   for k in range(N+1):
    t=2*k/N-1
    # Half width broadens at hip and narrows towards knee, following thigh.
    w=(.089 if band==0 else .082)+.012*f
    centre=side*(.124+.009*(1-f))
    # Curve continuously over front of leg, with subtle outward-turning side edges.
    x=centre+w*t
    convex=.032*(1-t*t)**.8
    y=-.167-.020*(1-f)-convex+.008*abs(t)**1.6
    # Gothic central spine and asymmetric panel facets sculpted into metal, not tubes.
    keel=.009*math.exp(-((t-.08*side)/.20)**2)*math.sin(math.pi*f)**.7
    flank=.004*math.exp(-((abs(t)-.70)/.16)**2)*math.sin(math.pi*f)
    y-=keel+flank
    # Mild pointed bottom with shallow swept-edge scallop; no paper-flat hem.
    zs=z+(.017*(1-abs(t))**1.6 if band==1 else .006*(1-abs(t))**1.2)*(1-f)**3
    verts.append((x,y,zs))
  for j in range(H):
   for k in range(N):
    a=j*(N+1)+k
    # Winding for outward-facing normal on -Y front (important for solidify)
    faces.append((a,a+N+1,a+N+2,a+1))
  name="%s thigh %s articulated Gothic tasset"%( "01 upper" if band==0 else "02 lower", "L" if side<0 else "R")
  obj=mesh(name,verts,faces)
  tassets.append(name)
  # Minimal side pivots, anchored close to each upper outer edge.
  for ts in (-1,1):
   px=side*(.124+.009*.15)+ts*((.089 if band==0 else .082)+.012*.85)*.89
   py=-.167-.020*.15-.032*(1-.89**2)**.8+.008*.89**1.6-.003
   bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.0035,location=(px,py,upper-.024))
   ob=bpy.context.object;ob.name="03 aged sliding pivot %s %d %d"%(side,band,ts)
   ob.scale=(1,.42,1);ob.data.materials.append(rivetmat);parts.append(ob)
assert len(tassets)==4
assert len({p for p in tassets})==4
bpy.ops.object.select_all(action="DESELECT")
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=next(ob for ob in parts if ob.type=="MESH")
bpy.ops.export_scene.gltf(filepath=str(out/"gothic_tassets_v1.glb"),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"gothic_tassets_v1.blend"))
for ob in parts:ob.select_set(False)
floor=mat("preview only stage floor",(.07,.075,.09),0,.93)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.22))
g=bpy.context.object;g.dimensions=(1.5,1.5,.025);g.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("dark stage")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.21,.23,.27,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.65
for name,loc,power,size in [("large soft key",(-.95,-1.4,1.65),72,1.25),("fill",(1.2,-.6,1.4),36,1.1),("rim",(0,1.2,1.7),77,1.1)]:
 ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.size=size
 ob=bpy.data.objects.new(name,ld);bpy.context.collection.objects.link(ob)
 ob.location=loc;ob.rotation_euler=(Vector((0,-.13,.78))-ob.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=.75
scene=bpy.context.scene;scene.camera=cam;scene.render.engine="CYCLES";scene.cycles.samples=36
scene.cycles.use_denoising=False
for layer in scene.view_layers:
 if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.view_settings.view_transform="Standard"
views=[("front",(0,-1.6,.78)),("left",(-1.5,0,.77)),("right",(1.5,0,.77)),
 ("angle",(1.2,-1.45,.85)),("back",(0,1.6,.78)),("top",(0,-.2,1.52))]
for n,pos in views:
 cam.location=pos;cam.rotation_euler=(Vector((0,-.20,.54))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(out/(n+".png"));bpy.ops.render.render(write_still=True)
files=["gothic_tassets_v1.glb","gothic_tassets_v1.blend","v22_matched_tassets_albedo_v1.png","v22_matched_tassets_roughness_v1.png"]+[n+".png" for n,_ in views]
hashes={f:hashlib.sha256((out/f).read_bytes()).hexdigest() for f in files}
manifest={"asset":"gothic_tassets","version":1,"approval":"NOT_APPROVED","game_integrated":False,"source":"tools/b5-knights/build_gothic_tassets_v1.py",
"source_sha":os.environ.get("GITHUB_SHA"),"run_id":os.environ.get("GITHUB_RUN_ID"),"reference":"Late Gothic continuous overlapping waist lames","chest_compatibility":"Fauld V2 bottom Z0.665, upper tassets start Z0.690, lower tassets Z0.347","source_texture_sha256":"7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23","lame_count":len(tassets),"views":[n for n,_ in views],"files_sha256":hashes,"parts":len(parts),"limitations":"V1 independent paired articulated thigh tassets; requires assembly check with fauld V2. Artist approval pending."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(out/"progress.json").write_text(json.dumps({"approval":"NOT_APPROVED","next":"Real-image inspect lap separation, front curvature, side profile and chestline matching; refine before artistic approval"},indent=2))
print("TASSETS_V1_REAL_SIX_VIEWS",hashes)
