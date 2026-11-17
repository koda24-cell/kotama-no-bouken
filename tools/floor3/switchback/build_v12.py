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
 cut(o,(x+.19,y-.18,upper*.43),(.075,.080,.17),"weathered corner spall, no through-hole")
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
# V3 artistic correction based on real 3-view V2 review:
# Remove fake rectangular grassy labels, keep genuine engineering and rails.
for obj in list(bpy.context.scene.objects):
 if obj.type=='MESH' and obj.name.startswith((
     "V1 rooted dark moss on step","V2 coherent organic film along stair riser",
     "V2 weathered moss layer on open landing","V2 pooled black green joint dampness",
     "V2 descending old moss on broken riser","V2 lichen rooted at base of pillar")):
  bpy.data.objects.remove(obj,do_unlink=True)
def organic_moss(name,x,y,z,rx,ry,seed):
 # Non-rectangular 24-point irregular attached mesh; broadly spread,
 # with a second darker layer for uneven growth.
 rng=random.Random(seed)
 verts=[]
 angles=24
 for k in range(angles):
  t=math.tau*k/angles
  # Three-scale continuous wave avoids polygonal star/sharp cuts.
  rr=.79+.12*math.sin(t*3+seed*.12)+.085*math.sin(t*7+seed*.21)+.04*rng.random()
  verts.append((x+rx*rr*math.cos(t),y+ry*rr*math.sin(t),z+.0005*math.sin(t*3)))
 mesh=bpy.data.meshes.new(name+' mesh');mesh.from_pydata(verts,[],[tuple(range(angles))]);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 ob.data.materials.append(moss if seed%3 else mosslight)
 return ob
for upper in (False,True):
 yc=-.96 if not upper else .98
 z0=.12 if not upper else 2.17
 for i in range(STEPS):
  t=(i+.48)/STEPS
  x=X0+(X1-X0)*t if not upper else X1-(X1-X0)*t
  z=z0+1.85*t+.085
  if i in (1,2,4,6,7,9,10,12,13):
   organic_moss('V3 asymmetrical attached concrete moss',x-.06,yc-.47,z,
                .12+.035*(i%3),.10+.025*(i%2),317+i+(200 if upper else 0))
   if i%3==1:organic_moss('V3 secondary light lichen',x+.11,yc+.39,z+.002,.10,.07,419+i)
# Landing moss follows slab edges as connected irregular patches, not squares.
for k,(cx,cy,zz) in enumerate(((-3.50,.98,4.203),(1.49,0,2.143))):
 for i in range(6):
  x=cx-.66+i*.27;y=cy+(.63 if i%2 else -.64)
  organic_moss('V3 wild moss following landing moisture edge',x,y,zz,
               .22+.03*(i%3),.17+.025*(i%3),840+k*30+i)
# Replace flat concrete coloration with low-saturation embedded lichen
# and runoff. Changes the actual image packed into the GLB, not just Blender noise.
import array
for mat_,kind in ((concrete,1),(broken,2)):
 image=bpy.data.images.get("V1 mapped old concrete albedo "+str(kind))
 assert image is not None
 pixels=array.array('f',[0.0])*(N*N*4)
 image.pixels.foreach_get(pixels)
 for yy in range(N):
  for xx in range(N):
   i=4*(yy*N+xx)
   u=xx/N;v=yy/N
   broad=math.sin(2*math.pi*(2*u+v))*.23+math.sin(2*math.pi*(u-3*v))*.13
   organic=math.sin(2*math.pi*(5*u+3*v))*.12+math.cos(2*math.pi*(3*u-4*v))*.11
   damp=max(0.0,min(1.0,(broad+organic+.08)*2.1))
   # dark grey-green contamination in concrete surface, blended continuously
   for k,target in enumerate((.12,.19,.105)):
    pixels[i+k]=max(.045,min(.85,pixels[i+k]*(1-.64*damp)+target*.64*damp))
 image.pixels.foreach_set(pixels)
 image.pack()
# Reduced high studio exposure, preserve the atmospheric wet concrete tone.
for ma in (concrete,broken):
 ma.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
