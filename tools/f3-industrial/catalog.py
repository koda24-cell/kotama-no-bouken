"""Collect only scanned, byte-verified per-part deliveries into the review catalog."""
import json,hashlib,re,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--partial',action='store_true');p.add_argument('--out',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[2];base=root/'assets/3d/dungeons/b3_industrial_candidates';parts=json.loads((root/'tools/f3-industrial/parts.json').read_text());assets=[];images={};missing=[]
for part in parts:
 folder=base/part['id'];file=folder/'manifest.json'
 if not file.exists():missing.append(part['id']);continue
 doc=json.loads(file.read_text());assert doc['status']=='NOT_APPROVED'
 receipt=json.loads((folder/'SHARED_BLENDER53_QA_NOT_APPROVED.json').read_text());assert receipt['status']=='NOT_APPROVED'
 log=(folder/'security/shared-gateway/output.log').read_text();assert re.search(r'^Infected files: 0\s*$',log,re.M)and re.search(r'^Scanned files: [1-9]',log,re.M)and not re.search(r'^Total errors: [1-9]|ERROR:',log,re.M)
 runtime=doc.get('runtime');assert runtime,part['id']
 for name in [doc['asset']['file'],'runtime/'+runtime['file'],*doc['asset']['renders']]:
  assert hashlib.sha256((folder/name).read_bytes()).hexdigest()==receipt['files'][name]['sha256']
 for row in runtime['images']:
  path=base/'shared_textures'/row['file'];assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256']
  images[row['file']]={'file':'shared_textures/'+row['file'],'sha256':row['sha256'],'bytes':row['bytes']}
 assets.append({'id':part['id'],'name':part['name'],'existingUpgrade':part.get('existingUpgrade',False),'file':part['id']+'/runtime/'+runtime['file'],'sha256':runtime['sha256'],'bytes':runtime['bytes'],'triangles':doc['asset']['tris'],'sourceCommit':doc['asset']['sourceCommit'],'workflowRun':doc['asset']['workflowRun'],'embeddedOriginal':part['id']+'/'+doc['asset']['file'],'embeddedOriginalBytes':runtime['embeddedOriginalBytes']})
if not args.partial:assert not missing,'Missing individual deliveries: '+','.join(missing)
result={'status':'NOT_APPROVED','partial':bool(missing),'missing':missing,'units':'meters','gltfUp':'Y','gltfFront':'+Z','assets':assets,'sharedImages':list(images.values()),'totals':{'individualParts':sum(not a['existingUpgrade']for a in assets),'existingUpgrades':sum(a['existingUpgrade']for a in assets),'runtimeGeometryBytes':sum(a['bytes']for a in assets),'sharedImageBytes':sum(a['bytes']for a in images.values()),'embeddedOriginalBytes':sum(a['embeddedOriginalBytes']for a in assets)}}
(args.out or base/'catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result['totals']))
