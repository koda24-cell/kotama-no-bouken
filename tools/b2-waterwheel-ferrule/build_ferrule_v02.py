"""B2 single forged-iron axle ferrule V02 seam-free PBR: one independent, visibly aged rigid part.
No reference hub mesh is altered or exported; 4 real Cycles renders for review.
"""
import bpy,sys,math,hashlib,json,random,struct
from pathlib import Path
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(argv)==1
out=Path(argv[0]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(241119)
# Four strata on face/edge make the ferrule read as wrought metal, not a flat washer.
# Profile is a closed continuous annulus in an X (axle longitudinal) - radius plane.
# Ends meet wood hub x=.18, inner bore radius .306 to clear existing shaft R=.300.
section=[(.183,.319),(.188,.308),(.197,.306),(.214,.307),
         (.225,.316),(.226,.338),(.226,.383),
         (.218,.395),(.208,.400),(.196,.398),
         (.183,.386)]
N=112
verts=[];faces=[]
for j,(x,r) in enumerate(section):
    for k in range(N):
        a=k*2*math.pi/N
        # irregular forging: low-frequency asymmetry, not repeated cog teeth.
        distortion=.00095*math.sin(a*9.1+j*.33)+.0008*math.sin(a*17.3+j*.2)+.0004*math.sin(a*43.2+j*.57)
        rr=r+distortion if r>.335 else r
        xx=x+(.00075*math.sin(a*13.1+j*.5) if r>.37 else 0)
        verts.append((xx,rr*math.cos(a),rr*math.sin(a)))
for j in range(len(section)):
    nj=(j+1)%len(section)
    for k in range(N):
        nk=(k+1)%N
        faces.append((j*N+k,j*N+nk,nj*N+nk,nj*N+k))
mesh=bpy.data.meshes.new('Ferrule_Anvil_Forged_Annular_Mesh')
mesh.from_pydata(verts,[],faces);mesh.update()
ferrule=bpy.data.objects.new('B2_One_Iron_Axle_Ferrule_01',mesh)
bpy.context.collection.objects.link(ferrule)
# UV follows angular circumference, axial/edge progression; no generated UV default.
uv=mesh.uv_layers.new(name='Ferrule_Forge_UV')
for f in mesh.polygons:
    for li in f.loop_indices:
        v=mesh.loops[li].vertex_index
        j,k=divmod(v,N)
        # A polygon crossing the circumference UV seam must use k=N as u=1,
        # not interpolate backwards to 0 through the whole texture.
        ks=[mesh.loops[l].vertex_index%N for l in f.loop_indices]
        u=k/N
        if max(ks)-min(ks)>N//2 and k<N//2:u+=1
        uv.data[li].uv=(u,j/(len(section)-1))
    f.use_smooth=True
# Generate two original non-periodic PBR maps, packed for GLB export.
SIZE=384
def clamp(x):return max(0,min(1,x))
def h(i,j):
    v=math.sin(i*127.11+j*311.78)*43758.5453123
    return v-math.floor(v)
def noise(u,v,sx,sy):
    x=u*sx;y=v*sy
    ix=math.floor(x);iy=math.floor(y)
    fx=x-ix;fy=y-iy
    tx=fx*fx*(3-2*fx);ty=fy*fy*(3-2*fy)
    # Periodic U boundary: rust map does not have a visible right-edge join.
    period=int(sx)
    a=h(ix%period,iy);b=h((ix+1)%period,iy)
    c=h(ix%period,iy+1);d=h((ix+1)%period,iy+1)
    return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty
pixels=[];rough=[]
for j in range(SIZE):
    v=(j+.5)/SIZE
    for i in range(SIZE):
        u=(i+.5)/SIZE
        # Scattered oxides, mineral patina and hammer-scale: nonperiodic continuous patches.
        stain=noise(u,v,8,5.3)*.50+noise(u,v,19,14)*.30+noise(u,v,47,37)*.20
        pit=noise(u,v,94,93)
        rust=clamp((stain-.55)*5.2) * (.36+.64*noise(u,v,5,7.1))
        fine=.035*(pit-.5)+.030*(rng.random()-.5)
        iron=(.13+fine,.155+fine,.171+fine)
        oxide=(.265+fine,.132+fine*.7,.059+fine*.5)
        c=[clamp(iron[k]*(1-rust)+oxide[k]*rust) for k in range(3)]
        pixels.extend((*c,1.0))
        rr=clamp(.52+rust*.36+.08*(pit-.5))
        rough.extend((rr,rr,rr,1.0))
def image(name,arr,path,non_color=False):
    im=bpy.data.images.new(name,width=SIZE,height=SIZE,alpha=True)
    im.pixels.foreach_set(arr)
    im.file_format='PNG';im.filepath_raw=str(path);im.save();im.pack()
    if non_color:im.colorspace_settings.name='Non-Color'
    return im
albedo=out/'b2_iron_ferrule_oxidized_albedo_v02.png'
roughpath=out/'b2_iron_ferrule_roughness_v02.png'
base=image('B2_Original_Ferrule_Forge_Oxides_Albedo',pixels,albedo)
ra=image('B2_Original_Ferrule_Oxidized_Roughness',rough,roughpath,True)
mat=bpy.data.materials.new('Old cold-forged iron with local rust')
mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links
bs=nodes.get('Principled BSDF')
bs.inputs['Metallic'].default_value=.89
bs.inputs['Roughness'].default_value=.72
tex=nodes.new('ShaderNodeTexImage');tex.image=base;tex.location=(-450,130)
links.new(tex.outputs['Color'],bs.inputs['Base Color'])
rt=nodes.new('ShaderNodeTexImage');rt.image=ra;rt.location=(-450,-90)
links.new(rt.outputs['Color'],bs.inputs['Roughness'])
# Close-up forging roughness in Blender review, not claimed GLB normal conversion.
noise_node=nodes.new('ShaderNodeTexNoise');noise_node.inputs['Scale'].default_value=125
noise_node.inputs['Detail'].default_value=3
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.085
bump.inputs['Distance'].default_value=.0016
links.new(noise_node.outputs['Fac'],bump.inputs['Height'])
links.new(bump.outputs['Normal'],bs.inputs['Normal'])
mesh.materials.append(mat)
# Export geometry only. No review studio lamps or camera in game mesh.
bpy.ops.object.select_all(action='DESELECT')
ferrule.select_set(True);bpy.context.view_layer.objects.active=ferrule
tag='b2_single_iron_axle_ferrule_v02'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
ferrule.select_set(False)
world=bpy.data.worlds.new('cave_studio_gray');world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.31,.35,.39,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.6
bpy.context.scene.world=world
for loc,energy,size in [((2,-1.3,3),600,2.3),((-1.5,2,1.2),450,2.0)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=bpy.context.object;light.data.energy=energy;light.data.size=size
    light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=1.24
scene=bpy.context.scene;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=50
scene.render.resolution_x=850;scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
files=[glb,albedo,roughpath]
for view,loc in [('front',(2.6,.32,.29)),('side',(.29,2.6,.32)),
                 ('angle',(2.1,1.9,1.65)),('back',(-2.6,.32,.3))]:
    camera.location=loc
    camera.rotation_euler=(Vector((.205,0,0))-camera.location).to_track_quat('-Z','Y').to_euler()
    f=out/(tag+'_'+view+'.png')
    scene.render.filepath=str(f);bpy.ops.render.render(write_still=True)
    files.append(f)
blend=out/(tag+'.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','independent_asset_count':1,
 'inner_radius_m':.306,'outer_radius_nominal_m':.400,
 'hub_contact_x_m':.183,'radial_clearance_to_hub_mortises':'.1m minimum nominal; actual fitting not verified',
 'metal_texture_original_generated':True,'texture_resolution':[SIZE,SIZE],
 'mesh_vertices':len(mesh.vertices),'mesh_faces':len(mesh.polygons),
 'uv_seam_per_face_corrected':True,'tiled_u_rust_maps':True,
 'references':['https://www.ubss.org.uk/resources/proceedings/vol18/UBSS_Proc_18_1_3-19.pdf'],
 'files':{}}
for f in files:
    data=f.read_bytes()
    manifest['files'][f.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_FERRULE_V02_REAL_RENDER_OK',len(mesh.polygons),flush=True)
