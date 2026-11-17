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
# V6: lower-saturation, deeper woodland greens with rare lighter accents.
leaves=[mat("leaf_deep",(0.036,.112,.039)),mat("leaf_mid",(0.055,.161,.053)),mat("leaf_lit",(0.095,.223,.083)),mat("leaf_sage",(0.066,.148,.075))]
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
 angle=2*math.pi*k/7+.15+R.uniform(-.25,.25)
 dist=.28+R.uniform(-.09,.12)
 points=[(.015,.0,.18),(.07*math.cos(angle),.07*math.sin(angle),.115),(.15*math.cos(angle),.15*math.sin(angle),.07),(.21*math.cos(angle),.21*math.sin(angle),.014),(dist*math.cos(angle),dist*math.sin(angle),-.022)]
 tube("tree_mature_root_%02d"%k,points,[.075,.07,.052,.025,.010],bark,12)
# Branches with side bends, taper and staggered elevations.
tips=[]
for i in range(13):
 a=2*math.pi*(i*.61803398875%1)+.25
 z=1.24+(i%6)*.185+R.uniform(-.085,.085)
 reach=.66+R.uniform(-.10,.24)
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
 # V15: curved broadleaf blade with a narrower pointed tip, raised midrib,
 # asymmetric margin and a gently cupped surface; no paper-square silhouette.
 width=size*(.34+R.uniform(-.045,.035))
 roll=R.uniform(-.04,.045)*size
 points=[c-axis*size*.62,
         c-axis*size*.15+side*width+normal*size*.035,
         c+axis*size*.66+side*roll,
         c-axis*size*.17-side*width*.86+normal*size*.045,
         c+normal*size*(.17+R.uniform(-.02,.045))]
 mesh=bpy.data.meshes.new(name+"_mesh");mesh.from_pydata(points,[],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),
                                                          (4,1,0),(4,2,1),(4,3,2),(4,0,3)]);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 mesh.materials.append(material)
 for p in mesh.polygons:p.use_smooth=True
 asset.append(ob);leaves_obj_count+=1
# V6: form 2–3 coherent leaf sprays anchored at EACH real branch position.
# A broad, single Gaussian per branch scattered the leaves as paper confetti.
for ti,tip in enumerate(tips):
 radial=Vector((tip.x-.06,tip.y,0))
 if radial.length<.03:radial=Vector((R.uniform(-1,1),R.uniform(-1,1),0))
 radial.normalize()
 sprays=2+(1 if ti%4==0 else 0)
 for spray in range(sprays):
  theta=(spray-(sprays-1)*.5)*.75+R.uniform(-.25,.25)
  direction=Vector((radial.x*math.cos(theta)-radial.y*math.sin(theta),
                    radial.x*math.sin(theta)+radial.y*math.cos(theta),0))
  cluster_center=tip+direction*(.045+R.uniform(0,.055))+Vector((0,0,R.uniform(-.04,.065)))
  count=16 if spray==0 else 12
  for n in range(count):
   along=R.gauss(0,.045)
   perp=R.gauss(0,.035)
   height=R.gauss(0,.035)
   perpendicular=Vector((-direction.y,direction.x,0))
   center=cluster_center+direction*along+perpendicular*perp+Vector((0,0,height))
   size=R.uniform(.070,.110)
   az=math.atan2(direction.y,direction.x)+R.uniform(-.43,.43)
   leaf("tree_mature_leaf_%04d"%leaves_obj_count,center,size,
        (az,R.uniform(-.12,.37)),leaves[R.choices([0,1,2,3],weights=[38,36,13,13])[0]])
# V7: secondary inner-branch bridges soften stacked shelf-like leaf silhouettes.
# Supplement V6 sprays rather than replacing original foliage or woody meshes.
for ti,tip in enumerate(tips):
 if ti%3: continue
 toward_center=Vector((-.11*tip.x,-.11*tip.y,.085+R.uniform(-.05,.08)))
 core=tip+toward_center
 for n in range(17):
  center=core+Vector((R.gauss(0,.09),R.gauss(0,.09),R.gauss(0,.095)))
  direction=Vector((center.x,center.y,.12))
  az=math.atan2(direction.y,direction.x)+R.uniform(-.6,.6)
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,center,R.uniform(.066,.1),
       (az,R.uniform(-.1,.42)),leaves[R.choices([0,1,2,3],weights=[36,41,14,9])[0]])
