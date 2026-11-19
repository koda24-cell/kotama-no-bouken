"""Assassin V18 Candidate B: Shibu Face-preserving Coons quad patch.
Review-only, NOT_APPROVED. Does not use old standalone Assassin head.
Usage: blender -b --python build_v18_candidate_b.py -- shibu.vrm boundary.json out_dir
"""
import bpy, bmesh, math, json, os, sys, hashlib
from collections import Counter
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=3: raise SystemExit('Expected Shibu.vrm boundary-loops.json output_dir')
source,report_path,out=args; os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
original=next((o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.lower()=='face'),None)
if original is None: raise RuntimeError('Source Face mesh missing')
report=json.load(open(report_path))
entry=next(x for x in report['objects'] if x['name']==original.name)
comp=entry['components'][5]
assert comp['simple_cycle'] and len(comp['paths'])==1
path=comp['paths'][0]['vertex_indices']
assert len(path)==37 and path[0]==path[-1] and len(set(path[:-1]))==36
rim_ids=path[:-1]
matrix=original.matrix_world.copy(); inv=matrix.inverted()
rim=[matrix@original.data.vertices[i].co for i in rim_ids]
# The original boundary starts in the chin/nape region and travels clockwise
# around right side, crown, left side. Four corners at 2, 11, 20, 29.
# Build a real two-dimensional 9x9 quad patch with NO radial rings and NO center fan.
N=9
def boundary_id(u,v):
    if v==0:return rim_ids[(2+u)%36]
    if u==N:return rim_ids[(11+v)%36]
    if v==N:return rim_ids[(29-u)%36]
    if u==0:return rim_ids[(2-v)%36]
    return None
def original_point(u,v):return matrix@original.data.vertices[boundary_id(u,v)].co
def coons(u,v):
    s=u/N;t=v/N
    b=original_point(u,0); top=original_point(u,N)
    l=original_point(0,v); right=original_point(N,v)
    c00=original_point(0,0);c10=original_point(N,0)
    c11=original_point(N,N);c01=original_point(0,N)
    p=(1-t)*b+t*top+(1-s)*l+s*right-((1-s)*(1-t)*c00+s*(1-t)*c10+s*t*c11+(1-s)*t*c01)
    # Broad, smooth cranial vault. More fullness in the upper occiput,
    # gradually narrow into nape. No single vertex at the far posterior.
    # Extended egg-shaped occipital volume: shift the broad posterior bulge
    # upwards, stop the pointed wedge at the lowest rear and keep temples full.
    def smoothstep(a,b,x):
        y=max(0.0,min(1.0,(x-a)/(b-a)))
        return y*y*(3-2*y)
    side=smoothstep(0,.25,s)*smoothstep(1,.75,s)
    top=smoothstep(0,.26,t)*smoothstep(1,.88,t)
    height=0.80+0.20*math.exp(-((t-.69)/.25)**2)
    p.y-=0.142*side*top*height
    return p
# Preserve imported original mesh as a hidden immutable snapshot in .blend.
original.name='Shibu_FACE_ORIGINAL_UNMODIFIED'
original.hide_render=True
candidate=original.copy();candidate.data=original.data.copy()
candidate.name='Assassin_V18_Candidate_B_SOURCE_FACE_PRESERVED'
bpy.context.collection.objects.link(candidate);candidate.hide_render=False
bm=bmesh.new();bm.from_mesh(candidate.data);bm.verts.ensure_lookup_table()
original_count=len(bm.verts);original_faces=len(bm.faces)
source_vertices=tuple(bm.verts[i] for i in range(original_count))
grid={}
for v in range(N+1):
    for u in range(N+1):
        idx=boundary_id(u,v) if (u==0 or u==N or v==0 or v==N) else None
        if idx is not None:
            grid[(u,v)]=source_vertices[idx]
        else:
            grid[(u,v)]=bm.verts.new(inv@coons(u,v))
bm.verts.ensure_lookup_table();bm.verts.index_update()
faces=[]
for v in range(N):
    for u in range(N):
        v00,v10,v11,v01=(grid[(u,v)],grid[(u+1,v)],grid[(u+1,v+1)],grid[(u,v+1)])
        faces.append(bm.faces.new((v00,v10,v11,v01)))
# Orient new faces opposite pre-existing source surface across the seam.
# Check first rim edge and invert *only newly added* polygons if needed.
boundary_lookup={}
for face in bm.faces:
    if face in faces:continue
    for loop in face.loops:
        a,b=loop.vert.index,loop.link_loop_next.vert.index
        if (a in rim_ids and b in rim_ids):
            boundary_lookup[(a,b)]=True
