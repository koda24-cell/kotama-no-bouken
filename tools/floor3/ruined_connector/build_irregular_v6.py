"""V6: anchored rail joints, genuine landing grooves, exported tangent-space Normal Map.
Preserves V5 geometry/weathering and forbids scattered particle debris.
"""
source=open('/work/tools/floor3/ruined_connector/build_irregular_v5.py',encoding='utf-8').read()
needle=" export('floor3_ruined_connector_'+kind+'_v5')"
assert source.count(needle)==1
patch=r""" # V6 repair railing: remove legacy posts whose bases do not match deck elevation.
 for obj in list(bpy.context.scene.objects):
  if obj.type=='MESH' and obj.name.startswith((
   'slim rusted post','buckled hanging rail','bent rusted rail lower',
   'snapped rusted rail upper','hanging bent rail','branching floor crack')):
   bpy.data.objects.remove(obj,do_unlink=True)
 def deck_height(y):
  if kind=='landing':return .46
  if kind=='ramp':
   t=max(0,min(1,(y+.94)/1.88))
   return -.39+.90*t+.055
  i=max(0,min(6,round((y+.855)/.285)))
  return -.39+i*.137+.048
 # Rail feet follow the actual concrete walking surfaces, rather than a
 # universal global Z. Low heavy mounting collars hide seams in the concrete.
 post_ys=(-.82,.02,.81)
 for side in (-1,1):
  x=side*.72
  tops=[]
  for i,y in enumerate(post_ys):
   base=deck_height(y)
   top=base+(.68 if i!=1 else .63)
   rod('V6 anchored handrail post',(x,y,base-.025),(x,y,top),.026,rust)
   rod('V6 embedded post collar',(x,y,base-.045),(x,y,base+.06),.046,rust)
   tops.append((x,y,top))
  # Deliberately fragmented but each rail segment joins real post endpoints.
  rod('V6 railing attached segment A',tops[0],tops[1],.025,rust)
  if side==-1:
   rod('V6 railing attached segment B',tops[1],tops[2],.023,rust)
  else:
   # Damaged upper rail remains anchored at the middle post.
   a=tops[1];b=(x+side*.13,(tops[1][1]+tops[2][1])*.5,tops[1][2]-.12)
   rod('V6 railing bent anchored stub',a,b,.022,rust)
 if kind=='landing':
  slab=bpy.data.objects.get('asymmetric cracked landing slab')
  assert slab is not None
  # Cut into the original concrete: recessed grooves replace floating rods.
  # Real boolean-modified mesh survives GLB export.
  segments=[
   ((-.65,-.78),(-.21,-.19)),
   ((-.21,-.19),(.28,.06)),
   ((.28,.06),(.61,.37)),
   ((-.52,.64),(-.13,.23))
  ]
  for i,(a,b) in enumerate(segments):
   dx=b[0]-a[0];dy=b[1]-a[1]
   length=math.hypot(dx,dy)
   mx=(a[0]+b[0])/2;my=(a[1]+b[1])/2
   bpy.ops.mesh.primitive_cube_add(size=1,location=(mx,my,.458))
   cutter=bpy.context.object;cutter.name='V6 temporary fracture cutter'
   cutter.dimensions=(.028 if i%2 else .042,length,.085)
   cutter.rotation_euler.z=-math.atan2(dx,dy)
   bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
   bpy.context.view_layer.objects.active=slab
   mod=slab.modifiers.new('V6 real recessed concrete fissure','BOOLEAN')
   mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
   bpy.ops.object.select_all(action='DESELECT')
   slab.select_set(True);bpy.context.view_layer.objects.active=slab
   bpy.ops.object.modifier_apply(modifier=mod.name)
   bpy.data.objects.remove(cutter,do_unlink=True)
 # Deterministic seamless OpenGL tangent-space normal-map image, stored in GLB.
 # This is image-backed instead of Blender-only Noise->Bump shader nodes.
 import array
 N=256
 im=bpy.data.images.get('V6 concrete normal map')
 if im is None:
  im=bpy.data.images.new('V6 concrete normal map',width=N,height=N,alpha=True)
  pix=array.array('f')
  def height_at(x,y):
   u=x*2*math.pi/N;v=y*2*math.pi/N
   return (0.50*math.sin(11*u+3*math.sin(7*v))*math.cos(13*v)
          +0.24*math.sin(29*u-17*v)*math.sin(19*v+11*u)
          +0.10*math.sin(53*u+31*v)*math.cos(47*v-23*u))
  for y in range(N):
   for x in range(N):
    dx=(height_at((x+1)%N,y)-height_at((x-1)%N,y))*.62
    dy=(height_at(x,(y+1)%N)-height_at(x,(y-1)%N))*.62
    nx,ny,nz=-dx,-dy,1.
    norm=math.sqrt(nx*nx+ny*ny+nz*nz)
    pix.extend((.5+.5*nx/norm,.5+.5*ny/norm,.5+.5*nz/norm,1.))
  im.pixels.foreach_set(pix)
  im.file_format='PNG';im.pack()
 for mat in (stone,edge):
  nodes=mat.node_tree.nodes;links=mat.node_tree.links
  tex=nodes.new('ShaderNodeTexImage');tex.label='V6 GLB embedded concrete normal'
  tex.image=im
  im.colorspace_settings.name='Non-Color'
  normal=nodes.new('ShaderNodeNormalMap')
  normal.inputs['Strength'].default_value=.76
  links.new(tex.outputs['Color'],normal.inputs['Color'])
  links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
 # Explicit UV unwrap is required for image normal maps on custom polygon meshes.
 # Primitive posts may already have UVs; leave those intact.
 for obj in [o for o in bpy.context.scene.objects if o.type=='MESH']:
  if len(obj.data.uv_layers)==0:
   bpy.ops.object.select_all(action='DESELECT')
   obj.select_set(True)
   bpy.context.view_layer.objects.active=obj
   bpy.ops.object.mode_set(mode='EDIT')
   bpy.ops.mesh.select_all(action='SELECT')
   bpy.ops.uv.smart_project(island_margin=.015)
   bpy.ops.object.mode_set(mode='OBJECT')
 # Export stays non-destructive to V5 as a separate artifact family.
 export('floor3_ruined_connector_'+kind+'_v6')"""
source=source.replace(needle,patch)
source=source.replace('FLOOR3_IRREGULAR_V5_COMPLETE','FLOOR3_IRREGULAR_V6_COMPLETE')
exec(compile(source,'irregular_stair_v6.py','exec'))
