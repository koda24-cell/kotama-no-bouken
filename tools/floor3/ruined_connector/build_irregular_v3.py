"""V3: asymmetrically damaged stairs, continuous ramp, cracked landing, broken rails."""
import bpy,random,math
from mathutils import Vector
source=open('/work/tools/floor3/ruined_connector/build_irregular_v2.py',encoding='utf-8').read()
needle=" export('floor3_ruined_connector_'+kind+'_v2')"
assert source.count(needle)==1
patch=""" # V3 destructive wear on all three modules, keeping 2m connector endpoints.
 if kind=='stairs':
  for i in range(7):
   obj=bpy.data.objects.get('irregular fractured stair tread '+str(i))
   if not obj:continue
   rng=random.Random(390+i*19)
   # Different damage magnitude per tread: large missing corners on 1,4,6.
   severity=[.03,.27,.08,.13,.35,.05,.25][i]
   for v in obj.data.vertices:
    x,y,z=v.co
    if x>0.30 and y<(-.855+i*.285) and i in (1,4,6):
     v.co.x-=severity*(.4+rng.random())
     v.co.y+=severity*rng.random()*.32
    if x<-.3 and i in (2,5):
     v.co.x+=severity*rng.random()
    v.co.z+=rng.uniform(-.007,.007)
  # Bent and snapped railing portions; remove overly straight originals.
 elif kind=='ramp':
  for obj in list(bpy.context.scene.objects):
   if obj.type=='MESH' and obj.name.startswith('fragmented ramp slab'):
    bpy.data.objects.remove(obj,do_unlink=True)
  # One continuous inclined ramp mesh with chipped, asymmetric edges and gaps.
  rng=random.Random(108)
  rows=15;verts=[]
  for i in range(rows):
   t=i/(rows-1);y=-.94+1.88*t;z=-.39+.90*t
   left=-.80+rng.uniform(-.08,.09);right=.80-rng.uniform(0,.14)
   if i in (4,9):right-=.22
   if i==7:left+=.24
   verts.extend([(left,y,z-.055),(right,y,z-.055),(left,y,z+.055),(right,y,z+.055)])
  faces=[]
  for i in range(rows-1):
   a=i*4;b=(i+1)*4
   faces.extend([(a+2,a+3,b+3,b+2),(a,b,b+1,a+1),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
  faces.extend([(0,1,3,2),tuple(range((rows-1)*4,(rows-1)*4+4))])
  mesh=bpy.data.meshes.new('continuous cracked slope');mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new('single uneven continuous concrete ramp',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(stone)
  for i in (4,7,10):
   t=i/14;y=-.94+1.88*t;z=-.39+.90*t
   rod('ramp diagonal fracture',( -.52,y-.04,z+.056),(.35,y+.06,z+.056),.009,edge)
 elif kind=='landing':
  for obj in list(bpy.context.scene.objects):
   if obj.type=='MESH' and obj.name=='thin landing':
    bpy.data.objects.remove(obj,do_unlink=True)
  # Single polygon with missing right-front corner, jagged outline and fractured face.
  outline=[(-.82,-.95),(-.53,-.98),(-.22,-.91),(.20,-.95),(.39,-.85),(.34,-.58),(.64,-.45),(.81,-.30),(.78,.13),(.84,.55),(.72,.95),(.20,.91),(-.16,.97),(-.55,.91),(-.82,.74),(-.76,.26),(-.83,-.32)]
  n=len(outline);verts=[(x,y,z) for z in (.35,.46) for x,y in outline]
  faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
  faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
  mesh=bpy.data.meshes.new('broken landing slab');mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new('asymmetric cracked landing slab',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(stone)
  for a,b in [((-.65,-.78,.47),(-.21,-.19,.47)),((-.21,-.19,.47),(.28,.06,.47)),((.28,.06,.47),(.61,.37,.47)),((-.52,.64,.47),(-.13,.23,.47))]:
   rod('branching floor crack',a,b,.012,edge)
 # Break the long continuous handrails and kink one end.
 for obj in list(bpy.context.scene.objects):
  if obj.type=='MESH' and obj.name.startswith('sloped upper handrail'):
   bpy.data.objects.remove(obj,do_unlink=True)
 for side in (-1,1):
  x=side*.81
  rod('bent rusted rail lower',(x,-.85,.38),(x+side*.06,-.23,.69),.025,rust)
  if side==-1:
   rod('snapped rusted rail upper',(x-.07,.10,.82),(x-.22,.56,1.04),.023,rust)
  else:
   rod('hanging bent rail',(x+.03,.12,.80),(x+.23,.49,.54),.022,rust)
 export('floor3_ruined_connector_'+kind+'_v3')"""
source=source.replace(needle,patch).replace("FLOOR3_IRREGULAR_V2_COMPLETE","FLOOR3_IRREGULAR_V3_COMPLETE")
exec(compile(source,'irregular_stair_v3.py','exec'))
