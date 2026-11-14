"""Compose existing V13 wall with Poly Haven Rock Face 02 scanned geometry; render five views."""
import bpy,sys,os,math
from pathlib import Path
from mathutils import Vector
src,reference,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
base=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not base:raise RuntimeError('Missing original V13 geometry')
for o in base:o['v13_preserved']=True
# Import scanned cliff without removing existing meshes.
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.import_scene.gltf(filepath=os.path.abspath(reference))
added=[o for o in bpy.context.selected_objects if o.type=='MESH']
if not added:raise RuntimeError('Missing Poly Haven geometry')
# Ground all imported geometry into wall's front (+Y in Blender after glTF conversion).
# Each cluster is independently oriented and stretched to break the rectangular silhouette.
from mathutils import Matrix
def world_bounds(objects):
 pts=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
 return Vector([min(p[i] for p in pts) for i in range(3)]),Vector([max(p[i] for p in pts) for i in range(3)])
lo,hi=world_bounds(base);center=(lo+hi)/2
rlo,rhi=world_bounds(added);rcenter=(rlo+rhi)/2
rs=rhi-rlo
# Make imported cliff broad across x, tall across z, and substantial across y.
target=Vector((4.0,2.0,4.1))
scale=min(target[i]/max(rs[i],.01) for i in range(3))
for o in added:
 o.matrix_world=Matrix.Translation(Vector((-2.3,lo.y-1.05,center.z+1.1))) @ Matrix.Rotation(math.radians(-11),4,'Y') @ Matrix.Scale(scale,4) @ Matrix.Translation(-rcenter) @ o.matrix_world
 o['source']='Poly Haven Rock Face 02 / CC0'
# Duplicated masses are not independent floating rocks: overlap the existing solid wall.
for j,(x,z,angle,s) in enumerate([(1.7,-.65,16,.83),(3.15,1.35,-23,.58)]):
 for o in added:
  cp=o.copy();cp.data=o.data.copy();bpy.context.collection.objects.link(cp)
  pivot=Vector((-2.3,lo.y-.32,center.z+1.1))
  cp.matrix_world=Matrix.Translation(Vector((x+2.3,.10,z-(center.z+1.1)))) @ Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(angle),4,'Y') @ Matrix.Scale(s,4) @ Matrix.Translation(-pivot) @ o.matrix_world
  cp['source']='Poly Haven Rock Face 02 / CC0'
# Neutral basalt material while preserving scan geometry; no original rock removed.
mat=bpy.data.materials.new('volcanic_basalt_scan');mat.diffuse_color=(.12,.115,.11,1);mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.16,.145,.14,1);bsdf.inputs['Roughness'].default_value=.94
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.get('source'):
  o.data.materials.clear();o.data.materials.append(mat)
# V15: deform the existing wall's perimeter, retaining all faces and original fissure meshes.
# The original wall geometry is still present: only its outer edge vertices are sculpted.
for obj in base:
 if obj.type!='MESH' or len(obj.data.vertices)<2000:continue
 from mathutils import Vector
 verts=obj.data.vertices
 local=[v.co.copy() for v in verts]
 xx=[v.x for v in local];zz=[v.z for v in local]
 xlo,xhi=min(xx),max(xx);zlo,zhi=min(zz),max(zz)
 if xhi-xlo<3 or zhi-zlo<3:continue
 for v in verts:
  p=v.co;u=(p.x-xlo)/(xhi-xlo);w=(p.z-zlo)/(zhi-zlo)
  # Natural nonrectangular outline: edge-only lateral and vertical erosion.
  left=math.exp(-(u/.12)**2);right=math.exp(-((1-u)/.12)**2)
  top=math.exp(-((1-w)/.12)**2);bottom=math.exp(-(w/.11)**2)
  p.x+=left*(.25+.20*math.sin(w*11)+.10*math.sin(w*23))
  p.x-=right*(.35+.22*math.sin(w*9+1.2)+.12*math.cos(w*19))
  p.z-=top*(.20+.30*math.sin(u*12+.4)**2+.15*math.sin(u*24)**2)
  p.z+=bottom*(.08+.10*math.sin(u*17)**2)
 obj.data.update()
