# F6 flower garden natural sparse gravel V1 (unapproved).
# Every stone is independently deformable geometry; the preview ground is NOT exported.
import bpy, math, random, hashlib, json, os
from pathlib import Path
from mathutils import Vector, noise
OUT=Path("render-output/floor6/gravel/gravel_sparse")
OUT.mkdir(parents=True,exist_ok=True)
RNG=random.Random(6161101)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scn=bpy.context.scene
scn.render.engine="BLENDER_EEVEE"
scn.render.resolution_x=960
scn.render.resolution_y=960
scn.render.resolution_percentage=100
scn.render.image_settings.file_format="PNG"
scn.view_settings.view_transform="Standard"
world=scn.world
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(0.43,0.46,0.42,1)

def stone_material(name,color,seed):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Roughness"].default_value=.97
    n=m.node_tree.nodes
    def height(x,y):
        u=math.tau*x/128;v=math.tau*y/128
        return .18*math.sin(9*u+3*v+seed)*math.cos(7*v-2*u)+.08*math.sin(23*u-13*v+seed)
    image=bpy.data.images.new(name+"_normal",width=128,height=128,alpha=True)
    px=[]
    for y in range(128):
        for x in range(128):
            dx=(height((x+1)%128,y)-height((x-1)%128,y))*.55
            dy=(height(x,(y+1)%128)-height(x,(y-1)%128))*.55
            mag=math.sqrt(dx*dx+dy*dy+1)
            px.extend([(.5-dx/mag*.5),(.5-dy/mag*.5),(.5+1/mag*.5),1])
    image.pixels[:]=px
    image.colorspace_settings.name="Non-Color"
    image.pack()
    tex=n.new("ShaderNodeTexImage")
    tex.image=image
    normal=n.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value=.32
    m.node_tree.links.new(tex.outputs["Color"],normal.inputs["Color"])
    m.node_tree.links.new(normal.outputs["Normal"],p.inputs["Normal"])
    return m

materials=[stone_material("pebble_gray",(0.35,0.37,0.34),10),
           stone_material("pebble_warm",(0.39,0.36,0.31),20),
           stone_material("pebble_cool",(0.31,0.34,0.33),30)]
def uv_continuous(obj):
    layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name="ContinuousUV")
    for p in obj.data.polygons:
        vals=[]
        for li in p.loop_indices:
            v=obj.data.vertices[obj.data.loops[li].vertex_index].co
            vals.append((math.atan2(v.y,v.x)/math.tau+.5,max(.001,min(.999,(v.z+1)/2))))
        crossing=max(u for u,v in vals)-min(u for u,v in vals)>.5
        for li,(u,v) in zip(p.loop_indices,vals):
            layer.data[li].uv=(u+1 if crossing and u<.5 else u,v)

# Non-uniform natural group distribution, leaves broad grassy negative space.
clusters=[(-.28,.18),(.19,-.23),(.25,.25)]
stones=[]
for i in range(29):
    if i<23:
        cx,cy=clusters[RNG.randrange(len(clusters))]
        x=cx+RNG.gauss(0,.087)
        y=cy+RNG.gauss(0,.095)
    else:
        x=RNG.uniform(-.43,.43)
        y=RNG.uniform(-.43,.43)
    x=max(-.44,min(.44,x));y=max(-.44,min(.44,y))
    r=RNG.uniform(.024,.055)
    if i%8==0:r*=1.30
    height=r*RNG.uniform(.42,.72)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=(x,y,height*.64))
    obj=bpy.context.object
    obj.name="gravel_sparse_pebble_%02d"%i
    phase=RNG.uniform(-math.pi,math.pi)
    for vert in obj.data.vertices:
        v=vert.co.copy()
        grain=noise.noise_vector(Vector((v.x*6+i*.23,v.y*6-i*.13,v.z*6+phase)))
        fac=1+.12*math.sin(v.x*5+phase)*math.cos(v.y*4-phase)+.075*grain.x
        vert.co=(v.x*fac,v.y*fac,v.z*(.65+.06*grain.y))
    obj.scale=(r*RNG.uniform(.9,1.4),r*RNG.uniform(.75,1.2),height)
    obj.rotation_euler=(RNG.uniform(-.24,.24),RNG.uniform(-.24,.24),RNG.uniform(-math.pi,math.pi))
    obj.data.materials.append(materials[RNG.randrange(len(materials))])
    for p in obj.data.polygons:p.use_smooth=True
    uv_continuous(obj)
    stones.append(obj)

bpy.ops.object.select_all(action="DESELECT")
for obj in stones:obj.select_set(True)
bpy.context.view_layer.objects.active=stones[0]
# Export stones only. Floor, lighting and cameras are intentionally excluded.
bpy.ops.export_scene.gltf(filepath=str((OUT/"gravel_sparse.glb").resolve()),export_format="GLB",use_selection=True)
bpy.ops.object.select_all(action="DESELECT")
# Ground is only a compositional render reference, not a saved game asset.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.032))
floor=bpy.context.object
floor.name="REVIEW_ONLY_grass_reference"
floor.scale=(1.0,1.0,.05)
fmat=bpy.data.materials.new("review_only_muted_meadow")
fmat.diffuse_color=(.42,.49,.31,1)
floor.data.materials.append(fmat)
ld=bpy.data.lights.new("key","AREA");lo=bpy.data.objects.new("key",ld)
bpy.context.collection.objects.link(lo);lo.location=(1.3,-2,2.8);ld.energy=460;ld.size=3.3
ld2=bpy.data.lights.new("fill","AREA");lo2=bpy.data.objects.new("fill",ld2)
bpy.context.collection.objects.link(lo2);lo2.location=(-2,1.5,2.4);ld2.energy=300;ld2.size=4.5
for name,loc in [("front",(0,-2,1.2)),("side",(2,0,1.2)),("angle",(1.65,-2.2,1.7)),("top",(0,-.001,3))]:
    camera=bpy.data.cameras.new("review_"+name)
    ob=bpy.data.objects.new("review_"+name,camera)
    bpy.context.collection.objects.link(ob)
    ob.location=loc
    ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat("-Z","Y").to_euler()
    camera.type="ORTHO";camera.ortho_scale=1.4
    scn.camera=ob
    scn.render.filepath=str((OUT/(name+".png")).resolve())
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((OUT/"gravel_sparse.blend").resolve()))
files=[]
for p in sorted(OUT.iterdir()):
    if p.suffix in (".glb",".png",".blend"):
        files.append({"name":p.name,"bytes":p.stat().st_size,
            "sha256":hashlib.sha256(p.read_bytes()).hexdigest()})
manifest={"asset_id":"gravel_sparse","version":"V1","status":"NOT_APPROVED",
    "game_integration":"NOT_INTEGRATED","tile_size_m":[1,1],
    "source":"tools/floor6/gravel_sparse_v1.py",
    "source_sha":os.getenv("GITHUB_SHA","local"),
    "run_id":os.getenv("GITHUB_RUN_ID","local"),
    "parts":len(stones),"files":files,
    "note":"Review-only ground plane excluded from GLB; render scene in .blend."}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("F6_GRAVEL_SPARSE_DONE",len(stones))
