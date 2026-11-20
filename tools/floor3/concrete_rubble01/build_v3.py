"""F3 ruined city: ONE fallen concrete rubble fragment.
Fractured perimeter, irregular slab stratification, exposed stones on a broken
edge, worn cast-concrete surface. Existing game geometry untouched.
Blender 5.3 standalone multi-view asset study.
"""
import bpy, math, random, os
from mathutils import Vector
OUT="/work/out/f3_concrete_rubble01_v3"
os.makedirs(OUT,exist_ok=True)
rng=random.Random(320116)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
# 0.45m wide slab fracture, 0.31m depth, 0.12m thick; N irregular perimeter.
N=23
angles=[2*math.pi*i/N for i in range(N)]
# Broad irregular fragment, with two local breaks rather than repeated sharp spikes.
radii=[.81+.085*math.sin(a*2+.5)+.042*math.sin(a*5-1.3)+rng.uniform(-.028,.028) for a in angles]
radii[3]*=.79
radii[16]*=.86
radii[9]*=1.06
verts=[]
for level in range(3):
 for i,a in enumerate(angles):
  radius=radii[i]*(1 if level!=1 else .94+rng.uniform(-.04,.035))
  x=.245*radius*math.cos(a)
  y=.18*radius*math.sin(a)
  z=(-.057 if level==0 else -.002 if level==1 else .052)
  z+=.008*math.sin(a*3.4+.6)+.005*math.cos(a*7.1)+rng.uniform(-.009,.009)
  verts.append((x,y,z))
# top and bottom inner vertices; triangular fan creates many planar facets
verts.extend([(-.012,.008,.065),(0,0,-.063)])
TOP=3*N;BOTTOM=3*N+1
faces=[]
for layer in (0,1):
 for i in range(N):
  j=(i+1)%N
  faces.append((layer*N+i,layer*N+j,(layer+1)*N+j))
  faces.append((layer*N+i,(layer+1)*N+j,(layer+1)*N+i))
for i in range(N):
 j=(i+1)%N
 faces.append((TOP,2*N+i,2*N+j))
 faces.append((BOTTOM,j,i))
mesh=bpy.data.meshes.new("broken_concrete_slab_facets")
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new("F3_CONCRETE_RUBBLE01_CORE",mesh)
bpy.context.collection.objects.link(obj)
uv=mesh.uv_layers.new(name="rubble_uv")
for poly in mesh.polygons:
 for li in poly.loop_indices:
  co=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=((co.x+.25)/.50,(co.y+.19)/.38)
# Dusty exposed concrete texture + roughness, with small pores and stains.
S=256;col=bpy.data.images.new("F3_RUBBLE01_CONCRETE_ALBEDO",width=S,height=S,alpha=False)
rm=bpy.data.images.new("F3_RUBBLE01_CONCRETE_ROUGHNESS",width=S,height=S,alpha=False)
cp=[];rp=[]
for j in range(S):
 v=j/(S-1)
 for i in range(S):
  u=i/(S-1)
  fine=rng.uniform(-.029,.029)
  gran=.028*math.sin(u*67+v*37)*math.cos(u*43-v*61)
  grime=max(0, math.sin(u*11+v*7)*math.cos(v*13-u*5))*.21
  oldpatch=math.exp(-((u-.78)/.15)**2-((v-.26)/.20)**2)*.19
  n=fine*.7+gran*.6-grime*.7-oldpatch*.6
  base=(.225,.230,.220)
  c=tuple(max(.06,min(.8,x+n)) for x in base)
  cp.extend((*c,1))
  rr=min(.99,max(.70,.88+grime*.20+fine*.30))
  rp.extend((rr,rr,rr,1))
col.pixels[:]=cp;rm.pixels[:]=rp
for image in (col,rm):
 image.filepath_raw=OUT+"/"+image.name+".png"
 image.file_format="PNG";image.save()