# Use broad asymmetric scan-rock clusters that overlap the existing mother-rock
# and do not form a detached shelf under the wall.
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH' or not obj.get('source'):continue
 obj.location.z+=.38
 obj.location.y-=.95
# Add hand-sculpted basalt buttresses to mask straight side-wall profiles.
rock=bpy.data.materials.get('volcanic_basalt_scan')
for j,(sx,sy,sz,rx,ry,rz) in enumerate([
 (-4.10,lo.y+.20,center.z-1.45,.70,.80,1.70),
 ( 4.02,lo.y+.17,center.z+1.10,.76,.85,1.95),
 (-3.95,lo.y+.15,center.z+1.75,.58,.64,1.25),
 ( 3.70,lo.y+.30,center.z-1.90,.82,.68,1.10)]):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(sx,sy,sz))
 b=bpy.context.object;b.name='V15 basalt edge buttress '+str(j)
 for v in b.data.vertices:
  n=v.co
  jitter=1+.12*math.sin(n.x*7+j)+.08*math.cos(n.z*11+j)
  n.x*=rx*jitter;n.y*=ry*jitter;n.z*=rz*jitter
 b.data.materials.append(rock)
 b['source']='Additive irregular basalt edge buttress'

# V17: front camera looks from +Y. Previous versions placed the scan at lo.y
# (the BACK of the wall), so the intact mother rock occluded it.
# Place the rear of each scanned cluster just inside the mother rock FRONT.
# Keep some penetration to hide seams, without burying the scanned surface.
scan_objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and 'Poly Haven' in o.get('source','')]
if not scan_objects:raise RuntimeError('Missing scan meshes for front alignment')
base_front=world_bounds(base)[1].y
for o in scan_objects:
 scan_back=world_bounds([o])[0].y
 o.matrix_world.translation.y+=base_front-.38-scan_back
scan_front=world_bounds(scan_objects)[1].y
if scan_front<=base_front+.25:raise RuntimeError('Scan remains buried: %.3f <= %.3f'%(scan_front,base_front))
print('SCAN_ALIGNMENT_OK','mother_front',base_front,'scan_front',scan_front,'scan_count',len(scan_objects))

# V23: broad planar basalt faces, fracture borders, and all-sided relief.
# Existing V13 geometry and glowing fissure meshes are kept intact.
# Unlike smooth waves, nearest-cell faceting produces plateaus and sharp boundaries.
from mathutils import noise as bnoise
import random
rng=random.Random(2301)
cells=[]
for row in range(5):
 for col in range(6):
  cx=-4.4+col*1.76+rng.uniform(-.40,.40)
  cz=-3.5+row*1.75+rng.uniform(-.42,.42)
  depth=rng.uniform(-.37,.38)
  slopex=rng.uniform(-.16,.16)
  slopez=rng.uniform(-.14,.14)
  cells.append((cx,cz,depth,slopex,slopez))
def facet(x,z):
 # Irregular Voronoi slabs with subtle sloped planes and narrow weathered seams.
 ranked=sorted(((x-cx)**2+(z-cz)**2,i) for i,(cx,cz,*_) in enumerate(cells))
 cx,cz,depth,sx,sz=cells[ranked[0][1]]
 d1=math.sqrt(ranked[0][0]);d2=math.sqrt(ranked[1][0])
 seam=max(0.,1.-(d2-d1)/.28)
 face=depth+sx*(x-cx)+sz*(z-cz)
 return face-.12*seam
