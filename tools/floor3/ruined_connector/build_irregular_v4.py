"""V4 removes visually noisy pebble/moss dots while retaining V3 architecture."""
source=open('/work/tools/floor3/ruined_connector/build_irregular_v3.py',encoding='utf-8').read()
needle=" export('floor3_ruined_connector_'+kind+'_v3')"
assert source.count(needle)==1
patch=""" # V4: eliminate scattered pebble-like geometry and green dot moss.
 for obj in list(bpy.context.scene.objects):
  if obj.type!='MESH':continue
  if obj.name.startswith(('loose concrete chip','moss seam','exposed aggregate chip','broken stair corner','damaged lip')):
   bpy.data.objects.remove(obj,do_unlink=True)
 # Retain the larger broken geometry, actual cracked silhouettes and rails.
 # Avoid introducing substitute dots or clusters.
 export('floor3_ruined_connector_'+kind+'_v4')"""
source=source.replace(needle,patch).replace("FLOOR3_IRREGULAR_V3_COMPLETE","FLOOR3_IRREGULAR_V4_COMPLETE")
exec(compile(source,'irregular_stair_v4.py','exec'))
