#!/usr/bin/env python3
"""Download Poly Haven Rock Face 02 (CC0) at 1k, preserving glTF dependencies."""
import hashlib,json,pathlib,urllib.request,urllib.parse,os
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'assets/reference/cc0/polyhaven-rock-face-02'
out.mkdir(parents=True,exist_ok=True)
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'kotama-rock-reference/1.0'})
 with urllib.request.urlopen(req,timeout=90) as r:return r.read()
files=json.loads(fetch('https://api.polyhaven.com/files/rock_face_02'))
print('AVAILABLE_FORMATS',list(files))
variants=files.get('gltf',{})
if not variants:raise RuntimeError('No glTF variants available')
res=variants.get('1k') or variants.get('2k')
if not res:raise RuntimeError('No 1k/2k model resolution')
entry=res.get('gltf')
if not entry:raise RuntimeError('No glTF entry')
seen={}
def save(url,name,expected=None):
 name=pathlib.PurePosixPath(name)
 if name.is_absolute() or '..' in name.parts:raise ValueError('Unsafe path')
 if str(name) in seen:return
 data=fetch(url)
 if expected and hashlib.md5(data).hexdigest()!=expected:raise ValueError('MD5 mismatch '+str(name))
 path=out/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
 seen[str(name)]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'url':url}
 print('DOWNLOADED',name,len(data))
def handle(file,default):
 if not isinstance(file,dict) or not file.get('url'):raise ValueError('Bad file entry')
 url=file['url'];name=urllib.parse.urlparse(url).path.rsplit('/',1)[-1] or default
 save(url,name,file.get('md5'))
 for key,dep in (file.get('include') or {}).items():
  if isinstance(dep,dict) and dep.get('url'):save(dep['url'],key,dep.get('md5'))
handle(entry,'rock_face_02.gltf')
gltfs=list(out.glob('*.gltf'))
if len(gltfs)!=1:raise RuntimeError('Expected one glTF')
data=json.loads(gltfs[0].read_text())
for record in data.get('buffers',[])+data.get('images',[]):
 uri=record.get('uri','')
 if uri and not uri.startswith('data:') and not (out/uri).is_file():raise RuntimeError('Missing glTF dependency: '+uri)
(out/'PROVENANCE.json').write_text(json.dumps({'source':'https://polyhaven.com/a/rock_face_02','license':'CC0','api':'https://api.polyhaven.com/files/rock_face_02','files':seen},indent=2)+'\n')
print('READY_FOR_BLENDER',gltfs[0])
