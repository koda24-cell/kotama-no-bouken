"""A near-view fern colony from scanned official CC0 geometry and leaf maps."""
def build(e):
 import json,hashlib,urllib.request,math
 from pathlib import Path,PurePosixPath
 from mathutils import Vector,Matrix
 c,bpy,rng,scan=[e[k]for k in ['c','bpy','rng','scan']]
 asset=e.get('licensedPlant','fern_02');opacity=e.get('opacity','Alpha');count=e.get('meshCount',4)
 folder=c.OUT/('sources/polyhaven_'+asset+'_original');folder.mkdir(parents=True,exist_ok=True)
 receipt=[]
 def retrieve(url,path,row=None):
  assert url.startswith(('https://api.polyhaven.com/','https://dl.polyhaven.org/file/ph-assets/'))
  path.parent.mkdir(parents=True,exist_ok=True)
  request=urllib.request.Request(url,headers={'User-Agent':'Kotama CC0 environment art reference study'})
  with urllib.request.urlopen(request,timeout=90)as response:data=response.read(20_000_001)
  assert len(data)<=20_000_000
  path.write_bytes(data);scan(path,'fern-input-'+str(len(receipt)))
  if row:
   assert len(data)==row['size'];assert hashlib.md5(data).hexdigest()==row['md5']
  receipt.append({'file':str(path.relative_to(c.OUT)),'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 meta=folder/'files-api.json';retrieve('https://api.polyhaven.com/files/'+asset,meta)
 doc=json.loads(meta.read_text());row=doc['gltf']['1k']['gltf'];source=folder/(asset+'_1k.gltf');retrieve(row['url'],source,row)
 for name,item in row['include'].items():
  relative=PurePosixPath(name);assert not relative.is_absolute()and'..'not in relative.parts
  retrieve(item['url'],folder/relative,item)
 alpha=folder/('textures/'+asset+'_alpha_1k.png');retrieve(doc[opacity]['1k']['png']['url'],alpha,doc[opacity]['1k']['png'])
 raw=json.loads(source.read_text())
 for item in raw.get('buffers',[])+raw.get('images',[]):
  relative=PurePosixPath(item['uri']);assert not relative.is_absolute()and'..'not in relative.parts and ':'not in item['uri'];assert(folder/relative).is_file()
 scan(folder,'fern-complete-source')
 from gltf_import_compat import import_gltf
 before=set(bpy.data.objects);import_gltf(bpy,source);bpy.context.view_layer.update()
 meshes=[o for o in set(bpy.data.objects)-before if o.type=='MESH'];assert len(meshes)==count
 original_vertices=sum(len(o.data.vertices)for o in meshes)
 # Retain every source vertex and original UV, arrange four plants as a bank.
 source_meshes=[]
 for i,o in enumerate(sorted(meshes,key=lambda o:o.name)):
  world=o.matrix_world.copy();corners=[world@Vector(p)for p in o.bound_box];lo=Vector([min(p[k]for p in corners)for k in range(3)]);hi=Vector([max(p[k]for p in corners)for k in range(3)]);center=(lo+hi)*.5
  scale=[.83,1.03,.82,.94][i%4]
  source_meshes.append({'name':o.name,'vertices':len(o.data.vertices),'sourceMatrix':[[*r]for r in world]})
  o.parent=None;o.matrix_world=Matrix.Translation((((i-(count-1)/2)*.51)-center.x*scale,(-.05 if i%2 else .05)-center.y*scale,-lo.z*scale))@Matrix.Diagonal((scale,scale,scale,1))@world
  # Separate official alpha is explicitly connected; no black rectangular cards.
  for material in o.data.materials:
   material.name='f3_v2_polyhaven_'+asset;material.use_backface_culling=False;material.surface_render_method='DITHERED'
   p=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
   node=next((n for n in material.node_tree.nodes if n.name=='official_fern_opacity'),None)
   if node is None:
    node=material.node_tree.nodes.new('ShaderNodeTexImage');node.name='official_fern_opacity';node.image=bpy.data.images.load(str(alpha),check_existing=True);node.image.colorspace_settings.name='Non-Color'
   material.node_tree.links.new(node.outputs['Color'],p.inputs['Alpha'])
   p.inputs['Roughness'].default_value=.88
   material['alphaMode']='MASK';material['alphaCutoff']=.45
 assert sum(len(o.data.vertices)for o in meshes)==original_vertices
 (c.OUT/'sources/fern-provenance.json').write_text(json.dumps({'status':'NOT_APPROVED','supplier':'Poly Haven','asset':asset,'assetURL':'https://polyhaven.com/a/'+asset,'license':'CC0','licenseURL':'https://polyhaven.com/license','files':receipt,'originalSourceKept':True,'originalVertices':original_vertices,'verticesRemoved':0,'uvPreserved':True,'sourceMeshes':source_meshes},indent=2))

def finalize(c,model,metrics,only_materials=None):
 """Use the proven F1 alpha-MASK export patch, then render the final GLB."""
 import json,struct
 path=c.OUT/'props'/(model+'.glb');raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);binary=raw[20+n:]
 assert doc['materials']
 for material in doc['materials']:
  if only_materials and not any(token in material.get('name','')for token in only_materials):continue
  material.update(alphaMode='MASK',alphaCutoff=.45,doubleSided=True)
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)
 metrics.update(c._gltf_metrics(path));metrics['renders']=c.render_imported_glb(path,model);metrics['renderedFrom']='final alpha-MASK GLB reimport'
 return metrics