sculpted=0
for obj in base:
 if obj.type!='MESH' or len(obj.data.vertices)<2000:continue
 coords=[v.co.copy() for v in obj.data.vertices]
 xmin=min(p.x for p in coords);xmax=max(p.x for p in coords)
 ymin=min(p.y for p in coords);ymax=max(p.y for p in coords)
 zmin=min(p.z for p in coords);zmax=max(p.z for p in coords)
 if xmax-xmin<3 or zmax-zmin<3:continue
 mid=(ymin+ymax)*.5
 half=max(.01,(ymax-ymin)*.5)
 for v in obj.data.vertices:
  p=v.co
  side=(p.y-mid)/half
  front=1. if side>=0 else -1.
  # Front and back each receive relief; the side perimeter is shaped as well.
  x,z=p.x,p.z
  relief=facet(x,z)
  if front<0:relief=facet(x+.83,z-.47)*.72
  q=Vector((x*.8,z*.8,2.4))
  fine=.035*bnoise.noise(q)
  p.y+=front*(relief+fine)*(.40+.60*abs(side))
  edge=min((x-xmin)/(xmax-xmin),(xmax-x)/(xmax-xmin))
  edge=max(0.,min(1.,(0.13-edge)/.13))
  # Break flat side walls, without tearing boundary vertices away.
  p.x+=(-1 if x<0 else 1)*edge*(.16*math.sin(z*1.5)+.08*math.cos(z*3.1))
 obj.data.update();sculpted+=1
if sculpted==0:raise RuntimeError('V23 mother wall not found')
print('V23_FACETED_MOTHER_MESHES',sculpted)
# Recess scans more deeply; use them as embedded detail, not detached stone piles.
for o in scan_objects:
 o.matrix_world.translation.y-=.72
print('V23_SCANS_EMBEDDED',len(scan_objects))
# Existing V15 side buttresses remain as additional geometry.
# V24 rock-only preview: exclude molten ribbons, hot pockets and diagnostic scan rocks.
# The original V13 meshes remain untouched in the source GLB and source code.
# Keep only the dense V13 mother-rock mesh and existing basalt edge buttresses.
mother=[o for o in base if o.type=='MESH' and len(o.data.vertices)>2000]
if not mother:raise RuntimeError('V24 mother rock missing')
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 if o in mother or o.name.startswith('V15 basalt edge buttress'):continue
 bpy.data.objects.remove(o,do_unlink=True)
scan_objects=[]
print('V24_ROCK_ONLY',len(mother),'no lava no scan')
# V25: high-frequency stone micro-relief + layered basalt material.
# Fine geometry variation is baked into mesh positions (survives GLB export).
# Procedural Bump and Noise are Blender-render-only until baked to normal maps.
from mathutils import noise as rock_noise
for obj in mother:
 for v in obj.data.vertices:
  p=v.co
  n=Vector((p.x*9.2,p.y*9.2,p.z*9.2))
  coarse=rock_noise.noise(n)
  fine=rock_noise.noise(n*2.4)
  normal=v.normal.copy()
  if normal.length>.01:
   p+=normal.normalized()*(.023*coarse+.008*fine)
 obj.data.update()
basalt=bpy.data.materials.new('V25 Basalt dark stone layered bump')
basalt.use_nodes=True
nodes=basalt.node_tree.nodes;nodes.clear()
links=basalt.node_tree.links
out=nodes.new('ShaderNodeOutputMaterial')
bs=nodes.new('ShaderNodeBsdfPrincipled')
bs.inputs['Roughness'].default_value=.93
bs.inputs['Metallic'].default_value=0
links.new(bs.outputs['BSDF'],out.inputs['Surface'])
tex=nodes.new('ShaderNodeTexCoord')
noise_big=nodes.new('ShaderNodeTexNoise');noise_big.inputs['Scale'].default_value=2.6;noise_big.inputs['Detail'].default_value=4.0;noise_big.inputs['Roughness'].default_value=.72
noise_small=nodes.new('ShaderNodeTexNoise');noise_small.inputs['Scale'].default_value=34.;noise_small.inputs['Detail'].default_value=3.5;noise_small.inputs['Roughness'].default_value=.76
links.new(tex.outputs['Generated'],noise_big.inputs['Vector'])
links.new(tex.outputs['Generated'],noise_small.inputs['Vector'])
ramp=nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position=.20
ramp.color_ramp.elements[0].color=(.055,.050,.049,1)
ramp.color_ramp.elements[1].position=.82
ramp.color_ramp.elements[1].color=(.22,.20,.185,1)
ramp.color_ramp.elements.new(.50).color=(.12,.112,.105,1)
links.new(noise_big.outputs['Fac'],ramp.inputs['Fac'])
links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
bump=nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value=.35
bump.inputs['Distance'].default_value=.045
links.new(noise_small.outputs['Fac'],bump.inputs['Height'])
links.new(bump.outputs['Normal'],bs.inputs['Normal'])
for obj in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 obj.data.materials.clear();obj.data.materials.append(basalt)
print('V25_BASALT_MICRO_RELIEF_AND_BUMP_READY',len(mother))
# V26: fire-cave dark charcoal basalt with oxidized brown / muted ember undertones.
# Add angular fracture planes to existing mother mesh, including back and side boundaries.
import random
rng26=random.Random(2604)
plates26=[(rng26.uniform(-4.5,4.5),rng26.uniform(-3.7,3.7),rng26.uniform(-.22,.27),rng26.uniform(-.18,.18),rng26.uniform(-.18,.18)) for _ in range(28)]
for obj in mother:
 for v in obj.data.vertices:
  p=v.co
  candidates=sorted(plates26,key=lambda a:(p.x-a[0])**2+(p.z-a[1])**2)
  cx,cz,h,sx,sz=candidates[0]
  # Flat, sloped facets with irregular fractures, not smooth waves.
  relief=h+sx*(p.x-cx)+sz*(p.z-cz)
  p.y+=relief*.65
 obj.data.update()
