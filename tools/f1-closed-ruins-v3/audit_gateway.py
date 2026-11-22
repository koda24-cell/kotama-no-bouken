"""Read-only reimport/security audit of existing V3 output; no regeneration."""
from pathlib import Path
import os,json,hashlib,subprocess,shutil
import bpy
ROOT=Path(__file__).resolve().parents[2];base=ROOT/'assets/3d/dungeons/b1_closed_ruins_v3';out=ROOT/os.environ['OUTPUT_DIR'];out.mkdir(parents=True,exist_ok=True)
subprocess.run(['bash',str(ROOT/'tools/security/clamav_scan_gate.sh'),'scan',str(base),str(out/'security/input-assets.log')],check=True)
manifest=json.loads((base/'manifest.json').read_text());assert manifest['count']==5
records=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for a in manifest['assets']:
    glb=base/a['file'];assert sha(glb)==a['sha256']
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert meshes
    for o in meshes:assert o.data.uv_layers and not o.data.color_attributes
    blend=base/a['source'];assert sha(blend)==a['sourceSha256'];bpy.ops.wm.open_mainfile(filepath=str(blend))
    images=[im for im in bpy.data.images if im.source=='FILE'];assert images
    for im in images:assert im.packed_file or im.packed_files;_=im.pixels[0];assert im.has_data
    files=[a['file'],a['source']]+a['renders']
    for f in files:
        src=base/f;dst=out/'archived-originals'/f;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst);assert sha(src)==sha(dst)
    records.append({'id':a['id'],'glbSHA256':a['sha256'],'meshes':len(meshes),'packedImageCount':len(images),'sourceAndFourPNGArchived':True})
(out/'existing-v3-reimport.json').write_text(json.dumps({'status':'NOT_APPROVED','scope':'Read-only reimport/packed-image check and archival of existing individually rendered outputs; not new renders or FPS approval','blender':bpy.app.version_string,'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'assets':records},indent=2))
