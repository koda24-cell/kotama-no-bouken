"""3F overgrown switchback stair reference study V2.
A large independent multi-cell structure, NOT a replacement for approved modular stairs V8.
All textures are generated in Blender, no unlicensed reference image reuse.
"""
import bpy, math, random, os, json, hashlib
from mathutils import Vector
random.seed(271117)
OUT="/work/out";os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
def mat(name,rgb,metal=0,rough=.9):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*rgb,1)
 p.inputs["Roughness"].default_value=rough;p.inputs["Metallic"].default_value=metal
 return m
concrete=mat("V1 decades old wet stained grey concrete",(.26,.29,.255),0,.96)
broken=mat("V1 exposed darker aggregate",(.18,.19,.16))
moss=mat("V1 moss deep olive",(.10,.18,.075))
mosslight=mat("V1 moss lit sage",(.25,.32,.13))
rust=mat("V1 rusted iron railing",(.22,.075,.048),.55,.84)
rustdark=mat("V1 deeply oxidized joints",(.115,.055,.04),.68,.91)
stain=mat("V1 water streak translucent dark green",(.12,.16,.115))
# Deterministic image-backed albedo and OpenGL tangent normal maps that survive GLB.
N=256
for m,kind in ((concrete,1),(broken,2)):
 img=bpy.data.images.new("V1 mapped old concrete albedo "+str(kind),width=N,height=N,alpha=True)
 normal=bpy.data.images.new("V1 mapped concrete tangent normal "+str(kind),width=N,height=N,alpha=True)
 pix=[];nor=[]
 for y in range(N):
  for x in range(N):
   a=x*math.tau/N;b=y*math.tau/N
   coarse=.48+.17*math.sin(3*a+.4*math.sin(4*b))*math.cos(5*b)+.11*math.sin(11*a+7*b)+.045*math.cos(37*a-24*b)
   fleck=.07*math.sin(51*a+21*b)*math.sin(43*b-17*a)
   wet=.065*max(0,math.sin(a*2+b*7))+.07*max(0,math.sin(3*a+9*b))**3
   v=max(.17,min(.85,coarse+fleck-wet))
   c=(.19+.26*v,.20+.27*v,.175+.22*v) if kind==1 else (.12+.21*v,.13+.22*v,.115+.19*v)
   pix.extend((*c,1.))
   dx=.24*math.cos(11*a+7*b)+.17*math.sin(51*a+21*b)
   dy=.24*math.sin(3*a-5*b)+.16*math.cos(43*b-17*a)
   nn=Vector((-dx,-dy,1.));nn.normalize()
   nor.extend((.5+nn.x*.5,.5+nn.y*.5,.5+nn.z*.5,1.))
 img.pixels.foreach_set(pix);normal.pixels.foreach_set(nor)
 img.pack();normal.pack();normal.colorspace_settings.name="Non-Color"
 nodes=m.node_tree.nodes;links=m.node_tree.links
 al=nodes.new("ShaderNodeTexImage");al.image=img;al.label="GLB embedded albedo"
 nt=nodes.new("ShaderNodeTexImage");nt.image=normal;nt.label="GLB embedded normal"
 nm=nodes.new("ShaderNodeNormalMap");nm.inputs["Strength"].default_value=.68
 p=nodes.get("Principled BSDF")
 links.new(al.outputs["Color"],p.inputs["Base Color"])
 links.new(nt.outputs["Color"],nm.inputs["Color"]);links.new(nm.outputs["Normal"],p.inputs["Normal"])
def cube(name,xyz,dim,material,bevel=.018):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz);o=bpy.context.object;o.name=name;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new("rounded eroded concrete edge","BEVEL");mod.width=bevel;mod.segments=2
  o.modifiers.new("corner normals","WEIGHTED_NORMAL")
 return o
def rod(name,a,b,r,material,vertices=12):
 a=Vector(a);b=Vector(b);delta=b-a
 if delta.length<.00001:return
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=delta.length,location=(a+b)/2)
 o=bpy.context.object;o.name=name;o.rotation_euler=delta.to_track_quat("Z","Y").to_euler();o.data.materials.append(material)
 return o
