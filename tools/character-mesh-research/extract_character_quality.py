"""Reproducible Blender character study: geometry, loops, hair, materials, rigging.
Only run on licensed references. Output aggregate statistics, never source geometry.
blender -b --python extract_character_quality.py -- model.vrm report.json
"""
import bpy,sys,json,math,os,collections
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=2:raise SystemExit('usage: blender -b --python extract_character_quality.py -- model report.json')
src,dst=a
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
ext=os.path.splitext(src)[1].lower()
if ext in ('.vrm','.glb','.gltf'):bpy.ops.import_scene.gltf(filepath=src)
elif ext=='.fbx':bpy.ops.import_scene.fbx(filepath=src)
elif ext=='.obj':bpy.ops.wm.obj_import(filepath=src)
else:raise RuntimeError('unsupported format '+ext)
def r(v):return round(float(v),6)
def vec(v):return [r(x) for x in v]
def role(name):
 n=name.lower()
 for key,terms in [('hair',('hair','bang','fringe','ponytail')),('eye',('eye','iris','pupil','lash','brow')),('mouth',('mouth','lip','teeth','tongue')),('ear',('ear',)),('head',('head','face','skin')),('body',('body','torso','arm','leg'))]:
  if any(t in n for t in terms):return key
 return 'unknown'
def mat_info(mat):
 d={'name':mat.name,'blend_method':getattr(mat,'blend_method',None),'use_nodes':mat.use_nodes}
 if mat.use_nodes:
  nodes=mat.node_tree.nodes
  d['node_types']=dict(collections.Counter(n.bl_idname for n in nodes))
  d['images']=[{'name':n.image.name if n.image else None,'colorspace':n.image.colorspace_settings.name if n.image else None,'source':n.image.source if n.image else None} for n in nodes if n.type=='TEX_IMAGE']
  d['principled']=[]
  for n in nodes:
   if n.type!='BSDF_PRINCIPLED':continue
   vals={}
   for key in ('Base Color','Metallic','Roughness','Alpha','IOR','Emission Color','Emission Strength','Normal'):
    inp=n.inputs.get(key)
    if inp is None:continue
    value=inp.default_value
    vals[key]={'linked':inp.is_linked,'value':vec(value) if hasattr(value,'__len__') else r(value) if isinstance(value,(float,int)) else None}
   d['principled'].append(vals)
 return d
def mesh_info(o):
 m=o.data;pts=[o.matrix_world@v.co for v in m.vertices]
 if not pts:return None
 lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)])
 counts=collections.Counter();adj=collections.defaultdict(set)
 for p in m.polygons:
  ids=list(p.vertices)
  for x,y in zip(ids,ids[1:]+ids[:1]):
   edge=tuple(sorted((x,y)));counts[edge]+=1
 boundary={e for e,c in counts.items() if c==1}
 graph=collections.defaultdict(set)
 for x,y in boundary:graph[x].add(y);graph[y].add(x)
 loops=[];seen=set()
 for start in graph:
  if start in seen:continue
  todo=[start];group=set()
  while todo:
   v=todo.pop()
   if v in group:continue
   group.add(v);todo.extend(graph[v]-group)
  seen|=group
  es=sum(len(graph[v]) for v in group)//2
  ordered=sorted(group)
  q=[pts[v] for v in ordered]
  bounds=[vec([min(p[i] for p in q) for i in range(3)]),vec([max(p[i] for p in q) for i in range(3)])]
  loops.append({'vertex_count':len(group),'edge_count':es,'closed_cycle':all(len(graph[v])==2 for v in group) and es==len(group),'branched':any(len(graph[v])>2 for v in group),'bounds':bounds})
 loops.sort(key=lambda x:x['edge_count'],reverse=True)
 slices=[]
 for i in range(11):
  z=lo.z+(hi.z-lo.z)*i/10;tol=max((hi.z-lo.z)*.04,1e-6)
  q=[p for p in pts if abs(p.z-z)<=tol]
  slices.append({'height_fraction':i/10,'vertex_count':len(q),'width':r(max(p.x for p in q)-min(p.x for p in q)) if q else None,'depth':r(max(p.y for p in q)-min(p.y for p in q)) if q else None})
 groups=collections.Counter();weights=[]
 for v in m.vertices:
  groups[len(v.groups)]+=1
  weights.extend(g.weight for g in v.groups)
 armatures=[mod.object.name for mod in o.modifiers if mod.type=='ARMATURE' and mod.object]
 return {'name':o.name,'role_guess':role(o.name),'vertices':len(pts),'triangles':sum(len(p.vertices)-2 for p in m.polygons),'bounds_world':[vec(lo),vec(hi)],'dimensions_world':vec(hi-lo),'boundary_edges':len(boundary),'boundary_components':loops[:50],'boundary_component_count':len(loops),'nonmanifold_edges_over_two_faces':sum(c>2 for c in counts.values()),'horizontal_slices':slices,'uv_layers':len(m.uv_layers),'materials':[mat.name for mat in m.materials if mat],'shape_keys':[{'name':k.name,'vertex_count':len(k.data)} for k in m.shape_keys.key_blocks] if m.shape_keys else [],'vertex_group_influence_histogram':dict(groups),'weight_min_max':[r(min(weights)),r(max(weights))] if weights else None,'armature_modifiers':armatures}
meshes=[mesh_info(o) for o in bpy.context.scene.objects if o.type=='MESH']
meshes=[x for x in meshes if x]
rigs=[]
for o in bpy.context.scene.objects:
 if o.type!='ARMATURE':continue
 rigs.append({'name':o.name,'bone_count':len(o.data.bones),'bone_names':[b.name for b in o.data.bones],'parent_links':sum(b.parent is not None for b in o.data.bones)})
report={'schema_version':1,'source_basename':os.path.basename(src),'coordinate_warning':'World axes follow importer; forward direction and units must be calibrated before cross-model ratios','roles_warning':'Mesh role classification uses object names and needs manual verification','geometry':meshes,'materials':[mat_info(m) for m in bpy.data.materials],'armatures':rigs,'reconstruction_limit':'Summary metrics do not reproduce copyrighted meshes or textures; only independently designed shapes may be generated','review_status':'UNREVIEWED'}
os.makedirs(os.path.dirname(os.path.abspath(dst)),exist_ok=True)
with open(dst,'w',encoding='utf8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
print('QUALITY_REPORT_WRITTEN',dst,'meshes',len(meshes),'materials',len(report['materials']))
