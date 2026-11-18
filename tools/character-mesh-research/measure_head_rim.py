"""Measure the exact Shibu Face rim, local normals and turning angles.
Blender -b --python measure_head_rim.py -- source.vrm boundary.json output.json
"""
import bpy,sys,json,math,statistics
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=3:raise SystemExit('expected vrm boundary.json output.json')
src,report,out=a
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and x.name.lower()=='face')
data=json.load(open(report))
entry=next(x for x in data['objects'] if x['name']==o.name)
c=entry['components'][5]
ids=c['paths'][0]['vertex_indices']
if ids[0]!=ids[-1] or len(ids)!=37:raise RuntimeError('Unexpected 36 vertex rim')
ids=ids[:-1]
points=[o.matrix_world@o.data.vertices[i].co for i in ids]
normals=[(o.matrix_world.to_3x3().inverted().transposed()@o.data.vertices[i].normal).normalized() for i in ids]
edges=[];angles=[];samples=[]
for j,p in enumerate(points):
 prev=points[j-1];nxt=points[(j+1)%len(points)]
 v1=(prev-p).normalized();v2=(nxt-p).normalized()
 angle=math.degrees(v1.angle(v2))
 length=(nxt-p).length
 edges.append(length);angles.append(angle)
 samples.append({'order':j,'source_vertex_id':ids[j],'xyz_m':[round(v,7) for v in p],
  'vertex_normal':[round(v,6) for v in normals[j]],'next_edge_m':round(length,7),
  'interior_turn_angle_deg':round(angle,3)})
result={'source':src.split('/')[-1],'object':o.name,'component':5,'count':len(ids),
 'edge_min_m':min(edges),'edge_max_m':max(edges),'edge_median_m':statistics.median(edges),
 'angle_min_deg':min(angles),'angle_max_deg':max(angles),
 'samples':samples,'interpretation':'Source geometry audit only; anatomical seam and orientation need manual review'}
with open(out,'w') as f:json.dump(result,f,indent=2)
print('RIM_GEOMETRY_AUDIT',len(ids),'edge range',min(edges),max(edges),'angle range',min(angles),max(angles))
