# F6 flower garden — tree_mature V1; procedural, review only.
import bpy, math, random, json, hashlib, os
from mathutils import Vector, noise
from pathlib import Path
R=random.Random(6251117)
OUT=Path("render-output/floor6/nature/tree_mature")
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=850
scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="Standard"
scene.world.use_nodes=True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value=(.39,.42,.44,1)
def mat(name,c,rough=1):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*c,1)
 p.inputs["Roughness"].default_value=rough
 return m
bark=mat("aged_bark",(0.235,.168,.112))
twig=mat("twigs",(0.24,.175,.118))
leaves=[mat("leaf_deep",(0.085,.23,.085)),mat("leaf_mid",(0.125,.30,.105)),mat("leaf_lit",(0.175,.36,.13)),mat("leaf_sage",(0.15,.27,.16))]
# A packed, hand-generated bark normal texture for glTF transport.
def bark_normal(m):
 img=bpy.data.images.new("tree_mature_bark_normal",width=256,height=256,alpha=True)
 px=[]
 for y in range(256):
  for x in range(256):
   u=x/256;v=y/256
   dx=.11*math.sin(u*math.tau*15+math.sin(v*17)*.7)+.05*math.sin(u*math.tau*39+v*6)
   dy=.018*math.sin(v*math.tau*8+u*math.tau*4)
   length=math.sqrt(dx*dx+dy*dy+1)
   px.extend([.5-dx/(2*length),.5-dy/(2*length),.5+1/(2*length),1])
 img.pixels[:]=px;img.colorspace_settings.name="Non-Color";img.pack()
 nodes=m.node_tree.nodes
 tex=nodes.new("ShaderNodeTexImage");tex.image=img
 normal=nodes.new("ShaderNodeNormalMap")
 normal.inputs["Strength"].default_value=.62
 m.node_tree.links.new(tex.outputs["Color"],normal.inputs["Color"])
 m.node_tree.links.new(normal.outputs["Normal"],nodes.get("Principled BSDF").inputs["Normal"])
bark_normal(bark)
# Packed custom bark ALBEDO, painted procedural veins—not copied Pinterest pixels.
img=bpy.data.images.new("tree_mature_bark_albedo_v4",width=256,height=256,alpha=True)
pixels=[]
for y in range(256):
 for x in range(256):
  u=x/256;v=y/256
  crack=abs(math.sin(u*math.tau*13+math.sin(v*16)*.45))
  deep=(1.0-crack)**7
  grain=.08*math.sin(u*math.tau*45+v*14)*math.sin(v*55+u*17)
  val=max(.48,min(1.22,1.0-.27*deep+grain))
  pixels.extend([.25*val,.188*val,.125*val,1])
