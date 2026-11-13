"""Floor 3 modular crane hook. Blender 4+/5+; standalone, Y-up GLB export."""
import bpy, math, os
from mathutils import Vector
from math import sin, cos, pi
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0, rough=0.75):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=rough
    return m
iron=mat('oxidized forged iron',(0.18,0.16,0.145),0.72)
edge=mat('exposed worn steel',(0.31,0.29,0.25),0.72)
rust=mat('deep corrosion',(0.27,0.095,0.043),0.3)
dark=mat('pulley shadow',(0.08,0.078,0.075),0.62)
def cube(name,loc,scale,material,bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name
    o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('machined edges','BEVEL');mod.width=bevel;mod.segments=2
        mod2=o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o
def cyl(name,loc,r,depth,material,axis='X',vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    o=bpy.context.object;o.name=name
    if axis=='X':o.rotation_euler[1]=pi/2
    if axis=='Y':o.rotation_euler[0]=pi/2
    o.data.materials.append(material)
    bevel=o.modifiers.new('rim wear','BEVEL');bevel.width=min(.025,r*.12);bevel.segments=2
    o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o
def tube(name,pts,radius,material,sides=14):
    verts=[];faces=[]
    for i,p in enumerate(pts):
        tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(i-1,0)])
        tangent.normalize();u=tangent.cross(Vector((1,0,0)))
        if u.length<0.001:u=tangent.cross(Vector((0,1,0)))
        u.normalize();v=tangent.cross(u).normalized()
        for j in range(sides):
            a=2*pi*j/sides; q=Vector(p)+radius*(u*cos(a)+v*sin(a))
            verts.append(q)
        if i:
            for j in range(sides):
                a=(i-1)*sides+j;b=(i-1)*sides+(j+1)%sides
                c=i*sides+(j+1)%sides;d=i*sides+j
                faces.append((a,b,c,d))
    faces.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(material)
    for poly in mesh.polygons:poly.use_smooth=True
    return o

# Suspended twin cheek plates: 0.85m tall and ~0.75m wide.
for x in (-.155,.155):
    cube('side cheek plate', (x,0,1.33),(.075,.48,.66),iron,.065)
    cyl('pulley wheel', (x*.65,0,1.48),.225,.085,dark,'X')
    cyl('pulley wheel rim', (x*.65,0,1.48),.175,.093,edge,'X')
    cyl('axle end', (x*1.42,0,1.48),.085,.035,edge,'X',16)
    for z in (1.13,1.66):
        for y in (-.16,.16):
            cyl('plate rivet',(x+(.044 if x>0 else -.044),y,z),.026,.018,rust,'X',12)
cube('bottom cross pin',(0,0,1.08),(.42,.12,.12),edge,.025)
# U-shaped forged hook: long shank, wide return and sharply curling beak.
path=[]
path += [(0,0,1.10),(0,0,.92),(0,0,.73),(0,0,.54)]
# Downward shank, lower sweep, upward recurved beak in YZ plane
path += [(0, .025,.40),(0,.095,.275),(0,.215,.195),(0,.35,.18),
         (0,.475,.225),(0,.54,.325),(0,.55,.445),(0,.515,.555),
         (0,.465,.62),(0,.415,.645)]
tube('single forged recurved crane hook',path,.09,iron,20)
# Distinct tapered pointed beak, smooth continuation, not a closed ring
tube('tapered hook tip',[(0,.415,.645),(0,.38,.66),(0,.345,.675),(0,.315,.685)],.040,edge,16)
cyl('hook collar',(0,0,.94),.145,.115,edge,'Z')
cyl('swivel boss',(0,0,1.045),.12,.09,rust,'Z')
# Hanging steel cable ends are attachable but keep modular hook usable alone.
# Continuous steel wire ropes routed through the pulley and into the upper clamp.
for y in (-.17,.17):
    tube('pulley rope',[(0,y,1.47),(0,y,1.70),(0,y,1.91),(0,y,2.28)],.030,dark,12)