def cut(obj,pt,scale,label):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=pt)
 c=bpy.context.object;c.name="temporary irregular break";c.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=obj.modifiers.new(label,"BOOLEAN");mod.operation="DIFFERENCE";mod.solver="EXACT";mod.object=c
 bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(c,do_unlink=True)
def drip(x,y,z,length,i):
 # Dark rain and algae streaks descending from supported horizontal concrete.
 strip=cube("slow water run-off "+str(i),(x,y,z-length/2),(.038,.012,length),stain,.005)
 return strip
# Geometry: two *opposing* flights; outer widths 1.45 m; levels 0->2.05->4.10.
# x runs -3.3 to +1.6, switchback is on east side, upper platform west.
X0=-3.4; X1=1.30; STEPS=14; W=1.42
# A full upper platform and middle turning landing, both with thick slab/beam.
middle=cube("V1 middle turnaround landing",(1.48,0,2.005),(2.40,3.18,.25),concrete,.045)
top=cube("V1 broad upper exposed landing",(-3.52,.98,4.05),(2.18,1.86,.29),concrete,.045)
bottom=cube("V1 weathered entry landing",(-3.48,-.96,.035),(1.86,1.87,.24),concrete,.04)
cut(middle,(2.64,-1.38,2.10),(.29,.30,.28),"old cracked edge")
cut(top,(-4.50,.23,4.17),(.30,.34,.28),"broken upper platform")
# Heavy load-bearing posts: core support columns actually reach under slabs.
for x,y,upper in [(2.27,-1.12,1.89),(2.27,1.11,1.89),(-4.10,.44,3.90),(-4.10,1.57,3.90)]:
 o=cube("V1 massive load bearing pillar",(x,y,upper/2),(.27,.27,upper),concrete,.024)
 cut(o,(x+.15,y-.14,upper*.43),(.16,.16,.26),"weathered pillar corner")
 # partial vertical green grime as thin strips rather than noisy floating moss particles
 for k in range(3):
  drip(x-.07+k*.07,y-.141,upper-.13,.50+k*.13,k+int(x*100))
# Structural braces make platforms read as engineered rather than floating.
for xx,yy,zz,l in [(2.15,0,1.72,3.2),(-4.05,.98,3.76,1.8)]:
 cube("V1 landing concrete load beam",(xx,yy,zz),(.31,l,.36),broken,.025)
for upper in (False,True):
 y=-.96 if not upper else .98
 z0=0.12 if not upper else 2.17
 z1=1.97 if not upper else 4.02
 # Directions: lower climbs eastward; upper climbs westward.
 def at(t):
  x=X0+(X1-X0)*t if not upper else X1-(X1-X0)*t
  return (x,y,z0+(z1-z0)*t)
 for i in range(STEPS):
  t=(i+.48)/STEPS
  x,yc,z=at(t)
  o=cube(("V1 upper" if upper else "V1 lower")+" worn structural tread %02d"%i,
         (x,yc,z),(4.72/STEPS+.042,W,.16),concrete,.014)
  # Tread edges irregularly shattered with controlled varied severities.
  if i in (2,5,9,12):
   edge_y=yc+(.67 if i%2 else -.67)
   cut(o,(x+.095,edge_y,z+.05),(.18+.04*(i%3),.21,.145),"missing stair corner")
  # Broad patches of moss settle at back of damp tread, not tiny green dots.
  if i not in (0,3,11):
   yy=yc+(.49 if i%3 else -.42)
   green=moss if i%2 else mosslight
   cube("V1 rooted dark moss on step",(x,yy,z+.084),(.22+.06*(i%3),.13,.013),green,.007)
  if i%4==1:
   cube("V1 oxide streak on step",(x-.09,yc-.67,z+.088),(.09,.018,.006),rustdark,.002)
 # Long inclined structural side girders actually reach the landings
 for side in (-1,1):
  p0=Vector(at(0));p1=Vector(at(1));p0.y+=side*.57;p1.y+=side*.57
  start=p0+Vector((0,0,-.20));end=p1+Vector((0,0,-.20))
  seg=end-start
  beam=cube("V1 connected reinforced inclined concrete stringer",(start+end)/2,(seg.length,.19,.29),broken,.025)
  beam.rotation_euler.y=-math.atan2(seg.z,seg.x)
  # Irregular big eroded side faces, with exposed rebar at related locations.
  for ti in (.23,.77):
   pp=start.lerp(end,ti)
   cut(beam,(pp.x,pp.y+side*.13,pp.z),(.18,.19,.14),"structural damage underneath flight")
   rod("V1 fractured core exposed rebar",(pp.x-.15,pp.y,pp.z+.02),(pp.x+.18,pp.y+side*.02,pp.z+.08),.011,rustdark)
 # Rusted narrow steel posts and two continuous rails with bends.
 for side in (-1,1):
  control=[]
  for k in range(6):
   t=k/5;x,yy,z=at(t);yy+=side*.77
   topz=z+.93
   if upper and k==4:topz-=.10
   control.append((x,yy,topz))
   rod("V1 rusty vertical railing post",(x,yy,z+.04),(x,yy,topz),.024,rust)
   cube("V1 worn socket plate",(x,yy,z+.045),(.11,.12,.045),rustdark,.008)
  for k in range(5):
   a=control[k];b=control[k+1]
   rod("V1 weathered upper steel handrail",a,b,.025,rust)
   lower_a=(a[0],a[1],a[2]-.38);lower_b=(b[0],b[1],b[2]-.38)
   rod("V1 corroded mid rail",lower_a,lower_b,.016,rustdark)