img.pixels[:]=pixels;img.pack()
node=bark.node_tree.nodes.new("ShaderNodeTexImage");node.image=img
bark.node_tree.links.new(node.outputs["Color"],bark.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
asset=[]
def tube(name,points,radii,material,radial=10):
 # ring-based tapered joined mesh, avoids disconnected cylinder seams.
 verts=[];faces=[]
 for i,p in enumerate(points):
  p=Vector(p)
  tangent=(Vector(points[min(len(points)-1,i+1)])-Vector(points[max(0,i-1)])).normalized()
  cross=tangent.cross(Vector((0,0,1)))
  if cross.length<.01:cross=tangent.cross(Vector((0,1,0)))
  cross.normalize()
  bit=tangent.cross(cross).normalized()
  for j in range(radial):
   angle=2*math.pi*j/radial
   ridge=1+.065*math.sin(j*2.8+i*.9)+.038*math.sin(j*6.1+i*1.6)+.04*math.sin(angle*9.0+i*.21)+.025*math.sin(angle*17+i*.43)
   verts.append(tuple(p+radii[i]*ridge*(cross*math.cos(angle)+bit*math.sin(angle))))
  if i:
   for j in range(radial):
    a=(i-1)*radial+j;b=(i-1)*radial+(j+1)%radial;c=i*radial+(j+1)%radial;d=i*radial+j
    faces.append((a,b,c,d))
 faces.extend([tuple(reversed(tuple(range(radial)))),tuple((len(points)-1)*radial+j for j in range(radial))])
 mesh=bpy.data.meshes.new(name+"_mesh");mesh.from_pydata(verts,[],faces);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 ob.data.materials.append(material)
 for face in mesh.polygons:face.use_smooth=True
 # UV: cylinder coordinate follows ring and tangent, seamless around circumference
 uv=mesh.uv_layers.new(name="TrunkUV")
 for f in mesh.polygons:
  for li in f.loop_indices:
   vi=mesh.loops[li].vertex_index
   ring=vi//radial;j=vi%radial
   uv.data[li].uv=(j/radial,ring/max(1,len(points)-1))
 asset.append(ob)
 return ob
# Main crooked trunk: 2.7 metres high in a one-metre footprint.
trunk=[(0,0,.015),(.017,-.014,.22),(.04,-.035,.53),(.085,-.04,.91),(.12,-.02,1.31),(.11,.025,1.69),(.055,.055,2.05),(.025,.045,2.43),(0,.045,2.72)]
tube("tree_mature_main_trunk",trunk,[.18,.172,.15,.132,.112,.089,.066,.041,.014],bark,16)
# Surface roots go down to the terrain and converge naturally at lower trunk.
for k in range(7):
 angle=2*math.pi*k/7+.15
 dist=.33+R.uniform(-.06,.09)
 points=[(.015,.0,.18),(.07*math.cos(angle),.07*math.sin(angle),.115),(.15*math.cos(angle),.15*math.sin(angle),.07),(.25*math.cos(angle),.25*math.sin(angle),.029),(dist*math.cos(angle),dist*math.sin(angle),.012)]
 tube("tree_mature_root_%02d"%k,points,[.075,.07,.052,.020,.005],bark,12)
# Branches with side bends, taper and staggered elevations.
tips=[]
for i in range(13):
 a=2*math.pi*(i*.61803398875%1)+.25
 z=1.24+(i%6)*.185+R.uniform(-.085,.085)
 reach=.62+R.uniform(-.10,.22)
 anchor=(.08*math.sin(z*1.4),.025,z)
 bends=[anchor,(anchor[0]+reach*.23*math.cos(a),anchor[1]+reach*.23*math.sin(a),z+.17),
        (anchor[0]+reach*.59*math.cos(a+.13),anchor[1]+reach*.59*math.sin(a+.13),z+.27),
        (anchor[0]+reach*math.cos(a+.09),anchor[1]+reach*math.sin(a+.09),z+.32+R.uniform(-.09,.18))]
 tube("tree_mature_main_branch_%02d"%i,bends,[.068,.053,.029,.007],bark,9)
 tips.append(Vector(bends[-1]))
 # Each major branch carries leaves along its length, not just at its final tip.
 tips.append(Vector(bends[2]) + Vector((0,0,.075)))
 tips.append(Vector(bends[1]) + Vector((0,0,.14)))
 # Secondary branch fans create open canopy rather than a solid sphere.
 for j in range(3):
  bend=Vector(bends[2])
  phi=a+(j-1)*.55+R.uniform(-.18,.18)
  length=.22+R.uniform(0,.16)
  p1=bend+Vector((math.cos(phi)*length*.48,math.sin(phi)*length*.48,.08))
  end=bend+Vector((math.cos(phi)*length,math.sin(phi)*length,.13+R.uniform(0,.12)))
  tube("tree_mature_secondary_%02d_%02d"%(i,j),[tuple(bend),tuple(p1),tuple(end)],[.019,.012,.003],twig,7)
  tips.append(end)
  tips.append(p1 + Vector((0,0,.045)))
# Leaf cards: curved double-sided almond leaves; no large opaque ball meshes.
leaves_obj_count=0
def leaf(name,center,size,rotation,material):
 global leaves_obj_count
 c=Vector(center)
 az,tilt=rotation
 axis=Vector((math.cos(az),math.sin(az),tilt)).normalized()
 side=Vector((-math.sin(az),math.cos(az),0)).normalized()
 normal=axis.cross(side).normalized()
 points=[c-axis*size*.55,
         c-axis*size*.1+side*size*.31+normal*size*.08,
         c+axis*size*.55,
         c-axis*size*.1-side*size*.31+normal*size*.08,
         c+normal*size*.095]
 mesh=bpy.data.meshes.new(name+"_mesh");mesh.from_pydata(points,[],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),
                                                          (4,1,0),(4,2,1),(4,3,2),(4,0,3)]);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 mesh.materials.append(material)
 for p in mesh.polygons:p.use_smooth=True
 asset.append(ob);leaves_obj_count+=1