# Break the artificial square side silhouette with fused, angular stone masses.
# The source mesh is preserved; these are additive edge geometry.
for i,(x,z,scale) in enumerate([(-4.24,-2.8,.90),(-4.32,-.5,1.06),(-4.22,2.15,.98),(4.20,-2.45,1.02),(4.26,.35,.92),(4.12,2.65,.87)]):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,.28,z))
 rock=bpy.context.object;rock.name='V26 integrated angular side basalt %02d'%i
 rock.scale=(scale,.92,scale*1.36)
 rock.rotation_euler=(.15*i,.23*i,.31*i)
 rock.data.materials.append(basalt)
 rock['purpose']='side silhouette breakup - additive'
# Charcoal base with rusty volcanic brown, not red-hot glowing lava.
ramp.color_ramp.elements[0].color=(.032,.027,.026,1)
ramp.color_ramp.elements[1].color=(.20,.115,.083,1)
for el in ramp.color_ramp.elements:
 if abs(el.position-.50)<.01:el.color=(.095,.068,.057,1)
basalt.name='V26 Fire Cave Basalt - charcoal and oxidized brown'
print('V26_ANGULAR_FIRE_CAVE_BASALT_READY')
# V27: fivefold world-coordinate enlargement, actual geometry subdivision, and lifted shadow values.
# Apply to all meshes to preserve their relative positions and existing shapes.
import bmesh
for obj in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 if obj in mother:
  bm=bmesh.new();bm.from_mesh(obj.data)
  bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=2,use_grid_fill=True)
  bm.to_mesh(obj.data);bm.free()
  # Add gentle fine variation after subdividing so newly created vertices carry relief.
  for vert in obj.data.vertices:
   p=vert.co
   n=rock_noise.noise(Vector((p.x*4.5,p.y*4.5,p.z*4.5)))
   p.y+=n*.012
  obj.data.update()
 # Scale mesh vertices and object positions uniformly; dimensions are exactly 5x.
 obj.location*=5.0
 obj.scale*=5.0
# Keep contrast in volcanic palette while lifting the black floor.
ramp.color_ramp.elements[0].color=(.105,.084,.076,1)
ramp.color_ramp.elements[1].color=(.32,.21,.165,1)
for el in ramp.color_ramp.elements:
 if abs(el.position-.50)<.01:el.color=(.185,.134,.113,1)
bs.inputs['Roughness'].default_value=.89
print('V27_FIVEFOLD_SCALE_SUBDIVIDED_AND_SHADOWS_LIFTED',len(mother))
# V28: Replace disconnected primitive edge rocks with reused CC0 Poly Haven rock scan.
# Keep mother geometry unchanged, use the existing imported rock_face_02_1k.glb.
for obj in list(bpy.context.scene.objects):
 if obj.name.startswith('V26 integrated angular side basalt'):
  bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(reference))
