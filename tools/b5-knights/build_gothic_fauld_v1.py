#!/usr/bin/env python3
"""B5 Knight Gothic Fauld V1: three overlapping articulated lames; NOT_APPROVED."""
import bpy,math,random,hashlib,json,os
from pathlib import Path
from mathutils import Vector
out=Path("render-output/b5-knights/gothic_fauld_v1").resolve();out.mkdir(parents=True,exist_ok=True)
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
source=Path("render-output/b5-knights/helmet_grime_source_fauld_v1.png")
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
a=bpy.data.images.new("V22 matched fauld color",width=256,height=256,alpha=False)
a.pixels[:]=al;a.filepath_raw=str(out/"v22_matched_fauld_albedo_v1.png");a.file_format="PNG";a.save();a.pack()
r=bpy.data.images.new("V22 matched fauld roughness",width=256,height=256,alpha=False)
r.pixels[:]=rough;r.filepath_raw=str(out/"v22_matched_fauld_roughness_v1.png");r.file_format="PNG";r.save();r.pack()
im.pack()
steel=mat("V22 patinated forged steel",(.35,.36,.39),.82,.49,a,r)
dark=mat("lap undercut dark iron",(.13,.14,.16),.67,.76)
rivetmat=mat("aged steel rivets",(.29,.27,.24),.73,.53)
def mesh(name,verts,faces,material=steel):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(material)
 uv=me.uv_layers.new(name="fauld PBR UV")
 for poly in me.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices:
   v=me.vertices[me.loops[loop].vertex_index].co
   uv.data[loop].uv=((v.x+.25)/.5,(v.z-.59)/.33)
 so=ob.modifiers.new("1.8mm forged sheet","SOLIDIFY");so.thickness=.0018;so.offset=-1
 be=ob.modifiers.new("softened punched metal edge","BEVEL");be.width=.00065;be.segments=2
 ob.modifiers.new("surface normal","WEIGHTED_NORMAL")
 parts.append(ob);return ob
# Chest plate V6 lower boundary z ~0.875, halfwidth ~0.172.
# Three independent overlapping sheets; lower ones sweep outward to hip.
# Y front is negative, and top remains partially inside the prior breastplate.
N=80;H=9
bands=[
 {"upper":.892,"lower":.807,"wtop":.171,"wbottom":.183,"fwd":-.165,"flare":.013},
 {"upper":.832,"lower":.739,"wtop":.180,"wbottom":.207,"fwd":-.165,"flare":.024},
 {"upper":.762,"lower":.665,"wtop":.203,"wbottom":.228,"fwd":-.160,"flare":.038}
]
for b,par in enumerate(bands):
 verts=[];faces=[]
 for j in range(H):
  zf=j/(H-1);z=par["lower"]+(par["upper"]-par["lower"])*zf
  width=par["wbottom"]+(par["wtop"]-par["wbottom"])*zf
  for i in range(N+1):
   t=2*i/N-1
   # Forged front wraps pelvis rather than flat front. Flared distal lip.
   forward=par["fwd"]-.026*(1-t*t)**.76-par["flare"]*(1-zf)**2
   # Articulated central forward keel; fades into side wing tips.
   keel=.0035*(1-abs(t))**3*(.25+.75*(1-zf))
   # hammered diagonal transition creates broad changing plane, not tube trim
   plane=.003*math.sin(math.pi*zf)*(abs(t)**1.3)*(1-abs(t))
   y=forward-keel+plane
   lower_arch=.011*(1-abs(t))**2*(1-zf)
   verts.append((width*t,y,z+lower_arch))
 for j in range(H-1):
  for i in range(N):
   k=j*(N+1)+i;faces.append((k,k+1,k+N+2,k+N+1))
 mesh("0%d articulated overlapping Gothic waist lame"%(b+1),verts,faces)
 # each horizontal plate has a real rear-facing thickness, overlap 2–3 cm.
 # small under-lap liner to emphasize dark natural separation at gaps
 def rivet(pos,name):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.0037,location=pos)
  o=bpy.context.object;o.name=name;o.scale=(1,.45,1);o.data.materials.append(rivetmat);parts.append(o)
 for side in (-1,1):
  t=side*.86;z=par["upper"]-.014
  w=par["wtop"]+(par["wbottom"]-par["wtop"])*(.014/(par["upper"]-par["lower"]))
  y=par["fwd"]-.026*(1-t*t)**.76-par["flare"]*(.014/(par["upper"]-par["lower"]))**2
  rivet((w*t,y-.004,z),"0%d sliding pivot side %s"%(b+1,side))
# Separation QA: each band is structurally independent and overlaps the next.
assert all(bands[k]["upper"]>bands[k-1]["lower"] for k in (1,2))
assert bands[0]["upper"]>.875 and bands[-1]["lower"]>.64
bpy.ops.object.select_all(action="DESELECT")
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=next(ob for ob in parts if ob.type=="MESH")
bpy.ops.export_scene.gltf(filepath=str(out/"gothic_fauld_v1.glb"),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"gothic_fauld_v1.blend"))
for ob in parts:ob.select_set(False)
floor=mat("preview only stage floor",(.07,.075,.09),0,.93)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.57))
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
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=.72
scene=bpy.context.scene;scene.camera=cam;scene.render.engine="CYCLES";scene.cycles.samples=36
scene.cycles.use_denoising=False
for layer in scene.view_layers:
 if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.view_settings.view_transform="Standard"
views=[("front",(0,-1.6,1.03)),("left",(-1.5,0,1.02)),("right",(1.5,0,1.02)),
 ("angle",(1.2,-1.45,1.16)),("back",(0,1.6,1.03)),("top",(0,-.2,1.85))]
for n,pos in views:
 cam.location=pos;cam.rotation_euler=(Vector((0,-.11,.77))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(out/(n+".png"));bpy.ops.render.render(write_still=True)
files=["gothic_fauld_v1.glb","gothic_fauld_v1.blend","v22_matched_fauld_albedo_v1.png","v22_matched_fauld_roughness_v1.png"]+[n+".png" for n,_ in views]
hashes={f:hashlib.sha256((out/f).read_bytes()).hexdigest() for f in files}
manifest={"asset":"gothic_fauld","version":1,"approval":"NOT_APPROVED","game_integrated":False,"source":"tools/b5-knights/build_gothic_fauld_v1.py",
"source_sha":os.environ.get("GITHUB_SHA"),"run_id":os.environ.get("GITHUB_RUN_ID"),"reference":"Late Gothic continuous overlapping waist lames","chest_compatibility":"Breastplate V6 lower edge Z0.875, upper fauld lame Z0.892","source_texture_sha256":"7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23","lame_count":len(bands),"views":[n for n,_ in views],"files_sha256":hashes,"parts":len(parts),"limitations":"front-side fauld only, back culet/tassets are separate subsequent assets; preview without chest plate"}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(out/"progress.json").write_text(json.dumps({"approval":"NOT_APPROVED","next":"Real-image inspect lap separation, front curvature, side profile and chestline matching; refine before artistic approval"},indent=2))
print("FAULD_V1_REAL_SIX_VIEWS",hashes)
