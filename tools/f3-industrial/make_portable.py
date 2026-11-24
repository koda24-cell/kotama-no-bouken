"""Sequential packaging only: one original authored scene open at a time, no modeling."""
import os,json,hashlib,subprocess,traceback,re,struct
from pathlib import Path
import bpy
root=Path(__file__).resolve().parents[2];base=root/'assets/3d/dungeons/b3_industrial_candidates';out=root/os.environ['OUTPUT_DIR'];out.mkdir(parents=True,exist_ok=True)
def sha(data):return hashlib.sha256(data).hexdigest()
def scan(path,label):subprocess.run(['bash',str(root/'tools/security/clamav_scan_gate.sh'),'scan',str(path),str(out/'security'/(label+'.log'))],check=True)
def normal_name(name):return re.sub(r'\.(png|jpe?g)(?=\.|$)','',name,flags=re.I)
try:
 scan(root/'tools/f3-industrial','source');scan(base,'candidate-inputs');rows=[]
 parts=json.loads((root/'tools/f3-industrial/parts.json').read_text())
 for part in parts:
  folder=base/part['id'];manifest=json.loads((folder/'manifest.json').read_text());asset=manifest['asset'];source=folder/'sources'/(asset['id']+'_authoring.blend');glb=folder/asset['file'];binary=glb.read_bytes();assert sha(binary)==asset['sha256']
  length=struct.unpack_from('<I',binary,12)[0];doc=json.loads(binary[20:20+length]);data=binary[28+length:];embedded={}
  for image in doc.get('images',[]):
   view=doc['bufferViews'][image['bufferView']];blob=data[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']];name=normal_name(image.get('name',''))
   if name in embedded:assert embedded[name][0]==blob
   embedded[name]=(blob,image.get('mimeType','image/png'))
  source_sha=sha(source.read_bytes());bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=False)
  vertex_count=sum(len(o.data.vertices)for o in bpy.context.scene.objects if o.type=='MESH')
  used=set()
  for obj in bpy.context.scene.objects:
   if obj.type!='MESH':continue
   for slot in obj.material_slots:
    if slot.material and slot.material.use_nodes:
     used.update(n.image for n in slot.material.node_tree.nodes if n.type=='TEX_IMAGE'and n.image)
  image_rows=[]
  for image in used:
   if image.packed_file:image_rows.append({'name':image.name,'alreadyPacked':True,'sha256':sha(bytes(image.packed_file.data))});continue
   path=Path(bpy.path.abspath(image.filepath));expected=None
   if image.source=='FILE'and path.is_file():expected=sha(path.read_bytes())
   elif image.source=='FILE':
    blob,mime=embedded[normal_name(image.name)];path=out/'recovered_image_bytes'/(sha(blob)+('.jpg'if mime=='image/jpeg'else'.png'));path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(blob);image.filepath=str(path);expected=sha(blob)
   image.pack();assert image.packed_file,image.name
   actual=sha(bytes(image.packed_file.data));assert expected is None or expected==actual,image.name
   image_rows.append({'name':image.name,'alreadyPacked':False,'sha256':actual})
  assert sum(len(o.data.vertices)for o in bpy.context.scene.objects if o.type=='MESH')==vertex_count
  target=out/part['id']/'portable_sources'/source.name;target.parent.mkdir(parents=True,exist_ok=True);bpy.context.preferences.filepaths.save_version=0
  bpy.ops.wm.save_as_mainfile(filepath=str(target),compress=True)
  bpy.ops.wm.open_mainfile(filepath=str(target),use_scripts=False)
  reopened=set()
  for obj in bpy.context.scene.objects:
   if obj.type=='MESH':
    for slot in obj.material_slots:
     if slot.material and slot.material.use_nodes:reopened.update(n.image for n in slot.material.node_tree.nodes if n.type=='TEX_IMAGE'and n.image)
  assert all(image.packed_file for image in reopened)
  assert {image.name:sha(bytes(image.packed_file.data))for image in reopened}=={r['name']:r['sha256']for r in image_rows}
  assert sum(len(o.data.vertices)for o in bpy.context.scene.objects if o.type=='MESH')==vertex_count
  assert sha(glb.read_bytes())==asset['sha256']
  rows.append({'id':part['id'],'sourceBlend':str(source.relative_to(root)),'sourceBlendSha256':source_sha,'sourceGlbSha256':asset['sha256'],'portableFile':str(target.relative_to(out)),'sha256':sha(target.read_bytes()),'usedImages':image_rows,'preservedVertices':vertex_count,'modelGeometryAndRendersChanged':False})
  print('PORTABLE_AUTHORING_SAVED',part['id'],len(image_rows),flush=True)
 (out/'portability.json').write_text(json.dumps({'status':'NOT_APPROVED','blender':bpy.app.version_string,'workflowRun':os.environ['GITHUB_RUN_ID'],'files':rows,'note':'Only pack image bytes into separately saved authoring scenes; originals and all GLB/PNG remain unchanged.'},indent=2))
except BaseException:
 (out/'failure.txt').write_text(traceback.format_exc());traceback.print_exc();os._exit(1)