# Existing moss shapes no longer block visual reading of structural stair units.
# V4 structural gravity: wider cast-in-place side stringers under BOTH flights.
# Added as geometry rather than replacing the V1/V2 original framework.
for upper in (False,True):
 yc=-.96 if not upper else .98
 for side in (-1,1):
  x0=X0 if not upper else X1
  x1=X1 if not upper else X0
  a=Vector((x0,yc+side*.56,.02 if not upper else 2.07))
  b=Vector((x1,yc+side*.56,1.87 if not upper else 3.92))
  delta=b-a
  support=cube("V4 heavy mossy reinforced concrete stringer",(a+b)/2,
               (delta.length,.29,.39),broken,.024)
  support.rotation_euler.y=-math.atan2(delta.z,delta.x)
  # Localized old broken corners on the exposed outboard face.
  for ti in (.18,.66):
   pt=a.lerp(b,ti)
   cut(support,(pt.x,pt.y+side*.18,pt.z-.09),(.17,.20,.16),"V4 structural worn corner")
# More continuous water damage: irregular tapered vertical color films rooted in concrete.
def stain_band(name,px,py,z_top,depth,seed):
 rng=random.Random(seed)
 h=depth
 verts=[]
 for k in range(9):
  t=k/8
  xshift=.032*math.sin(t*7+seed*.29)+.012*math.sin(t*13)
  half_width=(.08-.036*t)*(.85+.17*math.sin(t*10+seed))
  zz=z_top-t*h
  verts.extend([(px+xshift-half_width,py,zz),(px+xshift+half_width,py,zz)])
 faces=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(8)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 o.data.materials.append(stain)
 return o
for k,(x,y,h) in enumerate([(2.27,-1.12,1.89),(2.27,1.11,1.89),(-4.10,.44,3.90),(-4.10,1.57,3.90)]):
 for j in range(3):
  stain_band("V4 continuous gravity-aligned water erosion",
             x-.092+j*.085,y-.147,h-.08,.42+.27*j,k*4+j)
# Image-backed concrete: darker and more olive, oxidized damp patches
# are part of the diffuse texture, not pasted planar squares.
for mat_,kind in ((concrete,1),(broken,2)):
 image=bpy.data.images.get("V1 mapped old concrete albedo "+str(kind))
 vals=array.array('f',[0.0])*(N*N*4);image.pixels.foreach_get(vals)
 for i in range(0,len(vals),4):
  red,green,blue=vals[i],vals[i+1],vals[i+2]
  vals[i]=red*.77
  vals[i+1]=green*.82
  vals[i+2]=blue*.71
 image.pixels.foreach_set(vals);image.pack()
# V5 optional real-world CC0 photo PBR scan, with source and hashes in out/.
# If the official download fails keep the original in-repository generated maps;
# do not claim that photo texture loaded when none was available.
from pathlib import Path
texroot=Path('/work/out/source_textures')
for mat_ in (concrete,broken):
 nodes=mat_.node_tree.nodes
 base=nodes.get('GLB embedded albedo')
 # Blender node names are not guaranteed to equal user labels.
 if base is None:base=next((n for n in nodes if n.type=='TEX_IMAGE' and n.label=='GLB embedded albedo'),None)
 norm=next((n for n in nodes if n.type=='TEX_IMAGE' and n.label=='GLB embedded normal'),None)
 diffuse=next(iter(sorted(texroot.glob('diffuse.*'))),None)
 normal=next(iter(sorted(texroot.glob('normal.*'))),None)
 rough=next(iter(sorted(texroot.glob('rough.*'))),None)
 if diffuse and base:
  image=bpy.data.images.load(str(diffuse),check_existing=True);image.pack();base.image=image
  print('V5_PHOTOGRAPHIC_CC0_DIFFUSE_LOADED',diffuse)
 if normal and norm:
  image=bpy.data.images.load(str(normal),check_existing=True);image.colorspace_settings.name='Non-Color'
  image.pack();norm.image=image
  print('V5_PHOTOGRAPHIC_CC0_NORMAL_LOADED',normal)
 if rough:
  image=bpy.data.images.load(str(rough),check_existing=True);image.colorspace_settings.name='Non-Color';image.pack()
  tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.label='V5 verified CC0 physical roughness'
  mat_.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Roughness'])
  print('V5_PHOTOGRAPHIC_CC0_ROUGHNESS_LOADED',rough)