# Break up the bare spear-shaped trunk tip with irregular small terminal shoots.
for ti in range(5):
 az=ti*math.tau/5+.35
 base=Vector((.025*math.cos(az),.025*math.sin(az),2.58+R.uniform(-.045,.06)))
 for n in range(15):
  center=base+Vector((R.gauss(0,.095),R.gauss(0,.095),R.gauss(0,.065)))
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,center,R.uniform(.058,.084),
       (az+R.uniform(-.6,.6),R.uniform(-.05,.4)),leaves[R.randrange(3)])
# V8: terminal branchlets replace the bare-stick impression without deleting
# the source trunk. They carry their own layered leaf clusters.
for k in range(9):
 az=k*math.tau/9+.29
 origin=Vector((.024*math.cos(az),.024*math.sin(az),2.33+R.uniform(-.06,.20)))
 spread=.23+R.uniform(.035,.15)
 elbow=origin+Vector((math.cos(az)*spread*.55,math.sin(az)*spread*.55,.09))
 end=origin+Vector((math.cos(az)*spread,math.sin(az)*spread,.16+R.uniform(-.08,.09)))
 tube("tree_mature_crown_terminal_%02d"%k,[tuple(origin),tuple(elbow),tuple(end)],
      [.017,.011,.0025],twig,7)
 for j,center_base in enumerate((elbow,end)):
  for n in range(22 if j else 15):
   center=center_base+Vector((R.gauss(0,.077),R.gauss(0,.077),R.gauss(0,.075)))
   leaf("tree_mature_leaf_%04d"%leaves_obj_count,center,R.uniform(.062,.095),
        (az+R.uniform(-.6,.6),R.uniform(-.2,.42)),
        leaves[R.choices([0,1,2,3],weights=[32,43,17,8])[0]])
# V9: asymmetric intermediate crowns, gently drooping leaf sprays and
# bifurcating top shoots. Additive only: original geometry remains intact.
for i in range(11):
 a=i*2.399963+R.uniform(-.2,.2)
 z=1.65+R.uniform(0,.82)
 radius=R.uniform(.14,.48)
 base=Vector((.08*math.sin(z*1.4),.025,z))
 knee=base+Vector((math.cos(a)*radius*.55,math.sin(a)*radius*.55,.12))
 end=base+Vector((math.cos(a)*radius,math.sin(a)*radius,.14+R.uniform(-.1,.11)))
 tube("tree_mature_v9_bridge_branch_%02d"%i,[tuple(base),tuple(knee),tuple(end)],
      [.024,.014,.002],twig,8)
 for n in range(34):
  t=R.uniform(.55,1.18)
  anchor_point=knee.lerp(end,min(1,t))
  off=Vector((R.gauss(0,.087),R.gauss(0,.083),R.gauss(-.025,.068)))
  pos=anchor_point+off
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,pos,R.uniform(.058,.087),
       (a+R.uniform(-.62,.62),R.uniform(-.25,.30)),leaves[R.choices([0,1,2,3],weights=[43,41,10,6])[0]])
# Bark-covered uneven buttress collars make the star-like straight root seams
# less apparent without removing the existing seven exposed roots.
for i in range(7):
 a=(i+.13)*math.tau/7+R.uniform(-.23,.23)
 length=.18+R.uniform(.01,.09)
 stem=Vector((.028*math.cos(a),.028*math.sin(a),.24))
 mid=Vector((.105*math.cos(a),.105*math.sin(a),.115))
 outer=Vector((length*math.cos(a),length*math.sin(a),-.014))
 tube("tree_mature_v9_root_flare_%02d"%i,[tuple(stem),tuple(mid),tuple(outer)],
      [.071,.075,.006],bark,11)
