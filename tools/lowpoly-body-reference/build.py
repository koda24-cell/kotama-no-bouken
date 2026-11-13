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
rings('01_HEAD',[(5.83,0,-.075,.08,.12),(5.94,0,-.055,.25,.27),(6.14,0,-.015,.37,.40),(6.32,0,.005,.44,.46),(6.53,0,.025,.48,.48),(6.76,0,.040,.45,.46),(6.92,0,.045,.31,.35),(7.00,0,.055,.10,.15)],12)
rings('02_NECK',[(5.52,0,.025,.16,.16),(5.75,0,.025,.17,.18),(5.93,0,.025,.19,.20)],8)
rings('03_TORSO_PELVIS',[(3.55,0,.015,.48,.33),(3.87,0,.005,.64,.37),(4.18,0,0,.58,.35),(4.45,0,0,.47,.32),(4.73,0,0,.35,.29),(5.12,0,0,.40,.36),(5.40,0,0,.57,.41),(5.61,0,0,.72,.42)],10)
# Arms: diagonal to wrists in front view, slightly backward in side view.
for side in [-1,1]:
 rings(('04_LEFT_ARM' if side<0 else '05_RIGHT_ARM'),[(3.36,side*1.72,.05,.11,.12),(3.65,side*1.57,.04,.13,.14),(4.10,side*1.22,.03,.14,.15),(4.56,side*.93,.01,.16,.18),(5.02,side*.70,0,.20,.21),(5.43,side*.55,0,.24,.23)],8)
 rings(('06_LEFT_HAND' if side<0 else '07_RIGHT_HAND'),[(3.08,side*1.79,.04,.11,.10),(3.35,side*1.72,.05,.13,.11)],8)
 # Front legs centered ~±.39; side view hip to ankle slightly forward.
 rings(('08_LEFT_LEG' if side<0 else '09_RIGHT_LEG'),[(.18,side*.37,.02,.11,.13),(.53,side*.37,.015,.12,.14),(1.03,side*.37,.03,.14,.17),(1.60,side*.39,.045,.19,.21),(2.15,side*.40,.06,.18,.20),(2.68,side*.41,.08,.24,.25),(3.25,side*.40,.07,.30,.28),(3.79,side*.38,.03,.32,.31)],8)
 rings(('10_LEFT_FOOT' if side<0 else '11_RIGHT_FOOT'),[(.04,side*.37,-.17,.20,.36),(.19,side*.37,-.10,.18,.32),(.42,side*.37,.01,.13,.17)],8)
# Ears as two low-poly faceted side lobes.
for side in [-1,1]:
 rings('EAR_'+str(side),[(6.12,side*.455,-.005,.105,.125),(6.33,side*.465,-.005,.11,.13),(6.48,side*.45,-.005,.07,.095)],8)
# Face profile is sculpted directly into the head mesh: visible nasal bridge/tip,
# posterior cranium, cheeks, tapered chin and jaw. No detached nose object.
head=bpy.data.objects['01_HEAD']
for v in head.data.vertices:
 x,y,z=v.co
 front=max(0,(-y+.03)/.50)
 mid=max(0,1-abs(x)/.20)
 if z>6.12 and z<6.55 and x*x<.06 and y<-.18:
  v.co.y-=.12*math.exp(-((z-6.28)/.18)**2)*mid*front
 if 6.04<z<6.30 and abs(x)<.12 and y<-.17:
  v.co.y-=.18*math.exp(-((z-6.15)/.085)**2)*mid*front
 if z<6.10:
  v.co.x*=.82