# V6 film-art direction: neutralise ochre cast from the photographic
# CC0 scan without losing the real moss / pores / fracture patterns.
# Operate on pixels of the *embedded diffuse texture* to maintain GLB fidelity.
for mat_ in (concrete,broken):
 image_node=next((n for n in mat_.node_tree.nodes if n.type=='TEX_IMAGE' and n.label=='GLB embedded albedo'),None)
 assert image_node is not None
 image=image_node.image
 w,h=image.size
 buf=array.array('f',[0.0])*(w*h*4);image.pixels.foreach_get(buf)
 for i in range(0,len(buf),4):
  red,green,blue=buf[i],buf[i+1],buf[i+2]
  # retain photo-based surface data; suppress warm yellow and preserve cool
  # grey-green dampness with lower value and narrow chroma.
  luma=.24*red+.68*green+.08*blue
  buf[i]=max(.04,min(.76,.65*red+.05*luma))
  buf[i+1]=max(.05,min(.78,.73*green+.025*luma))
  buf[i+2]=max(.04,min(.75,.86*blue+.06*luma))
 image.pixels.foreach_set(buf);image.pack()
# The light moss spots were too pale: match natural wet olive growth.
for m,target in ((moss,(.075,.13,.045,1)),(mosslight,(.125,.19,.07,1)),(stain,(.078,.12,.085,1))):
 m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=target
# More connected rust corrosion, no floating granular orbs.
for upper in (False,True):
 cy=-.96 if not upper else .98
 for k in (1,3,4):
  t=k/5
  xx=X0+(X1-X0)*t if not upper else X1-(X1-X0)*t
  zz=(.12 if not upper else 2.17)+1.85*t
  for side in (-1,1):
   yc=cy+side*.77
   cube('V6 corroded metal mounting seam',(xx,yc,zz+.014),(.14,.12,.013),rustdark,.004)
# V7 closer reference morphology: old platform edges, substantial supports,
# irregular railing age. These additions do not remove original stair geometry.
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 if o.name.startswith('V1 massive load bearing pillar'):
  o.scale.x*=1.32;o.scale.y*=1.27
 if o.name.startswith(('V1 rusty vertical railing post','V1 weathered upper steel handrail','V1 top handrail')):
  o.scale.x*=1.12;o.scale.y*=1.12
# Opposing large material-loss areas on cantilevered landings
for slab,positions in ((top,[(-2.68,1.77,4.13),(-4.24,1.68,4.15)]),
                       (middle,[(2.50,.96,2.09),(.58,-1.33,2.11)])):
 for i,p in enumerate(positions):
  cut(slab,p,(.16+.055*i,.20+.04*i,.17),'V7 irregular weather-exposed landing corner')
# Exposed diagonal rusted braces help the small older columns support the upper platform.
for px,py,ph in [(-4.10,.44,3.90),(-4.10,1.57,3.90),(2.27,-1.12,1.89),(2.27,1.11,1.89)]:
 rod('V7 steel to concrete knee brace',(px,py,ph-.52),(px+(.32 if px>0 else -.32),py,ph-.08),.03,rustdark)
# Narrow oxidation seams are attached to the landing's concrete edge, not suspended.
for x,y,z in [(-4.05,.048,4.04),(-3.15,.048,4.04),(1.78,-1.53,2.01),(2.17,1.53,2.01)]:
 cube('V7 genuine rusty water path under railing',(x,y,z-.11),(.07,.014,.27),rustdark,.008)
# V8 remove pale pasted-on vegetation planes. The CC0 concrete_moss scan
# already includes physically observed moss and lichen in its real diffuse.
# Retain all previously modeled concrete steps, supports, pillars and metal.
for obj in list(bpy.context.scene.objects):
 if obj.type=='MESH' and obj.name.startswith((
      'V3 asymmetrical attached concrete moss','V3 secondary light lichen',
      'V3 wild moss following landing moisture edge')):
  bpy.data.objects.remove(obj,do_unlink=True)
# The scanned lichen is now the only top-surface moss detail; the rain-streak
# and low-pillar dark films remain as environmental structure.
# V10 reference cleanup: faded dark iron must carry mottled corrosion
# rather than one perfectly flat copper paint. Image-based for GLB export.
R=384
rustimg=bpy.data.images.new('V10 packed weatherbeaten iron oxide',width=R,height=R,alpha=True)
rustpix=array.array('f')
for yy in range(R):
 for xx in range(R):
  u=xx*math.tau/R;v=yy*math.tau/R
  weather=.48+.22*math.sin(5*u+2*v)*math.cos(7*v-3*u)+.18*math.sin(17*u-9*v)+.08*math.cos(41*u+23*v)
  dark=max(0,min(1,weather))
  rustpix.extend((.085+.26*dark,.032+.092*dark,.023+.049*dark,1.))
