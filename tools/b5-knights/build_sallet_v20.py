#!/usr/bin/env python3
"""B5 sallet V20: independent reconstruction informed by Walters 51.470 multi-view originals.
The prior v1-v6 generators and all game assets remain untouched. NOT_APPROVED.
"""
import bpy, math, os, hashlib, json, random, struct
from mathutils import Vector
from pathlib import Path
rng=random.Random(470)
out=Path("render-output/b5-knights/sallet_v20").resolve()
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
tex=bpy.data.images.new("original_worn_steel_v20",width=256,height=256,alpha=False)
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
# Independent grayscale roughness atlas: clusters of wear and darker oily polished patches.
# This is a texture input, exported with GLB instead of an unsupported renderer-only Noise node.
rough_image=bpy.data.images.new("V20 forged steel variable roughness",width=256,height=256,alpha=False)
rp=[]
for yy in range(256):
 for xx in range(256):
  patch=(math.sin(xx*.021+yy*.028)*math.sin(xx*.029-yy*.009))
  micro=rng.uniform(-.025,.025)
  worn=.14 if (xx>178 and yy<85) else 0
  value=max(.25,min(.86,.53+.18*patch+micro-worn))
  rp.extend((value,value,value,1))
rough_image.pixels[:]=rp;rough_image.pack()
# ImageGen source: real user-requested grime image, downsampled to 256 WebP only
# for repeatable GitHub source transport, decoded to PNG by the Action step.
# NOT a procedural imitation: the actual generated pixels are baked into the final glTF baseColor.
grime_source=Path("render-output/b5-knights/grime_source_v20.png").resolve()
if not grime_source.exists():
 raise RuntimeError("Generated grime image must be decoded from .webp.b64; refusing untextured V15")
grime_image=bpy.data.images.load(str(grime_source),check_existing=False)
assert tuple(grime_image.size)==(256,256), tuple(grime_image.size)
dirty=list(grime_image.pixels)
original=list(tex.pixels)
rough_base=list(rough_image.pixels)
combined=[];rough_baked=[]
for yy in range(256):
 for xx in range(256):
  i=(yy*256+xx)*4
  dr,dg,db=dirty[i:i+3]
  lum=.24*dr+.66*dg+.10*db
  # Accumulate in low cavities/rear nape, with broad unevenness.
  # Image itself supplies non-repeating scratches and organic corrosion clusters.
  z=yy/255
  # Rust derives from the ACTUAL generated pixels, not random paint strokes.
  # R-B identifies warm oxidized clusters, while source luminance controls soot.
  oxidation=max(0.0,min(1.0,(dr-db)*6.5))
  soot=max(0.0,min(1.0,(.23-lum)*3.7))
  dirt_factor=max(.16,min(.82,.28+.25*(1-z)+.31*oxidation+.12*soot))
  target=(min(1.0,dr*1.12),dg*(1-.22*oxidation),db*(1-.36*oxidation))
  shade=(1-.15*oxidation-.13*soot-.08*(1-z))
  for k,d in enumerate(target):
   metal=original[i+k]
   # Keep polished areas but strengthen old rust / soot patches in low areas.
   combined.append(max(0.0,min(1.0,(metal*(1-dirt_factor)+d*dirt_factor)*shade)))
  combined.append(1.0)
  val=max(.29,min(.95,rough_base[i]+.09*dirt_factor+.26*oxidation+.16*soot))
  rough_baked.extend((val,val,val,1.0))
tex.pixels[:]=combined
tex.pack()
rough_image.pixels[:]=rough_baked
rough_image.pack()
# Preserve generated original PNG, combined metallic albedo and roughness as review evidence.
out.mkdir(parents=True,exist_ok=True)
bpy.data.images["original_worn_steel_v20"].file_format="PNG"
tex.filepath_raw=str(out/"grime_baked_albedo_v20.png")
tex.save()
rough_image.filepath_raw=str(out/"grime_baked_roughness_v20.png")
rough_image.file_format="PNG";rough_image.save()
grime_image.pack()

