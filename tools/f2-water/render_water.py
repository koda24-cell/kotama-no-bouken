"""Floor 2 non-destructive water study, Blender background render.
Requires scan_manifest SCANNED_OK_NOT_APPROVED and verified river_small_rocks PBR file.
No third-party Blender addon or Python execution. Output is NOT_APPROVED.
"""
import bpy, json, math, random, os, pathlib, hashlib
from mathutils import Vector
root=pathlib.Path("out/f2-water")
manifest=json.loads((root/"scan_manifest.json").read_text())
assert manifest["status"]=="SCANNED_OK_NOT_APPROVED", "Malware gate not passed"
imgpath=root/"verified/river_small_rocks_diff_1k.jpg"
assert imgpath.exists()
assert hashlib.sha256(imgpath.read_bytes()).hexdigest()==manifest["sha256"]
random.seed(20261119)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=64
scene.cycles.max_bounces=6
bpy.context.view_layer.cycles.use_denoising=False  # Ubuntu apt Blender has no OpenImageDenoiser
scene.render.resolution_x=960;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.world.color=(0.15,0.23,0.26)
scene.view_settings.view_transform="AgX"
def rgba(hexcode):
    h=hexcode.lstrip("#");return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,)
def mat(name,col,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=rgba(col);m.use_nodes=True
    n=m.node_tree.nodes.get("Principled BSDF");n.inputs["Base Color"].default_value=rgba(col)
    n.inputs["Roughness"].default_value=rough;n.inputs["Metallic"].default_value=metal
    return m
bed=mat("CC0 scanned riverbed texture","#786f5b")
bs=bed.node_tree.nodes.get("Principled BSDF")
image=bed.node_tree.nodes.new("ShaderNodeTexImage")
image.image=bpy.data.images.load(str(imgpath.resolve()))
image.interpolation="Linear"
texcoord=bed.node_tree.nodes.new("ShaderNodeTexCoord")
uvscale=bed.node_tree.nodes.new("ShaderNodeVectorMath");uvscale.operation="SCALE"
uvscale.inputs["Scale"].default_value=6.0
bed.node_tree.links.new(texcoord.outputs["UV"],uvscale.inputs[0])
bed.node_tree.links.new(uvscale.outputs["Vector"],image.inputs["Vector"])
bed.node_tree.links.new(image.outputs["Color"],bs.inputs["Base Color"])
bump=bed.node_tree.nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.16
bump.inputs["Distance"].default_value=.055
bed.node_tree.links.new(image.outputs["Color"],bump.inputs["Height"])
bed.node_tree.links.new(bump.outputs["Normal"],bs.inputs["Normal"])
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,-.45))
ground=bpy.context.object;ground.name="Riverbed_scanned_CC0"
ground.scale=(8,8,1);ground.data.materials.append(bed)
shore=mat("Damp wet bank","#554e42",.44)
pebble=[mat("Warm sandstone","#82776a",.66),mat("Cool wet schist","#626d69",.52),mat("Moss stained stone","#566458",.64),mat("Pale river gravel","#a29c86",.78)]
for i in range(450):
    x=random.uniform(-7.7,7.7);y=random.uniform(-7.7,7.7)
    # More detail at irregular shoreline, avoid tile / grid placement.
    shoreline=2.8+.34*math.sin(x*.7)+.18*math.cos(x*1.9)
    if y < shoreline and random.random()<.40:continue
    radius=random.uniform(.025,.16) if random.random()<.88 else random.uniform(.16,.43)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1 if radius<.16 else 2,radius=1,location=(x,y,-.43))
    o=bpy.context.object;o.name="Wet_river_pebble"
    o.scale=(radius*random.uniform(.7,1.5),radius*random.uniform(.7,1.2),radius*random.uniform(.35,.74))
    o.rotation_euler=(random.random()*.5,random.random()*.5,random.random()*math.pi)
    o.data.materials.append(random.choice(pebble))
