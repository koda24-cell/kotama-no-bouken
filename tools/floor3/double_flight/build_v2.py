"""V2: wet overgrown aging pass over the V1 concrete switchback stair.
V1 source files and independently renderable V1 output remain unchanged.
"""
source=open('/work/tools/floor3/double_flight/build_v1.py',encoding='utf-8').read()
needle='# Lighting and orthographic views.'
assert source.count(needle)==1
patch=r"""
# === V2 damp, long-abandoned treatment ===================================
# Reduce toy-like chalky concrete; maintain consistent low-saturation palette.
for material in (concrete,edges,wet):
 for node in material.node_tree.nodes:
  if node.type=='VALTORGB':
   node.color_ramp.elements[0].color=(.090,.105,.085,1)
   node.color_ramp.elements[1].color=(.305,.319,.274,1)
for node in rust.node_tree.nodes:
 if node.type=='VALTORGB':
  node.color_ramp.elements[0].color=(.085,.039,.024,1)
  node.color_ramp.elements[1].color=(.28,.105,.057,1)
for material in (moss,lightmoss):
 for node in material.node_tree.nodes:
  if node.type=='VALTORGB':
   node.color_ramp.elements[0].color=(.035,.079,.025,1)
   node.color_ramp.elements[1].color=(.115,.23,.065,1)

# Broad vertical algae and rainwater streaks physically cling to pier faces,
# rather than decorative free-floating green pebble dots.
rng=random.Random(8197)
piers=[o for o in bpy.context.scene.objects
       if o.type=='MESH' and ('load-bearing concrete pier' in o.name)]
for pier in piers:
 ztop=pier.location.z+pier.dimensions.z*.5
 for i in range(12):
  x=pier.location.x+rng.uniform(-.13,.13)
  y=pier.location.y-pier.dimensions.y*.5-.007
  zlow=rng.uniform(.21, max(.30,ztop*.6))
  length=rng.uniform(.18,.76)
  stripe=cube('V2 weathering down pier face',
    (x,y,zlow),(.016,.008,length),moss if i%3 else wet,0)
  stripe.rotation_euler.y=rng.uniform(-.09,.09)
 # Dark green around the concrete joint where water pools and migrates.
 cube('V2 shaded damp base on pier',
   (pier.location.x,pier.location.y,.075),
   (pier.dimensions.x+.016,pier.dimensions.y+.016,.15),wet,.01)

# Rain streaks drip from both landing edges; damp patches hug slab faces.
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH' or 'heavy landing slab' not in obj.name:continue
 # Slightly uneven water staining concentrated on downward-facing edge.
 x,y,z=obj.location
 for i in range(9):
  xx=x+rng.uniform(-.85,.85)
  yy=y-1.031
  ztop=z+rng.uniform(-.075,.105)
  drip=cube('V2 dripping algae streak under landing lip',
    (xx,yy,ztop-rng.uniform(.025,.11)),
    (rng.uniform(.026,.085),.012,rng.uniform(.09,.28)),
    moss if i%3 else wet,.009)

# Thin moss seam strips nest in the joins of steps (not scattered fragments).
for ob in list(bpy.context.scene.objects):
 if ob.type!='MESH' or 'eroded cast concrete tread' not in ob.name: continue
 if rng.random()>.82:continue
 # Step-local geometry follows ob rotation through parent transform.
 along=Vector((math.cos(ob.rotation_euler.z),math.sin(ob.rotation_euler.z),0))
 offset=along*rng.uniform(-.38,.38)
 patch=cube('V2 irregular moisture strip across treads',
  (ob.location.x+offset.x,ob.location.y+offset.y,ob.location.z+.107),
  (rng.uniform(.15,.29),rng.uniform(.045,.09),.012),moss,.009)
 patch.rotation_euler.z=ob.rotation_euler.z

# Exposure balanced for dark concrete and moss: still legible in GLB previews.
"""
source=source.replace(needle,patch+'\n'+needle)
source=source.replace('f3_double_flight_stairs_v1','f3_double_flight_stairs_v2')
source=source.replace("print('F3_DOUBLE_FLIGHT_V1_COMPLETE'","print('F3_DOUBLE_FLIGHT_V2_COMPLETE'")
source=source.replace('1850,6','1100,6').replace('1400,6','850,6').replace('1100,5','680,5')
exec(compile(source,'f3_double_flight_v2.py','exec'))
