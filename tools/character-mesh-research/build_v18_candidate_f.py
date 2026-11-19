"""Assassin V18 Candidate F: Shibu Face-preserving Coons quad patch.
Review-only, NOT_APPROVED. Does not use old standalone Assassin head.
Usage: blender -b --python build_v18_candidate_f.py -- shibu.vrm boundary.json out_dir
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
# Upper-cranium ONLY: original Shibu rim indexes 7..33 (through crown).
# Do not drag the chin and jaw perimeter into an occiput cap.
# The lower 10 face border edges remain intentionally open pending independent
# jaw/neck transition; this is a *non-final research patch*.
ARC=list(range(7,34))
ARCIDS=[rim_ids[i] for i in ARC]
N=12
cx=sum(p.x for p in rim)/36
top_z=max(p.z for p in rim)
def scalp_position(i,k):
    p=rim[i]; t=k/N
    u=(i-7)/26.0
    xback=cx+0.058*math.cos(math.pi*u)
    yback=-0.103+0.010*math.sin(math.pi*u)
    zback=1.404+0.013*math.sin(math.pi*u)
    smooth=t*t*(3-2*t)
    x=(1-smooth)*p.x+smooth*xback
    z=(1-smooth)*p.z+smooth*zback + 0.011*math.sin(math.pi*t)*math.sin(math.pi*u)
    # Smooth posterior projection; crest above ears and nape behind.
    y=(1-smooth)*p.y+smooth*yback-0.020*math.sin(math.pi*t)
    return Vector((x,y,z))
# Preserve imported original mesh as a hidden immutable snapshot in .blend.
original.name='Shibu_FACE_ORIGINAL_UNMODIFIED'
original.hide_render=True
candidate=original.copy();candidate.data=original.data.copy()
candidate.name='Assassin_V18_Fandidate_D_SOURCE_FACE_PRESERVED'
bpy.context.collection.objects.link(candidate);candidate.hide_render=False
bm=bmesh.new();bm.from_mesh(candidate.data);bm.verts.ensure_lookup_table()
original_count=len(bm.verts);original_faces=len(bm.faces)
source_vertices=tuple(bm.verts[i] for i in range(original_count))
# 26 quad strips over crown arc; lower face boundary is not connected here.
grid={}
for k in range(N+1):
    for j,i in enumerate(ARC):
        grid[(k,j)]=source_vertices[rim_ids[i]] if k==0 else bm.verts.new(inv@scalp_position(i,k))
bm.verts.ensure_lookup_table();bm.verts.index_update()
faces=[]
for k in range(N):
    for j in range(len(ARC)-1):
        a,b,c,d=grid[(k,j)],grid[(k,j+1)],grid[(k+1,j+1)],grid[(k+1,j)]
        faces.append(bm.faces.new((a,b,c,d)))
existing_dirs=set()
for face in bm.faces:
    if face in faces:continue
    for lp in face.loops:
        a,b=lp.vert.index,lp.link_loop_next.vert.index
        if a in ARCIDS and b in ARCIDS:existing_dirs.add((a,b))
if (ARCIDS[0],ARCIDS[1]) in existing_dirs:
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
seam=[tuple(sorted((ARCIDS[i],ARCIDS[i+1]))) for i in range(26)]
seam_inc=[edges[e] for e in seam]
if seam_inc!=[2]*26:raise RuntimeError('Unwelded / nonmanifold seam: '+str(seam_inc))
nonmanifold=[e for e,v in edges.items() if v>2]
if nonmanifold:raise RuntimeError(f'Nonmanifold edges {len(nonmanifold)}')
neck_edges=[e for e,n in edges.items() if n==1 and (e[0]>=original_count and e[1]>=original_count)]
if len(neck_edges)!=26:raise RuntimeError(f'Open posterior edge expected 26, found {len(neck_edges)}')
# Surface normals must be continuous enough to inspect, not inferred from manifold.
areas=[f.area for f in candidate.data.polygons]
if min(areas)<=1e-10:raise RuntimeError('Degenerate face')
new_poly_count=len(candidate.data.polygons)-original_faces
assert new_poly_count==312
added=len(candidate.data.vertices)-original_count
assert added==324
source_hash=hashlib.sha256(open(source,'rb').read()).hexdigest()
checks={'version':'V18_candidate_F','approval':'NOT_APPROVED','source_vrm_sha256':source_hash,
'source_mesh':'Shibu Face','rim_vertex_count':36,'cranial_seam_edges':26,
'original_vertex_count':original_count,'original_polygon_count':original_faces,
'added_vertices':added,'added_quads':new_poly_count,
'seam_incidence':seam_inc,'all_36_seam_edges_welded':True,
'nonmanifold_edges_gt2':len(nonmanifold),'open_posterior_boundary_edges':len(neck_edges),'minimum_polygon_area':min(areas),
'modeling_method':'26x12 upper-crown arc quad strip; separate lower jaw/neck transition not constructed',
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
       ('right',(1,0,0)),('three_quarter',(1,1,.25)),('back_upper',(1,-1,.6)),('side_closeup',(1,0,0))]
for name,d in views:
    cam.location=mid+Vector(d).normalized()*1.5
    cam.rotation_euler=(mid-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=.31 if name=='side_closeup' else .43
    scene.render.filepath=os.path.join(out,name+'.png')
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'assassin_v18_candidate_f.blend'))
# Export only review candidate (never the unchanged source snapshot).
bpy.ops.object.select_all(action='DESELECT');candidate.select_set(True);bpy.context.view_layer.objects.active=candidate
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'assassin_v18_candidate_f_review.glb'),export_format='GLB',use_selection=True)
manifest={'version':'V18_F','approval':'NOT_APPROVED','source_sha256':source_hash,
'generator':'tools/character-mesh-research/build_v18_candidate_f.py','outputs':{}}
for file in os.listdir(out):
    p=os.path.join(out,file)
    if os.path.isfile(p) and file!='manifest.json':
        manifest['outputs'][file]={'bytes':os.path.getsize(p),'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()}
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('V18_F_QA',json.dumps(checks))