# Middle landing iron guard surrounds outer free edges with discontinuity at stairs.
for y in (-1.42,1.42):
 for x in (.80,1.60,2.30):
  rod("V1 middle landing upright",(x,y,2.13),(x,y,3.05),.025,rust)
 rod("V1 middle platform safety railing",(.80,y,3.05),(2.30,y,3.05),.027,rust)
# Top level guard rails and little vertical iron struts.
for y in (.15,1.77):
 for x in (-4.25,-3.49,-2.74):
  rod("V1 high landing rail upright",(x,y,4.21),(x,y,5.12),.023,rust)
 rod("V1 top handrail",(-4.25,y,5.12),(-2.74,y,5.12),.026,rust)
# Height controlled algae bands and long rain tracks on concrete side walls.
for x,y,z,n in [(-4.25,.06,4.02,0),(-3.72,.06,3.89,1),(2.5,-1.3,1.99,2),(2.2,1.3,1.99,3)]:
 drip(x,y,z,.43+.12*n,70+n)
# V2: humid forest-enclosed concrete with stratified green decay.
# Structural first: positive load path under the two exposed decks.
for x,y,z,leny in [(-3.85,.98,3.73,1.55),(1.80,-.15,1.65,2.75)]:
 cube("V2 thick transverse engineering crossbeam",(x,y,z),(.40,leny,.38),broken,.035)
for x,y,z in [(-3.95,.98,3.29),(1.97,-.30,1.25)]:
 rod("V2 embedded oxidized diagonal bracing",(x-.25,y-.48,z-.25),(x+.15,y+.38,z+.45),.044,rustdark)
# Broad irregular moss curtains grow down from horizontal concrete ledges.
# They are a coherent attached layer, never free-floating small grains.
for upper in (False,True):
 y=-.96 if not upper else .98
 zbase=.12 if not upper else 2.17
 for i in range(STEPS):
  t=(i+.48)/STEPS
  x=X0+(X1-X0)*t if not upper else X1-(X1-X0)*t
  z=zbase+1.85*t
  left_side=y-.62
  # Weathering accumulates along outer stair edges and former construction seams.
  if i%5!=0:
   moss_width=.21+.07*(i%3)
   cube("V2 coherent organic film along stair riser",(x,left_side,z-.020),
       (.26,moss_width,.016),mosslight if i%4==0 else moss,.006)
  if i%3==1:
   cube("V2 pooled black green joint dampness",(x,y+.53,z+.083),
       (.29,.19,.007),stain,.003)
  if i%4 in (1,2):
   # short damp streak on outside vertical riser, physically connected to top.
   cube("V2 descending old moss on broken riser",(x,left_side-.016,z-.053),
       (.18,.011,.11),moss,.006)
