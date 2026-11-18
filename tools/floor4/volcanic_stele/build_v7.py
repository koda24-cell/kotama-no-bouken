import bpy, math, random, json, hashlib, os
from mathutils import Vector
from pathlib import Path
random.seed(417)
# V7 silhouette-focused redesign: monolithic dark volcanic rock, asymmetric crown, weathered layered stone foot.
# V5 fix: capped cutter geometry, safe Boolean rollback and hard QA
# V4: deeper rune engravings, dark side faces, asymmetric eroded foundation
# V3 robust closed-manifold voxel-remeshed stele before Boolean engraving
# V2: darker volcanic rock, actual Boolean-carved glyphs, iterative review
OUT=Path(os.environ.get("OUT_DIR","/tmp/b4-stele")); OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.8,emission=None,strength=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get("Principled BSDF");bs.inputs["Base Color"].default_value=(*color,1);bs.inputs["Metallic"].default_value=metal;bs.inputs["Roughness"].default_value=rough
 if emission:bs.inputs["Emission Color"].default_value=(*emission,1);bs.inputs["Emission Strength"].default_value=strength
 noise=m.node_tree.nodes.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=42;noise.inputs["Detail"].default_value=5
 bump=m.node_tree.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.35;bump.inputs["Distance"].default_value=.065
 m.node_tree.links.new(noise.outputs["Fac"],bump.inputs["Height"]);m.node_tree.links.new(bump.outputs["Normal"],bs.inputs["Normal"])
 return m