mat=bpy.data.materials.new("ruined_rough_gray_concrete")
mat.use_nodes=True
bs=mat.node_tree.nodes.get("Principled BSDF")
bs.inputs["Metallic"].default_value=0
cnode=mat.node_tree.nodes.new("ShaderNodeTexImage");cnode.image=col
mat.node_tree.links.new(cnode.outputs["Color"],bs.inputs["Base Color"])
rnode=mat.node_tree.nodes.new("ShaderNodeTexImage");rnode.image=rm
rm.colorspace_settings.name="Non-Color"
mat.node_tree.links.new(rnode.outputs["Color"],bs.inputs["Roughness"])
mesh.materials.append(mat)
# Embedded angular aggregates: tiny irregular rock grains lie on two broken sides,
# not floating above the rubble; stones use a different gray mineral material.
stone=bpy.data.materials.new("exposed_aggregate_quartz_limestone")
stone.diffuse_color=(.25,.245,.21,1);stone.use_nodes=True
b=stone.node_tree.nodes.get("Principled BSDF")
b.inputs["Base Color"].default_value=(.20,.205,.20,1)
b.inputs["Roughness"].default_value=.90
for i in range(14):
 a=angles[(2+i)%N]
 radius=.91*(radii[(2+i)%N])
 px=.23*radius*math.cos(a)
 py=.17*radius*math.sin(a)
 # exposed mineral clusters on broken sides and a few on near-top edges
 pz=(.045+rng.uniform(-.008,.004)) if i>=8 else (-.003+rng.uniform(-.010,.014))
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(px,py,pz))
 rock=bpy.context.object
 rock.name="F3_RUBBLE01_EXPOSED_AGGREGATE"
 rock.scale=(rng.uniform(.010,.022),rng.uniform(.011,.025),rng.uniform(.006,.012))
 rock.rotation_euler=(rng.random(),rng.random(),rng.random())
 rock.data.materials.append(stone)
# Batch same-material aggregate geometry to a single mesh for fewer draw calls.
bpy.ops.object.select_all(action="DESELECT")
aggregates=[o for o in bpy.context.scene.objects if o.name.startswith("F3_RUBBLE01_EXPOSED_AGGREGATE")]
assert len(aggregates)==14
for a in aggregates:a.select_set(True)
bpy.context.view_layer.objects.active=aggregates[0]
bpy.ops.object.join()
bpy.context.view_layer.objects.active.name="F3_RUBBLE01_AGGREGATES_BATCHED"
# Export geometric chunk + exposed stones only.
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.context.scene.objects:
 if o.type=="MESH":o.select_set(True)
bpy.context.view_layer.objects.active=obj
stem="f3_concrete_rubble01_v3"
bpy.ops.export_scene.gltf(filepath=OUT+"/"+stem+".glb",export_format="GLB",use_selection=True,export_apply=True)
# Review setup.
scene=bpy.context.scene
scene.render.engine="CYCLES";scene.cycles.samples=32
scene.render.resolution_x=820;scene.render.resolution_y=820
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=True
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=-.48
world=bpy.data.worlds.new("soft_urban_ruins_daylight")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.71,.74,.78,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.85
scene.world=world
for pos,power,size in [((-1,-1,1.4),205,1.2),((.8,1,.7),120,1.3)]:
 bpy.ops.object.light_add(type="AREA",location=pos)
 light=bpy.context.object;light.data.energy=power;light.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type="ORTHO";scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/"+stem+".blend")
focus=Vector((0,0,-.006))
for name,loc,scale in [
 ("front",(0,-1,.55),.72),
 ("side",(1,-.17,.45),.72),
 ("angle",(1,-1,.85),.72),
 ("fracture_detail",(1,-1,.22),.38)]:
 cam.data.ortho_scale=scale
 cam.location=focus+Vector(loc).normalized()*1.30
 cam.rotation_euler=(focus-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=OUT+"/"+stem+"-"+name+".png"
 bpy.ops.render.render(write_still=True)
 print("F3_RUBBLE01_RENDER_OK",name,flush=True)
print("F3_RUBBLE01_ALL_COMPLETE",flush=True)
