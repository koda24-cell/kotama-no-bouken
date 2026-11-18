"""Standalone Blender procedural ore prototype. Run: blender -b -t 2 --python tools/ore/generate_ore.py -- --out /tmp/ore --variant luminous --seed 17
Original parametric implementation; inspired by public procedural crystal techniques, not copied source files.
"""
import bpy, math, random, argparse, sys, os, json, hashlib
from mathutils import Vector

def mat(name, color, metallic=0, roughness=0.6, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Metallic"].default_value=metallic
    p.inputs["Roughness"].default_value=roughness
    emission_input=p.inputs.get("Emission Color") or p.inputs.get("Emission")
    if emission_input: emission_input.default_value=(*color,1)
    strength_input=p.inputs.get("Emission Strength")
    if strength_input: strength_input.default_value=emission
    return m

def rock(rng, material):
    # Irregular concentric rings with unequal frequencies, no uniform icosphere triangles.
    rings=10; segments=19; verts=[]; faces=[]
    for i in range(rings+1):
        theta=math.pi*(i+0.5)/(rings+1)
        for j in range(segments):
            phi=2*math.pi*j/segments
            n=1+0.16*math.sin(3*phi+theta*2)+0.09*math.sin(7*phi-3*theta)+rng.uniform(-0.055,0.055)
            x=1.0*math.sin(theta)*math.cos(phi)*n
            y=0.78*math.sin(theta)*math.sin(phi)*n
            z=0.82*math.cos(theta)*n
            verts.append((x,y,z))
    for i in range(rings):
        for j in range(segments):
            a=i*segments+j; b=i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.extend([tuple(reversed(tuple(range(segments)))),tuple(rings*segments+j for j in range(segments))])
    mesh=bpy.data.meshes.new("ore_host_mesh");mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new("HOST_ROCK_original",mesh);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    bevel=obj.modifiers.new("small_eroded_edges","BEVEL");bevel.width=0.027;bevel.segments=2
    obj.modifiers.new("weighted_normals","WEIGHTED_NORMAL")
    return obj

def crystal(name, rng, origin, axis, length, radius, material, sides=6):
    # Real ring topology: root embedded beneath host surface, tapered tip, chipped side faces.
    axis=Vector(axis).normalized()
    u=axis.cross(Vector((0,0,1)))
    if u.length<0.05: u=axis.cross(Vector((0,1,0)))
    u.normalize();v=axis.cross(u).normalized()
    verts=[]; rings=[(-0.28,0.78),(0.0,1.0),(0.62,0.96),(0.83,0.74),(1.0,0.03)]
    phase=rng.uniform(-0.3,0.3)
    for h,scale in rings:
        for j in range(sides):
            angle=2*math.pi*j/sides+phase
            radial=radius*scale*(1+rng.uniform(-0.045,0.045))
            pos=Vector(origin)+axis*(h*length)+radial*(math.cos(angle)*u+math.sin(angle)*v)
            verts.append(tuple(pos))
    faces=[]
    for i in range(len(rings)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))))
    mesh=bpy.data.meshes.new(name+"_mesh");mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
    bevel=obj.modifiers.new("micro_edge_damage","BEVEL");bevel.width=min(radius*0.045,0.012);bevel.segments=1
    return obj

def aim(obj, point):
    direction=Vector(point)-obj.location
    obj.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()

def build(variant, seed):
    rng=random.Random(seed)
    dark=mat("basalt_host",(.075,.072,.079),roughness=.91)
    rock(rng,dark)
    palette={
        "normal":((.24,.28,.31),.05,.26,0),
        "rare":((.55,.36,.12),.62,.24,.06),
        "luminous":((.045,.66,.54),.05,.23,1.4),
        "ice":((.18,.58,.86),.0,.17,.24),
        "volcanic":((.72,.13,.028),.1,.35,.45)}
    color,metal,rough,em=palette[variant]
    primary=mat(variant+"_mineral",color,metal,rough,em)
    impurity=mat("mineral_inclusions",tuple(c*.38 for c in color),.2,.45,em*.15)
    # Cluster emerges from a recessed zone on one oblique face of the host.
    for i in range(37):
        angle=rng.uniform(-math.pi*.67,math.pi*.66)
        h=rng.uniform(-.39,.42)
        x=.79*math.cos(angle);y=.62*math.sin(angle);z=h
        root=(x*.89,y*.89,z)
        axis=(.72+rng.uniform(-.27,.27),.18+rng.uniform(-.5,.5),.4+rng.uniform(-.3,.3))
        scale= rng.betavariate(1.2,2.9)
        length=.11+scale*.75
        radius=.038+scale*.15
        crystal("MINERAL_%02d"%i,rng,root,axis,length,radius,impurity if i%7==0 else primary, rng.choice((5,6,6,7)))
    return primary

def render(out,variant,seed):
    os.makedirs(out,exist_ok=True)
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    bpy.context.scene.render.engine="CYCLES"
    bpy.context.scene.cycles.samples=48
    bpy.context.scene.render.resolution_x=800;bpy.context.scene.render.resolution_y=800
    bpy.context.scene.render.resolution_percentage=100
    bpy.context.scene.render.image_settings.file_format="PNG"
    bpy.context.scene.world.color=(.13,.13,.13)
    build(variant,seed)
    light_data=bpy.data.lights.new("large_softbox","AREA");light=bpy.data.objects.new("large_softbox",light_data)
    bpy.context.collection.objects.link(light);light.location=(3,-4,6);light_data.energy=600;light_data.shape="DISK";light_data.size=5
    camera_data=bpy.data.cameras.new("review_camera");cam=bpy.data.objects.new("review_camera",camera_data)
    bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam;camera_data.type="ORTHO";camera_data.ortho_scale=3.5
    views={"front":(3,-5,1.9),"side":(5,1,2.1),"angle":(4,-4,3.6),"top":(.01,-.01,6)}
    outputs=[]
    for name,loc in views.items():
        cam.location=loc;aim(cam,(0,0,0));path=os.path.join(out,variant+"_"+name+".png")
        bpy.context.scene.render.filepath=path;bpy.ops.render.render(write_still=True);outputs.append(path)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type=="MESH":obj.select_set(True)
    bpy.context.view_layer.objects.active=next(obj for obj in bpy.context.scene.objects if obj.type=="MESH")
    glb=os.path.join(out,variant+".glb")
    bpy.ops.export_scene.gltf(filepath=glb,export_format="GLB",use_selection=True,export_apply=True)
    outputs.append(glb)
    manifest={"status":"NOT_APPROVED","variant":variant,"seed":seed,"generator":"tools/ore/generate_ore.py","files":{os.path.basename(p):hashlib.sha256(open(p,"rb").read()).hexdigest() for p in outputs}}
    with open(os.path.join(out,"manifest.json"),"w") as f:json.dump(manifest,f,indent=2)
    print("ORE_RESULT",json.dumps(manifest))

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--out",default="/tmp/kotama-ore");parser.add_argument("--variant",choices=["normal","rare","luminous","ice","volcanic"],default="normal");parser.add_argument("--seed",type=int,default=17)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    render(args.out,args.variant,args.seed)
