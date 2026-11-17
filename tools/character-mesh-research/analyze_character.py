"""Blender batch mesh metrics. Run: blender -b --python analyze_character.py -- /path/model.glb output.json
Only process files you are licensed to inspect. No model data is exported.
"""
import bpy,sys,json,os,math
from collections import Counter,defaultdict
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=2:raise SystemExit('usage: blender -b --python analyze_character.py -- input.glb output.json')
source,dest=args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
ext=os.path.splitext(source)[1].lower()
if ext in ('.glb','.gltf','.vrm'):bpy.ops.import_scene.gltf(filepath=source)
elif ext=='.fbx':bpy.ops.import_scene.fbx(filepath=source)
elif ext=='.obj':bpy.ops.wm.obj_import(filepath=source)
else:raise SystemExit('Unsupported extension; convert legally with compatible importer first: '+ext)
records=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 m=o.data
 pts=[o.matrix_world@v.co for v in m.vertices]
 if not pts:continue
 lo=[min(p[k] for p in pts) for k in range(3)]
 hi=[max(p[k] for p in pts) for k in range(3)]
 edges=Counter()
 for poly in m.polygons:
  ids=list(poly.vertices)
  for a,b in zip(ids,ids[1:]+ids[:1]):edges[tuple(sorted((a,b)))]+=1
 boundary=[e for e,n in edges.items() if n==1]
 nonmanifold=sum(n>2 for n in edges.values())
 # Mesh adjacency components (face-independent) for detecting detached shells.
 parent=list(range(len(m.vertices)))
 def root(i):
  while parent[i]!=i:
   parent[i]=parent[parent[i]];i=parent[i]
  return i
 for a,b in edges:
  ra,rb=root(a),root(b)
  if ra!=rb:parent[rb]=ra
 components=Counter(root(i) for i in range(len(m.vertices)))
 # Quantized horizontal occupancy only; no raw vertices or protected mesh data.
 hist=[]
 for t in range(11):
  z=lo[2]+(hi[2]-lo[2])*t/10
  band=max((hi[2]-lo[2])*.04,1e-6)
  sample=[p for p in pts if abs(p.z-z)<=band]
  hist.append({'z_fraction':t/10,'count':len(sample),'x_width':round(max(p.x for p in sample)-min(p.x for p in sample),5) if sample else None,'y_depth':round(max(p.y for p in sample)-min(p.y for p in sample),5) if sample else None})
 records.append({'object':o.name,'vertices':len(m.vertices),'polygons':len(m.polygons),'triangles':sum(len(p.vertices)-2 for p in m.polygons),'bounds_min':lo,'bounds_max':hi,'boundary_edges':len(boundary),'nonmanifold_edges':nonmanifold,'connected_components':len(components),'component_vertex_counts':sorted(components.values(),reverse=True)[:20],'uv_layers':len(m.uv_layers),'materials':len(m.materials),'shape_keys':len(m.shape_keys.key_blocks) if m.shape_keys else 0,'horizontal_sections':hist})
os.makedirs(os.path.dirname(os.path.abspath(dest)),exist_ok=True)
with open(dest,'w',encoding='utf8') as f:json.dump({'source_filename':os.path.basename(source),'status':'unverified analysis output; no raw geometry exported','meshes':records},f,indent=2,ensure_ascii=False)
print('ANALYSIS_WRITTEN',dest)