a=boundary_id(0,0);b=boundary_id(1,0)
# Patch's bottom boundary direction is a->b for the first quad.
if (a,b) in boundary_lookup:
    for f in faces:f.normal_flip()
bm.normal_update()
# Source vertex positions must be bit-for-bit unchanged.
for i,v in enumerate(original.data.vertices):
    if (source_vertices[i].co-v.co).length>1e-9:
        raise RuntimeError('Source vertex position changed')
bm.to_mesh(candidate.data);bm.free();candidate.data.update()
# Validate seam and topology on final Blender mesh.
edges=Counter()
for poly in candidate.data.polygons:
    ids=list(poly.vertices)
    for a,b in zip(ids,ids[1:]+ids[:1]):edges[tuple(sorted((a,b)))]+=1
seam=[tuple(sorted((rim_ids[i],rim_ids[(i+1)%36]))) for i in range(36)]
seam_inc=[edges[e] for e in seam]
if seam_inc!=[2]*36:raise RuntimeError('Unwelded / nonmanifold seam: '+str(seam_inc))
nonmanifold=[e for e,v in edges.items() if v>2]
if nonmanifold:raise RuntimeError(f'Nonmanifold edges {len(nonmanifold)}')
# Surface normals must be continuous enough to inspect, not inferred from manifold.
areas=[f.area for f in candidate.data.polygons]
if min(areas)<=1e-10:raise RuntimeError('Degenerate face')
new_poly_count=len(candidate.data.polygons)-original_faces
assert new_poly_count==81
added=len(candidate.data.vertices)-original_count
assert added==64
source_hash=hashlib.sha256(open(source,'rb').read()).hexdigest()
checks={'version':'V18_candidate_B','approval':'NOT_APPROVED','source_vrm_sha256':source_hash,
'source_mesh':'Shibu Face','rim_vertex_count':36,
'original_vertex_count':original_count,'original_polygon_count':original_faces,
'added_vertices':added,'added_quads':new_poly_count,
'seam_incidence':seam_inc,'all_36_seam_edges_welded':True,
'nonmanifold_edges_gt2':len(nonmanifold),'minimum_polygon_area':min(areas),
'modeling_method':'9x9 Coons transfinite quadrilateral surface with anisotropic occipital heightfield',
'legacy_assassin_head_used':False,'visual_approval':False}
with open(os.path.join(out,'qa.json'),'w') as f:json.dump(checks,f,indent=2)
# Keep the test scene uncluttered. Imported accessories remain in .blend but not render.
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and obj!=candidate:obj.hide_render=True
clay=bpy.data.materials.new('V18_review_clay');clay.diffuse_color=(.73,.67,.65,1)
clay.use_nodes=True;clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.73,.67,.65,1)
clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.83
bpy.context.scene.view_layers[0].material_override=clay
for polygon in candidate.data.polygons:polygon.use_smooth=True
scene=bpy.context.scene
available={e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in available else 'BLENDER_EEVEE'
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(.6,.6,.6)
mid=sum(rim,Vector())/len(rim)
for pos,power,size in [((1,2,3),420,1.4),((-2,-1,3),300,2.2)]:
    p=mid+Vector(pos)
    bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.size=size
    o.rotation_euler=(mid-p).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=.43
scene.camera=cam
views=[('front',(0,1,0)),('back',(0,-1,0)),('left',(-1,0,0)),
       ('right',(1,0,0)),('three_quarter',(1,1,.25)),('back_upper',(1,-1,.6))]
for name,d in views:
    cam.location=mid+Vector(d).normalized()*1.5
    cam.rotation_euler=(mid-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(out,name+'.png')
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_v18_candidate_b.blend'))
# Export only review candidate (never the unchanged source snapshot).
bpy.ops.object.select_all(action='DESELECT');candidate.select_set(True);bpy.context.view_layer.objects.active=candidate
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_v18_candidate_b_review.glb'),export_format='GLB',use_selection=True)
manifest={'version':'V18_B','approval':'NOT_APPROVED','source_sha256':source_hash,
'generator':'tools/character-mesh-research/build_v18_candidate_b.py','outputs':{}}
for file in os.listdir(out):
    p=os.path.join(out,file)
    if os.path.isfile(p) and file!='manifest.json':
        manifest['outputs'][file]={'bytes':os.path.getsize(p),'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()}
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('V18_B_QA',json.dumps(checks))
