"""V3: keep V1/V2 intact; thinner decks and beams, taller slimmer support pillar."""
source=open('/work/tools/floor3/elevated_bridge/build_v2.py',encoding='utf-8').read()
needle=" export('floor3_elevated_bridge_'+kind+'_v2')"
assert source.count(needle)==1
adjust=""" # V3 proportion pass: retain 2x2 tile footprint and connectors.
 for obj in [o for o in bpy.context.scene.objects if o.type=='MESH']:
  n=obj.name.lower()
  if 'deck' in n:
   # Deck top remains close to V2; thin downward from the top face.
   top=obj.location.z+obj.dimensions.z/2
   obj.scale.z*=.60
   obj.location.z=top-obj.dimensions.z/2
  elif 'under deck girder' in n or 'under deck cross beam' in n:
   obj.scale.z*=.70
  elif 'pier shaft' in n:
   # Slender, elongated column; extend toward ground without changing deck height.
   upper=obj.location.z+obj.dimensions.z/2
   obj.scale.x*=.68
   obj.scale.y*=.68
   obj.scale.z*=1.40
   obj.location.z=upper-obj.dimensions.z/2
  elif 'pier foundation' in n:
   obj.scale.x*=.77
   obj.scale.y*=.77
   obj.location.z-=.65
  elif 'foundation anchor' in n:
   obj.location.z-=.65
  elif 'pier weather streak' in n:
   obj.scale.x*=.70
   obj.scale.y*=.70
   obj.location.z-=.25
 export('floor3_elevated_bridge_'+kind+'_v3')"""
source=source.replace(needle,adjust)
source=source.replace("print('V2_RENDER_COMPLETE'","print('V3_RENDER_COMPLETE'")
exec(compile(source,'build_v3_generated.py','exec'))