# V17: selectively overlay the actual user-requested ImageGen crack reference.
# Apply ONLY to two elliptical atlas zones on the BACK / REAR-SIDE bowl.
# The face visor receives an independent clean copy so it is not affected.
clean_tex=bpy.data.images.new("V20 clean visor color",width=256,height=256,alpha=False)
clean_tex.pixels[:]=list(tex.pixels);clean_tex.pack()
clean_rough=bpy.data.images.new("V20 clean visor roughness",width=256,height=256,alpha=False)
clean_rough.pixels[:]=list(rough_image.pixels);clean_rough.pack()
crack_mask_path=Path("render-output/b5-knights/crack_detail_mask_v20.png").resolve()
if not crack_mask_path.exists():
 raise RuntimeError("V17 crack image mask not staged; refusing unmodified renderer")
crack_image=bpy.data.images.load(str(crack_mask_path),check_existing=False)
assert tuple(crack_image.size)==(256,256)
crack_pix=list(crack_image.pixels)
color_pix=list(tex.pixels); rough_pix=list(rough_image.pixels)
crack_color=[];crack_rough=[];region_alpha=[]
# Three intentionally sparse rear sections; expand originals only slightly.
# Kept entirely on rear-facing UV hemisphere and below crown / away from visor.
zones=[(.29,.44,.108,.165,.88),
       (.105,.265,.069,.108,.77),
       (.390,.365,.052,.085,.55)]
active_pixels=0
for yy in range(256):
 for xx in range(256):
  i=(yy*256+xx)*4
  u=(xx+.5)/256;v=(yy+.5)/256
  placement=0.0
  for center_u,center_v,rad_u,rad_v,weight in zones:
   d=((u-center_u)/rad_u)**2+((v-center_v)/rad_v)**2
   # Smooth falloff; the user asked for only damaged places.
   placement=max(placement,max(0.0,1.0-d)**1.5*weight)
  detail=max(0,min(1,crack_pix[i]))
  alpha=placement*(detail**.61)*.94
  if alpha>.025:active_pixels+=1
  region_alpha.extend((alpha,alpha,alpha,1))
  # Subtle dark fractured steel, no orange painted-on lines.
  for k in range(3):
   c=color_pix[i+k]
   crack_color.append(max(0,min(1,c*(1-.83*alpha))))
  crack_color.append(1)
  r=min(1,rough_pix[i]+.23*alpha)
  crack_rough.extend((r,r,r,1))
assert 900<active_pixels<7000,active_pixels
tex.pixels[:]=crack_color
rough_image.pixels[:]=crack_rough
tex.pack();rough_image.pack()
tex.filepath_raw=str(out/"localized_cracks_albedo_v20.png");tex.file_format="PNG";tex.save()
rough_image.filepath_raw=str(out/"localized_cracks_roughness_v20.png");rough_image.file_format="PNG";rough_image.save()
region_image=bpy.data.images.new("V20 three local crack spots",width=256,height=256,alpha=False)
region_image.pixels[:]=region_alpha
region_image.file_format="PNG";region_image.filepath_raw=str(out/"localized_cracks_mask_v20.png")
region_image.save()
crack_image.pack()

steel=mat("01 patinated satin steel crown",(.35,.36,.39),.82,.49,tex)
weathered=mat("01b lower nape aged forged steel",(.26,.275,.297),.75,.67,tex)
steel_visor=mat("06 visor untouched by cracks / V16 weathering",(.35,.36,.39),.82,.49,clean_tex)
nr=steel_visor.node_tree.nodes.new("ShaderNodeTexImage")
nr.image=clean_rough;nr.image.colorspace_settings.name="Non-Color"
steel_visor.node_tree.links.new(nr.outputs["Color"],steel_visor.node_tree.nodes.get("Principled BSDF").inputs["Roughness"])
# PBR roughness texture linked to Principled BSDF and GLB material.
for m in (steel, weathered):
 node=m.node_tree.nodes.new("ShaderNodeTexImage")
 node.name="independent forged roughness map";node.image=rough_image
 node.image.colorspace_settings.name="Non-Color"
 p=m.node_tree.nodes.get("Principled BSDF")
 m.node_tree.links.new(node.outputs["Color"],p.inputs["Roughness"])
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
   uv.data[i].uv=((math.atan2(v.y,v.x)+math.pi)/(2*math.pi),(v.z+.01)/.29) if name.startswith("01 continuous bowl") else ((v.x+.13)/.26,(v.z+.01)/.29)
 if solid:
  md=ob.modifiers.new("real thin forged metal shell","SOLIDIFY");md.thickness=solid
 be=ob.modifiers.new("restrained edge finish","BEVEL");be.width=.00045;be.segments=1
 we=ob.modifiers.new("weighted normals","WEIGHTED_NORMAL")
 # V13: Forging plane facet presentation below cheek and visor, polished crown still smooth.
 if name.startswith("01 continuous bowl"):
  # Smooth crown and swept rear face; horizontal bands in V13 were shading artifacts.
  # Actual metal creases must be produced by deliberate vertex section changes.
  for poly in me.polygons:
   zc=sum(me.vertices[k].co.z for k in poly.vertices)/len(poly.vertices)
   poly.use_smooth=not (zc<.052)
 return ob
