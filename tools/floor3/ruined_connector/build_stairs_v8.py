"""V8 single-asset stair review: structural concrete spalls and recessed fissures.
V7 source and its GLB remain unchanged. Exports only stairs_v8 candidate.
"""
source=open('/work/tools/floor3/ruined_connector/build_stairs_v7.py',encoding='utf-8').read()
needle="  export('floor3_ruined_connector_stairs_v7')"
assert source.count(needle)==1
patch=r"""  # V8: abrade the V7 concrete support beams with a few large, asymmetric
  # structural chips. Keep the beam load path and all original V7 components.
  beams=[o for o in bpy.context.scene.objects
         if o.type=='MESH' and o.name.startswith('V7 concrete staircase support spine')]
  assert len(beams)==2, 'expected two existing structural support beams'
  for beam in beams:
   side=-1 if beam.location.x<0 else 1
   for j,y in enumerate((-.52,.43)):
    # Beam axis inclines about .90m over the 1.88m stair flight.
    z=-.16+y*(.90/1.88)+(.045 if j else -.026)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,
      location=(side*.82,y,z))
    cutter=bpy.context.object
    cutter.name='V8 temporary support beam erosion cutter'
    cutter.scale=(.18,.26 if j else .35,.17)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=beam.modifiers.new('V8 irregular missing structural concrete','BOOLEAN')
    mod.operation='DIFFERENCE'
    mod.solver='EXACT'
    mod.object=cutter
    bpy.ops.object.select_all(action='DESELECT')
    beam.select_set(True)
    bpy.context.view_layer.objects.active=beam
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
  # Actual recessed grooves, not dark wires sitting on the stairs.
  for i,xx,width in ((2,-.16,.028),(5,.13,.039)):
   tread=bpy.data.objects.get('irregular fractured stair tread '+str(i))
   assert tread is not None
   y=-.855+i*.285
   z=-.39+i*.137
   bpy.ops.mesh.primitive_cube_add(size=1,location=(xx,y,z+.051))
   cutter=bpy.context.object
   cutter.name='V8 temporary surface fissure cutter'
   cutter.dimensions=(width,.26,.046)
   cutter.rotation_euler.z=(-.36 if i==2 else .45)
   bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
   mod=tread.modifiers.new('V8 recessed tread fissure','BOOLEAN')
   mod.operation='DIFFERENCE'
   mod.solver='EXACT'
   mod.object=cutter
   bpy.ops.object.select_all(action='DESELECT')
   tread.select_set(True)
   bpy.context.view_layer.objects.active=tread
   bpy.ops.object.modifier_apply(modifier=mod.name)
   bpy.data.objects.remove(cutter,do_unlink=True)
  # V8 uses the same consistent aged-concrete palette; slightly deepen the
  # broad color variation rather than introducing colored scattered particles.
  for mat in (stone,edge):
   for node in mat.node_tree.nodes:
    if node.type=='VALTORGB' and node.label=='Weathered concrete color':
     node.color_ramp.elements[0].color=(.11,.105,.096,1)
     node.color_ramp.elements[1].color=(.32,.302,.276,1)
  bpy.ops.wm.save_as_mainfile(
    filepath=OUT+'/floor3_ruined_connector_stairs_v8.blend',compress=True)
  export('floor3_ruined_connector_stairs_v8')"""
source=source.replace(needle,patch)
source=source.replace('FLOOR3_STAIRS_V7_COMPLETE','FLOOR3_STAIRS_V8_COMPLETE')
exec(compile(source,'floor3_stairs_v8.py','exec'))
