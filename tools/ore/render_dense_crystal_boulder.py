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
mat.diffuse_color=(.075,.20,.30,1)
mat.use_nodes=True
bsdf=mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value=(.075,.20,.30,1)
bsdf.inputs["Metallic"].default_value=.05
bsdf.inputs["Roughness"].default_value=.17
if bsdf.inputs.get("Transmission Weight"):bsdf.inputs["Transmission Weight"].default_value=.48
# Restrained mineral luminescence, not a uniform neon surface.
# GLB-compatible Principled emission: color remains physically shaded.
crystal_mats=[]
for tier,(tint,glow) in enumerate([((.025,.075,.14,1),.01),((.035,.11,.20,1),.05),((.06,.17,.29,1),.22)]):
    m=mat.copy();m.name="Quartz subtle core glow %d"%tier
    shader=m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=tint
    if shader.inputs.get("Emission Color"):shader.inputs["Emission Color"].default_value=(.12,.72,1.0,1)
    if shader.inputs.get("Emission Strength"):shader.inputs["Emission Strength"].default_value=glow
    crystal_mats.append(m)
# V8: mineral texture variation instead of artificial glowing lines or cores.
# Procedural mineral inclusions are self-contained and safe (no unverified downloads).
for i,m in enumerate(crystal_mats):
    nodes=m.node_tree.nodes; links=m.node_tree.links
    shader=nodes.get("Principled BSDF")
    tex=nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=42.0
    tex.inputs["Detail"].default_value=3.0;tex.inputs["Roughness"].default_value=.68
    ramp=nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position=.26
    ramp.color_ramp.elements[0].color=(.018,.055,.095,1)
    ramp.color_ramp.elements[1].position=.76
    ramp.color_ramp.elements[1].color=(.11,.29,.40,1)
    links.new(tex.outputs["Fac"],ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"],shader.inputs["Base Color"])
    bump=nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.08
    bump.inputs["Distance"].default_value=.008
    links.new(tex.outputs["Fac"],bump.inputs["Height"])
    links.new(bump.outputs["Normal"],shader.inputs["Normal"])
    shader.inputs["Roughness"].default_value=.22+i*.035
    shader.inputs["Emission Strength"].default_value=(.12,.22,.36)[i]
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
glow_centers=[]
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
        if j==0 and pocket_index in (1,3): glow_centers.append(origin+axis.normalized()*length*.48)
        growth.append({'pocket':pocket_index,'length':round(length/scale,4),'direction':[round(v,3) for v in axis.normalized()]})
        count+=1
for o in list(scene.objects):
    if o.type in {"CAMERA","LIGHT"}:bpy.data.objects.remove(o,do_unlink=True)
world=bpy.data.worlds.new("Neutral mineral review")
world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.26,.29,.34,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.32
scene.world=world
def light(name,direction,energy,size):
    d=bpy.data.lights.new(name,"AREA");d.energy=energy;d.size=size
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o)
    o.location=center+Vector(direction)*scale
    o.rotation_euler=(center-o.location).to_track_quat("-Z","Y").to_euler()
light("Key",(.7,-.8,1.3),240,4)
light("Fill",(-.7,.5,.8),120,5)
# Real local light spill onto adjacent rock, independent of postprocess bloom.
for i,pos in enumerate(glow_centers):
    data=bpy.data.lights.new("Quartz cyan spill %d"%i,"POINT")
    data.color=(.12,.68,1.0);data.energy=80;data.shadow_soft_size=scale*.11
    obj=bpy.data.objects.new(data.name,data);scene.collection.objects.link(obj)
    obj.location=pos
# V9 subtle VFX: scattered tiny emissive motes near crystal growth pockets.
# No glowing strokes or giant halos. Geometry stays separate from source rock.
vfx_mat=bpy.data.materials.new("VFX tiny mineral motes")
vfx_mat.use_nodes=True
vfx_shader=vfx_mat.node_tree.nodes.get("Principled BSDF")
vfx_shader.inputs["Base Color"].default_value=(.08,.35,.55,1)
vfx_shader.inputs["Emission Color"].default_value=(.15,.7,1,1)
vfx_shader.inputs["Emission Strength"].default_value=2.0
vfx_objects=[]
for i in range(22):
    base=glow_centers[i%len(glow_centers)]
    offset=Vector((rng.uniform(-.13,.13),rng.uniform(-.13,.13),rng.uniform(-.04,.20)))*scale
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=scale*rng.uniform(.0014,.0035),location=base+offset)
    mote=bpy.context.object;mote.name="VFX_MINERAL_MOTE_%02d"%i
    mote.data.materials.append(vfx_mat)
    vfx_objects.append(mote)
camdata=bpy.data.cameras.new("Review camera")
cam=bpy.data.objects.new("Review camera",camdata);scene.collection.objects.link(cam)
scene.camera=cam;camdata.type="ORTHO";camdata.ortho_scale=scale*1.6
scene.render.engine="CYCLES";scene.cycles.samples=32
# Blender 5 removes Scene.node_tree. Keep emissive Principled materials
# portable and renderable; add compositor glow only on older compatible APIs.
if hasattr(scene, "node_tree") and scene.node_tree is not None:
    scene.use_nodes=True
    nodes=scene.node_tree.nodes;nodes.clear()
    rl=nodes.new("CompositorNodeRLayers")
    glare=nodes.new("CompositorNodeGlare")
    glare.glare_type="FOG_GLOW";glare.threshold=1.7;glare.quality="MEDIUM";glare.mix=-.90
    out_node=nodes.new("CompositorNodeComposite")
    scene.node_tree.links.new(rl.outputs["Image"],glare.inputs["Image"])
    scene.node_tree.links.new(glare.outputs["Image"],out_node.inputs["Image"])
