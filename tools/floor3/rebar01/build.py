"""Stage 3 exposed rebar 01 only. Three independently rendered single-part studies.
No wall/building modifications. Blender 5.x / standard Python only.
"""
import bpy, math, os, json, random
from mathutils import Vector
ROOT="/work/out/f3_rebar01"
os.makedirs(ROOT,exist_ok=True)
def make_texture():
    # A reusable self-authored 256x256 rust albedo, no external downloads.
    rng=random.Random(391)
    w=h=256
    im=bpy.data.images.new("F3_REBAR_RUST_01",width=w,height=h,alpha=True)
    pixels=[]
    for y in range(h):
        for x in range(w):
            p=(math.sin(x*.21+y*.05)*math.sin(y*.37-x*.11)+math.sin(x*.045+y*.065))*.19
            pepper=rng.uniform(-.10,.10)
            t=max(0,min(1,.51+p+pepper))
            g=.14 + .13*t
            # silver flecks of exposed metal remain sparse
            metal=1 if rng.random()<.025 else 0
            pixels.extend((.20+.25*t+metal*.17,g+metal*.15,.085+.09*t+metal*.16,1))
    im.pixels[:]=pixels
    im.filepath_raw=ROOT+"/F3_REBAR_RUST_01.png"
    im.file_format='PNG'
    im.save()
    return im
def make_mat(im):
    m=bpy.data.materials.new("oxidized_reinforcing_steel")
    m.use_nodes=True
    nt=m.node_tree
    bs=nt.nodes.get('Principled BSDF')
    bs.inputs['Metallic'].default_value=.62
    bs.inputs['Roughness'].default_value=.79
    tex=nt.nodes.new('ShaderNodeTexImage')
    tex.image=im
    nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    bump=nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value=.13
    bump.inputs['Distance'].default_value=.009
    nt.links.new(tex.outputs['Color'],bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m
def center(z,variant):
    v=z/1.55
    if variant==1:return (0,0)
    if variant==2:return (.20*v*v,0.03*math.sin(2*math.pi*v))
    return (.15*v*v + .09*math.sin(v*math.pi*1.35), .035*math.sin(3*v))
def build(variant,mat):
    sides=16
    rings=125
    radius=.038
    verts=[];faces=[];uvs=[]
    for j in range(rings+1):
        z=1.55*j/rings
        cx,cy=center(z,variant)
        for k in range(sides+1):
            angle=2*math.pi*k/sides
            rib=.0048*math.exp(-((j%7-3.0)/1.6)**2)
            rough=(.0006 if variant==1 else .0014 if variant==2 else .0022)*math.sin(15*angle+j*.77)
            # mild circumferential ribs and varied longitudinal profile
            rr=radius+rib+rough
            if variant==3 and j>rings-9:
                rr*=.88+.12*math.sin((rings-j)*.8)**2
            verts.append((cx+rr*math.cos(angle),cy+rr*math.sin(angle),z))
    for j in range(rings):
        for k in range(sides):
            a=j*(sides+1)+k;b=a+sides+1
            faces.append((a,b,b+1,a+1))
    # Caps, broken/sheared end visible at close range
    verts.extend([(0,0,0),(*center(1.55,variant),1.55)])
    bottom=len(verts)-2;top=len(verts)-1
    for k in range(sides):
        faces.append((bottom,k+1,k))
        t=rings*(sides+1)
        faces.append((top,t+k,t+k+1))
    mesh=bpy.data.meshes.new("bent_ribbed_rebar_mesh")
    mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new("F3_EXPOSED_REBAR01_V"+str(variant),mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    uv=mesh.uv_layers.new(name="rust_metal_UV")
    for face in mesh.polygons:
        for li in face.loop_indices:
            vid=mesh.loops[li].vertex_index
            if vid >= rings*(sides+1):
                uv.data[li].uv=(.5,.5)
            else:
                j=vid//(sides+1);k=vid%(sides+1)
                uv.data[li].uv=(k/sides,j/rings)
    for f in mesh.polygons:f.use_smooth=True
    return obj
def render_scene(version,mat):
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=24
    scene.render.resolution_x=740;scene.render.resolution_y=740
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=True
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.view_settings.exposure=.15
    world=bpy.data.worlds.new("industrial diffuse daylight")
    world.use_nodes=True
    world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.64,.69,.75,1)
    world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.8
    scene.world=world
    for loc,power,size in [((2,-3,4),500,3),((-2,1,2),350,2.5)]:
        bpy.ops.object.light_add(type='AREA',location=loc)
        ob=bpy.context.object;ob.data.energy=power;ob.data.size=size
    bpy.ops.object.camera_add()
    cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.2
    scene.camera=cam
    center_point=Vector((0,0,.79))
    bpy.ops.wm.save_as_mainfile(filepath=f"{ROOT}/f3_rebar01_v{version}.blend")
    for name,direction in [('front',(0,-1,.19)),('side',(1,0,.22)),('angle',(1,-1,.55))]:
        cam.location=center_point+Vector(direction).normalized()*3.3
        cam.rotation_euler=(center_point-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=f"{ROOT}/f3_rebar01_v{version}-{name}.png"
        bpy.ops.render.render(write_still=True)
        print("F3_REBAR_RENDER_OK",version,name,flush=True)
image=make_texture()
for version in (1,2,3):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    ob=build(version,make_mat(image))
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True);bpy.context.view_layer.objects.active=ob
    bpy.ops.export_scene.gltf(filepath=f"{ROOT}/f3_rebar01_v{version}.glb",export_format='GLB',use_selection=True,export_apply=True)
    render_scene(version,ob.data.materials[0])
    print("F3_REBAR_ITERATION_COMPLETE",version,flush=True)
print("F3_REBAR_ALL_COMPLETE",flush=True)
