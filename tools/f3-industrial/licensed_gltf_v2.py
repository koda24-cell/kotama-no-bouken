"""Fetch one original CC0 model bundle with per-file scanning before import."""
def load(c,bpy,scan,asset,extras=(),resolution='1k'):
 import json,hashlib,urllib.request
 from pathlib import PurePosixPath
 folder=c.OUT/('sources/polyhaven_'+asset+'_original');folder.mkdir(parents=True,exist_ok=True);files=[]
 def get(url,path,row=None):
  assert url.startswith(('https://api.polyhaven.com/','https://dl.polyhaven.org/file/ph-assets/'))
  path.parent.mkdir(parents=True,exist_ok=True)
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Kotama CC0 environment art'}),timeout=90)as response:data=response.read(20_000_001)
  assert len(data)<=20_000_000;path.write_bytes(data);scan(path,'licensed-input-'+str(len(files)))
  if row:assert len(data)==row['size']and hashlib.md5(data).hexdigest()==row['md5']
  files.append(dict(file=str(path.relative_to(c.OUT)),url=url,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
 meta=folder/'files-api.json';get('https://api.polyhaven.com/files/'+asset,meta);api=json.loads(meta.read_text());row=api['gltf'][resolution]['gltf'];source=folder/(asset+'_'+resolution+'.gltf');get(row['url'],source,row)
 for name,item in row['include'].items():
  relative=PurePosixPath(name);assert not relative.is_absolute()and'..'not in relative.parts and ':'not in name;get(item['url'],folder/relative,item)
 for key in extras:
  item=api[key]['1k']['png'];get(item['url'],folder/('textures/'+asset+'_'+key+'_1k.png'),item)
 raw=json.loads(source.read_text())
 for item in raw.get('buffers',[])+raw.get('images',[]):
  relative=PurePosixPath(item['uri']);assert not relative.is_absolute()and'..'not in relative.parts and ':'not in item['uri']and(folder/relative).is_file()
 scan(folder,'licensed-complete-source')
 from gltf_import_compat import import_gltf
 before=set(bpy.data.objects);import_gltf(bpy,source);bpy.context.view_layer.update();objects=set(bpy.data.objects)-before
 (c.OUT/'sources/licensed-provenance.json').write_text(json.dumps(dict(status='NOT_APPROVED',supplier='Poly Haven',resolution=resolution,asset=asset,assetURL='https://polyhaven.com/a/'+asset,license='CC0',licenseURL='https://polyhaven.com/license',files=files,originalSourceKept=True),indent=2))
 return objects,raw
