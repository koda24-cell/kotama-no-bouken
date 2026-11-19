"""V4: physically recognizable deformed steel ribs, preserve V1-V3 generators."""
from pathlib import Path
source=Path('/work/tools/floor3/rebar01/build.py').read_text(encoding='utf-8')
assert source.count('image=make_texture()')==1
source=source.split('image=make_texture()')[0]
old="rib=.0048*math.exp(-((j%7-3.0)/1.6)**2)"
new="""# Crosswise angled rolled ridges around the shaft, unlike round bumpy rings.
            axial=(j / rings) * (1.55 / .083)
            ridge_phase=(axial+1.15*k/sides)*2*math.pi
            rib=.0009+.0038*max(0.0,math.cos(ridge_phase))**9
            rib+=.0018*max(0.0,math.cos(2*angle))**16"""
assert old in source
source=source.replace(old,new)
source=source.replace('if variant==3 and j>rings-9:', 'if variant>=3 and j>rings-9:')
source=source.replace('cam.data.ortho_scale=2.2','cam.data.ortho_scale=2.0')
exec(compile(source,'rebar_v4_source','exec'))
image=make_texture()
version=4
ob=build(version,make_mat(image))
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True);bpy.context.view_layer.objects.active=ob
bpy.ops.export_scene.gltf(filepath=f"{ROOT}/f3_rebar01_v4.glb",export_format='GLB',use_selection=True,export_apply=True)
render_scene(version,ob.data.materials[0])
# Additional close-up inspection of genuinely shaped ribs and cut top.
camera=bpy.context.scene.camera
target=Vector((.10,0,1.25))
camera.data.ortho_scale=.64
camera.location=target+Vector((1,-1,.24)).normalized()*2.0
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.filepath=f"{ROOT}/f3_rebar01_v4-detail.png"
bpy.ops.render.render(write_still=True)
print("F3_REBAR_V4_ALL_COMPLETE",flush=True)
