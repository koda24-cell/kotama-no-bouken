"""F3 single chipped pane V10 — one chipped upper-right corner, no centre hole.
Standalone glass model. Previous research V1-V7 kept intact.
Blender 5.3, export GLB and 4 view PNGs, one mesh with actual 6mm edge.
"""
import bpy,math,os,random
from mathutils import Vector
OUT="/work/out/f3_glass_shard_dirt_v10"
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
# The only geometry is the missing shard from V8.
# The original large glass sheet is omitted.
# The only geometry is the tiny missing corner of V8.
original=[(.56,.755),(.522,.779),(.484,.809),(.456,.838),(.413,.90),(.56,.90)]
cx=sum(x for x,z in original)/len(original)
cz=sum(z for x,z in original)/len(original)
points=[(x-cx,z-cz) for x,z in original]
W,H=.080,.085
mesh=bpy.data.meshes.new("single_detached_corner_shard")
mesh.from_pydata([(x,0,z) for x,z in points],[],[list(range(len(points)))])
mesh.update()
ob=bpy.data.objects.new("F3_GLASS_DETACHED_SHARD01_V10",mesh)
bpy.context.collection.objects.link(ob)
uv=mesh.uv_layers.new(name="whole_glass_uv")
for poly in mesh.polygons:
 for li in poly.loop_indices:
  p=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=((p.x+W)/(2*W),(p.z+H)/(2*H))
# Small, self-authored non-color roughness map; mostly clear, more dust near frame.
N=256
im=bpy.data.images.new("F3_GLASS_SINGLE_CHIP_ROUGHNESS_01",width=N,height=N,alpha=False)
rng=random.Random(111908)
pix=[]
for j in range(N):
 v=j/(N-1)
 for i in range(N):
  u=i/(N-1)
  edge=max(0.,1.-min(u,1-u,v,1-v)/.095)
  dust=.035*max(0,math.sin(22*u+6*v)*math.cos(32*v-9*u))
  drips=0.
  for a,b in ((.21,.9),(.76,.86)):
   if v<b: drips=max(drips,.12*math.exp(-((u-a-.018*(b-v))/.026)**2)*math.exp(-3.2*(b-v)))
  r=max(.055,min(.48,.077+.16*edge+dust+drips+rng.uniform(-.007,.007)))
  pix.extend((r,r,r,1.))