# Independent connection hardware: forged clevis cheeks, axle and clamp.
for x in (-.23,.23):
    cube('suspension clevis cheek',(x,0,1.98),(.085,.37,.45),iron,.045)
    cyl('clevis retaining bolt',(x*1.14,0,2.05),.075,.035,edge,'X',16)
cyl('clevis cross-pin',(0,0,2.05),.085,.60,edge,'X',24)
cube('top cable termination clamp',(0,0,2.30),(.52,.33,.13),iron,.045)
for x in (-.17,.17):
    cyl('termination clamp bolt',(x,0,2.375),.033,.035,rust,'Z',12)
ring=[]
for k in range(49):
    t=2*pi*k/48
    ring.append((0,.18*cos(t),2.53+.20*sin(t)))
tube('upper crane connector eye',ring,.052,edge,14)
for x in (-.20,.20):
    cube('lower clevis gusset',(x,0,1.77),(.065,.33,.17),rust,.02)

# Suspension assembly V3: overhead truss bracket, sheave and steel cable.
# Namespaced separate meshes allow Claude to detach or hide the support.
cube('SUPPORT_upper_crane_I_beam',(0,0,4.65),(2.8,.34,.13),iron,.025)
cube('SUPPORT_I_beam_web',(0,0,4.46),(2.8,.09,.32),iron,.015)
cube('SUPPORT_lower_flange',(0,0,4.28),(2.8,.32,.11),iron,.025)
for x in (-1.18,1.18):
    cube('SUPPORT_cross_brace',(x,0,4.04),(.16,.36,.60),rust,.025)
    for y in (-.10,.10):
        cyl('SUPPORT_mounting_rivet',(x,y,4.35),.036,.03,edge,'Y',12)
# Rigid upper pulley bracket, with large round sheave and axle.
for x in (-.19,.19):
    cube('SUPPORT_upper_pulley_plate',(x,0,3.83),(.075,.46,.63),iron,.045)
    cyl('SUPPORT_upper_axle_bolt',(x*1.27,0,3.82),.072,.04,edge,'X',16)
cyl('SUPPORT_upper_sheave',(0,0,3.82),.20,.31,dark,'X',32)
cyl('SUPPORT_sheave_face',(0,0,3.82),.155,.33,edge,'X',32)
# Rope passes visibly from the overhead sheave down to the hook's eye.
tube('SUPPORT_load_bearing_cable',[(0,0,3.82),(0,0,3.48),(0,0,3.17),(0,0,2.85),(0,0,2.68)],.042,dark,16)
cyl('SUPPORT_cable_ferrule',(0,0,2.73),.077,.15,edge,'Z',20)
# Small side reinforcing gussets: visibly attached to the I-beam.
for x in (-.35,.35):
    cube('SUPPORT_bracket_gusset',(x,0,4.19),(.09,.34,.23),rust,.02)

# Groundless standalone object: origin is its attachment footprint at Z=0.
# Export GLB. Blender glTF exporter converts Z-up scene to Y-up glTF.
out='/work/out'
os.makedirs(out,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'floor3_crane_hook_suspended_v3.glb'),export_format='GLB',use_selection=False)
# Studio render from front and 3/4 view, without changing exported geometry.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.12))
floor=bpy.context.object;floor.name='RENDER_ONLY_floor';floor.data.materials.append(mat('studio backdrop',(.11,.12,.14)))
world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world
world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.32,.35,.40,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
def area(name,loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
    direction=Vector((0,0,1))-o.location;o.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
area('key',(3,-4,6),850,5);area('fill',(-4,1,4),650,5)
bpy.ops.object.camera_add();camera=bpy.context.object;bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for label,position in [('front',(7,-10,5)),('side',(10,0,5)),('angle',(8,-8,6))]:
    camera.location=position
    direction=Vector((0,0,2.4))-camera.location
    camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=6.5
    scene.render.filepath=os.path.join(out,f'floor3_crane_hook_suspended_v3-{label}.png')
    bpy.ops.render.render(write_still=True)
print('HOOK_ASSET_OUTPUT',out)