basalt=mat("weathered vesicular basalt",(.012,.012,.014),rough=.91)
basalt2=mat("warm ash crust",(.019,.018,.019),rough=.95)
edge=mat("fractured inner basalt",(.016,.015,.017))
obsidian=mat("dark volcanic glass streaks",(.018,.018,.023),rough=.34)
ember=mat("molten light inside carved channels",(.22,.028,.005),emission=(1,.16,.012),strength=3.5)
ash=mat("ash and grit",(.075,.067,.063))
def mesh(name,verts,faces,material):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(material);return ob
def cube(name,loc,scale,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(material)
 if bevel:mod=ob.modifiers.new("eroded edge relief","BEVEL");mod.width=bevel;mod.segments=2;mod.profile=.6;mod2=ob.modifiers.new("weighted normals","WEIGHTED_NORMAL")
 return ob
def shard(name,loc,rad,height,material,n=9):
 verts=[]
 for z,rz in ((0,1),(height,.78)):
  for i in range(n):
   a=2*math.pi*i/n;r=rad*rz*random.uniform(.72,1.22)
   verts.append((loc[0]+r*math.cos(a),loc[1]+r*math.sin(a),loc[2]+z+random.uniform(-.035,.035)))
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
 return mesh(name,verts,faces,material)
# Sculpt irregular front/back slab as a volumetric polyhedron with asymmetric chipped outline.
profile=[(-.54,.20),(-.69,.43),(-.76,.72),(-.70,1.04),(-.81,1.35),(-.73,1.70),(-.85,2.05),(-.71,2.39),(-.61,2.67),(-.44,2.86),(-.27,3.12),(-.06,2.96),(.13,3.04),(.28,2.83),(.49,2.91),(.65,2.60),(.71,2.28),(.64,1.99),(.77,1.66),(.70,1.30),(.73,.95),(.63,.62),(.52,.35),(.26,.20),(-.08,.17),(-.36,.25)]
n=len(profile);verts=[]
for y in (-.34,.24):
 for x,z in profile:verts.append((x+random.uniform(-.055,.055),y+random.uniform(-.035,.035),z))
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
slab=mesh("one-piece fractured standing basalt stele",verts,faces,basalt)
# The V2 slab used nonplanar n-gons, which can cause invalid Boolean topology.
# Rebuild it as a closed watertight voxel mesh before any subtraction.
bpy.ops.object.select_all(action="DESELECT");slab.select_set(True);bpy.context.view_layer.objects.active=slab
slab.data.remesh_voxel_size=.028
bpy.ops.object.voxel_remesh()
print("PRE_BOOLEAN_STELE",len(slab.data.vertices),len(slab.data.polygons))

# Stone base built from asymmetrical blocks, uneven fractured rubble.
shard("rough fractured basal outcrop",(.01,0,.04),1.04,.29,basalt2,13)
shard("broken volcanic footing",(-.07,.03,.13),.83,.25,basalt,11)
for i in range(42):
 a=random.uniform(0,2*math.pi);r=random.uniform(.78,1.28)
 shard("collapsed basalt fragment %02d"%i,(r*math.cos(a),r*math.sin(a),.04),random.uniform(.055,.17),random.uniform(.06,.23),random.choice([basalt,basalt2,edge]),random.randint(6,10))
# carved looking glyphs: raised black interior channels plus thin molten core; intentionally broken and uneven.
def tube(name,pts,radius,material):
 cu=bpy.data.curves.new(name,"CURVE");cu.dimensions="3D";cu.resolution_u=12;cu.bevel_depth=radius;cu.bevel_resolution=2;cu.use_fill_caps=True
 sp=cu.splines.new("POLY");sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(material);return ob
# front faces negative Y; glyphs sit almost flush with basalt, dark channels surround incandescent inset.
glyphs=[
 [(-.19,2.58),(-.03,2.72),(.15,2.57),(.03,2.38),(-.15,2.45)],
 [(-.26,2.26),(-.09,2.13),(.04,2.29),(.22,2.12)],
 [(-.20,1.98),(.10,1.98),(.23,1.83),(-.04,1.72),(-.23,1.80)],
 [(-.22,1.55),(.04,1.66),(.25,1.48),(.06,1.29),(-.18,1.36)],
 [(-.12,1.14),(.16,1.14),(.04,.98),(-.15,.92)],
 [(-.13,.79),(.07,.69),(.19,.81)]
]
# V6: physically depress surface vertices along rune paths without destructive Boolean.
# Restrict to front-facing shell; deep inset becomes part of the real GLB mesh.
def distance_segment(px,pz,ax,az,bx,bz):
 dx=bx-ax;dz=bz-az;den=dx*dx+dz*dz
 t=max(0,min(1,((px-ax)*dx+(pz-az)*dz)/den)) if den else 0
 return math.hypot(px-(ax+t*dx),pz-(az+t*dz))
segments=[(a,b) for glyph in glyphs for a,b in zip(glyph,glyph[1:])]
changed=0
for v in slab.data.vertices:
 x,y,z=v.co
 if y>-.24:continue
 d=min(distance_segment(x,z,a[0],a[1],b[0],b[1]) for a,b in segments)
 if d<.067:
  # Inset center ~7cm, smooth shoulders with a narrower chiseled trench.
  weight=(1-d/.067)**1.15
  v.co.y+=.092*weight
  changed+=1
slab.data.update()
print("SCULPTED_RUNE_VERTICES",changed,"STELE_FACES",len(slab.data.polygons))
assert changed>100 and len(slab.data.polygons)>1000, "Inscription mesh displacement failed"
be=slab.modifiers.new("soft chipped carved stone edges","BEVEL");be.width=.008;be.segments=2
slab.modifiers.new("stone normal","WEIGHTED_NORMAL")
# Natural non-straight crack, wrapping from front to right edge and back.
cracks=[[(-.59,2.64),(-.45,2.52),(-.51,2.36),(-.39,2.25),(-.42,2.06)],
 [( .61,1.86),(.47,1.73),(.53,1.58),(.38,1.43),(.44,1.21),(.33,1.03)],
 [(-.54,.88),(-.38,.79),(-.40,.65),(-.24,.54)]]
for i,points in enumerate(cracks):
 tube("irregular deep crack %d"%i,[(x,-.305,z) for x,z in points],.020,obsidian)
 if i==1:tube("subsurface heat leaking crack",[(x,-.33,z) for x,z in points[2:]],.006,ember)
# Chips and coarse ash deposited on base
for i in range(22):
 x=random.uniform(-.72,.72);z=random.uniform(.44,2.7)
 if random.random()<.58:shard("embedded chipped crust %02d"%i,(x,-.282,z),random.uniform(.025,.07),random.uniform(.008,.028),random.choice([basalt2,edge]),7)
# Environment / stage floor only for previews, not exported
preview=cube("PREVIEW_ONLY floor",(0,0,-.13),(7,7,.2),ash,.05)
# Lighting
world=bpy.context.scene.world or bpy.data.worlds.new("world");bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.09,.07,.06,1);world.node_tree.nodes["Background"].inputs["Strength"].default_value=.5
def area(name,loc,color,power,size):
 bpy.ops.object.light_add(type="AREA",location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape="DISK";o.data.size=size;o.rotation_euler=(Vector((0,0,1.35))-o.location).to_track_quat("-Z","Y").to_euler()
area("softbox",(-3,-4,6),(1,.87,.77),520,5)
area("lava bounce",(3,2,1.4),(1,.18,.035),135,3)
area("rim",(0,3,4),(.45,.55,1),280,3)
sc=bpy.context.scene;sc.render.engine="CYCLES";sc.cycles.samples=48
sc.render.resolution_x=920;sc.render.resolution_y=920;sc.render.resolution_percentage=100
sc.render.image_settings.file_format="PNG"
sc.view_settings.view_transform="AgX"
# export model, no preview plane or lights
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.context.scene.objects:
 if o.type=="MESH" and o!=preview:o.select_set(True)
 if o.type=="CURVE":o.select_set(True)
bpy.context.view_layer.objects.active=slab
bpy.ops.export_scene.gltf(filepath=str(OUT/"b4-volcanic-stele-v7.glb"),export_format="GLB",use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"b4-volcanic-stele-v7.blend"))
def camera(name,loc):
 bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.name=name;c.rotation_euler=(Vector((0,0,1.48))-c.location).to_track_quat("-Z","Y").to_euler();c.data.type="ORTHO";c.data.ortho_scale=4.2;sc.camera=c
for name,loc in [("front",(0,-6,2.6)),("side",(6,-.4,2.5)),("angle",(4,-5,3.1)),("top",(3,-3,7))]:
 camera("review camera "+name,loc);sc.render.filepath=str(OUT/f"b4-volcanic-stele-v7-{name}.png");bpy.ops.render.render(write_still=True)
files=[]
for f in sorted(OUT.iterdir()):
 if f.is_file():files.append({"file":f.name,"size":f.stat().st_size,"sha256":hashlib.sha256(f.read_bytes()).hexdigest()})
(OUT/"manifest.json").write_text(json.dumps({"asset_id":"b4_volcanic_stele_v7","approval":"NOT_APPROVED","reference":"Pinterest reference library handoff/b4-volcanic-steles-temple-20261117.md","files":files},indent=2))
print("RENDER_SUCCESS",len(files))