# V10: add a multi-directional living crown above the prior visible trunk tip.
# Existing trunk stays present; fine shoots and foliage occlude its spear.
for k in range(12):
 a=k*math.tau/12+R.uniform(-.18,.18)
 at=Vector((.008*math.cos(a),.025+.009*math.sin(a),2.53+R.uniform(-.055,.035)))
 length=.13+R.uniform(.06,.20)
 bend=at+Vector((math.cos(a)*length*.5,math.sin(a)*length*.5,.06))
 end=at+Vector((math.cos(a)*length,math.sin(a)*length,.11+R.uniform(-.02,.11)))
 tube("tree_mature_v10_crown_fork_%02d"%k,[tuple(at),tuple(bend),tuple(end)],
      [.013,.009,.002],twig,7)
 for n in range(36):
  bas=R.choice([bend,end])
  ctr=bas+Vector((R.gauss(0,.067),R.gauss(0,.067),R.gauss(0,.065)))
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,ctr,R.uniform(.058,.096),
       (a+R.uniform(-.8,.8),R.uniform(-.15,.46)),
       leaves[R.choices([0,1,2,3],weights=[42,39,13,6])[0]])
# V11: mid-crown off-axis sprays bridge rigid shelf layers.
for i in range(8):
 a=2.3999632*i+.48
 level=1.72+R.uniform(0,.75)
 reach=.27+R.uniform(0,.2)
 base=Vector((.06*math.sin(level),.025,level))
 mid=base+Vector((math.cos(a)*reach*.52,math.sin(a)*reach*.52,.075))
 end=base+Vector((math.cos(a)*reach,math.sin(a)*reach,.08+R.uniform(-.07,.08)))
 tube("tree_mature_v11_connecting_twigs_%02d"%i,[tuple(base),tuple(mid),tuple(end)],
      [.020,.012,.002],twig,7)
 for n in range(21):
  anchor=mid.lerp(end,R.uniform(.35,1.0))
  ctr=anchor+Vector((R.gauss(0,.065),R.gauss(0,.07),R.gauss(0,.07)))
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,ctr,R.uniform(.06,.094),
       (a+R.uniform(-.6,.6),R.uniform(-.24,.40)),
       leaves[R.choices([0,1,2,3],weights=[44,37,12,7])[0]])
# V12: zelkova/oak broadleaf crown. Dominant volume ABOVE the main trunk,
# unlike earlier horizontal tiers. The existing V1–V11 geometry is retained.
# Fourteen irregular upper lobes: rising wooden forks with overlapping leaf sprays.
for lobe in range(14):
 a=math.tau*(lobe*0.61803398875%1)+R.uniform(-.17,.17)
 ring=lobe%3
 distance=(.38,.72,.92)[ring]+R.uniform(-.07,.085)
 crown_z=(2.89,2.70,2.48)[ring]+R.uniform(-.10,.16)
 base=Vector((.06*math.sin(crown_z),.035,2.22+R.uniform(-.08,.22)))
 bend=base+Vector((distance*.46*math.cos(a),distance*.46*math.sin(a),.20))
 tip=Vector((distance*math.cos(a),distance*math.sin(a),crown_z))
 tube("tree_mature_v12_upward_fork_%02d"%lobe,[tuple(base),tuple(bend),tuple(tip)],
      [.031,.019,.003],bark,9)
 # Leaf sprays are concentrated around a woody scaffold and overlap neighbors.
 for micro in range(3):
  from_tip=(micro-1)*.075
  center=tip+Vector((R.gauss(0,.074)+from_tip*math.cos(a),
                     R.gauss(0,.07)+from_tip*math.sin(a),
                     R.gauss(0,.055)+R.uniform(-.04,.04)))
  for n in range(42 if ring!=2 else 34):
   radial=R.gauss(0,.105 if ring==0 else .115)
   lateral=R.gauss(0,.087)
   rise=R.gauss(0,.094 if ring==0 else .083)
   leaf_center=center+Vector((radial*math.cos(a)-lateral*math.sin(a),
                             radial*math.sin(a)+lateral*math.cos(a),rise))
   leaf("tree_mature_leaf_%04d"%leaves_obj_count,leaf_center,
        R.uniform(.065,.106),
        (a+R.uniform(-.9,.9),R.uniform(-.30,.55)),
        leaves[R.choices([0,1,2,3],weights=[41,40,13,6])[0]])
# Smaller crown cap above the original tip: asymmetrically dome-shaped,
# leaves still individually formed; no solid sphere or original mesh deletion.
for cap in range(6):
 a=math.tau*cap/6+.24
 cap_center=Vector((.17*math.cos(a),.15*math.sin(a),3.00+R.uniform(-.035,.14)))
 for n in range(45):
  p=cap_center+Vector((R.gauss(0,.10),R.gauss(0,.10),R.gauss(0,.073)))
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,p,R.uniform(.062,.092),
       (a+R.uniform(-.7,.7),R.uniform(-.20,.42)),
       leaves[R.choices([0,1,2,3],weights=[43,41,10,6])[0]])
