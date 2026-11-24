"""One industrial ruin candidate per pinned shared Blender process."""
import os,traceback

def main():
 import sys,json,hashlib,subprocess,shutil,urllib.request,math,random
 from pathlib import Path
 ROOT=Path(__file__).resolve().parents[2];subprocess.run(['git','config','--global','--add','safe.directory',str(ROOT)],check=True);delivery=ROOT/os.environ['OUTPUT_DIR'];delivery.mkdir(parents=True,exist_ok=True)
 asset=delivery.name.removeprefix('f3-industrial-');parts=json.loads((ROOT/'tools/f3-industrial/parts.json').read_text());assert asset in [p['id']for p in parts]
 candidate=ROOT/'assets/3d/dungeons/b3_industrial_candidates';textures=candidate/'textures';textures.mkdir(parents=True,exist_ok=True)
 def scan(path,label):subprocess.run(['bash',str(ROOT/'tools/security/clamav_scan_gate.sh'),'scan',str(path),str(delivery/'security'/(label+'.log'))],check=True)
 scan(ROOT/'tools/f3-industrial','source');
 if asset in ['shattered_window','rebar_rubble']:scan(ROOT/'assets/3d/dungeons/b3_recovered_candidates','recovered-inputs')
 scan(ROOT/'tools/f1-sacred-forest','shared-source');scan(ROOT/'tools/f1-layer-v4/render_asset.py','renderer-source')
 sources=[]
 old=ROOT/'assets/models/floor3/double_flight/textures';scan(old,'existing-cc0-inputs')
 existing=json.loads((old/'sources.json').read_text())
 for kind,rows in existing['maps'].items():
  for role,row in rows.items():
   path=old/(kind+'_'+role+'.jpg');assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256'];shutil.copyfile(path,textures/path.name)
   sources.append(dict(asset=kind,role=role,file=path.name,url=row['url'],sha256=row['sha256'],license='CC0',reused=True))
 for kind in ['rusty_iron','asphalt_02']:
  meta=textures/(kind+'-api.json')
  def download(url,path,label):
   req=urllib.request.Request(url,headers={'User-Agent':'Kotama environment art (CC0 material research)'})
   with urllib.request.urlopen(req,timeout=90)as r:path.write_bytes(r.read(20000000))
   scan(path,label)
  if not meta.exists():download('https://api.polyhaven.com/files/'+kind,meta,kind+'-api')
  j=json.loads(meta.read_text())
  for role,key in [('diffuse','Diffuse'),('normal','nor_gl'),('roughness','Rough')]:
   row=j[key]['1k']['jpg'];path=textures/(kind+'_'+role+'.jpg')
   if not path.exists():download(row['url'],path,kind+'-'+role)
   sources.append(dict(asset=kind,role=role,file=path.name,url=row['url'],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),license='CC0'))
 if asset in ['v2_courtyard_facade','v2_service_tower']:
  # New photographic surfaces are scanned immediately after each retrieval,
  # before JSON parsing or Blender image decoding. Older deliveries unchanged.
  for kind in (['concrete_slab_wall','cracked_concrete_wall','concrete_debris']+(['worn_mossy_plasterwall'] if asset=='v2_courtyard_facade' else [])):
   meta=textures/(kind+'-api.json')
   if not meta.exists():download('https://api.polyhaven.com/files/'+kind,meta,kind+'-api')
   scan(meta,kind+'-api-input')
   j=json.loads(meta.read_text())
   for role,key in [('diffuse','Diffuse'),('normal','nor_gl'),('roughness','Rough')]:
    row=j[key]['1k']['jpg'];path=textures/(kind+'_'+role+'.jpg')
    if not path.exists():download(row['url'],path,kind+'-'+role)
    scan(path,kind+'-'+role+'-input')
    sources.append(dict(asset=kind,role=role,file=path.name,url=row['url'],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),license='CC0'))
 scan(textures,'all-texture-inputs')
 (textures/'sources.json').write_text(json.dumps({'supplier':'Poly Haven','license':'CC0','licenseURL':'https://polyhaven.com/license','maps':sources},indent=2))
 sys.path[:0]=[str(ROOT/'tools/f1-sacred-forest'),str(ROOT/'tools/f1-layer-v4'),str(Path(__file__).parent)]
 import bpy
 import common as c,render_asset
 c.ALLOWED_EXTENSIONS.update({'KHR_materials_transmission','KHR_materials_ior','KHR_materials_volume'})
 from mathutils import Vector
 OUT=candidate/asset;c.OUT=OUT;render_asset.OUT=OUT;c.render_imported_glb=render_asset.render_imported_glb
 c.reset_scene();bpy.context.preferences.filepaths.save_version=0
 def pbr(name,kind,metal=0):
  m=c.material('f3_'+name,texture_set={'basecolor':textures/(kind+'_diffuse.jpg'),'normal':textures/(kind+'_normal.jpg'),'roughness':textures/(kind+'_roughness.jpg')})
  m.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=metal
  return m
 concrete=pbr('weathered_concrete','chipped_concrete');moss=pbr('damp_concrete','concrete_moss');rust=pbr('oxidized_iron','rusty_iron',.15);asphalt=pbr('broken_asphalt','asphalt_02')
 fracture=c.material('f3_exposed_aggregate',(.26,.27,.245,1),.98);dark=c.material('f3_deep_crack',(.025,.029,.026,1),.97);steel=c.material('f3_bare_worn_steel',(.23,.25,.245,1),.48);steel.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.75
 rng=random.Random(33117+[p['id']for p in parts].index(asset))
 def box(name,loc,size,mat=concrete,bevel=.025):return c.cube(name,loc,size,mat,bevel)
 def rod(name,a,b,r=.018,mat=rust,sides=8):return c.tube(name,[a,b],r,mat,sides)
 def scar(obj,loc,size,angles=(0,0,0)):
  cutter=c.cube('temporary chisel',loc,size,None,0);cutter.rotation_euler=angles
  bpy.context.view_layer.objects.active=obj
  modifier=obj.modifiers.new('localized edge spalling','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
  bpy.ops.object.modifier_apply(modifier=modifier.name);bpy.data.objects.remove(cutter,do_unlink=True);c.uv_world(obj)
 if asset=='v2_courtyard_facade':
  from courtyard_facade_v2 import build
  build(dict(c=c,bpy=bpy,box=box,rod=rod,scar=scar,pbr=pbr,concrete=concrete,moss=moss,rust=rust,asphalt=asphalt,fracture=fracture,dark=dark,steel=steel,rng=rng,Vector=Vector,textures=textures))
 elif asset=='v2_service_tower':
  from service_tower_v2 import build
  build(dict(c=c,bpy=bpy,box=box,rod=rod,scar=scar,pbr=pbr,concrete=concrete,moss=moss,rust=rust,asphalt=asphalt,fracture=fracture,dark=dark,steel=steel,rng=rng,Vector=Vector,candidate=candidate,scan=scan))
 elif asset=='v2_fractured_road':
  from fractured_road_v2 import build
  build(dict(c=c,bpy=bpy,rng=rng,asphalt=asphalt,fracture=fracture,moss=moss))
 elif asset=='v2_truss_bridge':
  from truss_bridge_v2 import build
  build(dict(c=c,bpy=bpy,box=box,rod=rod,rust=rust,steel=steel,moss=moss,dark=dark,rng=rng))
 elif asset=='v2_wildflower_colony':
  from fern_colony_v2 import build
  build(dict(c=c,bpy=bpy,rng=rng,scan=scan,licensedPlant='periwinkle_plant',opacity='opacity',meshCount=6))
 elif asset=='v2_fern_colony':
  from fern_colony_v2 import build
  build(dict(c=c,bpy=bpy,rng=rng,scan=scan))
 elif asset=='retaining_wall':
  from weathering import wall_atlas
  diffuse,rough=wall_atlas(OUT/'sources/generated_materials',textures)
  aged=c.material('f3_rain_stained_wall',texture_set={'basecolor':diffuse,'normal':textures/'chipped_concrete_normal.jpg','roughness':rough})
  for node in list(aged.node_tree.nodes):
   if node.type=='TEX_IMAGE' and node.image.name=='chipped_concrete_normal.jpg':
    uv=aged.node_tree.nodes.new('ShaderNodeTexCoord');mapping=aged.node_tree.nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(4,6.5,1)
    aged.node_tree.links.new(uv.outputs['UV'],mapping.inputs['Vector']);aged.node_tree.links.new(mapping.outputs['Vector'],node.inputs['Vector'])
  def atlas_uv(obj):
   uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
   for poly in obj.data.polygons:
    for li in poly.loop_indices:
     co=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co
     axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=((1,2),(0,2),(0,1))[axis]
     uv.data[li].uv=(co[axes[0]]/4+.5,co[axes[1]]/(4 if axis==2 else 6.5)+(.72 if axis==2 else 0))
  def panel(name,profile):
   n=len(profile);verts=[(x,y,z)for y in[-.22,.22]for x,z in profile]
   faces=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]+[(i,n+i,n+(i+1)%n,(i+1)%n)for i in range(n)]
   obj=c.mesh(name,verts,faces,aged);atlas_uv(obj);return obj
  left=panel('irregular cast panel left',[(-2.02,0),(-.012,0),(-.012,6.08),(-.37,6.04),(-.69,6.22),(-1.05,6.12),(-1.27,5.98),(-1.43,6.17),(-1.79,5.96),(-2.02,5.70)])
  right=panel('irregular cast panel right',[(.012,0),(2.02,0),(2.02,5.42),(1.83,5.53),(1.61,5.32),(1.42,5.67),(1.17,5.82),(.84,5.93),(.41,5.86),(.012,5.98)])
  for body,xx,zz,sizes in [(left,-1.96,5.78,(.28,.26,.32)),(left,-1.94,.36,(.34,.27,.42)),(right,1.94,5.45,(.30,.25,.27)),(right,.06,5.85,(.27,.27,.34))]:
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(xx,-.20,zz));cut=bpy.context.object;cut.name='temporary angular fracture';cut.scale=sizes
   for v in cut.data.vertices:v.co*=rng.uniform(.83,1.14)
   body.data.materials.append(fracture);cut.data.materials.append(aged);cut.data.materials.append(fracture)
   for f in cut.data.polygons:f.material_index=1
   bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('edge fracture','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut
   bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True);atlas_uv(body)
  for xx,zz in [(-1.79,5.88),(-1.40,6.06),(1.45,5.50)]:
   c.tube('ribbed exposed reinforcing steel',[(xx,.025,zz-.25),(xx+.022,.005,zz+.29),(xx+.10,-.06,zz+.39)],.014,rust,10)
   for k in range(8):
    bpy.ops.mesh.primitive_torus_add(major_segments=10,minor_segments=4,location=(xx+.02,.01,zz+k*.033),major_radius=.0145,minor_radius=.0025)
    bpy.context.object.name='raised rebar deformation rib';bpy.context.object.data.materials.append(rust)
  box('deep expansion joint',(0,.02,2.98),(.016,.36,5.96),dark,0)
  for start in [(-1.80,5.40),(.12,5.57),(-.65,.94)]:
   x,z=start
   for k in range(6):
    nx=x+rng.uniform(-.065,.075);nz=z-rng.uniform(.08,.17)
    rod('branching hairline fracture',(x,-.224,z),(nx,-.224,nz),.0032-k*.00035,dark,4);x,z=nx,nz

 elif asset.startswith('native_'):
  scan(candidate/'native_originals','preserved-native-inputs')
  from upgrade_native import build
  native_provenance=build(asset,dict(c=c,bpy=bpy,box=box,rod=rod,scar=scar,concrete=concrete,moss=moss,rust=rust,asphalt=asphalt,fracture=fracture,dark=dark,steel=steel,rng=rng,Vector=Vector))
  (OUT/'sources/native-provenance.json').write_text(json.dumps(native_provenance,indent=2))
 else:
  from parts import build
  build(asset,dict(c=c,bpy=bpy,box=box,rod=rod,scar=scar,concrete=concrete,moss=moss,rust=rust,asphalt=asphalt,fracture=fracture,dark=dark,steel=steel,rng=rng,Vector=Vector))
 model='f3_'+asset
 used_images={node.image for material in bpy.data.materials if material.use_nodes for node in material.node_tree.nodes if node.type=='TEX_IMAGE' and node.image}
 packed_images={}
 for image in used_images:
  if image.source=='FILE':
   if not image.packed_file:image.pack()
   assert image.packed_file,'Unpacked authoring image '+image.name
   packed_images[image.name]=hashlib.sha256(image.packed_file.data).hexdigest()
 authoring=OUT/'sources'/(model+'_authoring.blend')
 authoring_vertices=sum(len(o.data.vertices)for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.wm.save_as_mainfile(filepath=str(authoring),compress=True)
 metrics=c.finish(model,description=next(p['name']for p in parts if p['id']==asset),render=asset not in ['v2_fern_colony','v2_wildflower_colony'])
 if asset in ['v2_fern_colony','v2_wildflower_colony']:
  from fern_colony_v2 import finalize
  metrics=finalize(c,model,metrics)
 metrics.update(approvalStatus='NOT_APPROVED',workflowRun=os.environ.get('GITHUB_RUN_ID'),verificationEnvironment='Shared pinned Blender '+bpy.app.version_string+' + ClamAV')
 (OUT/'metrics'/(model+'.json')).write_text(json.dumps(metrics,indent=2))
 from pack_runtime import pack
 runtime=pack(OUT/'props'/(model+'.glb'),delivery/'runtime'/(model+'.glb'),delivery/'shared_textures')
 # A self-contained authoring source is tested by reopening, not by file existence.
 bpy.ops.wm.open_mainfile(filepath=str(authoring))
 assert sum(len(o.data.vertices)for o in bpy.context.scene.objects if o.type=='MESH')==authoring_vertices
 for name,sha in packed_images.items():
  image=bpy.data.images[name];assert image.packed_file and hashlib.sha256(image.packed_file.data).hexdigest()==sha,name
 (OUT/'sources/authoring-portability.json').write_text(json.dumps({'status':'NOT_APPROVED','reopened':True,'vertices':authoring_vertices,'packedImageSha256':packed_images,'blendSha256':hashlib.sha256(authoring.read_bytes()).hexdigest()},indent=2))
 for folder in ['props','modules','sources','renders','metrics']:
  if (OUT/folder).exists():shutil.copytree(OUT/folder,delivery/folder,dirs_exist_ok=True)
 shutil.copytree(textures,delivery/'textures',dirs_exist_ok=True)
 (delivery/'manifest.json').write_text(json.dumps({'status':'NOT_APPROVED','assetName':asset,'asset':metrics,'sequential':True,'textureSources':sources,'runtime':runtime},ensure_ascii=False,indent=2))
 subprocess.run(['python3',str(ROOT/'tools/3d-performance/audit_glb.py'),str(OUT/'props'/(model+'.glb')),'--output',str(delivery/'structural-audit.json')],check=True)

if __name__=='__main__':
 try:main()
 except BaseException:
  from pathlib import Path
  p=Path(os.environ['OUTPUT_DIR']);p.mkdir(parents=True,exist_ok=True);(p/'asset-failure.log').write_text(traceback.format_exc());traceback.print_exc();os._exit(1)
