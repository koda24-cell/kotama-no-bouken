"""Extract ordered face-mesh boundary paths and rank posterior connection candidates.
Diagnostic only: anatomical seam classification requires visual confirmation.
blender -b --python analyze_boundary_loops.py -- input.vrm output.json
"""
import bpy,sys,json,collections,math,os
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=2:raise SystemExit('usage: blender -b --python analyze_boundary_loops.py -- input.vrm output.json')
src,dest=args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
result={'source':os.path.basename(src),'axis_assumption':'+Y is face front for tested VRoid samples','objects':[],'warnings':[]}
for obj in bpy.context.scene.objects:
 if obj.type!='MESH' or not any(x in obj.name.lower() for x in ('face','head')) or 'hair' in obj.name.lower():continue
 edges=collections.Counter()
 for face in obj.data.polygons:
  v=list(face.vertices)
  for a,b in zip(v,v[1:]+v[:1]):edges[tuple(sorted((a,b)))]+=1
 boundary={e for e,n in edges.items() if n==1}
 adj=collections.defaultdict(set)
 for a,b in boundary:adj[a].add(b);adj[b].add(a)
 unseen=set(adj);components=[]
 while unseen:
  seed=min(unseen);stack=[seed];unseen.remove(seed);verts=[]
  while stack:
   v=stack.pop();verts.append(v)
   for n in sorted(adj[v]):
    if n in unseen:unseen.remove(n);stack.append(n)
  nodes=set(verts);deg={v:len(adj[v]) for v in nodes}
  segs=sorted((a,b) for a,b in boundary if a in nodes and b in nodes)
  paths=[]
  remaining=set(segs)
  # Walk from non-degree-two vertices first, then pure cycles.
  starts=sorted(v for v in nodes if deg[v]!=2)+sorted(v for v in nodes if deg[v]==2)
  for start in starts:
   for nxt in sorted(adj[start]):
    edge=tuple(sorted((start,nxt)))
    if edge not in remaining:continue
    remaining.remove(edge);path=[start,nxt];prev=start;cur=nxt
    while cur!=start and deg[cur]==2:
     candidates=sorted(v for v in adj[cur] if v!=prev and tuple(sorted((cur,v))) in remaining)
     if not candidates:break
     nn=candidates[0];remaining.remove(tuple(sorted((cur,nn))))
     path.append(nn);prev,cur=cur,nn
    paths.append(path)
  def point(i):return obj.matrix_world@obj.data.vertices[i].co
  pts=[point(i) for i in nodes]
  mins=[min(p[k] for p in pts) for k in range(3)]
  maxs=[max(p[k] for p in pts) for k in range(3)]
  cy=sum(p.y for p in pts)/len(pts)
  pinfo=[]
  for path in paths:
   xyz=[point(i) for i in path]
   length=sum((b-a).length for a,b in zip(xyz,xyz[1:]))
   pinfo.append({'vertex_indices':path,'closed':len(path)>2 and path[0]==path[-1],'length_m':round(length,6),'vertex_count':len(path)-int(path[0]==path[-1])})
  comp={'vertex_count':len(nodes),'edge_count':len(segs),'degree_histogram':dict(sorted(collections.Counter(deg.values()).items())),'bounds_m':{'min':mins,'max':maxs},'mean_y_m':cy,'simple_cycle':all(d==2 for d in deg.values()),'paths':pinfo}
  components.append(comp)
 components.sort(key=lambda c:(-c['edge_count'],c['mean_y_m']))
 result['objects'].append({'name':obj.name,'vertex_count':len(obj.data.vertices),'boundary_edges':len(boundary),'components':components})
 if not components:result['warnings'].append(obj.name+': no open boundary')
 if any(not c['simple_cycle'] for c in components):result['warnings'].append(obj.name+': branched/open boundary graph; paths are diagnostic segments, not guaranteed anatomical loops')
result['warnings'].append('Posterior seam not automatically identified: confirm back-facing candidate by overlay and geometry before bridging')
os.makedirs(os.path.dirname(os.path.abspath(dest)),exist_ok=True)
with open(dest,'w',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
print('BOUNDARY_COMPONENTS',sum(len(x['components']) for x in result['objects']))