# Moist atmospheric water staining on column surfaces and landing slab faces.
for k,(x,y,h) in enumerate([(2.27,-1.12,1.89),(2.27,1.11,1.89),(-4.10,.44,3.90),(-4.10,1.57,3.90)]):
 for j in range(4):
  offset=(-.095+j*.062)
  drip(x+offset,y-.145,h*.95,.34+.21*((k+j)%3),110+k*5+j)
 # Moss appears heaviest on the damp foot of supports.
 for j in (-1,1):
  cube("V2 lichen rooted at base of pillar",(x+j*.07,y-.14,.15),(.095,.012,.30),
       moss if j==-1 else mosslight,.006)
# Red-brown oxidation at actual metal-to-concrete mechanical anchor points.
for upper in (False,True):
 y=-.96 if not upper else .98
 for side in (-1,1):
  for k in (0,2,4,5):
   t=k/5
   x=X0+(X1-X0)*t if not upper else X1-(X1-X0)*t
   z=(.12 if not upper else 2.17)+1.85*t
   yy=y+side*.77
   cube("V2 deeply oxidized plate and embedded footing",(x,yy,z+.014),
        (.145,.14,.05),rustdark,.009)
   # Rust wash sits below fixing on concrete side, not on arbitrary surfaces.
   cube("V2 localized rusty concrete seepage",(x,yy-side*.10,z-.064),
        (.11,.009,.10),rust,.006)
# Broad moss patches at exposed landing edges, tapering to light sage.
for landing,x,y,z,w in ((1,-3.50,.98,4.19,1.70),(2,1.49,0,2.14,2.25)):
 for j in range(7):
  xx=x-w*.45+j*w/7
  yy=y+(-.61 if j%2 else .58)
  patch_len=.22+.07*((j+landing)%3)
  cube("V2 weathered moss layer on open landing",(xx,yy,z+.007),
       (patch_len,.19+.06*(j%2),.012),moss if j%3 else mosslight,.005)
# Controlled variation in rust and greenery, not saturated plastic colors.
rust.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value=.91
moss.diffuse_color=(.095,.185,.066,1)
mosslight.diffuse_color=(.21,.27,.11,1)
# Keep source geometry unique. Smart unwrap for mapped images on all concrete.
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 if not o.data.uv_layers:
  bpy.ops.object.select_all(action="DESELECT");o.select_set(True)
  bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode="EDIT");bpy.ops.mesh.select_all(action="SELECT")
  bpy.ops.uv.smart_project(island_margin=.02)
  bpy.ops.object.mode_set(mode="OBJECT")
# Export only physical mesh, not cameras / lamps. Capture checkpoints before export.
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/floor3_overgrown_switchback_v2.blend",compress=True)
bpy.ops.object.select_all(action="DESELECT")
meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.export_scene.gltf(filepath=OUT+"/floor3_overgrown_switchback_v2.glb",export_format="GLB",use_selection=True,export_apply=True)
# Studio lighting, neutral dark environment, no false image background.
world=bpy.data.worlds.new("dark neutral preview world")
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes.get("Background").inputs["Color"].default_value=(.035,.038,.04,1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.55
for pos,power,size in [((1,-6,9),1850,7),((-5,3,8),1550,6),((4,4,5),1150,5)]:
 bpy.ops.object.light_add(type="AREA",location=pos)
 bpy.context.object.data.energy=power;bpy.context.object.data.size=size
bpy.ops.object.camera_add();camera=bpy.context.object;bpy.context.scene.camera=camera
scene=bpy.context.scene
try:scene.render.engine="BLENDER_EEVEE_NEXT"
except:scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=960;scene.render.resolution_y=820
scene.render.resolution_percentage=100
scene.view_settings.view_transform="AgX"
camera.data.type="ORTHO";camera.data.ortho_scale=11.2
target=Vector((-1,0,2.0))
for view,loc in [("front",(-1,-11,7)),("side",(10,0,6)),("angle",(8,-10,8))]:
 camera.location=loc
 camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=OUT+"/floor3_overgrown_switchback_v2-"+view+".png"
 bpy.ops.render.render(write_still=True)
print("FLOOR3_SWITCHBACK_V2_COMPLETE")
