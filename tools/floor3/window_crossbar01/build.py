"""Floor3 ruined-city horizontal window bar 01. Exactly ONE independent part.
V1 bare channel, V2 aged paint, V3 localized oxide near ends and glass ledge.
No window assembly; existing wall, vertical mullion and rebar left untouched.
"""
import bpy,math,random,os
from mathutils import Vector
OUT="/work/out/f3_window_crossbar01"
os.makedirs(OUT,exist_ok=True)
L=1.40
# Nominal U-channel section in local y-z (approx 100 mm x 105 mm).
PROFILE=[(-.05,-.052),(.05,-.052),(.05,.052),(.038,.052),(.038,-.038),
         (-.038,-.038),(-.038,.052),(-.05,.052)]
def image_maps(v):
    w,h=256,512
    base=bpy.data.images.new(f'F3_WINDOW_CROSSBAR_PAINT_V{v}',width=w,height=h,alpha=True)
    rough=bpy.data.images.new(f'F3_WINDOW_CROSSBAR_ROUGH_V{v}',width=w,height=h,alpha=True)
    rng=random.Random(917+v)
    col=[];rv=[]
    for yy in range(h):
        t=yy/(h-1)
        for xx in range(w):
            u=xx/(w-1)
            n=.012*math.sin(82*u+51*t)*math.sin(57*t-25*u)+rng.uniform(-.012,.012)
            spots=0.0
            for cx,cy,sx,sy in ((.06,.14,.08,.085),(.92,.72,.09,.10),(.23,.89,.038,.07),(.79,.19,.052,.035)):
                r=((u-cx)/sx)**2+((t-cy)/sy)**2
                border=1+.22*math.sin(27*u+17*t)*math.cos(19*t-11*u)
                spots=max(spots,max(0,1-r*border))
            rust=max(0,min(.94, (0 if v==1 else .33 if v==2 else .83)*spots +
                 (0 if v==1 else .07 if v==2 else .22)*max(0,1-t/.14) + max(0,n)*.3))
            paint=(.275+n,.307+n,.295+n)
            oxide=(.34+n*.3,.15+n*.2,.08+n*.1)
            c=tuple(paint[i]*(1-rust)+oxide[i]*rust for i in range(3))
            col.extend((*c,1));r=.68*(1-rust)+.92*rust;rv.extend((r,r,r,1))
    base.pixels[:]=col;rough.pixels[:]=rv
    base.filepath_raw=f'{OUT}/F3_WINDOW_CROSSBAR_PAINT_V{v}.png'
    rough.filepath_raw=f'{OUT}/F3_WINDOW_CROSSBAR_ROUGH_V{v}.png'
    base.file_format=rough.file_format='PNG'
    base.save();rough.save();return base,rough
def create(v):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    im,rough=image_maps(v)
    verts=[(x,y,z) for x in (-L/2,L/2) for (y,z) in PROFILE]
    n=len(PROFILE);faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.append((i,j,n+j,n+i))
    # U-profile end section made from four nonoverlapping rectangle bands.
    for offset,reverse in ((0,True),(n,False)):
        for a,b,c in ((0,1,4),(0,4,7),(1,2,3),(1,3,4),(4,5,6),(4,6,7)):
            tri=(offset+a,offset+b,offset+c)
            faces.append(tuple(reversed(tri)) if reverse else tri)
    mesh=bpy.data.meshes.new('single_hollow_window_horizontal_bar')
    mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('F3_WINDOW_CROSSBAR01',mesh)
    bpy.context.collection.objects.link(obj)
    uv=mesh.uv_layers.new(name='crossbar_horizontal_uv')
    for polygon in mesh.polygons:
        for li in polygon.loop_indices:
            p=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=((p.x+L/2)/L, (p.z+.052)/.104)
    mat=bpy.data.materials.new('F3_CROSSBAR_AGED_ENAMEL_PBR')
    mat.use_nodes=True
    nt=mat.node_tree
    bs=nt.nodes.get('Principled BSDF')
    bs.inputs['Metallic'].default_value=.65
    bs.inputs['Roughness'].default_value=.68
    tex=nt.nodes.new('ShaderNodeTexImage');tex.image=im
    tex.extension='EXTEND'
    nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    rnode=nt.nodes.new('ShaderNodeTexImage');rnode.image=rough
    rough.colorspace_settings.name='Non-Color'
    nt.links.new(rnode.outputs['Color'],bs.inputs['Roughness'])
    mesh.materials.append(mat)
    bevel=obj.modifiers.new('subtle steel edge softening','BEVEL')
    bevel.width=.0016;bevel.segments=2;bevel.limit_method='ANGLE'
    obj.modifiers.new('weighted_normals','WEIGHTED_NORMAL')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True);bpy.context.view_layer.objects.active=obj
    stem=f'f3_window_crossbar01_v{v}'
    bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',use_selection=True,export_apply=True)
    return stem
def render(stem):
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=28
    scene.render.resolution_x=760;scene.render.resolution_y=760
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=True
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.view_settings.exposure=.20
    world=bpy.data.worlds.new('soft_ruin_daylight')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.7,.73,.76,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.86
    scene.world=world
    for pos,power,size in [((-2,-2,3),510,2.8),((1,2,2),370,2.4)]:
        bpy.ops.object.light_add(type='AREA',location=pos)
        light=bpy.context.object;light.data.energy=power;light.data.size=size
    bpy.ops.object.camera_add();cam=bpy.context.object
    cam.data.type='ORTHO';cam.data.ortho_scale=2.0;scene.camera=cam
    bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
    focus=Vector((0,0,0))
    for view,d in [('front',(0,-1,.35)),('side',(1,-.08,.36)),('angle',(1,-1,.70))]:
        cam.location=focus+Vector(d).normalized()*3.1
        cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=f'{OUT}/{stem}-{view}.png'
        bpy.ops.render.render(write_still=True)
        print('F3_CROSSBAR_RENDER_OK',stem,view,flush=True)
    print('F3_CROSSBAR_ITERATION_COMPLETE',stem,flush=True)
for version in (1,2,3):
    stem=create(version)
    render(stem)
print('F3_CROSSBAR_ALL_COMPLETE',flush=True)
