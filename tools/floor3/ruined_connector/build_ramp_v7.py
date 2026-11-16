"""3F ramp V7: one-asset structural erosion, no floating crack rods.
Built on merged development V6 source; do not touch approved stairs V8.
"""
source=open('/work/tools/floor3/ruined_connector/build_irregular_v6.py',encoding='utf-8').read()
needle=" export('floor3_ruined_connector_'+kind+'_v6')"
assert source.count(needle)==1
patch=r""" # V7 ramp revision; all other module variants remain as originally modeled.
 if kind=='ramp':
  # Old dark crack cylinders appeared to sit on top of the ramp.
  for obj in list(bpy.context.scene.objects):
   if obj.type=='MESH' and obj.name.startswith('ramp diagonal fracture'):
    bpy.data.objects.remove(obj,do_unlink=True)
  slab=bpy.data.objects.get('single uneven continuous concrete ramp')
  assert slab is not None
  def ramp_surface(y):return -.39+.90*max(0,min(1,(y+.94)/1.88))+.055
  # Add supporting reinforced-concrete stringers beneath the continuous slab.
  # The old geometry is retained; these are additional independent elements.
  for side in (-1,1):
   beam=cube('V7 eroded ramp supporting concrete spine',
       (side*.59,0,-.10),(.19,2.00,.23),edge)
   beam.rotation_euler.x=math.atan2(.90,1.88)
   # Large chips physically remove outer corners, not a swarm of small stones.
   for i,y in enumerate((-.44,.54)):
    z=ramp_surface(y)-.18
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,
       location=(side*.74,y,z))
    cutter=bpy.context.object;cutter.name='V7 temporary stringer erosion cutter'
    cutter.scale=(.17,.22 if i else .27,.18)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=beam.modifiers.new('V7 missing structural concrete','BOOLEAN')
    mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.select_all(action='DESELECT')
    beam.select_set(True);bpy.context.view_layer.objects.active=beam
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
  # Three actually recessed fissures; nonuniform widths and angles.
  for i,(x,y,w,theta) in enumerate((
      (-.25,-.49,.025,-.45),
      (.18,.08,.038,.32),
      (-.09,.59,.029,-.26))):
   z=ramp_surface(y)
   bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z+.027))
   cutter=bpy.context.object;cutter.name='V7 temporary recessed ramp crack'
   cutter.dimensions=(w,.43 if i==1 else .36,.080)
   cutter.rotation_euler.z=theta
   bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
   mod=slab.modifiers.new('V7 real depressed fracture '+str(i),'BOOLEAN')
   mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
   bpy.ops.object.select_all(action='DESELECT')
   slab.select_set(True);bpy.context.view_layer.objects.active=slab
   bpy.ops.object.modifier_apply(modifier=mod.name)
   bpy.data.objects.remove(cutter,do_unlink=True)
  # A pronounced missing outer lip at the existing chipped right edge.
  y=.27;z=ramp_surface(y)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,
    location=(.78,y,z))
  cutter=bpy.context.object;cutter.name='V7 temporary missing ramp edge'
  cutter.scale=(.32,.29,.18)
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  mod=slab.modifiers.new('V7 missing outer ramp lip','BOOLEAN')
  mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
  bpy.ops.object.select_all(action='DESELECT')
  slab.select_set(True);bpy.context.view_layer.objects.active=slab
  bpy.ops.object.modifier_apply(modifier=mod.name)
  bpy.data.objects.remove(cutter,do_unlink=True)
  # Exposed reinforcement stays attached to the chipped edge.
  rod('V7 exposed ramp reinforcement',(.50,.27,z-.036),(.76,.32,z-.061),.012,rust)
  bpy.ops.wm.save_as_mainfile(
    filepath=OUT+'/floor3_ruined_connector_ramp_v7.blend',compress=True)
  export('floor3_ruined_connector_ramp_v7')
"""
source=source.replace(needle,patch)
source=source.replace('FLOOR3_IRREGULAR_V6_COMPLETE','FLOOR3_RAMP_V7_COMPLETE')
exec(compile(source,'floor3_ramp_v7.py','exec'))
