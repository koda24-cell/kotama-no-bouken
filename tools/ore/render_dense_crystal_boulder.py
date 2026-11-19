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
for m in crystal_mats:
    ramp=next(n for n in m.node_tree.nodes if n.type=="VALTORGB")
    ramp.color_ramp.elements[0].color=(.018,.055,.095,1)
    ramp.color_ramp.elements[1].color=(.11,.29,.40,1)
    m.node_tree.nodes.get("Principled BSDF").inputs["Emission Color"].default_value=(.12,.72,1.0,1)
vfx_shader.inputs["Emission Color"].default_value=(.15,.7,1,1)
for obj in scene.objects:
    if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):obj.data.color=(.12,.68,1.0)
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
# V11 diagnostic exaggeration: deliberately large, visible differences.
# These are NOT final materials. Keep original boulder mesh and crystal geometry.
v11_files={}
for experiment in ("v11_glass","v11_milky","v11_radiant"):
    for i,m in enumerate(crystal_mats):
        sh=m.node_tree.nodes.get("Principled BSDF")
        ramp=next(n for n in m.node_tree.nodes if n.type=="VALTORGB")
        if experiment=="v11_glass":
            sh.inputs["Roughness"].default_value=.015
            sh.inputs["Metallic"].default_value=0.0
            sh.inputs["Transmission Weight"].default_value=.94
            sh.inputs["IOR"].default_value=1.62
            sh.inputs["Emission Strength"].default_value=.015
            ramp.color_ramp.elements[0].color=(.003,.025,.055,1)
            ramp.color_ramp.elements[1].color=(.06,.48,.75,1)
        elif experiment=="v11_milky":
            sh.inputs["Roughness"].default_value=.78
            sh.inputs["Metallic"].default_value=0.0
            sh.inputs["Transmission Weight"].default_value=.02
            sh.inputs["IOR"].default_value=1.45
            sh.inputs["Emission Strength"].default_value=.0
            ramp.color_ramp.elements[0].color=(.13,.30,.39,1)
            ramp.color_ramp.elements[1].color=(.65,.88,.94,1)
        else:
            sh.inputs["Roughness"].default_value=.09
            sh.inputs["Metallic"].default_value=.0
            sh.inputs["Transmission Weight"].default_value=.25
            sh.inputs["IOR"].default_value=1.54
            sh.inputs["Emission Strength"].default_value=(3.0,6.0,12.0)[i]
            ramp.color_ramp.elements[0].color=(.008,.055,.14,1)
            ramp.color_ramp.elements[1].color=(.09,.50,.90,1)
        if sh.inputs.get("Coat Weight"):
            sh.inputs["Coat Weight"].default_value=1.0 if experiment=="v11_glass" else 0.0
        if sh.inputs.get("Coat Roughness"):
            sh.inputs["Coat Roughness"].default_value=.02
    for obj in scene.objects:
        if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):
            obj.data.energy=650 if experiment=="v11_radiant" else 80
    cam.location=center+Vector((1,-1,.8)).normalized()*scale*2.5
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    p=out/(experiment+".png")
    scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    v11_files[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
# V12: user-selected hybrid. Glass crystal surface + Radiant rock illumination.
# Keep both light energy and shader settings independent; no Milky variant.
v12_files={}
for experiment,spill_energy in (("v12_glass_radiant_650",650),("v12_glass_radiant_450",450)):
    for i,m in enumerate(crystal_mats):
        sh=m.node_tree.nodes.get("Principled BSDF")
        ramp=next(n for n in m.node_tree.nodes if n.type=="VALTORGB")
        sh.inputs["Roughness"].default_value=.015
        sh.inputs["Metallic"].default_value=0.0
        sh.inputs["Transmission Weight"].default_value=.94
        sh.inputs["IOR"].default_value=1.62
        sh.inputs["Emission Strength"].default_value=.015
        ramp.color_ramp.elements[0].color=(.003,.025,.055,1)
        ramp.color_ramp.elements[1].color=(.06,.48,.75,1)
        if sh.inputs.get("Coat Weight"):
            sh.inputs["Coat Weight"].default_value=1.0
        if sh.inputs.get("Coat Roughness"):
            sh.inputs["Coat Roughness"].default_value=.02
    for obj in scene.objects:
        if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):
            obj.data.energy=spill_energy
    cam.location=center+Vector((1,-1,.8)).normalized()*scale*2.5
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    p=out/(experiment+".png")
    scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    v12_files[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
# V13: 10 stage-adapted ore variants; original source mesh remains untouched.
# 1F mossy forest stone, 2F cold blue-grey stone, 4F dark volcanic stone.
# Each variant has deterministic crystal thinning, size, angle and mineral palette.
# This is review-only: GLBs require game-side spill lights and visual QA.
variant_specs=[
 ("f1_01_moss_cluster",1,(.20,.245,.17),(.025,.10,.14),(.11,.38,.43),(.16,.70,.78),.78,.82,-.16),
 ("f1_02_lichen_spires",1,(.28,.30,.22),(.035,.11,.16),(.16,.43,.48),(.25,.80,.86),.64,1.13,.10),
 ("f1_03_rootside_specks",1,(.18,.22,.16),(.018,.07,.11),(.08,.28,.35),(.13,.58,.68),.44,.72,.28),
 ("f2_01_ice_blue",2,(.25,.34,.40),(.003,.025,.055),(.06,.48,.75),(.12,.68,1.0),.95,1.0,0),
 ("f2_02_frost_shelf",2,(.36,.43,.46),(.008,.045,.075),(.17,.52,.70),(.22,.73,.94),.76,.76,.22),
 ("f2_03_cave_glacier",2,(.16,.25,.31),(.005,.022,.060),(.04,.30,.56),(.08,.57,.94),.62,1.22,-.12),
 ("f2_04_riverbed_crystals",2,(.28,.36,.38),(.012,.045,.055),(.10,.40,.46),(.20,.70,.75),.52,.68,.35),
 ("f4_01_basalt_vein",4,(.085,.085,.095),(.06,.014,.022),(.40,.085,.11),(.95,.19,.12),.86,.82,-.18),
 ("f4_02_ember_cluster",4,(.12,.105,.10),(.09,.026,.015),(.55,.16,.045),(1.0,.35,.08),.60,1.18,.14),
 ("f4_03_obsidian_glow",4,(.055,.065,.075),(.025,.014,.06),(.26,.10,.42),(.68,.23,.96),.45,.95,-.30),
]
variant_records=[]
crystal_objects=sorted((o for o in scene.objects if o.name.startswith("ADDED_QUARTZ_")),key=lambda o:o.name)
crystal_state={o.name:(o.hide_render,o.scale.copy(),o.rotation_euler.copy()) for o in crystal_objects}
rock_slots={o.name:[slot.material for slot in o.material_slots] for o in original}
rock_mat=bpy.data.materials.new("V13 review stage-tinted rock")
rock_mat.use_nodes=True
rock_sh=rock_mat.node_tree.nodes.get("Principled BSDF")
rock_sh.inputs["Roughness"].default_value=.89
for index,(name,floor_id,rock_color,dark,bright,glow_color,density,length_factor,lean) in enumerate(variant_specs):
    # Replace only the review render material slots, never original rock geometry.
    rock_sh.inputs["Base Color"].default_value=(*rock_color,1)
    rock_mat.diffuse_color=(*rock_color,1)
    for rock in original:
        for slot in rock.material_slots:slot.material=rock_mat
    for i,m in enumerate(crystal_mats):
        sh=m.node_tree.nodes.get("Principled BSDF")
        ramp=next(n for n in m.node_tree.nodes if n.type=="VALTORGB")
        sh.inputs["Roughness"].default_value=.015
        sh.inputs["Metallic"].default_value=0
        sh.inputs["Transmission Weight"].default_value=.94
        sh.inputs["IOR"].default_value=1.62
        sh.inputs["Emission Strength"].default_value=.015
        sh.inputs["Emission Color"].default_value=(*glow_color,1)
        sh.inputs["Coat Weight"].default_value=1.0
        sh.inputs["Coat Roughness"].default_value=.02
        ramp.color_ramp.elements[0].color=(*dark,1)
        ramp.color_ramp.elements[1].color=(*bright,1)
    for i,obj in enumerate(crystal_objects):
        # Deterministic, distributed thinning rather than a solid uniform haircut.
        obj.hide_render=((i*37+index*19)%101)/101.0>=density
        obj.scale=(length_factor,length_factor,length_factor)
        obj.rotation_euler[1]=lean*((i%7)-3)/3
    for obj in scene.objects:
        if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):
            obj.data.color=glow_color
            obj.data.energy=450 if floor_id==2 else (210 if floor_id==1 else 320)
    scene.render.resolution_x=640;scene.render.resolution_y=640
    scene.cycles.samples=24
    cam.location=center+Vector((1,-1,.8)).normalized()*scale*2.5
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    png=out/("v13_"+name+".png")
    scene.render.filepath=str(png)
    bpy.ops.render.render(write_still=True)
    # Export only currently visible crystals and original LOD0, not cameras/lights.
    bpy.ops.object.select_all(action="DESELECT")
    for o in scene.objects:
        if o.type=="MESH" and not o.hide_render:o.select_set(True)
    bpy.context.view_layer.objects.active=original[0]
    variant_glb=out/("v13_"+name+".glb")
    bpy.ops.export_scene.gltf(filepath=str(variant_glb),export_format="GLB",use_selection=True,export_apply=True)
    variant_records.append({"name":name,"floor":floor_id,"rock_color":rock_color,"crystal_density":density,"crystal_scale":length_factor,"light_reference":450 if floor_id==2 else (210 if floor_id==1 else 320),"png":png.name,"png_sha256":hashlib.sha256(png.read_bytes()).hexdigest(),"glb":variant_glb.name,"glb_sha256":hashlib.sha256(variant_glb.read_bytes()).hexdigest(),"visible_crystals":sum(not o.hide_render for o in crystal_objects)})