# V13: overlapping flank clusters at mid-height tie earlier shelf branches
# into the new broadleaf crown. Irregular asymmetry avoids a perfect ball.
for k in range(8):
 az=math.tau*(k*.6180339887%1)+.33
 elevation=2.23+R.uniform(-.15,.17)
 radial=.51+R.uniform(.04,.24)
 trunk_point=Vector((.08,.03,elevation-.19))
 twig_end=Vector((math.cos(az)*radial,math.sin(az)*radial,elevation))
 twig_mid=trunk_point.lerp(twig_end,.55)+Vector((0,0,.07))
 tube("tree_mature_v13_flank_connector_%02d"%k,
      [tuple(trunk_point),tuple(twig_mid),tuple(twig_end)],
      [.021,.013,.003],twig,8)
 for n in range(59):
  c=twig_end+Vector((R.gauss(0,.13),R.gauss(0,.11),R.gauss(0,.13)))
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,c,R.uniform(.067,.101),
       (az+R.uniform(-.8,.8),R.uniform(-.21,.39)),
       leaves[R.choices([0,1,2,3],weights=[41,43,11,5])[0]])
# V14: overlapping interior broadleaf crown pads between old branch tiers
# and the main upper canopy; keeps original branches and prior leaf meshes.
for pad in range(12):
 a=math.tau*((pad*.754877666)%1)+R.uniform(-.1,.1)
 d=(.18,.39,.61)[pad%3]+R.uniform(-.07,.07)
 z=(2.38,2.48,2.30)[pad%3]+R.uniform(-.10,.12)
 core=Vector((d*math.cos(a),d*math.sin(a),z))
 # Smaller local twigs help leaves grow from structure, not float unsupported.
 root=Vector((core.x*.34,core.y*.34,z-.16))
 middle=root.lerp(core,.62)+Vector((0,0,.07))
 tube("tree_mature_v14_crown_interior_%02d"%pad,
      [tuple(root),tuple(middle),tuple(core)],[.018,.011,.002],twig,8)
 for n in range(73):
  p=core+Vector((R.gauss(0,.104),R.gauss(0,.101),R.gauss(0,.117)))
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,p,
       R.uniform(.061,.10),
       (a+R.uniform(-.7,.7),R.uniform(-.18,.44)),
       leaves[R.choices([0,1,2,3],weights=[43,39,13,5])[0]])
# V15: a small number of structural *visible branch forks*, not thousands
# of additional floating leaves. Connect the former shelf layers to the upper
# crown. Sprays are attached to the fork tips and inherit branch orientation.
for i in range(10):
 az=math.tau*((i*.6180339887)%1)+R.uniform(-.14,.14)
 base_z=1.67+R.uniform(-.17,.26)
 base=Vector((.10*math.sin(base_z),.04,base_z))
 mid=base+Vector((.32*math.cos(az),.32*math.sin(az),.33+R.uniform(-.05,.12)))
 tip=mid+Vector((.28*math.cos(az+.20),.28*math.sin(az+.20),.30+R.uniform(-.08,.10)))
 tube("tree_mature_v15_main_fork_%02d"%i,[tuple(base),tuple(mid),tuple(tip)],
      [.048,.029,.004],bark,10)
 for j in range(3):
  fan=az+(j-1)*.57+R.uniform(-.12,.12)
  branch_tip=tip+Vector((math.cos(fan)*(.13+R.uniform(0,.10)),
                         math.sin(fan)*(.13+R.uniform(0,.10)),
                         R.uniform(-.075,.11)))
  tube("tree_mature_v15_branchlet_%02d_%02d"%(i,j),
       [tuple(mid.lerp(tip,.62)),tuple(tip),tuple(branch_tip)],
       [.010,.006,.002],twig,7)
  for n in range(18):
   # Small overlapping edge clusters rather than expanding total crown uniformly.
   ctr=branch_tip+Vector((R.gauss(0,.064),R.gauss(0,.073),R.gauss(0,.086)))
   leaf("tree_mature_leaf_%04d"%leaves_obj_count,ctr,R.uniform(.065,.096),
        (fan+R.uniform(-.57,.57),R.uniform(-.26,.44)),
        leaves[R.choices([0,1,2,3],weights=[46,39,10,5])[0]])