scan28=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
if not scan28:raise RuntimeError('V28 scanned rock geometry unavailable')
# Create a joined source mesh so placements stay coherent.
bpy.ops.object.select_all(action='DESELECT')
for o in scan28:o.select_set(True)
bpy.context.view_layer.objects.active=scan28[0]
bpy.ops.object.join()
template=bpy.context.view_layer.objects.active
# Source mesh is an authentic scan. Normalize bounds and place clusters intersecting wall edges.
from mathutils import Matrix
vlo,vhi=world_bounds([template])
vcenter=(vlo+vhi)*.5
extent=vhi-vlo
template.matrix_world=Matrix.Identity(4)
# Use mesh-local coordinates after transforms; center around origin.
for v in template.data.vertices:v.co-=vcenter
template.data.update()
local=[v.co for v in template.data.vertices]
span=Vector((max(v.x for v in local)-min(v.x for v in local),max(v.y for v in local)-min(v.y for v in local),max(v.z for v in local)-min(v.z for v in local)))
# V27 geometry was scaled 5x, so embed each scanned cluster inside the expanded wall edges.
for i,(x,z,sz) in enumerate([(-19,-13,1.0),(-20,1,1.2),(-19,13,1.0),(19,-12,1.1),(20,0,1.0),(19,13,.95)]):
 obj=template if i==0 else template.copy()
 if i:obj.data=template.data.copy();bpy.context.collection.objects.link(obj)
 obj.name='V28 scanned integrated basalt %02d'%i
 obj.matrix_world=Matrix.Translation(Vector((x,0,z))) @ Matrix.Rotation(.28*i,4,'Z') @ Matrix.Diagonal(Vector((sz*6/max(span.x,.01),sz*5/max(span.y,.01),sz*10/max(span.z,.01),1)))
 obj.data.materials.clear();obj.data.materials.append(basalt)
 obj['source']='Poly Haven Rock Face 02 CC0'
 obj['purpose']='overlapping mother-rock edge, no detached primitive'
print('V28_CC0_SCANNED_EDGE_ROCKS',6)
# V29: isolated rock VFX trial, no changes to existing mother-rock mesh.
# Procedural preview only; external CC0 particle PNG packs not yet downloaded.
import random
rng=random.Random(290415)
def vfx_material(name,color,strength):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1)
 bs.inputs['Emission Color'].default_value=(*color,1)
 bs.inputs['Emission Strength'].default_value=strength
 return m
embermat=vfx_material('V29 amber embers',(.95,.18,.018),3.5)
hotmat=vfx_material('V29 lava crack orange',(.85,.055,.007),2.2)
smokemat=vfx_material('V29 smoke preview',(.12,.105,.11),.06)
# V27 scale world extents: a sparse, nonuniform set of sparks around wall base.
for i in range(55):
 x=rng.uniform(-21,21);z=rng.uniform(-20,14);y=rng.uniform(-4,4)
 r=rng.uniform(.055,.16)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=(x,y,z))
 o=bpy.context.object;o.name='V29 ember %03d'%i;o.data.materials.append(embermat)
# Small warm fissure highlights, deliberately irregular and discontinuous.
for i in range(24):
 x=rng.uniform(-17,17);z=rng.uniform(-17,15)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=(x,-3.2,z))
 o=bpy.context.object;o.name='V29 lava seam %03d'%i
 o.scale=(rng.uniform(.045,.10),.05,rng.uniform(.3,1.2))
 o.rotation_euler[1]=rng.uniform(-.7,.7);o.data.materials.append(hotmat)
# Sparse semi-transparent-looking smoke wisps as dark gray layered ellipsoids;
# true alpha sprites and animated noise are reserved for Three.js runtime test.
for i in range(14):
 x=rng.uniform(-18,18);z=rng.uniform(-13,18)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,2.5,z))
 o=bpy.context.object;o.name='V29 smoke proxy %03d'%i
 o.scale=(rng.uniform(.5,1.2),rng.uniform(.3,.6),rng.uniform(1.2,2.3))
 o.data.materials.append(smokemat)