for i in range(15):
    x=random.uniform(-7,7);y=random.uniform(2.6,7.5)
    r=random.uniform(.16,.51)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,y,-.25))
    o=bpy.context.object;o.name="Waterline_stone";o.scale=(r*random.uniform(.8,1.4),r*.83,r*.42);o.rotation_euler=(random.random()*.18,random.random()*.18,random.random()*math.pi);o.data.materials.append(random.choice(pebble))
# V5: original tileable surface IMAGE, generated locally (never downloaded).
# It controls microscopic surface slope, roughness and delicate colored glints;
# the base water remains largely transparent rather than opaque teal jelly.
TEX_SIZE=256
surface=bpy.data.images.new("F2_original_water_surface_height_V5",width=TEX_SIZE,height=TEX_SIZE,alpha=False,float_buffer=False)
pixels=[]
for py in range(TEX_SIZE):
    v=2.0*math.pi*py/TEX_SIZE
    for px in range(TEX_SIZE):
        u=2.0*math.pi*px/TEX_SIZE
        # Explicitly periodic multidirectional features: seamless, no grid pattern.
        wave=(.43*math.sin(5*u+2*math.sin(3*v))+
              .22*math.sin(3*v+4*math.sin(2*u))+
              .16*math.sin(9*u+7*v+1.2*math.sin(2*v))+
              .10*math.cos(12*v-5*u)+.08*math.sin(13*u-7*v))
        height=max(.02,min(.98,.5+.34*wave))
        pixels.extend((height,height,height,1.0))
surface.pixels.foreach_set(pixels)
surface.filepath_raw=str((root/"f2-water-surface-v5.png").resolve())
surface.file_format="PNG"
surface.save()
watermat=bpy.data.materials.new("V5 thin transparent water + image driven ripples")
watermat.use_nodes=True
wn=watermat.node_tree.nodes
wn.clear()
wl=watermat.node_tree.links
output=wn.new("ShaderNodeOutputMaterial")
co=wn.new("ShaderNodeTexCoord")
mapping=wn.new("ShaderNodeVectorMath")
mapping.operation="SCALE"
mapping.inputs["Scale"].default_value=2.2
wl.new(co.outputs["Generated"],mapping.inputs[0])
tex=wn.new("ShaderNodeTexImage")
tex.image=surface
tex.interpolation="Linear"
tex.extension="REPEAT"
wl.new(mapping.outputs["Vector"],tex.inputs["Vector"])
bumpwater=wn.new("ShaderNodeBump")
bumpwater.inputs["Strength"].default_value=.16
bumpwater.inputs["Distance"].default_value=.012
wl.new(tex.outputs["Color"],bumpwater.inputs["Height"])
gloss=wn.new("ShaderNodeBsdfGlossy")
gloss.inputs["Color"].default_value=(.78,.96,.98,1)
wl.new(bumpwater.outputs["Normal"],gloss.inputs["Normal"])
# Same texture modulates micro-roughness and glints, independent of transparency.
roughmultiply=wn.new("ShaderNodeMath")
roughmultiply.operation="MULTIPLY"
roughmultiply.inputs[1].default_value=.055
wl.new(tex.outputs["Color"],roughmultiply.inputs[0])
roughadd=wn.new("ShaderNodeMath")
roughadd.operation="ADD"
roughadd.inputs[1].default_value=.025
wl.new(roughmultiply.outputs[0],roughadd.inputs[0])
wl.new(roughadd.outputs[0],gloss.inputs["Roughness"])
transparent=wn.new("ShaderNodeBsdfTransparent")
# No dark base color; only faint pale-cyan surface reflection.
transparent.inputs["Color"].default_value=(.97,.995,.995,1)
fresnel=wn.new("ShaderNodeLayerWeight")
fresnel.inputs["Blend"].default_value=.12
strength=wn.new("ShaderNodeMath")
strength.operation="MULTIPLY"
strength.inputs[1].default_value=.30
wl.new(fresnel.outputs["Fresnel"],strength.inputs[0])
base=wn.new("ShaderNodeMath")
base.operation="ADD"
base.inputs[1].default_value=.035
wl.new(strength.outputs[0],base.inputs[0])
mix=wn.new("ShaderNodeMixShader")
wl.new(base.outputs[0],mix.inputs[0])
wl.new(transparent.outputs["BSDF"],mix.inputs[1])
wl.new(gloss.outputs["BSDF"],mix.inputs[2])
wl.new(mix.outputs[0],output.inputs["Surface"])
# Shape water to avoid hard straight shoreline, with randomised multifrequency normal from mesh.
verts=[];faces=[];N=95
for j in range(N+1):
    for i in range(N+1):
        x=-7.9+15.8*i/N
        shoreline=2.8+.34*math.sin(x*.7)+.18*math.cos(x*1.9)
        y=-7.9+(7.9+shoreline)*j/N
        z=.009*math.sin(1.7*x+1.2*y)+.006*math.sin(3.1*x-.7*y)+.004*math.cos(.52*x+2.9*y)
        verts.append((x,y,z))