else:
    print("BLENDER5_COMPOSITOR_SKIP: emissive material renders without bloom")
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
files={}
for name,direction in {"front":(0,-1,.35),"side":(1,0,.35),"angle":(1,-1,.8),"top":(.01,-.01,1)}.items():
    cam.location=center+Vector(direction).normalized()*scale*2.5
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    p=out/(name+".png");scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    files[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
# Six actual Blender Cycles renders from the same camera and geometry.
# Preserve the baseline V8 render and GLB; these are unapproved color previews.
colorways={
    "purple":((.10,.025,.20),(.38,.16,.58),(.64,.30,1.0)),
    "green":((.015,.09,.055),(.08,.32,.19),(.20,.92,.45)),
    "white":((.17,.20,.24),(.60,.70,.77),(.75,.88,1.0)),
    "blue":((.018,.055,.13),(.10,.27,.47),(.12,.63,1.0)),
    "pink":((.16,.035,.10),(.52,.18,.34),(1.0,.38,.67)),
    "red":((.15,.018,.015),(.44,.08,.07),(1.0,.20,.12)),
}
variant_files={}
for color_name,(dark,light,emission) in colorways.items():
    for m in crystal_mats:
        nodes=m.node_tree.nodes
        ramp=next(n for n in nodes if n.type=="VALTORGB")
        ramp.color_ramp.elements[0].color=(*dark,1)
        ramp.color_ramp.elements[1].color=(*light,1)
        shader=nodes.get("Principled BSDF")
        shader.inputs["Emission Color"].default_value=(*emission,1)
    vfx_shader.inputs["Emission Color"].default_value=(*emission,1)
    for obj in scene.objects:
        if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):
            obj.data.color=emission
    cam.location=center+Vector((1,-1,.8)).normalized()*scale*2.5
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    p=out/("color_"+color_name+".png")
    scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    variant_files[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
# V10: controlled material experiments, identical geometry, camera and lighting.
# Fresnel is tested through the physically-based IOR/coat layer rather than
# an artificial bright outline or thin emission mask.
v10_files={}
for experiment in ("baseline","pbr_facets","pbr_coat"):
    for i,m in enumerate(crystal_mats):
        sh=m.node_tree.nodes.get("Principled BSDF")
        sh.inputs["Roughness"].default_value=(.22+i*.035) if experiment=="baseline" else (.12+i*.055)
        if sh.inputs.get("Coat Weight"):
            sh.inputs["Coat Weight"].default_value=0.0 if experiment!="pbr_coat" else .22
        if sh.inputs.get("Coat Roughness"):
            sh.inputs["Coat Roughness"].default_value=.16
        if sh.inputs.get("IOR"):
            sh.inputs["IOR"].default_value=1.45 if experiment=="baseline" else 1.54
    cam.location=center+Vector((1,-1,.8)).normalized()*scale*2.5
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    p=out/("v10_"+experiment+".png")
    scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    v10_files[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
# Return to original GLB material state; comparison is review-only.
for i,m in enumerate(crystal_mats):
    sh=m.node_tree.nodes.get("Principled BSDF")
    sh.inputs["Roughness"].default_value=.22+i*.035
    if sh.inputs.get("Coat Weight"):sh.inputs["Coat Weight"].default_value=0.0
    if sh.inputs.get("IOR"):sh.inputs["IOR"].default_value=1.45
# Restore the blue material state for the GLB export.
for m in crystal_mats:
    ramp=next(n for n in m.node_tree.nodes if n.type=="VALTORGB")
    ramp.color_ramp.elements[0].color=(.018,.055,.095,1)
    ramp.color_ramp.elements[1].color=(.11,.29,.40,1)
    m.node_tree.nodes.get("Principled BSDF").inputs["Emission Color"].default_value=(.12,.72,1.0,1)
vfx_shader.inputs["Emission Color"].default_value=(.15,.7,1,1)
for obj in scene.objects:
    if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):
        obj.data.color=(.12,.68,1.0)
bpy.ops.object.select_all(action="DESELECT")
for o in scene.objects:
    if o.type=="MESH" and not o.hide_render:o.select_set(True)
bpy.context.view_layer.objects.active=original[0]
glb=out/"dense_crystal_on_original_boulder.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_apply=True)
files[glb.name]=hashlib.sha256(glb.read_bytes()).hexdigest()
manifest={"render_variant":"V10_PBR_COMPARISON_UNAPPROVED","emission_strengths":[0.12,0.22,0.36],"internal_core_emission":0.0,"status":"NOT_APPROVED","source":src.name,"original_mesh_count":len(all_original),"rendered_lod_count":len(original),"added_crystals":count,"missing_texture_images":missing,"growth":growth,"vfx_mote_count":len(vfx_objects),"v10_comparison_renders":v10_files,"files":files,"colorway_renders":variant_files}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
print("DENSE_ORE_RESULT",json.dumps(manifest))
