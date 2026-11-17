"""V8 localized photographed stair-runoff and concrete weathering.
Reuses V7 structural mesh and externally sourced CC0 PBR; never changes V7.
"""
source=open('/work/tools/floor3/double_flight/build_v7.py',encoding='utf-8').read()
needle="source=source.replace(needle,patch+'\\n'+needle)"
assert source.count(needle)==1
extra=r"""
# V8 contrast pass: keep the original photos in the .blend, but bake
# a darker weathered variant for main concrete surfaces.
pix=np.empty(W*H*4,dtype=np.float32)
paint.pixels.foreach_get(pix)
pix=pix.reshape(H,W,4)
aged= pix.copy()
aged[:,:,:3]=np.clip((pix[:,:,:3]-.075)*.80+.038,0,1)
aged[:,:,3]=1.
main_v8=bpy.data.images.new('V8 darker photo-aged concrete',width=W,height=H,alpha=True)
main_v8.pixels.foreach_set(aged.ravel())
main_v8.file_format='PNG'
main_v8.pack()
apply_image(concrete,main_v8)

# Narrow stains on the actual riser faces show where water runs off the
# nosing. Faces are generated in each tread's own coordinates, avoiding
# floating coplanar planes on sloped flights.
bpy.context.view_layer.update()
for j,tread in enumerate(treads):
 if j%5 in (0,4):continue
 dims=tread.dimensions
 yface=-dims.y*.5-.009
 # Avoid repeating the same pattern on the 28 treads.
 side=(-1 if j%2 else 1)
 x=side*(dims.x*.38)
 width=.11+.06*((j*3)%4)/4
 def world(xx,zz):
  v=tread.matrix_world@Vector((xx,yface,zz))
  return tuple(v)
 coords=[
   world(x-width*.54,.087),
   world(x+width*.65,.079),
   world(x+width*.44,-.006),
   world(x+.06,-.072),
   world(x-width*.68,-.090),
   world(x-width*.83,-.015)
 ]
 weather_polygon('V8 rain-stained photographed concrete riser',
    coords,[(0,1),(1,1),(.93,.48),(.73,0),(0,0),(.10,.52)])
"""
extra += r"""
# V9: realistic large-scale runoff and broken masonry behind actual photo PBR.
# Do not disturb approved stairs or remove current photo maps.
from mathutils import Vector
import random, math
rng9=random.Random(9317)
for ob in [o for o in list(bpy.context.scene.objects) if o.type=='MESH'
           and 'heavy landing slab' in o.name]:
 x,y,z=ob.location
 # The slab reveals weathered dark underside on the front face.
 front_y=y-ob.dimensions.y*.5-.024
 for idx in range(4):
  cx=x+(-.68+idx*.43)+rng9.uniform(-.045,.045)
  ztop=z+.08-rng9.uniform(0,.07)
  bottom=ztop-rng9.uniform(.17,.31)
  half=rng9.uniform(.14,.26)
  pts=[(cx-half,front_y,ztop),
       (cx+half*.9,front_y,ztop-rng9.uniform(0,.035)),
       (cx+half*.57,front_y,bottom+.03),
       (cx+.02,front_y,bottom),
       (cx-half*.88,front_y,bottom+.07)]
  weather_polygon('V9 broad authentic landing runoff face',
                  pts,[(0,1),(1,1),(.8,.18),(.5,0),(0,.2)])
# At the foot of the stair, rainwater and soil splash up in a gradient.
# Use a patchy photographed band attached along the bottom edge of the piers.
for pier in support_piers:
 px,py,pz=pier.location
 front=py-pier.dimensions.y*.5-.015
 foot_h=.07
 top_h=min(.72,pz+pier.dimensions.z*.45)
 for idx in range(3):
  left=px-pier.dimensions.x*.47+idx*pier.dimensions.x/3
  right=left+pier.dimensions.x/3+.008
  h1=top_h*rng9.uniform(.48,1.0)
  h2=top_h*rng9.uniform(.55,.91)
  weather_polygon('V9 irregular soil moisture tide mark',
   [(left,front,foot_h),(right,front,foot_h),
    (right,front,h1*.75),
    (left+(right-left)*.67,front,h2),
    (left,front,h1)],
    [(0,0),(1,0),(1,.73),(.65,1),(0,.83)])
# A few larger broken chunks at the underside of the flight, rather than
# dots/noise on the surface. Cut stone at selected existing structural spine.
supports=[o for o in list(bpy.context.scene.objects) if o.type=='MESH'
          and 'thick supported sloped side stringer' in o.name]
for idx,spine in enumerate(supports):
 if idx%2:continue
 # Use existing object axes for the cut to remain on the physical outer lip.
 center=spine.matrix_world@Vector((0,0,-spine.dimensions.z*.28))
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=center)
 cutter=bpy.context.object
 cutter.name='V9 temporary eroded structural cut'
 cutter.scale=(.20,.23,.31)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 m=spine.modifiers.new('V9 true chipped load-bearing edge','BOOLEAN')
 m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter
 bpy.context.view_layer.objects.active=spine
 bpy.ops.object.modifier_apply(modifier=m.name)
 bpy.data.objects.remove(cutter,do_unlink=True)
"""
extra += r"""
# V10 refinement after V9 close-up review:
# the old algae overlays looked like flat green stickers. Desaturate the
# photographic runoff paint to mineral grey-brown and add fine stains.
wash=np.empty(W*H*4,dtype=np.float32)
dirt_img.pixels.foreach_get(wash)
wash=wash.reshape(H,W,4)
lum=(.22*wash[:,:,0]+.66*wash[:,:,1]+.12*wash[:,:,2])
wash[:,:,0]=np.clip(lum*.71+.017,0,1)
wash[:,:,1]=np.clip(lum*.73+.018,0,1)
wash[:,:,2]=np.clip(lum*.67+.013,0,1)
dirt_img.pixels.foreach_set(wash.ravel())
dirt_img.pack()
# On the underside of the landing the color is deliberately darker
# and the lower strip becomes a damaged, rain-exposed concrete edge.
for ob in [o for o in list(bpy.context.scene.objects)
           if o.type=='MESH' and 'heavy landing slab' in o.name]:
 x,y,z=ob.location
 front=y-ob.dimensions.y*.5-.021
 for i in range(4):
  seed=1009+i+int(z*20)
  ri=random.Random(seed)
  cx=x-.68+i*.44+ri.uniform(-.045,.045)
  length=ri.uniform(.12,.25)
  half=ri.uniform(.08,.18)
  weather_polygon('V10 shadowed seepage falling off landing',[
   (cx-half,front,z+.055),
   (cx+half,front,z+.061),
   (cx+half*.70,front,z-length*.62),
   (cx+.01,front,z-length),
   (cx-half*.70,front,z-length*.53)],
   [(0,1),(1,1),(.9,.4),(.6,0),(.1,.4)])
# Subtle mineral roughness is carried by CC0 image-backed normal maps.
# Never introduce free-floating rocks or decorative dots.
"""
source=source.replace(needle,"patch += r'''"+extra+"'''\n"+needle)
source=source.replace('f3_double_flight_stairs_v7','f3_double_flight_stairs_v10')
source=source.replace('F3_DOUBLE_FLIGHT_V7_COMPLETE','F3_DOUBLE_FLIGHT_V10_COMPLETE')
source=source.replace('f3_double_flight_v7.py','f3_double_flight_v10.py')
exec(compile(source,'f3_double_flight_v10.py','exec'))

# Additional close detail proof of quality: separate true Blender render.
cam=bpy.context.scene.camera
cam.data.ortho_scale=5.9
cam.location=Vector((5.7,-6.8,5.4))
cam.rotation_euler=(Vector((.9,-1.35,1.85))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.filepath='/work/out/f3_double_flight_stairs_v10-detail.png'
bpy.ops.render.render(write_still=True)
print('F3_DOUBLE_FLIGHT_V10_DETAIL_COMPLETE')