for rock in original:
    for slot,mat_orig in zip(rock.material_slots,rock_slots[rock.name]):slot.material=mat_orig
for o in crystal_objects:
    was_hidden,old_scale,old_rotation=crystal_state[o.name]
    o.hide_render=was_hidden;o.scale=old_scale;o.rotation_euler=old_rotation
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.cycles.samples=32
# V14: fifteen neutral-color, geometry-distinct rock+crystal arrangements.
# Uses the same original CC0 rock geometry and crystal-on-surface technique;
# geometry copies only, source mesh and V13 approved colors remain intact.
# Neutral palette allows later floor-specific color assignment.
neutral_rock=bpy.data.materials.new("V14 neutral stone recolorable")
neutral_rock.diffuse_color=(.24,.27,.28,1);neutral_rock.use_nodes=True
neutral_bsdf=neutral_rock.node_tree.nodes.get("Principled BSDF")
neutral_bsdf.inputs["Base Color"].default_value=(.24,.27,.28,1)
neutral_bsdf.inputs["Roughness"].default_value=.87
neutral_dark=(.004,.026,.050);neutral_bright=(.07,.44,.68)
# Broad shapes: low flat, broad, tall, stacked-like, angular, and asymmetric.
shape_specs=[
 ("low_wide_a",1.45,.78,.52,.08,.06,.07,.72,.85),
 ("low_wide_b",1.32,1.18,.48,.12,.13,.11,.56,.72),
 ("flat_shelf",1.55,.86,.40,.20,.06,.15,.46,.70),
 ("tall_spire_a",.74,.82,1.48,.12,.11,.09,.86,1.18),
 ("tall_spire_b",.80,.67,1.64,.18,.12,.14,.68,.96),
 ("narrow_shard",.65,1.12,1.42,.22,.16,.11,.51,1.23),
 ("rounded_mound",1.14,1.12,.86,.04,.03,.06,.80,.76),
 ("angular_chunk",1.05,.92,1.07,.26,.21,.18,.76,.99),
 ("fractured_wedge",1.30,.72,.96,.30,.12,.17,.58,1.15),
 ("sloped_plate",1.52,.80,.68,.24,.19,.15,.62,.77),
 ("asymmetric_lobe",1.24,.92,.94,.23,.17,.12,.72,1.03),
 ("deep_crevice",.98,1.24,.92,.32,.24,.16,.67,.84),
 ("small_pebble",.64,.62,.57,.09,.08,.09,.43,.70),
 ("medium_boulder",.96,.93,.88,.16,.14,.11,.74,.94),
 ("large_outcrop",1.58,1.40,1.16,.23,.17,.16,.91,1.10),
]
# Preserve original objects, materials, crystals, and all V13 variants.
for i,m in enumerate(crystal_mats):
    sh=m.node_tree.nodes.get("Principled BSDF")
    ramp=next(n for n in m.node_tree.nodes if n.type=="VALTORGB")
    sh.inputs["Roughness"].default_value=.015
    sh.inputs["Metallic"].default_value=0
    sh.inputs["Transmission Weight"].default_value=.94
    sh.inputs["IOR"].default_value=1.62
    sh.inputs["Emission Strength"].default_value=.015
    sh.inputs["Coat Weight"].default_value=1
    sh.inputs["Coat Roughness"].default_value=.02
    ramp.color_ramp.elements[0].color=(*neutral_dark,1)
    ramp.color_ramp.elements[1].color=(*neutral_bright,1)
