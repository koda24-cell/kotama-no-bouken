"""Non-destructive V02 continuation of the actually rendered V01 wooden hub.
Add localized edge wear after 14 real mortises; retain bore and main wood PBR.
"""
import bpy,sys,hashlib,json,math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
assert len(args)==2
out=Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
checkpoint=Path(args[1]).resolve()
SRC='0ee326423bd1775a465ffe96827313d5c5f9a6d30cd878f84aa79b5a3784ea6e'
sha=hashlib.sha256(checkpoint.read_bytes()).hexdigest()
assert sha==SRC,'Wrong V01 wooden hub source checkpoint'
bpy.ops.wm.open_mainfile(filepath=str(checkpoint))
hub=bpy.data.objects['B2_Single_Wooden_Hub_01']
before=(len(hub.data.vertices),len(hub.data.polygons))
# Tiny, asymmetric real volume wear along the end-rim corners; preserve load-bearing shell.
# Avoid a decorative scratch sheet or uniform radial repetition.
cuts=[(-.178,-2.48,.029,.023),(.178,-1.41,.031,.026),
      (-.177,.42,.024,.027),(.178,1.36,.027,.019),(-.179,2.54,.034,.025)]
for i,(x,ang,rad,depth) in enumerate(cuts):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,
        location=(x,.578*math.cos(ang),.578*math.sin(ang)))
    c=bpy.context.object;c.name='Temporary_edge_wear_%02d'%i
    c.scale=(depth,rad,rad*.75)
    c.rotation_euler=(ang*.31,0,0)
    bpy.context.view_layer.objects.active=c
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=hub.modifiers.new('Slight natural edge losses %02d'%i,'BOOLEAN')
    mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c
    bpy.context.view_layer.objects.active=hub
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(c,do_unlink=True)
assert len([o for o in bpy.data.objects if o.name.startswith('Temporary_edge_wear')])==0
# Round the freshly cut hard socket lips by a few mm like old worked oak.
bevel=hub.modifiers.new('Subtle socket and rim edge wear','BEVEL')
bevel.width=.0035;bevel.segments=2
bevel.limit_method='ANGLE';bevel.angle_limit=.55
normal=hub.modifiers.new('Stable split face normals','WEIGHTED_NORMAL')
# Export only the hub, no camera/light or old reference models.
bpy.ops.object.select_all(action='DESELECT')
hub.select_set(True);bpy.context.view_layer.objects.active=hub
tag='b2_waterwheel_single_wooden_hub_v02'
glb=out/(tag+'.glb')
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
hub.select_set(False)
sc=bpy.context.scene;sc.cycles.samples=48
sc.render.resolution_x=850;sc.render.resolution_y=850
sc.render.resolution_percentage=100
camera=sc.camera;camera.data.type='ORTHO';camera.data.ortho_scale=1.70
files=[glb]
for name,loc in [('front',(3.0,.35,.35)),('side',(.85,2.95,.8)),('angle',(2.4,2.0,1.8)),('back',(-2.9,.50,.3))]:
    camera.location=loc
    camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
    f=out/(tag+'_'+name+'.png');sc.render.filepath=str(f)
    bpy.ops.render.render(write_still=True);files.append(f)
blend=out/(tag+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(blend));files.append(blend)
manifest={'asset':tag,'approval':'NOT_APPROVED','source_v01_blend_sha256':sha,
 'preserved_v01_mesh_checkpoint':True,
 'original_source_hub_topology':{'vertices':before[0],'faces':before[1]},
 'original_bore_radius_m':.303,'real_mortise_count_preserved':14,
 'asymmetric_edge_loss_count':len(cuts),'bevel_width_m':.0035,
 'glb_only_one_hub':True,'files':{}}
for p in files:
    data=p.read_bytes();manifest['files'][p.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(out/(tag+'_manifest.json')).write_text(json.dumps(manifest,indent=2))
print('B2_HUB_V02_REAL_WEATHERING_RENDER_SUCCESS',len(cuts),flush=True)
