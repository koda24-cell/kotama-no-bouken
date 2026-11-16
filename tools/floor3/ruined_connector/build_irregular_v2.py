"""V2 fractured, irregular concrete stairs; preserve V1 independently."""
source=open('/work/tools/floor3/ruined_connector/build.py',encoding='utf-8').read()
needle=" build(kind);export('floor3_ruined_connector_'+kind)"
assert source.count(needle)==1
patch=""" build(kind)
 if kind=='stairs':
  # Replace the box-shaped treads with jagged, nonrectangular stone slabs.
  for obj in list(bpy.context.scene.objects):
   if obj.type=='MESH' and obj.name.startswith('worn thin concrete tread'):
    bpy.data.objects.remove(obj,do_unlink=True)
  for i in range(7):
   rng=random.Random(20261115+i*13)
   y=-.855+i*.285;z=-.39+i*.137
   left=-.81+rng.uniform(-.05,.08)
   right=.81+rng.uniform(-.12,.04)
   front=y-.13;back=y+.13
   outline=[(left,front+.035),(left+.12,front+rng.uniform(-.03,.04)),(-.36,front+rng.uniform(-.05,.06)),(.12,front+rng.uniform(-.055,.045)),(right-.16,front+rng.uniform(-.06,.05)),(right,front+.09),(right-rng.uniform(.01,.10),back-.015),(.28,back+rng.uniform(-.04,.03)),(-.31,back+rng.uniform(-.04,.03)),(left+.035,back-.03)]
   # The entire perimeter is irregular, not simply beveled cube edges.
   verts=[(x,yy,z+dz) for dz in (-.048,.048) for x,yy in outline]
   n=len(outline);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
   faces += [(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
   mesh=bpy.data.meshes.new('fractured tread geometry');mesh.from_pydata(verts,[],faces);mesh.update()
   obj=bpy.data.objects.new('irregular fractured stair tread '+str(i),mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(stone)
   if i in (1,3,5):
    for j in range(3):
     x=rng.choice([-1,1])*rng.uniform(.54,.75)
     rubble('exposed aggregate chip',(x,y+rng.uniform(-.09,.09),z+.02),(.045,.035,.045),edge)
     rod('exposed rusty reinforcement',(x,y,z-.02),(x+rng.uniform(-.07,.07),y+rng.uniform(.07,.16),z-.07),.012,rust)
  # Add slender supporting stringers rather than solid triangular side walls.
  for x in (-.70,.70):
   rod('slim diagonal stair stringer',(x,-.96,-.49),(x,.96,.49),.036,rust)
  # Shift loose debris to the actual tread elevation instead of floating.
  for obj in bpy.context.scene.objects:
   if obj.name.startswith('loose concrete chip') or obj.name.startswith('moss seam'):
    yy=obj.location.y
    index=max(0,min(6,round((yy+.855)/.285)))
    obj.location.z=-.39+index*.137+.06
 export('floor3_ruined_connector_'+kind+'_v2')"""
source=source.replace(needle,patch).replace("print('FLOOR3_CONNECTOR_RENDER_COMPLETE')","print('FLOOR3_IRREGULAR_V2_COMPLETE')")
exec(compile(source,'irregular_stair_v2.py','exec'))