for obj in scene.objects:
    if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):
        obj.data.color=(.12,.68,1.0);obj.data.energy=450
# Create a local duplicate of original LOD0; change only its own mesh vertices.
base_rock=original[0]
base_world=base_rock.matrix_world.copy()
rock_copy=base_rock.copy();rock_copy.data=base_rock.data.copy()
rock_copy.name="V14_VARIANT_ROCK"
scene.collection.objects.link(rock_copy)
rock_copy.data.materials.clear();rock_copy.data.materials.append(neutral_rock)
base_vertices=[v.co.copy() for v in rock_copy.data.vertices]
base_bounds=[base_world@v for v in base_vertices]
base_min=Vector(tuple(min(p[j] for p in base_bounds) for j in range(3)))
base_max=Vector(tuple(max(p[j] for p in base_bounds) for j in range(3)))
base_c=(base_min+base_max)*.5
base_extent=base_max-base_min
orig_rock_visibility=base_rock.hide_render
base_rock.hide_render=True
v14_records=[]
# Anchor crystals by nearest surface projection after each rock deformation.
from mathutils.bvhtree import BVHTree
for k,(name,sx,sy,sz,noise,crease,slope,density,crystal_size) in enumerate(shape_specs):
    seed=random.Random(41000+k*101)
    # Displace rock in local coordinates with multi-frequency ridges and asymmetry.
    for v,source in zip(rock_copy.data.vertices,base_vertices):
        p=base_world@source
        rel=p-base_c
        nx=rel.x/max(base_extent.x,.001)
        ny=rel.y/max(base_extent.y,.001)
        nz=rel.z/max(base_extent.z,.001)
        phase=nx*(7.5+k*.27)+ny*(5.2+k*.13)+nz*3.4
        ridge=abs(math.sin(phase+math.sin(ny*11.0+1.2*k)*.9))-.48
        layered=math.sin(nz*15.0+nx*4.5+k)*math.cos(ny*8.0-k*.6)
        chip=math.sin(nx*23.0+ny*17.0+k)*math.sin(nz*19.0-ny*13.0)
        displacement=noise*ridge+crease*layered*.55+crease*chip*.24
        world_p=base_c+Vector((rel.x*sx,rel.y*sy,rel.z*sz))
        world_p+=Vector((nx*displacement,ny*displacement*.85,displacement*.55+slope*nx*rel.z))
        v.co=base_world.inverted()@world_p
    rock_copy.data.update()
    # Nearest triangle BVH handles anchors on the new silhouette and prevents floating roots.
    depsgraph=bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    bvh=BVHTree.FromObject(rock_copy,depsgraph)
    assert bvh is not None
    for i,obj in enumerate(crystal_objects):
        old_hidden,old_scale,old_rotation=crystal_state[obj.name]
        obj.hide_render=(((i*43+k*29)%107)/107.0>=density)
        obj.scale=(crystal_size,)*3
        obj.rotation_euler=old_rotation.copy()
        obj.rotation_euler[1]+=((i%9)-4)*.026
        # Crystal mesh is authored in world coordinates; move object to match new rock.
        # Scale anchored tip displacement with rock footprint and project roots to mesh.
        original_anchor=Vector(tuple(sum(v.co[j] for v in obj.data.vertices[:6])/6 for j in range(3)))
        transformed=base_c+Vector(((original_anchor.x-base_c.x)*sx,(original_anchor.y-base_c.y)*sy,(original_anchor.z-base_c.z)*sz))
        local_query=base_world.inverted()@transformed
        nearest,normal,face_idx,dist=bvh.find_nearest(local_query)
        if nearest is not None:
            target=base_world@nearest
            obj.location=target-original_anchor*crystal_size
        else:obj.location=transformed-original_anchor*crystal_size
    scene.render.resolution_x=640;scene.render.resolution_y=640;scene.cycles.samples=24
    cam.location=center+Vector((1,-1,.8)).normalized()*scale*2.9
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    png=out/("v14_"+name+".png");scene.render.filepath=str(png)
    bpy.ops.render.render(write_still=True)
    bpy.ops.object.select_all(action="DESELECT")
    rock_copy.select_set(True)
    for obj in crystal_objects:
        if not obj.hide_render:obj.select_set(True)
    bpy.context.view_layer.objects.active=rock_copy
    glb=out/("v14_"+name+".glb")
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_apply=True)
    v14_records.append({"name":name,"size_factors":[sx,sy,sz],"crystal_density":density,"crystal_size":crystal_size,"palette":"neutral_recolorable","png":png.name,"glb":glb.name,"png_sha256":hashlib.sha256(png.read_bytes()).hexdigest(),"glb_sha256":hashlib.sha256(glb.read_bytes()).hexdigest()})
    for obj in crystal_objects:obj.location=(0,0,0)