for ti,tip in enumerate(tips):
 # Loose groups of leaves along twigs, leaving background visible between groups.
 for n in range(17 if ti%3 else 23):
  off=Vector((R.gauss(0,.085),R.gauss(0,.085),R.gauss(0,.07)))
  center=tip+off
  size=R.uniform(.056,.092)
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,center,size,
       (R.uniform(-math.pi,math.pi),R.uniform(-.15,.45)),leaves[R.randrange(len(leaves))])
# Export the actual foliage and woody meshes only, without environment or light.
bpy.ops.object.select_all(action="DESELECT")
for ob in asset:ob.select_set(True)
bpy.context.view_layer.objects.active=asset[0]
bpy.ops.export_scene.gltf(filepath=str((OUT/"tree_mature.glb").resolve()),export_format="GLB",use_selection=True)
bpy.ops.object.select_all(action="DESELECT")
# Review-only neutral floor plane and studio lights.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.045))
floor=bpy.context.object;floor.name="REVIEW_ONLY_GROUND";floor.scale=(2.4,2.4,.08)
floor.data.materials.append(mat("review_only_ground",(.32,.36,.27)))
for name,pos,energy,size in [("key",(3,-4,6),570,4.5),("fill",(-3,2,4),410,5)]:
 ld=bpy.data.lights.new(name,"AREA");ob=bpy.data.objects.new(name,ld)
 bpy.context.collection.objects.link(ob);ob.location=pos;ld.energy=energy;ld.size=size
for name,pos in [("front",(0,-6,3.1)),("side",(6,0,3.0)),("angle",(4,-6,4.1)),("top",(0,-.01,7))]:
 ca=bpy.data.cameras.new(name);ob=bpy.data.objects.new("review_camera_"+name,ca)
 bpy.context.collection.objects.link(ob);ob.location=pos
 ob.rotation_euler=(Vector((0,0,1.40))-ob.location).to_track_quat("-Z","Y").to_euler()
 ca.type="ORTHO";ca.ortho_scale=3.75
 scene.camera=ob;scene.render.filepath=str((OUT/(name+".png")).resolve())
 bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((OUT/"tree_mature.blend").resolve()))
files=[]
for p in sorted(OUT.iterdir()):
 if p.suffix in (".glb",".png",".blend"):
  files.append(dict(name=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
manifest=dict(asset_id="tree_mature",version="V4",status="NOT_APPROVED",game_integration="NOT_INTEGRATED",
              source="tools/floor6/tree_mature_v1.py",source_sha=os.getenv("GITHUB_SHA","local"),
              render_run_id=os.getenv("GITHUB_RUN_ID","local"),footprint_m=[1,1],height_m=2.72,
              roots=7,main_branches=13,leaf_meshes=leaves_obj_count,files=files)
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("F6_TREE_MATURE_DONE",len(asset),leaves_obj_count)