rustimg.pixels.foreach_set(rustpix);rustimg.pack()
iron_nodes=rust.node_tree.nodes;iron_links=rust.node_tree.links
iron_tex=iron_nodes.new('ShaderNodeTexImage');iron_tex.image=rustimg;iron_tex.label='V10 embedded oxidized steel texture'
iron_links.new(iron_tex.outputs['Color'],iron_nodes.get('Principled BSDF').inputs['Base Color'])
# Moderate fill and stronger photographed PBR normal so pores can be seen
# under the same 3-view studio lights without flattening silhouette.
normals=set()
for mat in (concrete,broken):
 for node in mat.node_tree.nodes:
  if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.95
  if node.type=='TEX_IMAGE' and node.label=='GLB embedded albedo':
   normals.add(node.image.name)
for img_name in normals:
 image=bpy.data.images[img_name];ww,hh=image.size
 vv=array.array('f',[0.0])*(ww*hh*4);image.pixels.foreach_get(vv)
 for i in range(0,len(vv),4):
  vv[i]=min(.83,vv[i]*1.15);vv[i+1]=min(.83,vv[i+1]*1.15);vv[i+2]=min(.83,vv[i+2]*1.16)
 image.pixels.foreach_set(vv);image.pack()
# V11 monolithic concrete flights: in the reference stairs are carried by
# thick continuous cast concrete, not floating thin slabs. Add a full-width
# sloped structural deck under the existing physically chipped tread meshes.
for upper in (False,True):
 y=-.96 if not upper else .98
 xa,xb=(X0,X1) if not upper else (X1,X0)
 za,zb=(.12,1.97) if not upper else (2.17,4.02)
 # The 35cm thick reinforced ramp core is behind the stepped upper face.
 q=.34;w=.54
 vertices=[
  (xa,y-w,za-.10),(xa,y+w,za-.10),(xb,y-w,zb-.10),(xb,y+w,zb-.10),
  (xa,y-w,za-.10-q),(xa,y+w,za-.10-q),(xb,y-w,zb-.10-q),(xb,y+w,zb-.10-q)
 ]
 faces=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
 mesh=bpy.data.meshes.new('V11 full-depth cast-in-place concrete geometry')
 mesh.from_pydata(vertices,[],faces);mesh.update()
 slab=bpy.data.objects.new('V11 full-bodied reinforced stair core',mesh)
 bpy.context.collection.objects.link(slab)
 slab.data.materials.append(broken)
 bev=slab.modifiers.new('V11 old soft broken concrete edge','BEVEL')
 bev.width=.026;bev.segments=2
 slab.modifiers.new('V11 structural face weighted normals','WEIGHTED_NORMAL')
 # Local loss at the exposed outer slab edge without weakening the entire core.
 for k,t in enumerate((.31,.72)):
  xx=xa+(xb-xa)*t;zz=za+(zb-za)*t-.22
  yy=y+(.50 if k%2 else -.50)
  cut(slab,(xx,yy,zz),(.18,.13,.14),'V11 fractured cast-in-place exterior')
# V12 realistic fracture art pass: large broken silhouettes, not fine floating debris.
# Keep the original structural deck and support beams, trim only selected corners.
for upper in (False,True):
 cy=-.96 if not upper else .98
 xa,xb=(X0,X1) if not upper else (X1,X0)
 za,zb=(.12,1.97) if not upper else (2.17,4.02)
 flight=[o for o in bpy.context.scene.objects
         if o.type=='MESH' and o.name=='V11 full-bodied reinforced stair core']
 assert len(flight)==2
 # identify the correctly located core using its global y coordinate.
 core=min(flight,key=lambda ob:abs(ob.location.y-cy))
 for k,t in enumerate((.17,.43,.81)):
  x=xa+(xb-xa)*t
  zz=za+(zb-za)*t-.23
  outer=cy+(-.54 if k%2 else .54)
  loss=(.19,.13,.24)[k]
  cut(core,(x,outer,zz),(loss,.18,.17),'V12 irregular structural spall at cast concrete rim')
  # Rusted original core steel is exposed immediately adjacent to the damage.
  rod('V12 steel reinforcement physically emerging from concrete',(x-.13,outer-.055,zz),
      (x+.11,outer+.09,zz-.028),.012,rustdark)
