from pathlib import Path
import math,os
import bpy
from mathutils import Vector
from common import cube,_look
OUT=None
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
    selected_views={v.strip() for v in os.environ.get('F1_RENDER_VIEWS','front,back,side,angle,top').split(',')}
    for view,unit in [('front',(0,-1,.12)),('back',(0,1,.12)),('side',(1,0,.12)),('angle',(1,-1,.60)),('top',(0,-.001,1))]:
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

