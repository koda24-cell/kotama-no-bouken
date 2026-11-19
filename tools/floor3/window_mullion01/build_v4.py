"""V4 rusted and weathered steel mullion; preserve V1-V3 base and origin.
Reuse the same cross section; generate reusable rust-paint albedo as PNG.
"""
import bpy,math,random,os
from mathutils import Vector
from pathlib import Path
src=Path('/work/tools/floor3/window_mullion01/build.py').read_text(encoding='utf8')
prefix=src.split('for version in (1,2,3):')[0]
exec(compile(prefix,'mullion_base','exec'))
# Delete default objects, but keep original untouched generator function.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
stem=setup_variant(3) # Preserve base and local attached damage layers
base=bpy.data.objects.get('F3_WINDOW_MULLION01_BASE')
assert base is not None
# Generate an independent color texture asset: aged greenish-grey enamel, irregular
# corrosion streaks, isolated bare metal, never uniform orange rust rings.
W,HIMG=256,512
im=bpy.data.images.new('F3_WINDOW_AGED_PAINT_RUST_01',width=W,height=HIMG,alpha=True)
rand=random.Random(788)
pix=[]
for row in range(HIMG):
    for col in range(W):
        x=col/W;y=row/HIMG
        broad=math.sin(x*9.5+y*3)*math.sin(x*3-y*18)
        fine=math.sin(x*51-y*15)*math.cos(y*60+x*15)
        # rust streaks descend from isolated breach spots
        streak=0
        for xx,yy,amp in ((.25,.82,.85),(.66,.55,.64),(.44,.22,.55),(.83,.94,.51)):
            if y<=yy:
                streak=max(streak,amp*math.exp(-((x-xx-.035*(yy-y))/.085)**2)*math.exp(-(yy-y)*3.0))
        rust=max(0,min(1,.09+.19*broad+.15*fine+streak+rand.uniform(-.12,.12)))
        basecol=(.28+.045*fine,.315+.04*fine,.295+.04*fine)
        oxide=(.30+.10*rust,.115+.045*rust,.07+.032*rust)
        pix.extend((*(basecol[i]*(1-rust)+oxide[i]*rust for i in range(3)),1.0))
im.pixels[:]=pix
im.filepath_raw=f'{OUT}/F3_WINDOW_AGED_PAINT_RUST_01.png';im.file_format='PNG';im.save()
paint=bpy.data.materials.new('Aged_window_paint_rust_tex')
paint.use_nodes=True
nt=paint.node_tree
bs=nt.nodes.get('Principled BSDF')
bs.inputs['Metallic'].default_value=.62;bs.inputs['Roughness'].default_value=.79
node=nt.nodes.new('ShaderNodeTexImage');node.image=im
nt.links.new(node.outputs['Color'],bs.inputs['Base Color'])
noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180
bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.0025
nt.links.new(noise.outputs['Fac'],bump.inputs['Height'])
nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
base.data.materials.clear();base.data.materials.append(paint)
# UV project longitudinal steel faces; each face gets full width and tall repeat
mesh=base.data
uv=mesh.uv_layers.new(name='metal_steel_length_UV')
for f in mesh.polygons:
    vids=[mesh.loops[i].vertex_index for i in f.loop_indices]
    pts=[mesh.vertices[i].co for i in vids]
    x0=min(p.x for p in pts);x1=max(p.x for p in pts)
    y0=min(p.y for p in pts);y1=max(p.y for p in pts)
    for li in f.loop_indices:
        p=mesh.vertices[mesh.loops[li].vertex_index].co
        if x1-x0 > y1-y0:
            u=(p.x-x0)/(x1-x0) if x1>x0 else .5
        else:
            u=(p.y-y0)/(y1-y0) if y1>y0 else .5
        uv.data[li].uv=(u,p.z/2.25)
# Re-export one material textured with embedded image (still unapproved).
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
    if ob.type=='MESH':ob.select_set(True)
bpy.context.view_layer.objects.active=base
stem='f3_window_mullion01_v4'
bpy.ops.export_scene.gltf(filepath=f'{OUT}/{stem}.glb',export_format='GLB',use_selection=True,export_apply=True)
cam=configure_render()
focus=Vector((0,0,1.125))
cam.data.ortho_scale=2.58
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/{stem}.blend')
for view,d in [('front',(0,-1,.12)),('side',(1,-.04,.15)),('angle',(1,-1,.30))]:
    cam.location=focus+Vector(d).normalized()*3.4
    cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene.render.filepath=f'{OUT}/{stem}-{view}.png'
    bpy.ops.render.render(write_still=True)
    print('F3_MULLION_V4_RENDER_OK',view,flush=True)
cam.data.ortho_scale=.55
detail=Vector((0,0,1.52))
cam.location=detail+Vector((1,-1,.28)).normalized()*1.5
cam.rotation_euler=(detail-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.filepath=f'{OUT}/{stem}-detail.png'
bpy.ops.render.render(write_still=True)
print('F3_MULLION_V4_ALL_COMPLETE',flush=True)
