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


# Stage 3: modular props surrounding the approved crane.
# Each collection is exported as a standalone GLB, never merged into crane.
out='/work/out'
os.makedirs(out,exist_ok=True)
def new_prop(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
def export_prop(name):
    bpy.ops.export_scene.gltf(filepath=os.path.join(out,name+'.glb'),export_format='GLB',use_selection=False)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.045))
    floor=bpy.context.object;floor.name='RENDER_ONLY_floor';floor.data.materials.append(mat('studio backdrop',(.11,.12,.14)))
    world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world
    world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.32,.35,.40,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
    for loc,power in [((4,-5,7),850),((-4,2,5),650)]:
        bpy.ops.object.light_add(type='AREA',location=loc)
        o=bpy.context.object;o.data.energy=power;o.data.size=5
        o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();camera=bpy.context.object;bpy.context.scene.camera=camera
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    for label,pos in [('front',(4,-7,3)),('side',(7,0,3)),('angle',(5,-5,4))]:
        camera.location=pos
        camera.rotation_euler=(Vector((0,0,1.0))-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.type='ORTHO';camera.data.ortho_scale=4.5
        scene.render.filepath=os.path.join(out,name+'-'+label+'.png')
        bpy.ops.render.render(write_still=True)

# A. Broken steel cable reel: drum, flanges, hub and loose coiled cable.
new_prop('floor3_crane_cable_reel')
for x in (-.58,.58):
    cyl('reel outer flange',(x,0,.83),.72,.085,iron,'X',40)
    cyl('flange raised rim',(x+(.052 if x>0 else -.052),0,.83),.63,.04,rust,'X',40)
    for k in range(8):
        t=2*pi*k/8
        cyl('flange bolt',(x+(.095 if x>0 else -.095),.47*cos(t),.83+.47*sin(t)),.038,.03,edge,'X',12)
cyl('reel barrel',(0,0,.83),.39,1.12,dark,'X',36)
cyl('reel axle',(0,0,.83),.15,1.48,edge,'X',24)
for x in [-.43,-.29,-.15,-.01,.13,.27,.41]:
    pts=[(x,.42*cos(2*pi*k/48),.83+.42*sin(2*pi*k/48)) for k in range(49)]
    tube('wound steel cable',pts,.038,edge,12)
for x in (-.45,.45):
    cube('reel timber support',(x,0,.12),(.21,1.24,.24),rust,.025)
export_prop('floor3_crane_cable_reel')

# B. Ruined crane counterweight block with steel lifting eye.
new_prop('floor3_crane_counterweight')
cube('heavy counterweight core',(0,0,.72),(1.85,1.20,1.32),dark,.11)
for x in (-.68,.68):
    cube('counterweight edge armour',(x,0,.74),(.16,1.25,1.37),iron,.035)
for y in (-.45,.45):
    cube('counterweight steel strap',(0,y,.72),(1.85,.09,1.42),rust,.025)
for x in (-.48,.48):
    tube('top lifting eye',[(x-.15,0,1.37),(x-.15,0,1.57),(x,0,1.73),(x+.15,0,1.57),(x+.15,0,1.37)],.07,edge,16)
for x in (-.52,.52):
    tube('concrete crack',[(x,-.61,1.05),(x+.11,-.62,.85),(x+.02,-.62,.63),(x+.19,-.62,.43)],.015,rust,8)
export_prop('floor3_crane_counterweight')

# C. Fallen steel lattice beam: broken structural end and diagonal braces.
new_prop('floor3_crane_fallen_truss')
for y in (-.32,.32):
    for z in (.23,.78):
        cube('fallen beam chord',(0,y,z),(2.8,.10,.10),iron,.025)
for x in (-1.30,-.65,0,.65,1.20):
    for y in (-.32,.32):
        cube('lattice vertical post',(x,y,.50),(.075,.09,.55),rust,.018)
for y in (-.32,.32):
    for i in range(4):
        x=-1.25+i*.66
        tube('lattice diagonal',[(x,y,.23),(x+.65,y,.78)],.045,edge,10)
for x in (-1.25,1.25):
    cube('damaged end plate',(x,0,.50),(.10,.76,.67),rust,.02)
    for y in (-.23,.23):
        cyl('end plate bolt',(x,y,.50),.04,.14,edge,'X',12)
export_prop('floor3_crane_fallen_truss')
# V2 enhancements: additional damage, plausible loosened components and ground clutter.
# Cable reel: trailing loose wire, bent rim braces and fragmented support.
new_prop('floor3_crane_cable_reel_v2')
for x in (-.58,.58):
    cyl('reel flange',(x,0,.83),.72,.085,iron,'X',40)
    cyl('rusty concentric ring',(x+(.052 if x>0 else -.052),0,.83),.63,.04,rust,'X',40)
    for k in range(8):
        t=2*pi*k/8
        cyl('rim rivet',(x+(.095 if x>0 else -.095),.47*cos(t),.83+.47*sin(t)),.038,.03,edge,'X',12)
cyl('barrel',(0,0,.83),.39,1.12,dark,'X',36)
cyl('axle',(0,0,.83),.15,1.48,edge,'X',24)
for x in [-.43,-.29,-.15,-.01,.13,.27,.41]:
    tube('wound cable',[(x,.42*cos(2*pi*k/48),.83+.42*sin(2*pi*k/48)) for k in range(49)],.038,edge,12)
for x in (-.45,.45):
    cube('reel support',(x,0,.12),(.21,1.24,.24),rust,.025)
tube('loose cable dragging on ground',[(.41,.42,.83),(.53,.62,.65),(.64,.83,.36),(.78,1.04,.12),(1.04,1.14,.07),(1.31,.92,.07),(1.44,.63,.07),(1.31,.44,.08)],.034,dark,12)
for k in range(5):
    t=2*pi*k/5
    cube('rust patch on reel',( .62,.57*cos(t),.83+.57*sin(t)),(.024,.13,.075),rust,.01)
cube('broken support plank',(.8,-.22,.09),(.65,.15,.13),dark,.025)
export_prop('floor3_crane_cable_reel_v2')

# Counterweight: visibly cracked armour, exposed anchor plates, uneven rubble.
new_prop('floor3_crane_counterweight_v2')
cube('weight core',(0,0,.72),(1.85,1.20,1.32),dark,.11)
for x in (-.68,.68):
    cube('armour plate',(x,0,.74),(.16,1.25,1.37),iron,.035)
for y in (-.45,.45):
    cube('rusty strap',(0,y,.72),(1.85,.09,1.42),rust,.025)
for x in (-.48,.48):
    tube('lifting eye',[(x-.15,0,1.37),(x-.15,0,1.57),(x,0,1.73),(x+.15,0,1.57),(x+.15,0,1.37)],.07,edge,16)
for x in (-.52,.52):
    tube('front deep fracture',[(x,-.63,1.17),(x+.13,-.64,.91),(x-.035,-.64,.72),(x+.17,-.64,.40)],.026,rust,10)
    tube('branch crack',[(x+.13,-.65,.91),(x+.34,-.65,.79),(x+.29,-.65,.61)],.013,edge,8)
for x in (-.76,.76):
    for z in (.27,1.04):
        cyl('strap anchor',(x,-.63,z),.045,.06,edge,'Y',12)
for x,y,size in [(-1.02,-.58,.24),(1.07,.31,.31),(.76,-.77,.19)]:
    cube('fallen concrete fragment',(x,y,.12),(size,size*.82,size*.62),dark,.035)
export_prop('floor3_crane_counterweight_v2')

# Fallen truss: original chords retained, plus bent and disconnected metal.
new_prop('floor3_crane_fallen_truss_v2')
for y in (-.32,.32):
    for z in (.23,.78):
        cube('original long beam chord',(0,y,z),(2.8,.10,.10),iron,.025)
for x in (-1.30,-.65,0,.65,1.20):
    for y in (-.32,.32):
        cube('original vertical post',(x,y,.50),(.075,.09,.55),rust,.018)
for y in (-.32,.32):
    for i in range(4):
        x=-1.25+i*.66
        tube('original lattice diagonal',[(x,y,.23),(x+.65,y,.78)],.045,edge,10)
for x in (-1.25,1.25):
    cube('original end plate',(x,0,.50),(.10,.76,.67),rust,.02)
    for y in (-.23,.23):
        cyl('end bolt',(x,y,.50),.04,.14,edge,'X',12)
for y in (-.32,.32):
    tube('buckled secondary brace',[(-1.22,y,.77),(-.90,y+.06,.69),(-.58,y-.10,.46),(-.23,y,.23)],.055,rust,12)
    tube('hanging torn steel',[(.58,y,.78),(.72,y+.04,.60),(.84,y+.16,.35),(1.02,y+.24,.13)],.042,dark,10)
for x,y in [(-1.34,-.43),(1.43,.39),(.86,-.66)]:
    cube('fallen joint scrap',(x,y,.10),(.24,.16,.11),rust,.02)
export_prop('floor3_crane_fallen_truss_v2')
print('CRANE_SURROUNDING_PROPS_V2_COMPLETE')

