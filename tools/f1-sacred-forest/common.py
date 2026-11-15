"""Small, reproducible Blender 5.3 asset pipeline for F1 sacred forest.

Model in metres, Z up, -Y front. Export glTF Y up, +Z front. Geometry is
authored by one asset script at a time; this module never assembles a dungeon.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import struct
import subprocess

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/3d/dungeons/b1_sacred_forest_candidates"
TEXTURES = Path(os.environ.get("F1_TEXTURES", str(ROOT / "tools/f1-sacred-forest/textures")))
ALLOWED_EXTENSIONS = {"KHR_texture_transform", "KHR_materials_emissive_strength", "KHR_mesh_quantization"}


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = 'METRIC'
    s.unit_settings.scale_length = 1
    for d in ('props', 'modules', 'sources', 'renders', 'metrics'):
        (OUT / d).mkdir(parents=True, exist_ok=True)


def _image(path, noncolor=False):
    im = bpy.data.images.load(str(Path(path).resolve()), check_existing=True)
    if noncolor:
        im.colorspace_settings.name = 'Non-Color'
    return im


def _fallback_images(name, color, roughness):
    """Original tiny tileable material images; no external image rights needed.

    This is a low-amplitude material finish, never a substitute for geometric
    chips or erosion. Image maps survive GLB export, unlike procedural nodes.
    """
    import numpy as np
    cache = OUT / 'sources' / 'generated_materials'
    cache.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(repr(('organic_v2',name, tuple(color), roughness)).encode()).hexdigest()[:12]
    paths = {k: cache / (name + '_' + key + '_' + k + '.jpg') for k in ('basecolor', 'normal', 'orm')}
    if all(p.exists() for p in paths.values()):
        return paths
    n = 256
    seed = int(key[:8], 16)
    rng = np.random.default_rng(seed)
    field = np.zeros((n, n))
    bark = any(k in name.lower() for k in ('wood', 'bark', 'cedar', 'root', 'vermilion'))
    # Periodic Gaussian random fields are tileable without the visible grid
    # produced by products of axis-aligned sine waves. Separate seeded bands
    # create broad natural mottling and restrained fine mineral/fibre grain.
    fy,fx=np.meshgrid(np.fft.fftfreq(n)*n,np.fft.fftfreq(n)*n,indexing='ij')
    for scale, amp in ((2,.016), (7,.014), (19,.009), (47,.005)):
        spectral=np.fft.fft2(rng.normal(size=(n,n)))
        sy=max(1,scale/7) if bark else scale
        filt=np.exp(-.5*((fx/scale)**2+(fy/sy)**2))
        band=np.fft.ifft2(spectral*filt).real
        band-=band.mean();band/=max(band.std(),1e-6)
        field+=band*amp
    field += rng.normal(0,.003,(n,n))
    maps = {}
    rgb = np.array(tuple(color)[:3],dtype=float)
    # color arguments are linear Blender values; image color map is sRGB.
    rgb = np.where(rgb <= .0031308, rgb*12.92, 1.055*np.maximum(rgb,0)**(1/2.4)-.055)
    rgba = np.ones((n,n,4),dtype=np.float32)
    rgba[:,:,:3] = np.clip(rgb[None,None,:]*(1+field[:,:,None]*2),0,1)
    maps['basecolor'] = rgba.copy()
    gx = (np.roll(field,-1,1)-np.roll(field,1,1))*.8
    gy = (np.roll(field,-1,0)-np.roll(field,1,0))*.8
    rgba[:,:,:3] = np.stack((.5-gx,.5-gy,np.ones_like(field)),axis=-1)
    maps['normal'] = rgba.copy()
    rgba[:,:,0] = np.clip(.98+field*.2,.75,1)
    rgba[:,:,1] = np.clip(roughness+field*.7,.12,.99)
    rgba[:,:,2] = 0
    maps['orm'] = rgba.copy()
    for kind, pixels in maps.items():
        im=bpy.data.images.new(name+'_'+kind,width=n,height=n,alpha=False)
        im.pixels.foreach_set(pixels.ravel())
        im.filepath_raw=str(paths[kind]); im.file_format='JPEG'; im.save()
        bpy.data.images.remove(im)
    return paths


def material(name, color=(.25,.25,.25,1), roughness=.82, texture_set=None):
    """Principled MR with embedded image color, OpenGL normal and ORM maps.

    texture_set: dictionary with basecolor, normal, roughness and/or orm paths.
    An existing material with the same name is reused. A source image set in
    TEXTURES/<name>_{basecolor,normal,orm}.jpg is discovered automatically.
    """
    existing=bpy.data.materials.get(name)
    if existing:
        return existing
    if len(color)==3:
        color=(*color,1)
    found={k: TEXTURES/(name+'_'+k+'.jpg') for k in ('basecolor','normal','orm')}
    if texture_set is None and all(p.exists() for p in found.values()):
        texture_set=found
    if texture_set is None:
        texture_set=_fallback_images(name,color,roughness)
    m=bpy.data.materials.new(name); m.use_nodes=True
    m.diffuse_color=color
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=color
    p.inputs['Roughness'].default_value=roughness
    p.inputs['Metallic'].default_value=0
    nodes=m.node_tree.nodes; links=m.node_tree.links
    def tex(key,noncolor=False):
        node=nodes.new('ShaderNodeTexImage'); node.name=name+'_'+key
        node.image=_image(texture_set[key],noncolor)
        return node
    if texture_set.get('basecolor'):
        t=tex('basecolor'); links.new(t.outputs['Color'],p.inputs['Base Color'])
    if texture_set.get('normal'):
        t=tex('normal',True); n=nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value=.65
        links.new(t.outputs['Color'],n.inputs['Color']); links.new(n.outputs['Normal'],p.inputs['Normal'])
    if texture_set.get('orm'):
        t=tex('orm',True); sep=nodes.new('ShaderNodeSeparateColor')
        links.new(t.outputs['Color'],sep.inputs['Color'])
        links.new(sep.outputs['Green'],p.inputs['Roughness'])
        links.new(sep.outputs['Blue'],p.inputs['Metallic'])
        group=bpy.data.node_groups.get('glTF Material Output')
        if not group:
            group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
            group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
            group.nodes.new('NodeGroupInput')
        g=nodes.new('ShaderNodeGroup');g.node_tree=group
        links.new(sep.outputs['Red'],g.inputs['Occlusion'])
    elif texture_set.get('roughness'):
        t=tex('roughness',True); links.new(t.outputs['Color'],p.inputs['Roughness'])
    m.use_backface_culling=False
    return m


def mesh(name, verts, faces, mat=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    if mat:
        data.materials.append(mat)
    return obj


def uv_world(obj, scale=1.0):
    """One UV repeat per `scale` metres, dominant-face planar projection.

    Apply before material grouping so the material's stone grain does not
    become smaller when more blocks are joined. Artists may replace this with
    a hand-authored UV layer for leaves, plaques or longitudinal bark.
    """
    layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
    for poly in obj.data.polygons:
        n=normal_matrix@poly.normal
        axis=max(range(3),key=lambda i:abs(n[i]))
        axes=((1,2),(0,2),(0,1))[axis]
        for li in poly.loop_indices:
            co=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co
            layer.data[li].uv=(co[axes[0]]/scale,co[axes[1]]/scale)
    return obj


def cube(name, loc=(0,0,0), size=(1,1,1), mat=None, bevel=.03):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if mat:obj.data.materials.append(mat)
    if bevel>0:
        mod=obj.modifiers.new('soft worn arris','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    # Blender's default cube UV is an atlas of the whole cube rather than a
    # metre-consistent tiling material. Replace it for architectural stone.
    uv_world(obj)
    return obj


def tube(name, points, radii, mat=None, sides=8):
    """Ring mesh along a polyline with parallel transported local frame."""
    pts=[Vector(p) for p in points]
    if isinstance(radii,(int,float)):radii=[radii]*len(pts)
    verts=[]
    previous=None
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        if previous is None:
            u=tangent.cross(Vector((0,0,1)))
            if u.length<.01:u=tangent.cross(Vector((0,1,0)))
            u.normalize()
        else:
            u=previous-tangent*previous.dot(tangent)
            if u.length<.001:u=tangent.cross(Vector((0,1,0)))
            u.normalize()
        v=tangent.cross(u).normalized();previous=u
        for j in range(sides):
            a=j*math.tau/sides
            verts.append(tuple(p+radii[i]*(u*math.cos(a)+v*math.sin(a))))
    faces=[]
    for i in range(len(pts)-1):
        for j in range(sides):
            faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))])
    obj=mesh(name,verts,faces,mat)
    uv=obj.data.uv_layers.new(name='UVMap')
    distance=[0.0]
    for i in range(1,len(pts)):distance.append(distance[-1]+(pts[i]-pts[i-1]).length)
    for poly in obj.data.polygons:
        sideface=len(poly.vertices)==4
        for k,li in enumerate(poly.loop_indices):
            vi=obj.data.loops[li].vertex_index;ring,j=divmod(vi,sides)
            if sideface:
                # Last sector needs U=1 at its closing edge, rather than U=0.
                j0=obj.data.loops[poly.loop_indices[0]].vertex_index%sides
                u=(j if j0!=sides-1 or j!=0 else sides)/sides
                uv.data[li].uv=(u*math.tau*max(radii[ring],.005),distance[ring])
            else:
                uv.data[li].uv=(verts[vi][0],verts[vi][1])
    for p in obj.data.polygons:p.use_smooth=True
    return obj


def _apply_and_join():
    objects=[o for o in bpy.context.scene.objects if o.type in {'MESH','CURVE','FONT','SURFACE'}]
    for obj in objects:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        if obj.type!='MESH':bpy.ops.object.convert(target='MESH')
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        if not obj.data.materials:obj.data.materials.append(material('unassigned_neutral'))
        for a in list(obj.data.color_attributes):obj.data.color_attributes.remove(a)
        if not obj.data.uv_layers:
            uv_world(obj)
    # Separate by material first, then join same material surfaces, preserving
    # world transforms and reducing glTF primitive / draw call count.
    for obj in list(bpy.context.scene.objects):
        if obj.type=='MESH' and len(obj.data.materials)>1:
            bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
    groups={}
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            # Material separation retains unused slots; identify the used slot
            # before collapsing, rather than assuming that it is slot zero.
            used=obj.data.materials[obj.data.polygons[0].material_index] if obj.data.polygons else obj.data.materials[0]
            obj.data.materials.clear();obj.data.materials.append(used)
            for p in obj.data.polygons:p.material_index=0
            groups.setdefault(used.name,[]).append(obj)
    result=[]
    for name,items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in items:o.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        obj=bpy.context.object;obj.name=name+'_surface'
        # Duplicate unused slots can be left by join. Strip unused to avoid
        # redundant material exports, preserving the first surface assignment.
        while len(obj.data.materials)>1:obj.data.materials.pop(index=len(obj.data.materials)-1)
        for p in obj.data.polygons:p.material_index=0
        if not obj.data.uv_layers:uv_world(obj)
        # All geometry has coherent outward normals, including boolean caps.
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
        result.append(obj)
    return result


def _gltf_metrics(path):
    data=path.read_bytes()
    magic,version,total=struct.unpack_from('<III',data,0)
    assert magic==0x46546c67 and version==2 and total==len(data)
    n,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
    gltf=json.loads(data[20:20+n])
    attrs=[];tris=0;verts=0
    for m in gltf.get('meshes',[]):
        for p in m['primitives']:
            a=p['attributes'];attrs.append(a)
            count=gltf['accessors'][p['indices']]['count'] if 'indices' in p else gltf['accessors'][a['POSITION']]['count']
            tris+=count//3;verts+=gltf['accessors'][a['POSITION']]['count']
    assert attrs and all('NORMAL' in a and 'TEXCOORD_0' in a and 'COLOR_0' not in a for a in attrs),'Missing NORMAL/UV or unexpected vertex color'
    assert not(set(gltf.get('extensionsUsed',[]))-ALLOWED_EXTENSIONS),gltf.get('extensionsUsed')
    assert all('bufferView' in im and 'uri' not in im for im in gltf.get('images',[])),'Texture not embedded'
    points=[]
    def visit(idx,parent):
        node=gltf['nodes'][idx]
        if 'matrix' in node:
            v=node['matrix'];mat=Matrix([[v[r+c*4] for c in range(4)] for r in range(4)])
        else:
            q=node.get('rotation',[0,0,0,1]);rot=Quaternion((q[3],q[0],q[1],q[2])).to_matrix().to_4x4()
            mat=Matrix.Translation(node.get('translation',[0,0,0]))@rot@Matrix.Diagonal((*node.get('scale',[1,1,1]),1))
        mat=parent@mat
        if 'mesh' in node:
            for p in gltf['meshes'][node['mesh']]['primitives']:
                acc=gltf['accessors'][p['attributes']['POSITION']]
                lo,hi=acc['min'],acc['max']
                for x in (lo[0],hi[0]):
                    for y in (lo[1],hi[1]):
                        for z in (lo[2],hi[2]):points.append(mat@Vector((x,y,z)))
        for c in node.get('children',[]):visit(c,mat)
    for idx in gltf['scenes'][gltf.get('scene',0)]['nodes']:visit(idx,Matrix.Identity(4))
    lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
    return dict(bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),tris=tris,verts=verts,meshes=len(gltf.get('meshes',[])),drawCalls=len(attrs),
                materials=[m.get('name','') for m in gltf.get('materials',[])],textureCount=len(gltf.get('images',[])),
                textureBytes=sum(gltf['bufferViews'][im['bufferView']]['byteLength'] for im in gltf.get('images',[])),
                sizeMeters=[round(hi[i]-lo[i],4) for i in range(3)],bboxMin=[round(v,4) for v in lo],bboxMax=[round(v,4) for v in hi],
                extensions=gltf.get('extensionsUsed',[]),animations=[a.get('name','') for a in gltf.get('animations',[])],pointLights=0,emitters=0,valid=True)


def _look(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def render_imported_glb(path, asset_id):
    """Render evidence only after deleting the source scene and importing GLB."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
    corners=[o.matrix_world@Vector(c) for o in obs for c in o.bound_box]
    lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
    center=(lo+hi)*.5;extent=hi-lo
    radius=max(extent.length*.5,.15)
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU'
    s.cycles.samples=int(os.environ.get('F1_RENDER_SAMPLES','24'));s.cycles.use_denoising=True
    s.render.threads_mode='FIXED';s.render.threads=int(os.environ.get('F1_RENDER_THREADS','4'))
    res=int(os.environ.get('F1_RENDER_RES','640'));s.render.resolution_x=res;s.render.resolution_y=res;s.render.resolution_percentage=100
    s.render.image_settings.file_format='PNG';s.render.film_transparent=False
    s.view_settings.view_transform='AgX'
    s.view_settings.exposure=-.2
    s.world=bpy.data.worlds.new('neutral studio world');s.world.use_nodes=True
    s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.14,.17,.19,1)
    s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
    # Review-only neutral ground must not acquire product texture noise.
    floor=bpy.data.materials.new('review_ground');floor.use_nodes=True
    floor.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.075,.085,.083,1)
    floor.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.93
    cube('review ground',(center.x,center.y,lo.z-.07),(radius*15,radius*15,.1),floor,0)
    for name,pos,power,size,col in [
        ('warm soft key',(-3,-4,6),850,4,(1,.89,.74)),
        ('cool fill',(4,-1,3),450,3,(.72,.84,1)),
        ('rim',(1,4,5),1000,3,(1,.98,.87))]:
        light=bpy.data.lights.new(name,'AREA');light.energy=power*.18*max(radius*.6,.3)**2;light.shape='DISK';light.size=size*radius*.5;light.color=col
        obj=bpy.data.objects.new(name,light);s.collection.objects.link(obj);obj.location=center+Vector(pos)*radius*.5;_look(obj,center)
    cam=bpy.data.cameras.new('evidence_camera');co=bpy.data.objects.new('evidence_camera',cam);s.collection.objects.link(co);s.camera=co
    cam.type='ORTHO';cam.ortho_scale=max(extent.z,extent.x,extent.y)*1.28
    paths=[]
    selected_views={v.strip() for v in os.environ.get('F1_RENDER_VIEWS','front,side,angle,top').split(',')}
    for view,unit in [('front',(0,-1,.12)),('side',(1,0,.12)),('angle',(1,-1,.60)),('top',(0,-.001,1))]:
        if view not in selected_views:continue
        co.location=center+Vector(unit).normalized()*radius*4;_look(co,center)
        # Square frame around the projected model in this particular view.
        axes=co.rotation_euler.to_matrix();right=axes@Vector((1,0,0));up=axes@Vector((0,1,0))
        px=[v.dot(right) for v in corners];py=[v.dot(up) for v in corners]
        cam.ortho_scale=max(max(px)-min(px),max(py)-min(py)) * 1.18
        dst=OUT/'renders'/asset_id/(view+'.png');dst.parent.mkdir(parents=True,exist_ok=True)
        s.render.filepath=str(dst);bpy.ops.render.render(write_still=True)
        paths.append(str(dst.relative_to(OUT)))
    return paths