# Join all anatomically overlapping parts, voxel-union to remove open gaps
# at shoulder, hip, ear and neck; then decimate back to a low-poly silhouette.
parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.object.join()
head.name='LOWPOLY_UNIFIED_BODY'
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
rem=head.modifiers.new('Seamless_body_union','REMESH')
rem.mode='VOXEL';rem.voxel_size=.055
bpy.context.view_layer.objects.active=head
bpy.ops.object.modifier_apply(modifier=rem.name)
dec=head.modifiers.new('Low_poly_retopology','DECIMATE')
dec.decimate_type='COLLAPSE'
dec.ratio=min(1.0,650/max(1,len(head.data.polygons)))
bpy.ops.object.modifier_apply(modifier=dec.name)
for p in head.data.polygons:p.use_smooth=False
counts.clear()
counts['LOWPOLY_UNIFIED_BODY']=(len(head.data.vertices),len(head.data.polygons))
assert len([o for o in bpy.context.scene.objects if o.type=='MESH'])==1
# Pixel-calibrated two-view silhouette fitting from the traced Pinterest outlines.
# Front image x0=197; side image y-axis pixel center=442, front points to right.
# The lists are sampled from the visible contours; interpolate between landmarks.
PX=7.0/660.0
front_bounds=[
 (705,152,242),(654,158,229),(609,158,231),(555,154,237),
 (499,153,240),(456,148,250),(411,142,256),(370,134,261),
 (350,137,261),(319,145,251),(296,163,233),(270,169,225),
 (247,166,229),(221,158,237),(199,145,251),(179,167,228),
 (156,183,211),(125,163,227),(105,147,246),(93,152,243),
 (69,153,243),(47,168,226)]
# Include arms in outer front envelope from shoulder through hand.
arm_bounds=[(396,20,371),(367,30,353),(343,43,353),(313,67,331),
 (283,92,308),(250,117,269),(220,151,237),(193,145,251),(179,167,228)]
side_bounds=[
 (705,406,495),(663,407,467),(608,407,440),(555,410,452),
 (498,410,465),(463,413,467),(430,410,471),(386,405,475),
 (352,414,491),(321,414,502),(287,414,499),(251,413,491),
 (221,414,487),(195,412,452),(174,418,446),(156,421,447),
 (131,404,482),(117,389,482),(94,383,482),(70,387,474),
 (46,428,452)]
def interpolate(rows,pixel_y):
 rows=sorted(rows,key=lambda t:t[0])
 if pixel_y<=rows[0][0]:return rows[0][1:]
 if pixel_y>=rows[-1][0]:return rows[-1][1:]
 for i in range(len(rows)-1):
  y0,a0,b0=rows[i];y1,a1,b1=rows[i+1]
  if y0<=pixel_y<=y1:
   t=(pixel_y-y0)/(y1-y0)
   return a0+(a1-a0)*t,b0+(b1-b0)*t
def target_bounds(pixel_y):
 l,r=interpolate(front_bounds,pixel_y)
 if 179<=pixel_y<=396:
  al,ar=interpolate(arm_bounds,pixel_y)
  l=min(l,al);r=max(r,ar)
 back,forward=interpolate(side_bounds,pixel_y)
 return (l-197)*PX,(r-197)*PX,-(forward-442)*PX,-(back-442)*PX
# Fit each horizontal cross-section by normalizing against the current model's
# local envelope. This preserves a connected mesh and silhouette in both views.
original=[tuple(v.co) for v in head.data.vertices]
def envelope(z):
 neighbors=[p for p in original if abs(p[2]-z)<.085]
 if len(neighbors)<8:
  neighbors=sorted(original,key=lambda p:abs(p[2]-z))[:32]
 return (min(p[0] for p in neighbors),max(p[0] for p in neighbors),
         min(p[1] for p in neighbors),max(p[1] for p in neighbors))
for v,p in zip(head.data.vertices,original):
 x,y,z=p;py=705-z/PX
 xl,xr,yf,yb=target_bounds(py)
 oxl,oxr,oyf,oyb=envelope(z)
 if x>=0:
  v.co.x= x*xr/max(.03,oxr)
 else:
  v.co.x= x*abs(xl)/max(.03,abs(oxl))
 if y<0:
  v.co.y= y*abs(yf)/max(.03,abs(oyf))
 else:
  v.co.y= y*yb/max(.03,oyb)
# Do not change Z: reference front and side use exactly the same height scale.
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