# V16: asymmetric climbing boughs from the middle trunk to the
# underside of the upper broadleaf crown. These make the lower tiers belong
# to the same tree rather than isolated horizontal leaf shelves.
for i in range(8):
 phi=math.tau*((i*.61803398875)%1)+R.uniform(-.20,.20)
 z=1.42+R.uniform(-.07,.30)
 reach=.53+R.uniform(.10,.25)
 base=Vector((.10*math.sin(z*1.3),.02,z))
 shoulder=base+Vector((.23*math.cos(phi),.23*math.sin(phi),.28))
 upper=base+Vector((reach*.74*math.cos(phi+.09),reach*.74*math.sin(phi+.09),.57))
 tip=base+Vector((reach*math.cos(phi+.12),reach*math.sin(phi+.12),.71+R.uniform(-.07,.12)))
 tube("tree_mature_v16_climbing_bough_%02d"%i,
      [tuple(base),tuple(shoulder),tuple(upper),tuple(tip)],
      [.051,.038,.017,.003],bark,10)
 for j in range(2):
  end=tip+Vector((math.cos(phi+(j-.5)*.57)*.17,
                  math.sin(phi+(j-.5)*.57)*.17,
                  R.uniform(-.05,.12)))
  tube("tree_mature_v16_upper_twigs_%02d_%02d"%(i,j),
       [tuple(upper),tuple(tip),tuple(end)],
       [.012,.008,.002],twig,8)
  for n in range(19):
   pos=end+Vector((R.gauss(0,.075),R.gauss(0,.072),R.gauss(0,.080)))
   leaf("tree_mature_leaf_%04d"%leaves_obj_count,pos,R.uniform(.060,.096),
        (phi+R.uniform(-.55,.55),R.uniform(-.22,.42)),
        leaves[R.choices([0,1,2,3],weights=[44,41,10,5])[0]])
# V17: restrained drooping secondary shoots on the crown perimeter.
# Each shoot physically emerges from a principal limb and carries a small,
# uneven terminal spray. Preserve all previous geometry; avoid blanket leaf fill.
for k in range(7):
 az=math.tau*((k*.61803398875)%1)+.41
 height=2.35+R.uniform(-.07,.24)
 origin=Vector((.33*math.cos(az),.33*math.sin(az),height))
 elbow=Vector((.60*math.cos(az+.08),.60*math.sin(az+.08),height+.045))
 end=Vector((.77*math.cos(az+.16),.77*math.sin(az+.16),height-.14-R.uniform(0,.09)))
 tube("tree_mature_v17_drooping_shoot_%02d"%k,
      [tuple(origin),tuple(elbow),tuple(end)],
      [.014,.009,.002],twig,8)
 for j in range(15):
  t=R.uniform(.45,1.0)
  anchor_point=elbow.lerp(end,t)
  pos=anchor_point+Vector((R.gauss(0,.043),R.gauss(0,.045),R.gauss(0,.056)))
  leaf("tree_mature_leaf_%04d"%leaves_obj_count,pos,
       R.uniform(.060,.088),
       (az+R.uniform(-.48,.48),R.uniform(-.33,.16)),
       leaves[R.choices([0,1,2,3],weights=[45,41,9,5])[0]])
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
 ca.type="ORTHO";ca.ortho_scale=4.30
 scene.camera=ob;scene.render.filepath=str((OUT/(name+".png")).resolve())
 bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((OUT/"tree_mature.blend").resolve()))
files=[]
for p in sorted(OUT.iterdir()):
 if p.suffix in (".glb",".png",".blend"):
  files.append(dict(name=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
manifest=dict(asset_id="tree_mature",version="V17",status="NOT_APPROVED",game_integration="NOT_INTEGRATED",
              source="tools/floor6/tree_mature_v1.py",source_sha=os.getenv("GITHUB_SHA","local"),
              render_run_id=os.getenv("GITHUB_RUN_ID","local"),footprint_m=[1,1],height_m=2.72,
              roots=7,main_branches=13,leaf_meshes=leaves_obj_count,files=files)
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("F6_TREE_MATURE_DONE",len(asset),leaves_obj_count)
