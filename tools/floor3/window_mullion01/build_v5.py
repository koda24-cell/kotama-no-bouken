"""Window mullion 01 V5: same U channel, physically flush paint and localized corrosion.

V4 is preserved unchanged. There are NO raised plate meshes in V5:
paint chips/oxidation are represented in the UV material; metal section unchanged.
All images are our own deterministic procedural output, no external assets.
"""
import bpy, math, random
from mathutils import Vector
from pathlib import Path
src=Path('/work/tools/floor3/window_mullion01/build.py').read_text(encoding='utf-8')
prefix=src.split('for version in (1,2,3):')[0]
assert 'def setup_variant(v):' in prefix
exec(compile(prefix,'mullion_original_source','exec'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
stem=setup_variant(1)  # one original U-section, without V3 floating plate meshes
base=bpy.data.objects.get('F3_WINDOW_MULLION01_BASE')
assert base and len([o for o in bpy.context.scene.objects if o.type=='MESH'])==1
W,HIMG=256,512
albedo=bpy.data.images.new('F3_WINDOW_ENAMEL_RUST_V5',width=W,height=HIMG,alpha=True)
rough=bpy.data.images.new('F3_WINDOW_ROUGHNESS_V5',width=W,height=HIMG,alpha=False)
rgb=[];rg=[]
rng=random.Random(5103)
# Corrosion is concentrated at bottom, old scratches, and three small damage loci;
# broad areas of intact muted enamel must remain visually dominant.
spots=((.14,.12,.085,.050),(.83,.20,.060,.105),(.33,.77,.070,.058),
       (.79,.91,.066,.066),(.57,.50,.041,.026))
for yi in range(HIMG):
    y=yi/(HIMG-1)
    for xi in range(W):
        x=xi/(W-1)
        micro=(math.sin(x*157.1+y*91.7)*math.sin(x*73.7-y*153.2))*.018
        noise=rng.uniform(-.014,.014)
        damaged=0.0
        for px,py,sx,sy in spots:
            dist=((x-px)/sx)**2+((y-py)/sy)**2
            irregular=1+.22*math.sin(19*x+7*y)*math.sin(35*y-9*x)
            damaged=max(damaged,max(0,1-dist*irregular))
        # Occasional narrow vertical drainage from a few existing corrosion spots
        drainage=0.0
        for px,py in ((.83,.20),(.33,.77)):
            if y<py:
                drainage=max(drainage,
                   math.exp(-((x-px-.016*(py-y))/.019)**2)
                   *math.exp(-(py-y)*10)*.18)
        # row zero is bottom on longitudinal UV
        bottom=max(0,1-y/.16)*.34
        rust=max(0,min(.94,damaged*.88+drainage+bottom+.017*abs(math.sin(44*x+57*y))+noise))
        # central damage exposes bare steel; tiny local spectral variation of oxide
        bare=0.0
        for px,py in ((.14,.12),(.79,.91)):
            bare=max(bare,max(0,1-((x-px)/.028)**2-((y-py)/.014)**2))
        bare=min(1,bare*.67)
        paint=(.285+micro,.315+micro*.75,.297+micro*.82)
        oxide=(.315+micro*.8,.145+micro*.42,.080+micro*.24)
        steel=(.34,.365,.365)
        c=tuple(max(0,min(1,(paint[k]*(1-rust)+oxide[k]*rust)*(1-bare)+steel[k]*bare)) for k in range(3))
        rgb.extend((*c,1))
        r=max(.05,min(1,(.69*(1-rust)+.91*rust)*(1-bare)+.40*bare))
        rg.extend((r,r,r,1))
albedo.pixels[:]=rgb
albedo.filepath_raw=f'{OUT}/F3_WINDOW_ENAMEL_RUST_V5.png'
albedo.file_format='PNG';albedo.save()
rough.pixels[:]=rg
rough.filepath_raw=f'{OUT}/F3_WINDOW_ROUGHNESS_V5.png'
rough.file_format='PNG';rough.save()
# Common longitudinal UV layout shared between source color and roughness.
mesh=base.data
uv=mesh.uv_layers.new(name='paint_longitudinal_uv')
for poly in mesh.polygons:
    points=[mesh.vertices[mesh.loops[li].vertex_index].co for li in poly.loop_indices]
    x_min,x_max=min(p.x for p in points),max(p.x for p in points)
    y_min,y_max=min(p.y for p in points),max(p.y for p in points)
    span_x=x_max-x_min
    span_y=y_max-y_min
    for li in poly.loop_indices:
        p=mesh.vertices[mesh.loops[li].vertex_index].co
        u=(p.x-x_min)/span_x if span_x>span_y and span_x>.00001 else (
           (p.y-y_min)/span_y if span_y>.00001 else .5)
        uv.data[li].uv=(u,p.z/2.25)
paint=bpy.data.materials.new('F3_aged_enamel_flush_oxide_v5')
paint.use_nodes=True
nt=paint.node_tree
bs=nt.nodes.get('Principled BSDF')
bs.inputs['Metallic'].default_value=.65
bs.inputs['Roughness'].default_value=.74
color=nt.nodes.new('ShaderNodeTexImage');color.image=albedo
color.interpolation='Linear';color.extension='EXTEND'
nt.links.new(color.outputs['Color'],bs.inputs['Base Color'])
rm=nt.nodes.new('ShaderNodeTexImage');rm.image=rough
rm.image.colorspace_settings.name='Non-Color'
nt.links.new(rm.outputs['Color'],bs.inputs['Roughness'])
# Mild metal porosity, no exaggerated bark/wavy noise.
grain=nt.nodes.new('ShaderNodeTexNoise')
grain.inputs['Scale'].default_value=140
grain.inputs['Detail'].default_value=2
bump=nt.nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value=.075
bump.inputs['Distance'].default_value=.0007
nt.links.new(grain.outputs['Fac'],bump.inputs['Height'])
nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
mesh.materials.clear();mesh.materials.append(paint)
# Only the true U-profile is exported, not camera, lights or any loose flake.
bpy.ops.object.select_all(action='DESELECT')
base.select_set(True);bpy.context.view_layer.objects.active=base
stem='f3_window_mullion01_v5'
bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',
                          use_selection=True,export_apply=True)
cam=configure_render()
focus=Vector((0,0,1.125))
cam.data.ortho_scale=2.58
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
for view,d in [('front',(0,-1,.12)),('side',(1,-.04,.15)),('angle',(1,-1,.30))]:
    cam.location=focus+Vector(d).normalized()*3.4
    cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene.render.filepath=f'{OUT}/{stem}-{view}.png'
    bpy.ops.render.render(write_still=True)
    print('F3_MULLION_V5_RENDER_OK',view,flush=True)
cam.data.ortho_scale=.55
focus=Vector((0,0,.38))
cam.location=focus+Vector((1,-1,.28)).normalized()*1.5
cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.filepath=f'{OUT}/{stem}-detail.png'
bpy.ops.render.render(write_still=True)
print('F3_MULLION_V5_ALL_COMPLETE',flush=True)