print('V29_VFX_PREVIEW',55,24,14)
# V30: magma flow over the FRONT of the rock face, not a detached floor puddle.
# Animated texture coordinates can later be driven by Three.js; the GLB contains actual ribbons.
import math
for ob in list(bpy.context.scene.objects):
 if ob.name.startswith('V29 smoke proxy'):
  bpy.data.objects.remove(ob,do_unlink=True)
magma_core=vfx_material('V30 flowing magma molten core',(.96,.12,.008),4.0)
magma_edge=vfx_material('V30 magma hot border',(.36,.018,.004),1.6)
magma_glint=vfx_material('V30 magma bright highlights',(1,.45,.045),5.0)
# Ribbons follow irregular vertical paths and widen near the bottom, partially overlapping the mother wall.
def make_flow(name,seed,x0,z_top,length,width,material,yoffset):
 verts=[];faces=[];steps=42
 for j in range(steps+1):
  t=j/steps;z=z_top-length*t
  cx=x0+math.sin(t*5.5+seed)*.65+math.sin(t*14+seed*1.8)*.20
  w=width*(.72+.35*t+.13*math.sin(t*17+seed))
  y=yoffset+math.sin(t*11+seed)*.20
  verts.extend([(cx-w/2,y,z),(cx+w/2,y,z)])
  if j:faces.append(((j-1)*2,(j-1)*2+1,j*2+1,j*2))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);ob.data.materials.append(material)
 ob['vfx']='flowing magma';ob['flow_direction']='down';ob['flow_speed']=.18+seed*.035
 return ob
for k,(x,z,L,w) in enumerate([(-14,17,29,1.6),(-5,11,25,1.15),(7,19,32,1.8),(15,8,21,1.1)]):
 make_flow('V30 magma dark edge %d'%k,k+1,x,z,L,w*1.4,magma_edge,4.1)
 make_flow('V30 magma molten river %d'%k,k+1,x,z,L,w,magma_core,4.24)
 make_flow('V30 magma central glow %d'%k,k+1,x,z,L,w*.23,magma_glint,4.35)
# More visible glow near rock foot, while leaving enough dark stone to read geometry.
for k,x in enumerate([-14,-5,7,15]):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,4.2,-16.5))
 o=bpy.context.object;o.name='V30 magma accumulation %d'%k;o.scale=(1.3,.2,.55)
 o.data.materials.append(magma_core)
print('V30_MAGMA_FLOWS',4,'ribbons',12)
# Save complete composite GLB for review.
os.makedirs(outdir,exist_ok=True)
glb=os.path.join(outdir,'b4-v30-polyhaven-rockwall-composite.glb')
bpy.ops.export_scene.gltf(filepath=os.path.abspath(glb),export_format='GLB')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
lo,hi=world_bounds(meshes);center=(lo+hi)/2;size=max(hi[i]-lo[i] for i in range(3))
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=size*1.3;bpy.context.scene.camera=cam
for vec,power,scale in [((-3,3,5),1800,1.0),((4,2,1),950,2.8),((1,-2,4),700,2.2)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(vec)*size)
 light=bpy.context.object;light.data.energy=power*max(size,1);light.data.size=size*scale;aim(light,center)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=36
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.world.color=(.2,.2,.2)
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=1.65
for label,direction in [('front-lit',(0,1,.12)),('front-level',(0,1,0)),('angle-lit',(1,1,.28)),('side-lit',(1,0,.12)),('back-lit',(0,-1,.12))]:
 cam.location=center+Vector(direction).normalized()*size*2.7;aim(cam,center)
 scene.render.filepath=os.path.abspath(os.path.join(outdir,'b4-v30-'+label+'.png'))
 bpy.ops.render.render(write_still=True)
 if not os.path.exists(scene.render.filepath):raise RuntimeError('Missing '+label)
 print('RENDER_OK',label)
print('V28_SCANNED_SURROUNDINGS_OK',len(base),len(added),len(meshes),glb)
