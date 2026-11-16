"""Floor 3 stairs V7: one-asset structural damage iteration based on V6.
V6 model and its three module output families remain unchanged.
Only the stairs tile is exported as the V7 review candidate.
"""
source=open('/work/tools/floor3/ruined_connector/build_irregular_v6.py',encoding='utf-8').read()
needle=" export('floor3_ruined_connector_'+kind+'_v6')"
assert source.count(needle)==1
patch=r""" # V7: separate quality candidate. Improve only the stair structure.
 if kind=='stairs':
  # The old stair flights looked like seven unsupported sheets. Two continuous
  # heavy reinforced-concrete side beams now give them believable load paths.
  slope=math.atan2(.90,1.88)
  for side in (-1,1):
   beam=cube('V7 concrete staircase support spine',(side*.67,0,-.16),(.20,2.04,.23),edge)
   beam.rotation_euler.x=slope
  # Carve actual missing chunks into three chosen treads. Large-scale
  # geometry only: never pebble-sized dots or repeated evenly spaced chips.
  for i,cx,depth in ((1,.63,.32),(4,-.67,.39),(6,.62,.28)):
   tread=bpy.data.objects.get('irregular fractured stair tread '+str(i))
   assert tread is not None
   y=-.855+i*.285
   z=-.39+i*.137
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,
     location=(cx,y-.105,z+.015))
   cutter=bpy.context.object
   cutter.name='V7 temporary fractured corner cutter'
   cutter.scale=(depth,.16,.17)
   bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
   mod=tread.modifiers.new('V7 physically missing concrete corner','BOOLEAN')
   mod.operation='DIFFERENCE'
   mod.solver='EXACT'
   mod.object=cutter
   bpy.ops.object.select_all(action='DESELECT')
   tread.select_set(True)
   bpy.context.view_layer.objects.active=tread
   bpy.ops.object.modifier_apply(modifier=mod.name)
   bpy.data.objects.remove(cutter,do_unlink=True)
   # Two staggered visible reinforcement ends, anchored in the actual tread.
   anchor_x=cx-(.12 if cx>0 else -.12)
   rod('V7 exposed embedded reinforcement',
     (anchor_x,y-.015,z-.012),(cx,y-.17,z-.036),.011,rust)
  # The V6 left upper railing is perfectly straight. Replace only its upper
  # segment with a damaged kink that is still anchored in the middle post.
  for obj in list(bpy.context.scene.objects):
   if obj.name.startswith('V6 railing attached segment B'):
    bpy.data.objects.remove(obj,do_unlink=True)
  rail_mid=(-.54,.02,deck_height(.02)+.63)
  kink=(-.575,.44,deck_height(.44)+.55)
  rod('V7 buckled left rail anchored to middle post',rail_mid,kink,.024,rust)
  rod('V7 bent terminal left railing',kink,(-.68,.63,deck_height(.63)+.37),.021,rust)
  # Darken existing broad concrete noise ramp, preserving the natural variance.
  # The normal map is retained from V6; do not add noisy micro-objects.
  for mat in (stone,edge):
   for node in mat.node_tree.nodes:
    if node.type=='VALTORGB' and node.label=='Weathered concrete color':
     node.color_ramp.elements[0].color=(.14,.135,.125,1)
     node.color_ramp.elements[1].color=(.38,.365,.33,1)
  # Save a recoverable Blender checkpoint before rendering and export.
  bpy.ops.wm.save_as_mainfile(
    filepath=OUT+'/floor3_ruined_connector_stairs_v7.blend',compress=True)
  export('floor3_ruined_connector_stairs_v7')
 # The ramp and landing keep their original V6 versions and receive no V7 export.
"""
source=source.replace(needle,patch)
source=source.replace('FLOOR3_IRREGULAR_V6_COMPLETE','FLOOR3_STAIRS_V7_COMPLETE')
exec(compile(source,'floor3_stairs_v7.py','exec'))
