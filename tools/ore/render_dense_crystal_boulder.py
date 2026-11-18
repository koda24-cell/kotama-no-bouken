"""Add dense crystal clusters to the ORIGINAL downloaded CC0 boulder mesh.
The source mesh is not edited or deleted. Review output only.
"""
import bpy, math, random, sys, json, hashlib
from pathlib import Path
from mathutils import Vector
src=Path(sys.argv[sys.argv.index("--")+1]).resolve()
out=Path(sys.argv[sys.argv.index("--")+2]).resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src))
scene=bpy.context.scene
original=[o for o in scene.objects if o.type=="MESH" and not o.hide_render]
assert original,"missing original CC0 boulder mesh"
# Original .blend contains four overlapping LODs. Keep all geometry intact,
# but render/export only LOD0 to prevent z-fighting and quadruple geometry.
all_original=list(original)
original=[o for o in original if o.name.endswith('LOD0')] or original[:1]
for obj in all_original:
    if obj not in original:
        obj.hide_render=True
        obj.hide_set(True)

pts=[o.matrix_world@Vector(c) for o in original for c in o.bound_box]
lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)))
hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
center=(lo+hi)*.5
dims=hi-lo
scale=max(dims.length,.1)
rng=random.Random(20261118)
# Reference-driven growth: many small crystals, few dominant tips.
# Preserve the source rock mesh, diagnose missing images before rendering.
missing=[]
for material in bpy.data.materials:
    if not material.use_nodes: continue
    for node in material.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image:
            im=node.image
            try: valid=im.packed_file is not None or Path(bpy.path.abspath(im.filepath)).is_file()
            except Exception: valid=False
            if not valid: missing.append({'material':material.name,'image':im.name,'path':im.filepath})
# A missing diffuse image produces magenta. Use a neutral stone fallback
# only for missing-image materials; keep all original geometry unchanged.
if missing:
    fallback=bpy.data.materials.new('REVIEW_ONLY_neutral_stone_missing_texture')
    fallback.diffuse_color=(.28,.27,.25,1);fallback.use_nodes=True
    shader=fallback.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(.28,.27,.25,1)
    shader.inputs['Roughness'].default_value=.86
    for obj in original:
        for slot in obj.material_slots:
            if slot.material and any(m['material']==slot.material.name for m in missing):slot.material=fallback
print('MISSING_TEXTURE_DIAGNOSTIC',json.dumps(missing))
mat=bpy.data.materials.new("Quartz pale ice blue")
mat.diffuse_color=(.38,.72,.85,1)
mat.use_nodes=True
bsdf=mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value=(.34,.69,.82,1)
bsdf.inputs["Metallic"].default_value=.05
bsdf.inputs["Roughness"].default_value=.17
if bsdf.inputs.get("Transmission Weight"):bsdf.inputs["Transmission Weight"].default_value=.28
# Restrained mineral luminescence, not a uniform neon surface.
# GLB-compatible Principled emission: color remains physically shaded.
crystal_mats=[]
for tier,(tint,glow) in enumerate([((.30,.62,.78,1),.08),((.28,.72,.88,1),.20),((.38,.78,.95,1),.38)]):
    m=mat.copy();m.name="Quartz subtle core glow %d"%tier
    shader=m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=tint
    if shader.inputs.get("Emission Color"):shader.inputs["Emission Color"].default_value=(.10,.58,.92,1)
    if shader.inputs.get("Emission Strength"):shader.inputs["Emission Strength"].default_value=glow
    crystal_mats.append(m)
def make_crystal(index,origin,axis,length,radius):
    axis=Vector(axis).normalized()
    u=axis.cross(Vector((0,0,1)))
    if u.length<.1:u=axis.cross(Vector((0,1,0)))
    u.normalize();v=axis.cross(u).normalized()
    sides=6;phase=rng.random()*math.tau
    rings=[(-.24,.72),(0,1),(.64,.95),(.81,.8),(1,.025)]
    vertices=[]
    for h,w in rings:
        for j in range(sides):
            angle=phase+j*math.tau/sides
            p=Vector(origin)+axis*(length*h)+radius*w*(u*math.cos(angle)+v*math.sin(angle))
            vertices.append(tuple(p))
    faces=[]
    for k in range(len(rings)-1):
        for j in range(sides):
            a=k*sides+j;b=k*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))))
    mesh=bpy.data.meshes.new("crystal_mesh_%03d"%index)
    mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new("ADDED_QUARTZ_%03d"%index,mesh)
    scene.collection.objects.link(obj);mesh.materials.append(crystal_mats[rng.choices([0,1,2],[.55,.35,.10])[0]])
    return obj
