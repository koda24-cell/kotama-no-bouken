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
scene.cycles.samples=48  # V11 preview; restore >=56 for approved final
scene.cycles.max_bounces=4
bpy.context.view_layer.cycles.use_denoising=False  # Ubuntu apt Blender has no OpenImageDenoiser
scene.render.resolution_x=960;scene.render.resolution_y=640;scene.render.resolution_percentage=85  # V9 fast preview 816x544
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
# V12 corrective: The V11 Voronoi Distance-to-Edge created an unnatural
# network of bright polygonal seams resembling cracked stone. Remove that
# entire pseudo-caustic node chain and retain the scanned riverbed photo.
# Genuine light caustics will be revisited with low-contrast warped bands,
# masked/discontinuous and compared in an isolated A/B test.
# V13: separate SHALLOW WATER BOTTOM TINT from reflections and refraction.
# Subtle cyan scattering tint exists only where riverbed is beneath the surface
# (Y < shoreline). A broad, soft gradient prevents any hard waterline/grid.
bottom_geo=bed.node_tree.nodes.new("ShaderNodeNewGeometry")
bottom_xyz=bed.node_tree.nodes.new("ShaderNodeSeparateXYZ")
bed.node_tree.links.new(bottom_geo.outputs["Position"],bottom_xyz.inputs["Vector"])
underwater=bed.node_tree.nodes.new("ShaderNodeMapRange")
underwater.inputs["From Min"].default_value=1.65
underwater.inputs["From Max"].default_value=3.45
underwater.inputs["To Min"].default_value=.16
underwater.inputs["To Max"].default_value=0.0
underwater.clamp=True
bed.node_tree.links.new(bottom_xyz.outputs["Y"],underwater.inputs["Value"])
tint_color=bed.node_tree.nodes.new("ShaderNodeRGB")
tint_color.outputs["Color"].default_value=(.29,.63,.64,1)
bottom_tint=bed.node_tree.nodes.new("ShaderNodeMixRGB")
bottom_tint.blend_type="MIX"
bed.node_tree.links.new(underwater.outputs["Result"],bottom_tint.inputs[0])
bed.node_tree.links.new(image.outputs["Color"],bottom_tint.inputs[1])
bed.node_tree.links.new(tint_color.outputs["Color"],bottom_tint.inputs[2])
bed.node_tree.links.new(bottom_tint.outputs["Color"],bs.inputs["Base Color"])
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
surface=bpy.data.images.new("F2_original_water_surface_height_V7",width=TEX_SIZE,height=TEX_SIZE,alpha=False,float_buffer=False)
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
surface.filepath_raw=str((root/"f2-water-surface-v7-height.png").resolve())
surface.file_format="PNG"
surface.save()
# V6 water: keep real transparency, restore legible surface through
# Fresnel reflections and image-controlled pale optical highlights.
watermat=bpy.data.materials.new("V13 clear shallow water + broad underwater tint")
watermat.use_nodes=True
wn=watermat.node_tree.nodes
wn.clear()
wl=watermat.node_tree.links
outnode=wn.new("ShaderNodeOutputMaterial")
co=wn.new("ShaderNodeTexCoord")
mapping=wn.new("ShaderNodeVectorMath")
mapping.operation="SCALE"
mapping.inputs["Scale"].default_value=1.65
wl.new(co.outputs["Generated"],mapping.inputs[0])
tex=wn.new("ShaderNodeTexImage")
tex.image=surface
tex.extension="REPEAT"
tex.interpolation="Linear"
wl.new(mapping.outputs["Vector"],tex.inputs["Vector"])
waterbump=wn.new("ShaderNodeBump")
waterbump.inputs["Strength"].default_value=.075
waterbump.inputs["Distance"].default_value=.006
wl.new(tex.outputs["Color"],waterbump.inputs["Height"])
reflection=wn.new("ShaderNodeBsdfGlossy")
reflection.inputs["Color"].default_value=(.72,.89,.93,1)
reflection.inputs["Roughness"].default_value=.095
wl.new(waterbump.outputs["Normal"],reflection.inputs["Normal"])
# V9 genuine shallow-water distortion: refraction is independent of colored ripples.
# Mix a mostly-transparent sightline with physical IOR 1.333 refraction.
clear=wn.new("ShaderNodeBsdfTransparent")
clear.inputs["Color"].default_value=(.995,1,1,1)
refract=wn.new("ShaderNodeBsdfRefraction")
refract.inputs["Color"].default_value=(.91,.975,.99,1)
refract.inputs["IOR"].default_value=1.333
refract.inputs["Roughness"].default_value=.002
wl.new(waterbump.outputs["Normal"],refract.inputs["Normal"])
refr_mix=wn.new("ShaderNodeMixShader")
refr_mix.inputs[0].default_value=.11
wl.new(clear.outputs["BSDF"],refr_mix.inputs[1])
wl.new(refract.outputs["BSDF"],refr_mix.inputs[2])
fresnel=wn.new("ShaderNodeLayerWeight")
fresnel.inputs["Blend"].default_value=.19
# Visible, yet light, reflection even straight on.
fscale=wn.new("ShaderNodeMath");fscale.operation="MULTIPLY"
fscale.inputs[1].default_value=.24
wl.new(fresnel.outputs["Fresnel"],fscale.inputs[0])
fbase=wn.new("ShaderNodeMath");fbase.operation="ADD"
fbase.inputs[1].default_value=.06
wl.new(fscale.outputs[0],fbase.inputs[0])
mix=wn.new("ShaderNodeMixShader")
wl.new(fbase.outputs[0],mix.inputs[0])
wl.new(refr_mix.outputs[0],mix.inputs[1])
wl.new(reflection.outputs["BSDF"],mix.inputs[2])
# A very thin, pale image-driven highlight mask makes the waterline
# readable even if the scene is viewed head-on. Never tint the water volume.
crest=wn.new("ShaderNodeValToRGB")
crest.color_ramp.elements[0].position=.53
crest.color_ramp.elements[0].color=(0,0,0,1)
crest.color_ramp.elements[1].position=.79
crest.color_ramp.elements[1].color=(1,1,1,1)
wl.new(tex.outputs["Color"],crest.inputs["Fac"])
hscale=wn.new("ShaderNodeMath");hscale.operation="MULTIPLY"
hscale.inputs[1].default_value=.075
wl.new(crest.outputs["Color"],hscale.inputs[0])
highlight=wn.new("ShaderNodeEmission")
highlight.inputs["Color"].default_value=(.63,.87,.91,1)
highlight.inputs["Strength"].default_value=.24
mixhigh=wn.new("ShaderNodeMixShader")
wl.new(hscale.outputs[0],mixhigh.inputs[0])
wl.new(mix.outputs[0],mixhigh.inputs[1])
wl.new(highlight.outputs[0],mixhigh.inputs[2])
# V7: actual COLOR + ALPHA water image texture on the same mesh.
# Alpha masks gentle cyan highlights while transparent regions retain the riverbed.
overlay_path=root/"v7_water_surface_color_alpha.png"
assert overlay_path.is_file(), "V7 SVG-rasterized overlay missing"
overlay_img=bpy.data.images.load(str(overlay_path.resolve()))
# V8: one broad smooth nonuniform flow field distorts texture coordinates
# and a separate low-frequency field breaks repeated highlight coverage.
flow_noise=wn.new("ShaderNodeTexNoise")
flow_noise.inputs["Scale"].default_value=3.8
flow_noise.inputs["Detail"].default_value=2.1
wl.new(mapping.outputs["Vector"],flow_noise.inputs["Vector"])
flow_shift=wn.new("ShaderNodeVectorMath")
flow_shift.operation="SCALE"
flow_shift.inputs["Scale"].default_value=.13
wl.new(flow_noise.outputs["Color"],flow_shift.inputs[0])
warped_uv=wn.new("ShaderNodeVectorMath")
warped_uv.operation="ADD"
wl.new(mapping.outputs["Vector"],warped_uv.inputs[0])
wl.new(flow_shift.outputs["Vector"],warped_uv.inputs[1])
coverage=wn.new("ShaderNodeTexNoise")
coverage.inputs["Scale"].default_value=1.8
coverage.inputs["Detail"].default_value=2.0
wl.new(mapping.outputs["Vector"],coverage.inputs["Vector"])
cover_map=wn.new("ShaderNodeMapRange")
cover_map.inputs["From Min"].default_value=.38
cover_map.inputs["From Max"].default_value=.72
cover_map.inputs["To Min"].default_value=.22
cover_map.inputs["To Max"].default_value=1.0
wl.new(coverage.outputs["Fac"],cover_map.inputs["Value"])
overlay_tex=wn.new("ShaderNodeTexImage")
overlay_tex.image=overlay_img
overlay_tex.extension="REPEAT"
overlay_tex.interpolation="Linear"
wl.new(warped_uv.outputs["Vector"],overlay_tex.inputs["Vector"])
overlay_light=wn.new("ShaderNodeEmission")
overlay_light.inputs["Strength"].default_value=.42
wl.new(overlay_tex.outputs["Color"],overlay_light.inputs["Color"])
overlay_alpha=wn.new("ShaderNodeMath")
overlay_alpha.operation="MULTIPLY"
overlay_alpha.inputs[1].default_value=.55
wl.new(overlay_tex.outputs["Alpha"],overlay_alpha.inputs[0])
overlay_mix=wn.new("ShaderNodeMixShader")
overlay_coverage=wn.new("ShaderNodeMath")
overlay_coverage.operation="MULTIPLY"
wl.new(overlay_alpha.outputs[0],overlay_coverage.inputs[0])
wl.new(cover_map.outputs["Result"],overlay_coverage.inputs[1])
wl.new(overlay_coverage.outputs[0],overlay_mix.inputs[0])
wl.new(mixhigh.outputs[0],overlay_mix.inputs[1])
wl.new(overlay_light.outputs["Emission"],overlay_mix.inputs[2])
# V7 AI-generated source image is used directly as a second COLOR + ALPHA layer.
# Git stores its 96px RGBA original; rasterizer prepares a smooth 1024px PNG.
ai_path=root/"v7_ai_water_surface_color_alpha_1024.png"
assert ai_path.is_file(), "Git-tracked AI-generated water image missing"
ai_img=bpy.data.images.load(str(ai_path.resolve()))
ai_tex=wn.new("ShaderNodeTexImage")
ai_tex.image=ai_img
ai_tex.extension="REPEAT"
ai_tex.interpolation="Linear"
wl.new(warped_uv.outputs["Vector"],ai_tex.inputs["Vector"])
ai_emission=wn.new("ShaderNodeEmission")
ai_emission.inputs["Strength"].default_value=.48
wl.new(ai_tex.outputs["Color"],ai_emission.inputs["Color"])
ai_mask=wn.new("ShaderNodeMath")
ai_mask.operation="MULTIPLY"
ai_mask.inputs[1].default_value=.37
wl.new(ai_tex.outputs["Alpha"],ai_mask.inputs[0])
ai_mix=wn.new("ShaderNodeMixShader")
ai_coverage=wn.new("ShaderNodeMath")
ai_coverage.operation="MULTIPLY"
wl.new(ai_mask.outputs[0],ai_coverage.inputs[0])
wl.new(cover_map.outputs["Result"],ai_coverage.inputs[1])
wl.new(ai_coverage.outputs[0],ai_mix.inputs[0])
wl.new(overlay_mix.outputs[0],ai_mix.inputs[1])
wl.new(ai_emission.outputs[0],ai_mix.inputs[2])
wl.new(ai_mix.outputs[0],outnode.inputs["Surface"])
# Shape water to avoid hard straight shoreline, with randomised multifrequency normal from mesh.
verts=[];faces=[];N=95
for j in range(N+1):
    for i in range(N+1):
        x=-7.9+15.8*i/N
        shoreline=2.8+.34*math.sin(x*.7)+.18*math.cos(x*1.9)
        y=-7.9+(7.9+shoreline)*j/N
        z=.018*math.sin(1.7*x+1.2*y)+.011*math.sin(3.1*x-.7*y)+.006*math.cos(.52*x+2.9*y)
        verts.append((x,y,z))