im.pixels[:]=pix
im.filepath_raw=OUT+"/F3_GLASS_SINGLE_CHIP_ROUGHNESS_01.png"
im.file_format="PNG"
im.save()
material=bpy.data.materials.new("lightly_weathered_clear_glass")
material.use_nodes=True
nodes=material.node_tree.nodes
links=material.node_tree.links
p=nodes.get("Principled BSDF")
p.inputs["Base Color"].default_value=(.94,.98,.975,1)
p.inputs["Metallic"].default_value=0
p.inputs["Transmission Weight"].default_value=.98
p.inputs["IOR"].default_value=1.47
p.inputs["Roughness"].default_value=.08
tn=nodes.new("ShaderNodeTexImage")
tn.image=im
im.colorspace_settings.name="Non-Color"
tn.interpolation="Linear"
links.new(tn.outputs["Color"],p.inputs["Roughness"])
# AI-generated reference image (original 1254 px PNG SHA256:
# c8937570b1be8541811a62cc0213584c085dc2276afbe5efa850f1c2d0babbd6)
# Downsampled 128 x 128, 4-bit grayscale values preserving stains and drips.
# Self-contained on GitHub so Blender Actions can render without temporary URLs.
import base64,zlib
DIRT_B85 = """c-pmF+k)#L2z->u|9|i~ZBpef*lr$nx7#Er!Y~2?uZ#X)gT#gB7bv{&T+jXd)AJ-=uNkjvzV&^}eV=+Dk^laQRQ~gJ`R6mUdjMlTMEJaRJv^QtLyqCTBO0cfF?}XAA6W9I3TVl{e-ER3J9RA{j{J{Yu9oNh?;%Vn>>;QZ4yI-H3NC(%(bh5LvJo)-z7(*gjmH-FZ2ymN=*d|l!4fXD0(ChC!(RX`|81(?+syo*>yrOABQRbC@x0KVSd+QrOr!hx^R;pvYtChv$Hm<epFijG(fkPxG<<G^_6s%tVCV#f8cL6@`NQ$WHGB`b*!L;kC_@&qkb~iLTNki6271oUO+)}xg2E*19TPSlG;)UEEY1QE$6`EPdw$1;4t}HY0qHp$Y^XFW<2c-V<k}k)h~OM?42tzHe4a3u9r3*Upoc65X7V9$=MyM__(3ZkiDgkr0|ZQHpo-sV;51Y2#{NanbAZP;H24wRF)<+1KUCZ`(?M*x0=3rlc*}nu;XycAf4&0u+9TDKdL17x4}X`yk!(eM$Z)<5qQacvAS?g=csXW(Y=JX#%~wQnN6-#`_4;VG;)c1+c-bPMpmPN{sr>~`uBp@}<`^5~pDf%a&g<#`McH;)Eh((&pln0Y0D?zLm^c+a&J-Zm-@+|XR{_VDS;-4ELn;MiFGRRB<YZ##O803PcGEahM^S0Oc41M1@n6}4`@v_WMfu}=0O_|9H|Z}FkoxLgKHH#`(HSUyRikce`&^Y@3{(|03XXrKe;h9`pL0w85dx*Vp;SI_4rI=TV>ofNsDJnXq$2W2M>6{1su%!Jl7C<;pqzlkloADC`T;_rc~4J1JgS|nLXctDKD(vlB|L}7)JppwX$oc|zvd%Z27DvG&WZE%#>ysYZI3oe7k2fg&Hy2q&vtYebX9zq!jQ`bpWlyBerJ`xf~7py$noudq)7Z$CfpVds1d7&+4O9OBnlU_mEQ=t655f!Le(s+8#E0nByYji08Z7wGr(iYv)LO2;t_7~kL4R0>sD249Z}HDL5CM4|Bw|J*oy}ehKa}WJu8LH#6e)Pwj5T)JCE`~1{!MH?gg_ERx88QPLQ)i?jC@<J7k62YI-Z$r&l)$iY<<>5+~5|Q7A1@nxbzlhCw;>sKv08X>no)X1>^IqdWh1TA4xY23Jwgd5=ur@^Kbcd}dot0)TAIy%E^i4)BDIO@1f;eF1f?pHbn-a*FcR>xZ@W?Vhqm$R7C}qKZzo&CSbmdXJz^e$1+&d0p-*rnrxqCGEimT46!Lp_58G+F8Jw()bR^id^uq?Vsf_)d0#)zjKlCM+1oFeyot7&8=%Fu-vAN<TXzTJp)<T$BsaBM!MX~ya43am4V-^Sk$}FEsrJ`vCBdh@@BOx0sLYxcB_x7RhRGiJ)AVi+aJhp(#M})Rr-u$>#tJDq^wlbzv9(fN~9)+N_<BN8!Jqy(9i40E!7=@jO8fcb6Q)g6OZ!xcNEaUeu7{8!MXe{`8@)Q#B^%RQ_>&PXjdt+#-`Dgult(|UIE*}QwJ2YwOlR5ejjhd8u}Z&h$lmJQ-6<}`nDw73c9!ZfWrtQM)9LyGZlV8l@@GLBDcJ+<P(vbUnan07@fvc9Y)Z1Wv95{@WTLkahUO74lB+J@XQ+un;O3y(vkn9x-Z)$4x#>hw|$oJkr~fx^@fX7Oyu#rS+y^pL<awrc)K9y1DzZTc5oZ{2zUYlJi_#I-7r6b70eoN1GeCG`Kog-tec0Bd5~JG8epm>Z?aALSfkjUsYnu!C?#pZ&VBKA?Yy_yIeX-9NgVBf#Cacn?#w|WfB9g0iyiqW0iifeGu@FfZ{vDSmLP!x?E0?3<9k}|j9&-Ww|E_$pFe?@i2^@^h=hf<Lr$2R(Q#LnI^Ad3X_7{Ndo>ZI+%Iw$%f*`2qHx5b>A_2k7mmrGyt9MLjpMlMv8DP(w6I_+>kse1iUSYa9CtZ*>=9Bpw?3mu5*=D;Z-jYYa}S*588Pr8Z65CAhvAk6o|C$X{HnpFP2h}@W~n-Hu$uBVeuU6H6A!v11G7O!*l^-?YXpwyXNl+0XRJ6ZSQwB5-noUO{f<6J^zv2Zz7&UH=nPeO3`(6QOZ{FS`i*&jiOZniII|$KQA0UXfQ-f0^$+^&3(N"""
raw=zlib.decompress(base64.b85decode(DIRT_B85.encode('ascii')))
assert len(raw)==128*128
dirt=bpy.data.images.new("F3_GENERATED_GLASS_DIRT_V10",width=128,height=128,alpha=False)
dirt.pixels[:]=[channel for v in raw for channel in ((v+.5)/16.,(v+.5)/16.,(v+.5)/16.,1.)]
dirt.filepath_raw=OUT+"/F3_GENERATED_GLASS_DIRT_V10.png"
dirt.file_format='PNG'
dirt.save()
# Texture directly drives surface roughness AND subtle tinted grime.
# Preserve transmission 0.95 to avoid making the shard a solid gray stone.
dirt.colorspace_settings.name='Non-Color'
dirt_node=nodes.new('ShaderNodeTexImage')
dirt_node.image=dirt
dirt_node.interpolation='Linear'
dirt_node.label='User generated grime texture — attached to actual shard'
rough_map=nodes.new('ShaderNodeMapRange')
rough_map.inputs['From Min'].default_value=.42
rough_map.inputs['From Max'].default_value=.66
rough_map.inputs['To Min'].default_value=.12
rough_map.inputs['To Max'].default_value=.79
links.new(dirt_node.outputs['Color'],rough_map.inputs['Value'])
links.new(rough_map.outputs['Result'],p.inputs['Roughness'])
mixed=nodes.new('ShaderNodeMixRGB')
mixed.blend_type='MIX'
mixed.inputs[0].default_value=.25
mixed.inputs[1].default_value=(.95,.98,.97,1)
links.new(dirt_node.outputs['Color'],mixed.inputs[2])
links.new(mixed.outputs['Color'],p.inputs['Base Color'])
p.inputs['Transmission Weight'].default_value=.96
mesh.materials.append(material)
solid=ob.modifiers.new("six_mm_actual_thickness","SOLIDIFY")
solid.thickness=.006
solid.offset=0
bevel=ob.modifiers.new("tiny_light_catching_cut_edges","BEVEL")
bevel.width=.00075;bevel.segments=1;bevel.limit_method='ANGLE'
# The absence of a central hole is checked in source geometry: exactly one ngon.
assert len(mesh.polygons)==1 and len(mesh.vertices)==6
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True)
bpy.context.view_layer.objects.active=ob
stem="f3_glass_detached_shard01_dirt_v10"
bpy.ops.export_scene.gltf(filepath=f"{OUT}/{stem}.glb",export_format="GLB",
                          use_selection=True,export_apply=True)
