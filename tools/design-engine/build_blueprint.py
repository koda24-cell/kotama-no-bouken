"""Original geometry from explicit design instructions; never imports reference meshes."""
import bpy, json, math, sys, hashlib, os
from pathlib import Path
from mathutils import Vector

def vec(v,n=3):
    if len(v)!=n or not all(isinstance(x,(int,float)) and math.isfinite(x) and abs(x)<=100000 for x in v): raise ValueError("invalid vector")
    return tuple(float(x) for x in v)
def mm(v): return tuple(x/1000 for x in vec(v))
def mesh(name,verts,faces):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update()
    o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);return o
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def primitive(p):
    kind=p['shape']; name=p['id']
    if kind=='box':
        bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.dimensions=mm(p['size_mm']);active(o);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    elif kind in ('extrude','loft','revolve'):
        if kind=='extrude':
            profile=[vec(v,2) for v in p['profile_mm']];h=float(p['height_mm']);rings=[[(x,y,z) for x,y in profile] for z in (0,h)]
        elif kind=='loft': rings=[[vec(v) for v in ring] for ring in p['rings_mm']]
        else:
            profile=[vec(v,2) for v in p['profile_mm']];steps=int(p.get('segments',48))
            if not 8<=steps<=128 or any(r<=0 for r,z in profile):raise ValueError('revolve requires positive radii')
            rings=[[(r*math.cos(2*math.pi*i/steps),r*math.sin(2*math.pi*i/steps),z) for i in range(steps)] for r,z in profile]
        n=len(rings[0]);k=len(rings)
        if not 3<=n<=512 or not 2<=k<=128 or any(len(r)!=n for r in rings):raise ValueError('ring topology')
        faces=[tuple(reversed(range(n))),tuple(range((k-1)*n,k*n))]
        faces += [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(k-1) for i in range(n)]
        o=mesh(name,[mm(v) for ring in rings for v in ring],faces)
    elif kind=='curve':
        c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=float(p['radius_mm'])/1000;c.bevel_resolution=3;c.use_fill_caps=True
        pts=p['points_mm'];s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
        for b,v in zip(s.bezier_points,pts):b.co=mm(v);b.handle_left_type=b.handle_right_type='AUTO'
        o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);active(o);bpy.ops.object.convert(target='MESH');o=bpy.context.object
    else:raise ValueError('unsupported shape '+kind)
    o.name=name;active(o)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    return o
def build(p,materials):
    o=primitive(p)
    for i,f in enumerate(p.get('features',[])):
        cutter=primitive(dict(f,id='feature-'+str(i)))
        cutter.location=mm(f.get('position_mm',[0,0,0]));cutter.rotation_euler=tuple(math.radians(x) for x in vec(f.get('rotation_deg',[0,0,0])))
        active(o);mod=o.modifiers.new('feature','BOOLEAN');mod.operation={'hole':'DIFFERENCE','groove':'DIFFERENCE','raised':'UNION'}[f['operation']];mod.object=cutter;mod.solver='EXACT';bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    if p.get('bevel_mm',0)>0:
        active(o);m=o.modifiers.new('edge finish','BEVEL');m.width=p['bevel_mm']/1000;m.segments=int(p.get('bevel_segments',3));bpy.ops.object.modifier_apply(modifier=m.name)
    active(o);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project();bpy.ops.object.mode_set(mode='OBJECT')
    o.data.materials.append(materials[p['material']]);o.location=mm(p.get('position_mm',[0,0,0]));o.rotation_euler=tuple(math.radians(x) for x in vec(p.get('rotation_deg',[0,0,0])))
    return o
def main():
    src,out=map(Path,sys.argv[sys.argv.index('--')+1:]);data=json.loads(src.read_text());assert data['schema']=='kotama-build-v1' and data['units']=='mm'
    out.mkdir(parents=True,exist_ok=True);bpy.ops.wm.read_factory_settings(use_empty=True)
    mats={}
    for name,p in data['materials'].items():
        m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=vec(p['rgba'],4);b.inputs['Roughness'].default_value=p.get('roughness',.5);b.inputs['Metallic'].default_value=p.get('metallic',0)
        if p.get('checker'):
            im=bpy.data.images.new(name+'-texture',width=64,height=64);im.pixels=[c for y in range(64) for x in range(64) for c in ((.65,.65,.65,1) if (x//8+y//8)%2 else (.25,.25,.25,1))];im.pack();t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;m.node_tree.links.new(t.outputs['Color'],b.inputs['Base Color'])
        mats[name]=m
    objects=[]
    for p in data['parts']:
        o=build(p,mats);objects.append(o)
        repeat=p.get('repeat',{});count=int(repeat.get('count',1));assert 1<=count<=64
        for i in range(1,count):
            q=o.copy();q.data=o.data.copy();bpy.context.collection.objects.link(q);q.location+=Vector(mm(repeat['step_mm']))*i;objects.append(q)
        if 'mirror_axis' in p:
            axis=int(p['mirror_axis']);assert 0<=axis<=2
            q=o.copy();q.data=o.data.copy();bpy.context.collection.objects.link(q);q.location[axis]*=-1;q.scale[axis]*=-1;objects.append(q)
    bpy.context.view_layer.update()
    assert objects and all(len(o.data.polygons)>0 for o in objects)
    corners=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box];lo=Vector([min(v[i] for v in corners) for i in range(3)]);hi=Vector([max(v[i] for v in corners) for i in range(3)]);center=(lo+hi)/2;span=max((hi-lo).length,.01)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/'model.glb'),export_format='GLB',use_selection=True)
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=s.render.resolution_y=640;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.35,.35,1)
    for d in [(4,-4,6),(-4,-2,3),(0,4,5)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(d)*span);l=bpy.context.object;l.data.energy=900*span**2;l.data.size=3*span;l.rotation_euler=(center-l.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=span*1.2
    for name,d in [('front',(0,-1,0)),('side',(1,0,0)),('back',(0,1,0)),('top',(0,0,1)),('angle',(1,-2,1))]:
        cam.location=center+Vector(d).normalized()*span*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'model.blend'))
    (out/'manifest.json').write_text(json.dumps({'approval_state':'NOT_APPROVED','source_commit':os.getenv('GITHUB_SHA'),'run_id':os.getenv('GITHUB_RUN_ID'),'blueprint_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'objects':len(objects),'dimensions_mm':list((hi-lo)*1000),'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file()}},indent=2))
if __name__=='__main__':main()