# Restore source object and remove only temporary geometry copy.
base_rock.hide_render=orig_rock_visibility
bpy.data.objects.remove(rock_copy,do_unlink=True)
for o in crystal_objects:
    was_hidden,old_scale,old_rotation=crystal_state[o.name]
    o.hide_render=was_hidden;o.scale=old_scale;o.rotation_euler=old_rotation;o.location=(0,0,0)
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.cycles.samples=32
# Restore spill intensity as well as material settings for GLB.
for obj in scene.objects:
    if obj.type=="LIGHT" and obj.name.startswith("Quartz cyan spill"):
        obj.data.energy=80
# Return to original GLB material state; comparison is review-only.
for i,m in enumerate(crystal_mats):
    sh=m.node_tree.nodes.get("Principled BSDF")
    sh.inputs["Roughness"].default_value=.22+i*.035
    sh.inputs["Metallic"].default_value=.05
    sh.inputs["Transmission Weight"].default_value=.48
    sh.inputs["Emission Strength"].default_value=(.12,.22,.36)[i]
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
manifest={"render_variant":"V10_PBR_COMPARISON_UNAPPROVED","emission_strengths":[0.12,0.22,0.36],"internal_core_emission":0.0,"status":"NOT_APPROVED","source":src.name,"original_mesh_count":len(all_original),"rendered_lod_count":len(original),"added_crystals":count,"missing_texture_images":missing,"growth":growth,"vfx_mote_count":len(vfx_objects),"v10_comparison_renders":v10_files,"v11_exaggerated_comparison_renders":v11_files,"v12_hybrid_renders":v12_files,"v13_stage_variants":variant_records,"v14_neutral_shape_variants":v14_records,"files":files,"colorway_renders":variant_files}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
print("DENSE_ORE_RESULT",json.dumps(manifest))

# V11 exaggerated material comparison: rerender requested; safety gate required.
