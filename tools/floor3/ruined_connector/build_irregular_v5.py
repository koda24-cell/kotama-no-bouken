"""V5: rough weathered concrete shader, no floating particles."""
source=open('/work/tools/floor3/ruined_connector/build_irregular_v4.py',encoding='utf-8').read()
needle=" export('floor3_ruined_connector_'+kind+'_v4')"
assert source.count(needle)==1
patch=""" # V5 material-only weathering: no mesh particles, no smooth plastic sheen.
 for mat in (stone,edge):
  mat.use_nodes=True
  nodes=mat.node_tree.nodes;links=mat.node_tree.links
  p=nodes.get('Principled BSDF')
  p.inputs['Roughness'].default_value=.97
  p.inputs['Metallic'].default_value=0
  tex=nodes.new('ShaderNodeTexNoise');tex.label='Broad concrete erosion'
  tex.inputs['Scale'].default_value=5.2
  tex.inputs['Detail'].default_value=5.5
  tex.inputs['Roughness'].default_value=.72
  fine=nodes.new('ShaderNodeTexNoise');fine.label='Micro pitted stone'
  fine.inputs['Scale'].default_value=85
  fine.inputs['Detail'].default_value=3
  bump=nodes.new('ShaderNodeBump');bump.label='Irregular concrete pores'
  bump.inputs['Strength'].default_value=.46
  bump.inputs['Distance'].default_value=.024
  links.new(fine.outputs['Fac'],bump.inputs['Height'])
  links.new(bump.outputs['Normal'],p.inputs['Normal'])
  mix=nodes.new('ShaderNodeValToRGB');mix.label='Weathered concrete color'
  mix.color_ramp.elements[0].position=.22
  mix.color_ramp.elements[0].color=(.21,.205,.19,1)
  mix.color_ramp.elements[1].position=.79
  mix.color_ramp.elements[1].color=(.48,.455,.405,1)
  links.new(tex.outputs['Fac'],mix.inputs['Fac'])
  links.new(mix.outputs['Color'],p.inputs['Base Color'])
  rough=nodes.new('ShaderNodeMapRange')
  rough.inputs['From Min'].default_value=.1
  rough.inputs['From Max'].default_value=.9
  rough.inputs['To Min'].default_value=.84
  rough.inputs['To Max'].default_value=1.0
  links.new(tex.outputs['Fac'],rough.inputs['Value'])
  links.new(rough.outputs['Result'],p.inputs['Roughness'])
 # Use broad uneven surfaces instead of scattered pebble dots.
 export('floor3_ruined_connector_'+kind+'_v5')"""
source=source.replace(needle,patch).replace("FLOOR3_IRREGULAR_V4_COMPLETE","FLOOR3_IRREGULAR_V5_COMPLETE")
exec(compile(source,'irregular_stair_v5.py','exec'))