N=96
# Dimensions from original 25.5cm H, 22.5cm W, 39.6cm D.
# +Y is face/front; -Y is the sweeping neck tail. z from .015 to .270.
# More section rings around the visor and a progressive backward sweep.
# Radius and fore/aft position are tuned to maintain an unbroken bowl rather than V7's square cavity.
# V19 photographic silhouette match: less ball-like high crown, longer smooth
# nape blend, thin pointed rear lip. Metrology is approximate from Walters 51.470.
rings=[(.032,.082,.088,-.280),(.040,.093,.096,-.269),
       (.052,.101,.105,-.258),(.064,.106,.112,-.245),
       (.080,.110,.117,-.222),(.094,.111,.120,-.196),
       (.103,.112,.120,-.173),(.115,.113,.121,-.152),
       (.125,.112,.123,-.142),(.137,.111,.120,-.130),
       (.150,.110,.119,-.121),(.171,.105,.113,-.112),
       (.191,.099,.107,-.104),(.207,.088,.095,-.096),
       (.225,.074,.083,-.082),(.238,.061,.070,-.068),
       (.250,.042,.048,-.047),(.259,.024,.027,-.025),
       (.263,.004,.006,-.005)]
v=[]
for j,(z,rx,front,back) in enumerate(rings):
 for i in range(N):
  a=2*math.pi*i/N
  side=math.cos(a);fwd=math.sin(a)
  # Independently loft front and back, leaving a smooth single-shell tail.
  y=front*max(0,fwd)+back*max(0,-fwd)
  x=rx*side
  # V12 crisp forged planes sculpted into the continuous crown, not floating borders.
  # Eight shallow panel transitions; stronger near cheek, fade toward crown apex.
  az=math.atan2(fwd,side)
  low=max(0.0,min(1.0,(.24-z)/.105))
  # Four broad real plane faces, not tiny eight-fold ripples; crease the diagonal boundary.
  # Mild four-fold forged panel width, concentrated by cheek and brow, not striping.
  folded=math.cos(4*az)
  metal_panel=max(-.30,min(1.0,(folded+.25)*1.1))
  x+=side*.0050*low*metal_panel
  y+=fwd*.0040*low*metal_panel
  # Raised front/side brow is a sharply stepped forging, not a floating plate.
  if fwd>.36 and .128<z<.17:
   prominence=max(0,1-abs(z-.148)/.022)
   y+=.0085*prominence*(1-max(0,(abs(side)-.65)/.35))
  # Form a slightly flattened but still anatomical brow above the eye slit.
  if fwd>.58 and .133<z<.174:
   y-=.0075*(1-abs(side))*(1-abs(z-.151)/.026)
  # Gentle forged step in the actual bowl geometry around the low rear nape.
  # Small, directional flanging of the hem with a crisp break across adjacent rings.
  if fwd < -.18 and j in (0,1,2,3):
   # thinner forged flare, an integrated narrow sharp hem instead of thick slab
   lip=(.0060,.0075,.0035,0.0)[j]
   x += (1 if side>=0 else -1)*lip*abs(side)
   y -= lip*abs(fwd)*.38
  # Tail's tip recedes at centreline in the rear and flares laterally only near rim.
  if j<4 and fwd<0:
   # real rear rim is a pointed spade: center does not project as far as side lips
   y+=(1-abs(side))*.010
  # Step in the temple transition flows from pivot into the nape, no free floating strip.
  if abs(side)>.50 and fwd<-.06 and .087<z<.145:
   lateral=min(1.0,(abs(side)-.50)/.50)
   ridge=max(0.0,1.0-abs(z-(.103+.017*(-fwd)))/.013)
   x+=math.copysign(.0026*lateral*ridge,side)
  # Replace the old floating highlighted centreline curve by a subtle
  # integral raised forge crease in the bowl mesh near the upper crown.
  ridge_window=max(0.0,1.0-abs(side)/.085)
  upper_window=max(0.0,min(1.0,(z-.159)/.028))
  v.append((x,y,z+.0018*ridge_window*upper_window))
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
   # Slightly raised central facet and pinched temples: a forged plate, not a cylinder.
   # Contoured cheek-to-brow wrap. A shallow central sharp break is forged
   # into the plate, not an extra horizontal rectangular plate stuck on.
   sharp_crease=max(0.0,1.0-abs(t)/.18)
   # V20: temple edges tucked back under shell. No oversized shovel tip.
   # Central forged fold is narrow with a controlled 1-2mm highlight.
   y=forward + .012*(1-t*t) - .020*t*t + .0025*sharp_crease
   dz=(-.006*abs(t)**2 if z<.092 else -.002*abs(t)**2)
   lower_chamfer=(-.010*(1-abs(t)) if z<.094 else 0)
   jaw_sweep=(.005*abs(t) if z<.11 else 0)
   if z<.09:y+=.003*(1-abs(t))
   V.append((x,y,z+.0012*(1-t*t)+dz+lower_chamfer+jaw_sweep))
 F=[]
 for j in range(len(rows)-1):
  for i in range(K):
   k=j*(K+1)+i;F.append((k,k+1,k+K+2,k+K+1))
 return make(name,V,F,material,True,.0020)