def finish(asset_id, category='props', description='', render=True):
    assert category in ('props','modules')
    objects=_apply_and_join()
    root=bpy.data.objects.new(asset_id,None);bpy.context.scene.collection.objects.link(root)
    root['asset_id']=asset_id;root['approval_status']='pending_visual_review'
    for obj in objects:obj.parent=root
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    for image in bpy.data.images:
        if image.source=='FILE' and image.has_data:image.pack()
    src=OUT/'sources'/(asset_id+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(src))
    path=OUT/category/(asset_id+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_yup=True,export_texcoords=True,export_normals=True,export_vertex_color='NONE',
        export_materials='EXPORT',export_image_format='AUTO',export_cameras=False,export_lights=False,
        export_extras=True,export_animations=False)
    metrics=_gltf_metrics(path)
    metrics.update(id=asset_id,file=str(path.relative_to(OUT)),category=category,desc_ja=description,
        approvalStatus='pending_visual_review',sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        workflowRun=None,verificationEnvironment='Local Blender '+bpy.app.version_string,
        source=str(src.relative_to(OUT)),renderedFrom=None,renders=[])
    dest=OUT/'metrics'/(asset_id+'.json');dest.write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
    if render:
        try:
            metrics['renders']=render_imported_glb(path,asset_id)
            metrics['renderedFrom']='reimported GLB'
        except Exception as exc:
            metrics['renderError']=repr(exc)
            dest.write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
            raise
    dest.write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
    print('F1_ASSET_FINISHED '+json.dumps(metrics,ensure_ascii=False))
    return metrics
