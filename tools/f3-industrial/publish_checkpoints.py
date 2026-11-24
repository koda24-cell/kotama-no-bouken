"""Register verified render bytes in the independent gallery; no game promotion."""
import argparse,json,hashlib,subprocess,tempfile,re
from pathlib import Path
from datetime import datetime,timezone
p=argparse.ArgumentParser();p.add_argument('--progress',type=Path,required=True);p.add_argument('--register',type=Path,required=True);args=p.parse_args()
root=Path(__file__).resolve().parents[2];base=root/'assets/3d/dungeons/b3_industrial_candidates';parts=json.loads((root/'tools/f3-industrial/parts.json').read_text());updated=[]
for part in parts:
 folder=base/part['id'];mp=folder/'manifest.json'
 if not mp.exists():continue
 m=json.loads(mp.read_text());asset=m['asset'];receipt=json.loads((folder/'SHARED_BLENDER53_QA_NOT_APPROVED.json').read_text())
 assert m['status']==receipt['status']=='NOT_APPROVED'
 log=(folder/'security/shared-gateway/output.log').read_text();assert re.search(r'^Infected files: 0\s*$',log,re.M)and re.search(r'^Scanned files: [1-9]',log,re.M)and not re.search(r'^Total errors: [1-9]|ERROR:',log,re.M)
 images=[]
 for name in asset['renders']:
  row=receipt['files'][name];file=folder/name;assert hashlib.sha256(file.read_bytes()).hexdigest()==row['sha256']
  images.append({'view':Path(name).stem,'file':name})
 registry=json.loads((args.progress/'index.json').read_text());ident='f3-industrial-'+part['id'].replace('_','-')
 # Register tool itself rejects older timestamps; do not overwrite a later source.
 prior=next((r for r in registry['models']if r['id']==ident),None)
 if prior and str(prior.get('run_id'))==str(asset['workflowRun']):continue
 manifest={'id':ident,'name':part['name'],'floor':'第3層 遺跡都市','version':'個別PBR・構造検証 '+str(asset['sourceCommit'])[:7],'status':'制作中','run_id':int(asset['workflowRun']),'source_sha':asset['sourceCommit'],'updated_at':datetime.now(timezone.utc).isoformat(),'publication_cleared':True,'images':images}
 with tempfile.NamedTemporaryFile(mode='w',suffix='.json')as f:
  json.dump(manifest,f,ensure_ascii=False);f.flush();subprocess.run(['python3',str(args.register),'--registry',str(args.progress),'--manifest',f.name,'--source',str(folder)],check=True)
 updated.append(ident)
print(json.dumps({'registered':updated,'gameApproval':'NOT_APPROVED'},ensure_ascii=False))