# A single curved visor below the slit, not V7's double projecting bands.
# Face-covering visor has a pointed, swept lower hem and side planes.
visor("02 fitted tapered forged visor plate",[(.073,.65,.090),(.087,.85,.108),(.099,.97,.120),(.111,1,.121),(.117,1,.119)],.108,steel_visor)
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
# V20: detached floating crest REMOVED; line now formed in bowl vertices.
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
bpy.ops.export_scene.gltf(filepath=str(out/"sallet_v20.glb"),export_format="GLB",use_selection=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(out/"sallet_v20.blend"))
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
files=[out/"sallet_v20.glb",out/"sallet_v20.blend",out/"grime_baked_albedo_v20.png",out/"grime_baked_roughness_v20.png",out/"localized_cracks_albedo_v20.png",out/"localized_cracks_roughness_v20.png",out/"localized_cracks_mask_v20.png"]+[out/(name+".png") for name,_ in views]
for f in files:checks[f.name]=hashlib.sha256(f.read_bytes()).hexdigest()
manifest={"approval":"NOT_APPROVED","game_integrated":False,"source_sha":os.environ.get("GITHUB_SHA"),
"run_id":os.environ.get("GITHUB_RUN_ID"),"source":"tools/b5-knights/build_sallet_v20.py",
"reference":"Walters Art Museum Visored Sallet 51.470 (CC0 11-view gallery)",
"reference_url":"https://art.thewalters.org/object/51.470/",
"dimensions_reference_cm":{"height":25.5,"width":22.5,"depth":39.6},
"views":[n for n,_ in views],"component_count":len(parts),"files_sha256":checks,
"art_review":"V20 removes floating independent crest and tucks visor edges closer to the genuine Walters frontal plate silhouette while keeping V18 grime and three crack zones. NOT_APPROVED.","crack_source":"tools/b5-knights/textures/cracks_imagegen_v17_192.webp.b64","crack_source_sha256":"b9560e690caebf216df9ccadd434dbe6e6dbbca5e8f5c085c8b4d4129ac2955c","crack_target_regions":"three localized rear UV ellipses: u0.29_v0.44 u0.105_v0.265 u0.39_v0.365","crack_active_texels":active_pixels,"generated_grime_source_sha256":"7287744136ebb3c4e43854306131fd215bdc396fd9aaa57ae7c32099190d8a23","grime_source":"tools/b5-knights/textures/grime_imagegen_v15_256.webp.b64","dirt_blend":"V16 16-82% weighted by source-image oxide and soot, retain polished steel areas"}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
(out/"progress.json").write_text(json.dumps({"iteration":20,"approval":"NOT_APPROVED","checkpoint":"sallet_v20.blend",
"next":"Review V20 six actual renders vs V19 and Walters originals, especially visor overlap and no floating crown line. NOT_APPROVED."},indent=2))
print("SALLET_V20_RENDERED_SIX_VIEWS",checks)