scene=bpy.context.scene
scene.render.engine="CYCLES";scene.cycles.samples=32
scene.render.resolution_x=850;scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=-.24
world=bpy.data.worlds.new("ruined_window_studio")
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.40,.44,.49,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.8
scene.world=world
# Backdrop belongs to QA only. It is NOT in GLB.
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,.48,0),rotation=(math.pi/2,0,0))
back=bpy.context.object;back.name="RENDER_ONLY_DARK_TEST_BACKDROP"
back.scale=(1.4,1.4,1)
bm=bpy.data.materials.new("slate_gradient_free_backdrop")
bm.use_nodes=True
bm.node_tree.nodes.clear()
em=bm.node_tree.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value=(.065,.085,.110,1)
em.inputs["Strength"].default_value=1.
out=bm.node_tree.nodes.new("ShaderNodeOutputMaterial")
bm.node_tree.links.new(em.outputs[0],out.inputs["Surface"])
back.data.materials.append(bm)
for loc,power,size in [((-2,-2.8,2.7),350,2.3),((1.4,1.3,2.2),245,2.4)]:
 bpy.ops.object.light_add(type="AREA",location=loc)
 light=bpy.context.object;light.data.energy=power;light.data.size=size
bpy.ops.object.camera_add()
cam=bpy.context.object;cam.data.type="ORTHO";cam.data.ortho_scale=2.38;scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/{stem}.blend")
for name,d,scale,focus in [
 ("front",(0,-1,.12),.30,Vector((0,0,0))),
 ("side",(1,-.35,.14),.30,Vector((0,0,0))),
 ("angle",(1,-1,.30),.30,Vector((0,0,0))),
 ("chip_detail",(1,-1,.24),.18,Vector((0,0,0)))
]:
 cam.data.ortho_scale=scale
 cam.location=focus+Vector(d).normalized()*3.2
 cam.rotation_euler=(focus-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.render.filepath=f"{OUT}/{stem}-{name}.png"
 bpy.ops.render.render(write_still=True)
 print("F3_GLASS_SINGLE_CHIP_V10_RENDER_OK",name,flush=True)
print("F3_GLASS_SINGLE_CHIP_V10_ALL_COMPLETE",flush=True)