# Landing edges age more strongly than sheltered centers.
for slab,origin,z in ((top,(-3.55,.98),4.06),(middle,(1.49,0),2.005)):
 for j,(dx,dy) in enumerate(((.74,.88),(-.82,-.67),(.92,-.74))):
  x,y=origin[0]+dx,origin[1]+dy
  cut(slab,(x,y,z+.08),(.14+.03*j,.16+.04*j,.13),
      'V12 rainy concrete corner loss')
# Replace repeated perfect cracks with physically carved chips in front tread lips.
for upper in (False,True):
 for i in (0,4,7,11,13):
  name='V1 '+('upper' if upper else 'lower')+' worn structural tread %02d'%i
  tread=bpy.data.objects.get(name)
  if not tread:continue
  x,y,z=tread.location
  # Small enough to preserve walkable center, large enough to read silhouette.
  cut(tread,(x+(.13 if i%2 else -.13),y+(.59 if i%3 else -.59),z+.056),
       (.125,.17,.105),'V12 chipped tread nose')
# Rain staining occurs below real edge damage, not suspended in air.
for x,y,z,h in [(-3.12,.06,4.05,.59),(-4.19,1.87,4.04,.71),
                (2.16,-1.57,1.99,.51),(1.12,1.54,1.96,.43)]:
 stain_band('V12 rainfall streak anchored at slab lip',x,y,z,h,370+int(abs(x)*10))
# Keep source geometry unique. Smart unwrap for mapped images on all concrete.
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 if not o.data.uv_layers:
  bpy.ops.object.select_all(action="DESELECT");o.select_set(True)
  bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode="EDIT");bpy.ops.mesh.select_all(action="SELECT")
  bpy.ops.uv.smart_project(island_margin=.02)
  bpy.ops.object.mode_set(mode="OBJECT")
# V9: heavy weathering chips break the mechanical repetition of the
# risers; cut real geometry, no fake line particles.
for flight in ('lower','upper'):
 for i in (1,3,6,9,12):
  o=bpy.data.objects.get('V1 '+flight+' worn structural tread %02d'%i)
  assert o is not None
  world=o.matrix_world.translation
  wx=world.x+(-.155 if flight=='lower' else .155)
  wy=world.y+(.60 if i%2 else -.60)
  wz=world.z+.055
  cut(o,(wx,wy,wz),(.10+.035*(i%3),.16,.13),'V9 physically chipped front step edge')
# Surface photo textures should represent 3m of real concrete, NOT one full
# 1K/2K image per 34 cm stair tread. Reproject UV by global coordinates and
# dominant face normal for consistent real-world texel density across stairs.
bpy.context.view_layer.update()
for ob in [x for x in bpy.context.scene.objects if x.type=='MESH']:
 if not any(m.name.startswith(('V1 decades old wet stained grey concrete',
                               'V1 exposed darker aggregate')) for m in ob.data.materials):
  continue
 uv=ob.data.uv_layers.active
 if uv is None:uv=ob.data.uv_layers.new(name='Real world 3m CC0 projection')
 rotation=ob.matrix_world.to_3x3()
 for face in ob.data.polygons:
  fn=rotation @ face.normal
  axis=max(range(3),key=lambda k:abs(fn[k]))
  for li in face.loop_indices:
   v=ob.data.vertices[ob.data.loops[li].vertex_index]
   pt=ob.matrix_world @ v.co
   if axis==2:
    u,vv=pt.x/3.0,pt.y/3.0
   elif axis==1:
    u,vv=pt.x/3.0,pt.z/3.0
   else:
    u,vv=pt.y/3.0,pt.z/3.0
   uv.data[li].uv=(u,vv)
# Export only physical mesh, not cameras / lamps. Capture checkpoints before export.
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/floor3_overgrown_switchback_v12.blend",compress=True)
bpy.ops.object.select_all(action="DESELECT")
meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.export_scene.gltf(filepath=OUT+"/floor3_overgrown_switchback_v12.glb",export_format="GLB",use_selection=True,export_apply=True)
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
scene.render.resolution_x=1120;scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.view_settings.view_transform="AgX"
camera.data.type="ORTHO";camera.data.ortho_scale=10.0
target=Vector((-1,0,2.0))
for view,loc in [("front",(-1,-11,7)),("side",(10,0,6)),("angle",(-8,-10,8))]:
 camera.location=loc
 camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=OUT+"/floor3_overgrown_switchback_v12-"+view+".png"
 bpy.ops.render.render(write_still=True)
print("FLOOR3_SWITCHBACK_V12_COMPLETE")