for j in range(N):
    for i in range(N):
        a=j*(N+1)+i;faces.append((a,a+1,a+N+2,a+N+1))
mesh=bpy.data.meshes.new("non_uniform_waves");mesh.from_pydata(verts,[],faces);mesh.update()
water=bpy.data.objects.new("Clear_water_surface",mesh);bpy.context.collection.objects.link(water)
water.data.materials.append(watermat)
for pgn in water.data.polygons:pgn.use_smooth=True
# Local translucent foam around irregular bank using scattered thin white flakes
foam=mat("Soft_broken_white_foam","#9dc9bd",.8)
for i in range(65):
    x=random.uniform(-7.2,7.2)
    y=2.8+.34*math.sin(x*.7)+.18*math.cos(x*1.9)+random.gauss(0,.18)
    radius=random.uniform(.006,.035)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=(x,y,.038))
    o=bpy.context.object;o.name="Foam_contact_fragment";o.scale=(radius*2.5,radius*.32,.001)
    o.data.materials.append(foam)
# luminous gobo-ish breaks: light for particulate sparkle, rather than a uniform lattice
for k in range(4):
    bpy.ops.object.light_add(type="AREA",location=((-4+k*2.8),-1,6))
    lamp=bpy.context.object;lamp.data.energy=160 if k==0 else 80
    lamp.data.shape="DISK";lamp.data.size=5 if k else 4
bpy.ops.object.light_add(type="SUN",location=(0,0,8))
sun=bpy.context.object;sun.data.energy=1.3;sun.rotation_euler=(.39,-.4,-.5)
# very subtle distance fog using actual volume scatter in a distant cube
fog=bpy.data.materials.new("Subtle distance mist VFX");fog.use_nodes=True
nodes=fog.node_tree.nodes;nodes.clear()
output=nodes.new("ShaderNodeOutputMaterial");volume=nodes.new("ShaderNodeVolumePrincipled")
volume.inputs["Color"].default_value=(.54,.76,.75,1)
volume.inputs["Density"].default_value=.0008
fog.node_tree.links.new(volume.outputs["Volume"],output.inputs["Volume"])
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,5,2.5))
mist=bpy.context.object;mist.name="Distance_mist";mist.scale=(16,7,6);mist.data.materials.append(fog)
world=bpy.data.worlds.new("Cool cavern ambient");scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.22,.38,.45,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.7
def point_camera(loc,target):
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.type="ORTHO";cam.data.ortho_scale=12.5
    scene.camera=cam
for name,pos in [("front",(0,-11,5.9)),("side",(11,-2,6)),("angle",(7,-11,8.4))]:
    point_camera(pos,(0,0,-.2));scene.render.filepath=str((root/(name+".png")).resolve())
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(scene.camera,do_unlink=True)
results={}
for n in ("front","side","angle"):
    f=root/(n+".png");assert f.stat().st_size>10000
    results[n]={"path":str(f),"sha256":hashlib.sha256(f.read_bytes()).hexdigest(),"size":f.stat().st_size}
(root/"render_manifest.json").write_text(json.dumps({"status":"NOT_APPROVED","render_engine":"Blender Cycles","images":results,"scan_source":manifest["sha256"]},indent=2))
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str((root/"f2-water-v5.blend").resolve()))
