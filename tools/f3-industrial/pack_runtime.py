"""Byte-preserving image externalization. Keep the embedded authored GLB unchanged."""
from pathlib import Path
import struct,json,hashlib

def pack(source,out,shared):
 source,out,shared=Path(source),Path(out),Path(shared);raw=source.read_bytes();assert raw[:4]==b'glTF'
 size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);start=20+size;assert raw[start+4:start+8]==b'BIN\x00';binary=raw[start+8:]
 old=json.loads(json.dumps(doc));old_views=old.get('bufferViews',[]);shared.mkdir(parents=True,exist_ok=True);images=[]
 for image in doc.get('images',[]):
  if 'bufferView'not in image:raise ValueError('Expected embedded source image')
  view=old_views[image.pop('bufferView')];data=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']];digest=hashlib.sha256(data).hexdigest()
  suffix='.png'if image.get('mimeType')=='image/png'else'.jpg';name=digest+suffix;dest=shared/name
  if dest.exists():assert dest.read_bytes()==data
  else:dest.write_bytes(data)
  image['uri']='../../shared_textures/'+name;images.append({'file':name,'sha256':digest,'bytes':len(data)})
 used=set()
 for accessor in doc.get('accessors',[]):
  if 'bufferView'in accessor:used.add(accessor['bufferView'])
  for part in ['indices','values']:
   if part in accessor.get('sparse',{}):used.add(accessor['sparse'][part]['bufferView'])
 chunks=bytearray();mapping={};views=[]
 for index in sorted(used):
  view=dict(old_views[index]);assert view.get('buffer',0)==0
  block=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
  while len(chunks)%4:chunks.append(0)
  view['byteOffset']=len(chunks);chunks.extend(block);mapping[index]=len(views);views.append(view)
 for accessor in doc.get('accessors',[]):
  if 'bufferView'in accessor:accessor['bufferView']=mapping[accessor['bufferView']]
  for part in ['indices','values']:
   if part in accessor.get('sparse',{}):accessor['sparse'][part]['bufferView']=mapping[accessor['sparse'][part]['bufferView']]
 doc['bufferViews']=views;doc['buffers']=[{'byteLength':len(chunks)}]
 for key in ['nodes','meshes','materials','textures','samplers','scenes','scene','extensionsUsed','extensionsRequired']:
  assert doc.get(key)==old.get(key),'Unintended model mutation: '+key
 for before,after in zip(old.get('accessors',[]),doc.get('accessors',[])):
  if 'bufferView'in before:
   a=old_views[before['bufferView']];b=views[after['bufferView']]
   assert binary[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]==chunks[b['byteOffset']:b['byteOffset']+b['byteLength']]
 text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*((-len(text))%4);chunks+=b'\x00'*((-len(chunks))%4)
 result=struct.pack('<III',0x46546c67,2,12+8+len(text)+8+len(chunks))+struct.pack('<I4s',len(text),b'JSON')+text+struct.pack('<I4s',len(chunks),b'BIN\x00')+chunks
 out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(result)
 return {'file':str(out.name),'sourceSha256':hashlib.sha256(raw).hexdigest(),'sha256':hashlib.sha256(result).hexdigest(),'bytes':len(result),'embeddedOriginalBytes':len(raw),'images':images,'geometryAndMaterialDataUnchanged':True,'imageLayout':'../../shared_textures/<sha256>.jpg|png relative to candidate/<asset>/runtime/'}
