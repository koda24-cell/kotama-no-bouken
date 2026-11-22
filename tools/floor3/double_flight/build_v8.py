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
source=source.replace(needle,"patch += r'''"+extra+"'''\n"+needle)
source=source.replace('f3_double_flight_stairs_v7','f3_double_flight_stairs_v8')
source=source.replace('F3_DOUBLE_FLIGHT_V7_COMPLETE','F3_DOUBLE_FLIGHT_V8_COMPLETE')
source=source.replace('f3_double_flight_v7.py','f3_double_flight_v8.py')
exec(compile(source,'f3_double_flight_v8.py','exec'))
