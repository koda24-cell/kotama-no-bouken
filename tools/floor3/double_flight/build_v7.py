"""V7: localized photographic patina pass over the successful CC0 PBR V6.
No V6 source assets or approved stairs_v8 are modified.
The weathering overlays have UV textures packed into .blend and GLB.
"""
source=open('/work/tools/floor3/double_flight/build_v6.py',encoding='utf-8').read()
needle='# Record provenance inside .blend and as sidecar manifest.'
assert source.count(needle)==1
patch=r"""
# V7 uses site-specific aging instead of uniformly tinting every face.
# The photographic basemap & normals from V6 remain unchanged.
# A distinct dark weathering material samples a real concrete_moss image.
# In-place deterioration zones have a textured irregular polygon boundary.
dark_photo=np.empty_like(gray)
dark_photo[:,:,:3]=np.clip(green[:,:,:3]*.50+gray[:,:,:3]*.22,0,1)
dark_photo[:,:,3]=1
dirt_img=bpy.data.images.new('V7 packed photographic damp runoff',
                              width=W,height=H,alpha=True)
dirt_img.pixels.foreach_set(dark_photo.ravel())
dirt_img.file_format='PNG';dirt_img.pack()
dirt_material=bpy.data.materials.new('V7 rain dirt with photographic image')
dirt_material.use_nodes=True
dirt_nodes=dirt_material.node_tree.nodes
dirt_bs=dirt_nodes.get('Principled BSDF')
dirt_bs.inputs['Roughness'].default_value=.94
dirt_texture=dirt_nodes.new('ShaderNodeTexImage')
dirt_texture.image=dirt_img
dirt_material.node_tree.links.new(dirt_texture.outputs['Color'],dirt_bs.inputs['Base Color'])
dirt_normal=dirt_nodes.new('ShaderNodeTexImage')
dirt_normal.image=pbr('concrete_moss','normal')
nmap=dirt_nodes.new('ShaderNodeNormalMap')
nmap.inputs['Strength'].default_value=.55
dirt_material.node_tree.links.new(dirt_normal.outputs['Color'],nmap.inputs['Color'])
dirt_material.node_tree.links.new(nmap.outputs['Normal'],dirt_bs.inputs['Normal'])

def weather_polygon(name,coords,uvs,material=dirt_material):
 mesh=bpy.data.meshes.new(name+' mesh')
 mesh.from_pydata(coords,[],[list(range(len(coords)))])
 mesh.update()
 obj=bpy.data.objects.new(name,mesh)
 bpy.context.collection.objects.link(obj)
 obj.data.materials.append(material)
 layer=obj.data.uv_layers.new(name='Weathering UV')
 for poly in mesh.polygons:
  for loop_idx in poly.loop_indices:
   vertex_index=mesh.loops[loop_idx].vertex_index
   layer.data[loop_idx].uv=uvs[vertex_index]
 return obj

# Rain follows gravity along columns. Avoid checkerboard decals or random dots.
# Darken only the front face, with irregular tapered width & length.
stain_rng=random.Random(8207)
support_piers=[o for o in list(bpy.context.scene.objects)
               if o.type=='MESH' and 'load-bearing concrete pier' in o.name]
assert len(support_piers)>=4,'missing structural support piers'
for pier in support_piers:
 px,py,pz=pier.location
 front_y=py-pier.dimensions.y*.5-.012
 top=pz+pier.dimensions.z*.50-.12
 for j in range(3):
  x=px+(-.10+j*.10)+stain_rng.uniform(-.023,.023)
  width=stain_rng.uniform(.055,.09)
  upper=top*stain_rng.uniform(.48,.9)
  lower=stain_rng.uniform(.13,.37)
  if upper<=lower+.16:continue
  # Irregular polygon, broadest near the damp foot, little branching.
  coords=[
    (x-width*.30,front_y,upper),
    (x+width*.37,front_y,upper-.14),
    (x+width*.64,front_y,(upper+lower)*.56),
    (x+width*.22,front_y,lower),
    (x-width*.48,front_y,lower+.08),
    (x-width*.64,front_y,(upper+lower)*.43)
  ]
  weather_polygon('V7 physically attached wall rain runoff',coords,
      [(0,1),(.35,1),(.7,.59),(.5,0),(0,0),(.12,.5)])
 # Upper slab-to-pier junction: shadowed damp band, shaped irregularly.
 z=min(top+.09,pz+pier.dimensions.z*.50)
 weather_polygon('V7 dark moisture at supporting pier junction',[
  (px-.145,front_y,z),(px+.13,front_y,z-.045),
  (px+.16,front_y,z-.20),(px+.07,front_y,z-.28),
  (px-.16,front_y,z-.23)
 ],[(0,1),(1,1),(1,0),(.7,0),(0,0)])

# Stair edges collect moisture in the longitudinal cracks. Placed along
# actual step tops, rotated with the tread so patches never float.
treads=[o for o in list(bpy.context.scene.objects)
        if o.type=='MESH' and 'eroded cast concrete tread' in o.name]
assert len(treads)>=26
for i,tread in enumerate(treads):
 if i%4==3:continue
 side=-1 if i%3==0 else 1
 rot=tread.rotation_euler.z
 ct=math.cos(rot);st=math.sin(rot)
 def local(x,y):
  return (tread.location.x+ct*x-st*y,
          tread.location.y+st*x+ct*y,
          tread.location.z+tread.dimensions.z*.5+.008)
 w=.16+.06*(i%3)
 # Soft tapered fillet following the slab lip, avoiding rectangular moss pads.
 near=side*(tread.dimensions.x*.5-.025)
 inner=near-side*w
 coords=[local(near,-.11),local(near,.10),
         local(inner,.125),local(inner-side*.035,-.015),
         local(inner,.0-.11)]
 weather_polygon('V7 joint-grounded aged tread edge',coords,
  [(0,0),(0,1),(.9,1),(.75,.43),(.9,0)])

# Reinforcement/rust runoff on concrete directly below the rail flanges.
flanges=[o for o in list(bpy.context.scene.objects)
         if o.type=='MESH' and 'steel base plate' in o.name]
for k,flange in enumerate(flanges):
 if k%4:continue
 x,y,z=flange.location
 # Small stain extends DOWN the concrete face next to the steel anchor.
 # This is visually subordinate to the larger vertical column stains.
 center=(x,y,z-.045)
 weather_polygon('V7 weathering underneath rusty steel flange',[
   (x-.09,y-.012,z-.043),(x+.095,y-.012,z-.043),
   (x+.045,y-.012,z-.12),(x-.035,y-.012,z-.15)
 ],[(0,1),(1,1),(.8,0),(.12,0)])
"""
source=source.replace(needle,patch+'\n'+needle)
source=source.replace('f3_double_flight_stairs_v6','f3_double_flight_stairs_v7')
source=source.replace('F3_DOUBLE_FLIGHT_V6_COMPLETE','F3_DOUBLE_FLIGHT_V7_COMPLETE')
source=source.replace('f3_double_flight_v6.py','f3_double_flight_v7.py')
exec(compile(source,'f3_double_flight_v7.py','exec'))