for j in range(N):
    for i in range(N):
        a=j*(N+1)+i;faces.append((a,a+1,a+N+2,a+N+1))
mesh=bpy.data.meshes.new("non_uniform_waves");mesh.from_pydata(verts,[],faces);mesh.update()
water=bpy.data.objects.new("Clear_water_surface",mesh);bpy.context.collection.objects.link(water)
water.data.materials.append(watermat)
for pgn in water.data.polygons:pgn.use_smooth=True
# V7: remove V6's artificial white ribbon strokes. Natural overlay image replaces them.
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
    lamp=bpy.context.object;lamp.data.energy=90 if k==0 else 45
    lamp.data.shape="DISK";lamp.data.size=6.5 if k else 6
bpy.ops.object.light_add(type="SUN",location=(0,0,8))
sun=bpy.context.object;sun.data.energy=.9;sun.rotation_euler=(.39,-.4,-.5)
# very subtle distance fog using actual volume scatter in a distant cube
fog=bpy.data.materials.new("Subtle distance mist VFX");fog.use_nodes=True
nodes=fog.node_tree.nodes;nodes.clear()
output=nodes.new("ShaderNodeOutputMaterial");volume=nodes.new("ShaderNodeVolumePrincipled")
volume.inputs["Color"].default_value=(.54,.76,.75,1)
volume.inputs["Density"].default_value=.0003
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
bpy.ops.wm.save_as_mainfile(filepath=str((root/"f2-water-v13.blend").resolve()))
