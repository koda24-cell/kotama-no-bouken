import bpy,math,os,sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=os.path.abspath(args[args.index('--out')+1]);os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
m=bpy.data.materials.new('neutral_solid');m.diffuse_color=(.68,.70,.73,1)
# X = front-view horizontal, Y = depth (negative = front), Z = height.
# Pixel calibration of 563x740 reference: ground y=705, top y=45 => H=660px=7 units.
# 1 model unit = 94.2857 reference pixels. Front center x=197; side ground x=415.
# These low-poly rings are explicitly located at visible orthographic edge-loop heights.
counts={}
def rings(name,rows,n=8):
 v=[];f=[]
 for z,cx,cy,rx,ry in rows:
  for k in range(n):
   a=2*math.pi*k/n
   v.append((cx+rx*math.cos(a),cy+ry*math.sin(a),z))
 for j in range(len(rows)-1):
  for k in range(n):
   a=j*n+k;b=j*n+(k+1)%n;f.append((a,b,b+n,a+n))
 f.append(tuple(reversed(tuple(range(n)))))
 f.append(tuple((len(rows)-1)*n+k for k in range(n)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],f);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(m)
 counts[name]=(len(v),len(f))
 return o
# Front widths are derived from silhouette: head 90px, shoulders 105px,
# waist 62px, hips 125px, ankles ~20px. Side depth at chest ~75px, hips ~62px.
rings('01_HEAD',[(5.88,0,0,.31,.29),(6.18,0,0,.42,.39),(6.55,0,0,.48,.40),(6.83,0,0,.46,.39),(7.00,0,0,.30,.31)],8)
rings('02_NECK',[(5.61,0,0,.13,.15),(5.82,0,0,.16,.16),(5.99,0,0,.15,.15)],8)
rings('03_TORSO_PELVIS',[(3.70,0,.015,.35,.31),(4.04,0,.005,.66,.34),(4.43,0,0,.55,.32),(4.73,0,0,.32,.27),(5.12,0,0,.33,.32),(5.40,0,0,.42,.38),(5.62,0,0,.56,.38)],8)
# Arms: diagonal to wrists in front view, slightly backward in side view.
for side in [-1,1]:
 rings(('04_LEFT_ARM' if side<0 else '05_RIGHT_ARM'),[(3.36,side*1.72,.05,.11,.12),(3.65,side*1.57,.04,.13,.14),(4.10,side*1.22,.03,.14,.15),(4.56,side*.93,.01,.16,.18),(5.02,side*.70,0,.20,.21),(5.43,side*.55,0,.24,.23)],8)
 rings(('06_LEFT_HAND' if side<0 else '07_RIGHT_HAND'),[(3.08,side*1.79,.04,.11,.10),(3.35,side*1.72,.05,.13,.11)],8)
 # Front legs centered ~±.39; side view hip to ankle slightly forward.
 rings(('08_LEFT_LEG' if side<0 else '09_RIGHT_LEG'),[(.18,side*.37,.02,.11,.13),(.53,side*.37,.015,.12,.14),(1.03,side*.37,.03,.14,.17),(1.60,side*.39,.045,.19,.21),(2.15,side*.40,.06,.18,.20),(2.68,side*.41,.08,.24,.25),(3.25,side*.40,.07,.30,.28),(3.79,side*.38,.03,.32,.31)],8)
 rings(('10_LEFT_FOOT' if side<0 else '11_RIGHT_FOOT'),[(.04,side*.37,-.17,.20,.36),(.19,side*.37,-.10,.18,.32),(.42,side*.37,.01,.13,.17)],8)
# Ears as two low-poly faceted side lobes.
for side in [-1,1]:
 rings('EAR_'+str(side),[(5.98,side*.48,0,.07,.09),(6.24,side*.49,0,.08,.10)],6)
# Material override creates solid clay; edge overlay is a separate Freestyle pass.
sc=bpy.context.scene
engines={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
sc.view_layers[0].material_override=m
sc.render.resolution_x=660;sc.render.resolution_y=850;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG'
sc.world.color=(.68,.68,.68)
for loc,power in [((4,-6,9),850),((-4,2,7),550)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=6
 o.rotation_euler=(Vector((0,0,3.4))-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc in [('front',(0,-18,3.5)),('right_side',(18,0,3.5)),('left_side',(-18,0,3.5)),('three_quarter',(12,-14,5))]:
 bpy.ops.object.camera_add(location=loc);cam=bpy.context.object
 cam.rotation_euler=(Vector((0,0,3.5))-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO';cam.data.ortho_scale=8.15;sc.camera=cam
 sc.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(cam,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'lowpoly_human.blend'))
with open(os.path.join(out,'topology.txt'),'w') as f:
 f.write('source_pin=878835314813441339\nengine='+sc.render.engine+'\n')
 for k,(v,p) in counts.items():f.write(f'{k}: vertices={v} polygons={p}\n')
 f.write('TOTAL_VERTICES='+str(sum(v for v,p in counts.values()))+'\nTOTAL_POLYGONS='+str(sum(p for v,p in counts.values()))+'\n')
