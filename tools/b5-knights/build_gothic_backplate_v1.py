#!/usr/bin/env python3
"""B5 Knight Gothic Backplate V1: three overlapping articulated lames; NOT_APPROVED."""
import bpy,math,random,hashlib,json,os
from pathlib import Path
from mathutils import Vector
out=Path("render-output/b5-knights/gothic_backplate_v1").resolve();out.mkdir(parents=True,exist_ok=True)
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
source=Path("render-output/b5-knights/helmet_grime_source_backplate_v1.png")
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
a.pixels[:]=al;a.filepath_raw=str(out/"v22_matched_backplate_albedo_v2.png");a.file_format="PNG";a.save();a.pack()
r=bpy.data.images.new("V22 matched fauld roughness",width=256,height=256,alpha=False)
r.pixels[:]=rough;r.filepath_raw=str(out/"v22_matched_backplate_roughness_v2.png");r.file_format="PNG";r.save();r.pack()
im.pack()
steel=mat("V22 patinated forged steel",(.35,.36,.39),.82,.49,a,r)
dark=mat("lap undercut dark iron",(.13,.14,.16),.67,.76)
rivetmat=mat("aged steel rivets",(.29,.27,.24),.73,.53)
def mesh(name,verts,faces,material=steel):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(material)
 uv=me.uv_layers.new(name="backplate PBR UV")
 for poly in me.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices:
   v=me.vertices[me.loops[loop].vertex_index].co
   uv.data[loop].uv=((v.x+.25)/.5,(v.z-.59)/.33)
 so=ob.modifiers.new("1.8mm forged sheet","SOLIDIFY");so.thickness=.0018;so.offset=-1
 be=ob.modifiers.new("softened punched metal edge","BEVEL");be.width=.00065;be.segments=2
 ob.modifiers.new("surface normal","WEIGHTED_NORMAL")
 parts.append(ob);return ob
# Gothic backplate separate from the front breastplate, seated on the back.
# +Y = wearer rear. Chest V6 front is -Y; upper waist reaches z=.875.
# Shoulder cuts are anatomical, not broad rectangular slab.
# Capture back curvature and narrow waist first; no other armour components.
profiles=[
 # height, half width, rearward central projection
 (.872,.172,.103),(.902,.176,.109),(.967,.170,.119),
 (1.042,.184,.139),(1.123,.210,.161),(1.202,.226,.179),
 (1.285,.231,.188),(1.355,.220,.179),(1.413,.204,.160),
 (1.455,.191,.146)
]
# Two real forged side-panel transitions are integrated into the same mesh.
n=160;verts=[];faces=[]
for q in range(len(profiles)-1):
 z0,w0,y0=profiles[q];z1,w1,y1=profiles[q+1]
 for k in range(5):
  t=k/5
  z=z0+(z1-z0)*t
  w=w0+(w1-w0)*t
  rear=y0+(y1-y0)*t
  for i in range(n+1):
   u=i/n*2-1
   x=w*u
   radius=(1-u*u)**.66
   # convex back shell, with shoulder blades as two broad forged volumes
   shoulder_bulge=.008*math.exp(-((z-1.30)/.13)**2)
   blade=math.exp(-((abs(u)-.48)/.23)**2)
   y=rear+.077*radius+shoulder_bulge*blade
   # shallow vertical upper spine ridge carved from the steel itself
   ridge=.005*math.exp(-(u/.18)**2)*max(0,1-abs(z-1.26)/.22)
   y+=ridge
   # smooth two-stage panel fold approaching narrower waist
   folded=.0048*math.exp(-((abs(u)-.67)/.12)**2)*max(0,1-abs(z-1.24)/.22)
   y+=folded
   local_z=z
   if z>1.413:
    upper=min(1,(z-1.413)/(.042))
    neck_drop=.055*(1-abs(u)**1.7)*upper
    local_z-=neck_drop
    local_z+=.014*(abs(u)**2)*upper
   if z>1.255 and abs(u)>.85:
    upper=min(1,(z-1.255)/(.20))
    local_z-=.024*upper*((abs(u)-.85)/.15)
   verts.append((x,y,local_z))
# highest ring
z,w,rear=profiles[-1]
for i in range(n+1):
 u=i/n*2-1;x=w*u
 y=rear+.077*(1-u*u)**.66+.008*math.exp(-((z-1.30)/.13)**2)*math.exp(-((abs(u)-.48)/.23)**2)
 ridge=.005*math.exp(-(u/.18)**2)*max(0,1-abs(z-1.26)/.22)
 folded=.0048*math.exp(-((abs(u)-.67)/.12)**2)*max(0,1-abs(z-1.24)/.22)
 local_z=z-.055*(1-abs(u)**1.7)+.014*abs(u)**2
 if abs(u)>.85:local_z-=.024*((abs(u)-.85)/.15)
 verts.append((x,y+ridge+folded,local_z))
