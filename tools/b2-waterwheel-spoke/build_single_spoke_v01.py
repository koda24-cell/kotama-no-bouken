"""B2 single timber spoke prototype: one radial arm only, no wheel replacement.
X is wheel axle. One spoke extends in +Y; assembly rotates around X in 14 steps.
"""
import bpy, math, sys, json, hashlib, random
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=Path(args[0] if args else 'render-output/b2-single-spoke-v01').resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value=(*color,1)
    b.inputs['Roughness'].default_value=rough
    return m
oak=mat('cold-aged-oak-preview',(0.22,0.17,0.12),0.88)
end=mat('weathered-endgrain-preview',(0.16,0.115,0.077),0.95)
dark=mat('joint-shadow-preview',(0.10,0.073,0.05),0.96)
# Axial depth <= 0.19m, radial range 0.34 to 2.48m. Cut shoulder and narrow tenon.
stations=[
 (.34,.085,.105),(.38,.089,.103),(.52,.090,.103),(.78,.084,.098),
 (1.15,.078,.091),(1.60,.076,.088),(2.08,.075,.084),
 (2.29,.074,.083),(2.37,.075,.083),
 (2.385,.061,.063),(2.47,.058,.061)]
# an eight-point beveled rectangular silhouette; no repeated primitive cylinders
def section(hx,hz):
    bevel=.011
    return [(-hx+bevel,-hz),(hx-bevel,-hz),(hx,-hz+bevel),
            (hx,hz-bevel),(hx-bevel,hz),(-hx+bevel,hz),
            (-hx,hz-bevel),(-hx,-hz+bevel)]
verts=[]
for i,(y,hx,hz) in enumerate(stations):
    for k,(x,z) in enumerate(section(hx,hz)):
        taper=1.0+.025*math.sin(y*7.1+k*.8)
        verts.append((x*taper,y,z*taper))
faces=[]
for i in range(len(stations)-1):
    for k in range(8):
        a=i*8+k;b=i*8+(k+1)%8
        faces.append((a,b,b+8,a+8))
faces.extend([tuple(reversed(range(8))),tuple((len(stations)-1)*8+k for k in range(8))])
mesh=bpy.data.meshes.new('SingleSpoke_AgedOak_SolidMesh')
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('B2_SingleSpoke_01_AgedOak',mesh);bpy.context.collection.objects.link(obj)
mesh.materials.append(oak);mesh.materials.append(end)
for face in mesh.polygons:
    face.material_index=1 if face.index>=len(faces)-2 else 0
    face.use_smooth=face.index<len(faces)-2
# UV follows wood's long direction rather than transverse striping.
uv=mesh.uv_layers.new(name='LengthwiseWoodUV')
for polygon in mesh.polygons:
    for li in polygon.loop_indices:
        vi=mesh.loops[li].vertex_index
        x,y,z=mesh.vertices[vi].co
        uv.data[li].uv=(y/2.2, (math.atan2(z,x)+math.pi)/(2*math.pi))
# Joinery: shallow separate dark shoulder on transition, not a black outline around the whole piece.
# A pair of asymmetrically placed small old dowel impressions on outer lateral face.
def shallow_mark(name,y,depth):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=.013,depth=.0018,
        location=(.077,y,.012))
    pin=bpy.context.object;pin.name=name
    pin.rotation_euler=(0,math.pi/2,0)
    pin.data.materials.append(dark)
    return pin
shallow_mark('B2_Spoke_Joinery_Peg_Outer_01',2.275,.002)
# Fine non-repeating longitudinal split near foot, represented as a very narrow ribbon.
vs=[(.090, .60, .010),(.091,.73,.012),(.088,.93,.009),(.092,1.02,.014)]
vv=[]
for v in vs:
    vv.extend([(v[0]+.0007,v[1],v[2]),(v[0]-.0007,v[1],v[2])])
crack=bpy.data.meshes.new('Subtle_Longitudinal_Grain_Split')
crack.from_pydata(vv,[],[(2*j,2*j+1,2*j+3,2*j+2) for j in range(3)])
crack.update();co=bpy.data.objects.new('B2_Spoke_One_Short_Grain_Split',crack)
bpy.context.collection.objects.link(co);crack.materials.append(dark)
# Save/export geometry before adding review lighting/camera; explicit selection only.
for o in bpy.context.scene.objects:o.select_set(False)
exports=[obj,co,bpy.data.objects['B2_Spoke_Joinery_Peg_Outer_01']]
for o in exports:o.select_set(True)
bpy.context.view_layer.objects.active=obj
tag='b2_waterwheel_single_spoke_v01'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
for o in exports:o.select_set(False)
world=bpy.data.worlds.new('cold-neutral-review');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.42
bpy.context.scene.world=world
for location,power,size in [((2,-1.5,4),520,3),((-1,3,2),300,2.5)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    light=bpy.context.object;light.data.energy=power;light.data.size=size
    light.rotation_euler=(Vector((0,1.4,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=840;scene.render.resolution_y=840
scene.render.resolution_percentage=100
camera.data.type='ORTHO';camera.data.ortho_scale=3.15
files=[glb]
for name,at in [('front',(3,1.4,1.3)),('side',(1.1,1.4,3.3)),('angle',(2.6,-.4,2.1)),('back',(-3,1.4,1.2))]:
    camera.location=at
    camera.rotation_euler=(Vector((0,1.4,0))-camera.location).to_track_quat('-Z','Y').to_euler()
    png=out/(tag+'_'+name+'.png');scene.render.filepath=str(png)
    bpy.ops.render.render(write_still=True);files.append(png)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','single_spoke_only':True,
 'radius_compatible_m':2.55,'spoke_count_compatible':14,'axle':'X',
 'radial_extent_m':[.34,2.47],'axial_halfwidth_m_max':.09,
 'source_geometry_preserved':'standalone independent from gameplay',
 'material_note':'procedural flat-color prototype; photo PBR not yet applied',
 'files':{}}
for file in files:
    data=file.read_bytes()
    manifest['files'][file.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print('B2_SINGLE_SPOKE_V01_RENDER_SUCCESS',len(files),flush=True)