# Original mesh bounds are used to distribute clusters over upper/front boulder surface.
# Avoid a regular grid: use five overlapping, unevenly populated growth pockets.
pockets=[(-.30,-.19,8),(.12,-.26,31),(.35,-.03,12),(-.14,.17,44),(.24,.25,15)]
count=0
growth=[]
for pocket_index,(px,py,n) in enumerate(pockets):
    base=Vector((rng.uniform(-.65,.65),rng.uniform(-.65,.65),rng.uniform(.55,1.0))).normalized()
    for j in range(n):
        x=max(-.44,min(.44,px+rng.gauss(0,.06 if pocket_index%2==0 else .11)))
        y=max(-.44,min(.44,py+rng.gauss(0,.065 if pocket_index%2==0 else .11)))
        # Cast onto the actual rock surface rather than guessing from bounding box.
        sample=center+Vector((x*dims.x,y*dims.y,dims.z*2.5))
        hit,hit_pos,hit_normal,hit_index,hit_obj,hit_matrix=scene.ray_cast(bpy.context.view_layer.depsgraph,sample,Vector((0,0,-1)),distance=scale*5)
        if not hit or hit_obj not in original:
            # Nearest-mesh fallback retains all 110 crystals on steep rock sides.
            target=original[0]
            local=target.matrix_world.inverted()@sample
            found,local_pos,local_normal,_=target.closest_point_on_mesh(local)
            assert found,"cannot anchor crystal to source rock"
            hit_pos=target.matrix_world@local_pos
            hit_normal=(target.matrix_world.to_3x3().inverted().transposed()@local_normal).normalized()
        origin=hit_pos-hit_normal*(scale*.008)
        axis=base+Vector((rng.gauss(0,.24),rng.gauss(0,.24),rng.gauss(0,.15)))
        if axis.dot(hit_normal)<.22:axis=(axis+hit_normal*.9).normalized()
        if rng.random()<.12:axis=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(.1,.8)))
        tier=rng.random()
        if j==0 and pocket_index in (1,3):length=scale*rng.uniform(.16,.22)
        elif tier<.04:length=scale*rng.uniform(.11,.16)
        elif tier<.21:length=scale*rng.uniform(.075,.14)
        else:length=scale*rng.uniform(.014,.07)
        radius=length*rng.uniform(.12,.26)
        make_crystal(count,origin,axis,length,radius)
        growth.append({'pocket':pocket_index,'length':round(length/scale,4),'direction':[round(v,3) for v in axis.normalized()]})
        count+=1
for o in list(scene.objects):
    if o.type in {"CAMERA","LIGHT"}:bpy.data.objects.remove(o,do_unlink=True)
world=bpy.data.worlds.new("Neutral mineral review")
world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.26,.29,.34,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.75
scene.world=world
def light(name,direction,energy,size):
    d=bpy.data.lights.new(name,"AREA");d.energy=energy;d.size=size
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o)
    o.location=center+Vector(direction)*scale
    o.rotation_euler=(center-o.location).to_track_quat("-Z","Y").to_euler()
light("Key",(.7,-.8,1.3),650,4)
light("Fill",(-.7,.5,.8),350,5)
camdata=bpy.data.cameras.new("Review camera")
cam=bpy.data.objects.new("Review camera",camdata);scene.collection.objects.link(cam)
scene.camera=cam;camdata.type="ORTHO";camdata.ortho_scale=scale*1.6
scene.render.engine="CYCLES";scene.cycles.samples=32
# Preview includes soft glow via compositor; geometry and GLB remain unchanged.
scene.use_nodes=True
nodes=scene.node_tree.nodes;nodes.clear()
rl=nodes.new("CompositorNodeRLayers")
glare=nodes.new("CompositorNodeGlare");glare.glare_type="FOG_GLOW";glare.threshold=1.7;glare.quality="MEDIUM";glare.mix=-.90
out_node=nodes.new("CompositorNodeComposite")
scene.node_tree.links.new(rl.outputs["Image"],glare.inputs["Image"])
scene.node_tree.links.new(glare.outputs["Image"],out_node.inputs["Image"])
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
files={}
for name,direction in {"front":(0,-1,.35),"side":(1,0,.35),"angle":(1,-1,.8),"top":(.01,-.01,1)}.items():
    cam.location=center+Vector(direction).normalized()*scale*2.5
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    p=out/(name+".png");scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    files[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
bpy.ops.object.select_all(action="DESELECT")
for o in scene.objects:
    if o.type=="MESH" and not o.hide_render:o.select_set(True)
bpy.context.view_layer.objects.active=original[0]
glb=out/"dense_crystal_on_original_boulder.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_apply=True)
files[glb.name]=hashlib.sha256(glb.read_bytes()).hexdigest()
manifest={"render_variant":"V4_SUBTLE_CYAN_EMISSION","emission_strengths":[0.08,0.20,0.38],"status":"NOT_APPROVED","source":src.name,"original_mesh_count":len(all_original),"rendered_lod_count":len(original),"added_crystals":count,"missing_texture_images":missing,"growth":growth,"files":files}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
print("DENSE_ORE_RESULT",json.dumps(manifest))