rows=(len(profiles)-1)*5+1
for j in range(rows-1):
 for i in range(n):
  a=j*(n+1)+i
  faces.append((a,a+1,a+n+2,a+n+1))
assert len(verts)==rows*(n+1)
assert .85<min(v[2] for v in verts)<.92
assert 1.43<max(v[2] for v in verts)<1.50
assert .225<max(v[0] for v in verts)<.25
back=mesh("01 continuous Gothic forged backplate",verts,faces)
# Slightly rolled original steel edge, not an attached thick frame.
def edge_curve(name,coordinates):
 c=bpy.data.curves.new(name,"CURVE");c.dimensions="3D";c.bevel_depth=.0014;c.bevel_resolution=3
 sp=c.splines.new("POLY");sp.points.add(len(coordinates)-1)
 for i,p in enumerate(coordinates):sp.points[i].co=(*p,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(steel);parts.append(o)
edge_curve("02 waist back rolled arris",verts[:n+1])
edge_curve("03 neck rear rolled arris",verts[-(n+1):])
# Fastener anchor dimples, two shoulders and paired waist side attachments
def rivet(pos,name):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.004,location=pos)
 o=bpy.context.object;o.name=name;o.scale=(1,.44,1);o.data.materials.append(rivetmat);parts.append(o)
for side in (-1,1):
 rivet((side*.168,.184,1.426),"04 shoulder strap socket %s"%side)
 rivet((side*.164,.144,.908),"05 waist joining pivot %s"%side)
bpy.ops.object.select_all(action="DESELECT")
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=next(ob for ob in parts if ob.type=="MESH")
bpy.ops.export_scene.gltf(filepath=str(out/"gothic_backplate_v1.glb"),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/"gothic_backplate_v1.blend"))
for ob in parts:ob.select_set(False)
floor=mat("preview only stage floor",(.07,.075,.09),0,.93)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.80))
g=bpy.context.object;g.dimensions=(1.5,1.5,.025);g.data.materials.append(floor)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
world=bpy.context.scene.world or bpy.data.worlds.new("dark stage")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.21,.23,.27,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.65
for name,loc,power,size in [("large soft key",(-.95,-1.4,1.65),72,1.25),("fill",(1.2,-.6,1.4),36,1.1),("rim",(0,1.2,1.7),77,1.1)]:
 ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.size=size
 ob=bpy.data.objects.new(name,ld);bpy.context.collection.objects.link(ob)
 ob.location=loc;ob.rotation_euler=(Vector((0,.13,1.17))-ob.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=.90
scene=bpy.context.scene;scene.camera=cam;scene.render.engine="CYCLES";scene.cycles.samples=36
scene.cycles.use_denoising=False
for layer in scene.view_layers:
 if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.view_settings.view_transform="Standard"
views=[("front",(0,-1.6,1.48)),("left",(-1.5,0,1.47)),("right",(1.5,0,1.47)),
 ("angle",(1.2,1.45,1.57)),("back",(0,1.6,1.48)),("top",(0,.2,2.05))]
for n,pos in views:
 cam.location=pos;cam.rotation_euler=(Vector((0,.13,1.17))-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=str(out/(n+".png"));bpy.ops.render.render(write_still=True)
files=["gothic_backplate_v1.glb","gothic_backplate_v1.blend","v22_matched_backplate_albedo_v2.png","v22_matched_backplate_roughness_v2.png"]+[n+".png" for n,_ in views]
hashes={f:hashlib.sha256((out/f).read_bytes()).hexdigest() for f in files}
manifest={"asset":"gothic_backplate","version":1,"approval":"NOT_APPROVED","game_integrated":False,"source":"tools/b5-knights/build_gothic_backplate_v1.py",
"source_sha":os.environ.get("GITHUB_SHA"),"run_id":os.environ.get("GITHUB_RUN_ID"),"reference":"15th century German Gothic backplate, Met Museum 22881 and 22906","chest_compatibility":"Breastplate V6 lowest Z0.875 / halfwidth .172; backplate low edge .872/.172","source_texture_sha256":"7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23","backplate_segments":1,"views":[n for n,_ in views],"files_sha256":hashes,"parts":len(parts),"limitations":"Backplate only; front breastplate and fauld are separately approved components. Culet and joining straps not yet included."}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(out/"progress.json").write_text(json.dumps({"approval":"NOT_APPROVED","next":"Real-image inspect lap separation, front curvature, side profile and chestline matching; refine before artistic approval"},indent=2))
print("BACKPLATE_V1_REAL_SIX_VIEWS",hashes)
