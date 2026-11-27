"""Append verified V3 deliveries; retain the entire earlier review catalog."""
import hashlib,json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2];base=root/'assets/3d/dungeons/b3_industrial_candidates'
def data(p):
 if p.is_file():return p.read_bytes()
 return subprocess.check_output(['git','show','HEAD:'+str(p.relative_to(root))],cwd=root)
def digest(p):
 if p.is_file():return hashlib.sha256(p.read_bytes()).hexdigest()
 h=hashlib.sha256();proc=subprocess.Popen(['git','show','HEAD:'+str(p.relative_to(root))],cwd=root,stdout=subprocess.PIPE)
 for b in iter(lambda:proc.stdout.read(1024*1024),b''):h.update(b)
 assert proc.wait()==0;return h.hexdigest()
j=json.loads((base/'catalog.json').read_text());j['assets']=[a for a in j['assets']if not a['id'].startswith('v3_')]
images={a['file']:a for a in j['sharedImages']};parts=json.loads((root/'tools/f3-industrial/parts.json').read_text());done=[]
for a in parts:
 if not a['id'].startswith('v3_'):continue
 f=base/a['id'];mp=f/'manifest.json'
 if not mp.is_file():continue
 m=json.loads(mp.read_text());r=json.loads((f/'SHARED_BLENDER53_QA_NOT_APPROVED.json').read_text());assert m['status']==r['status']=='NOT_APPROVED'
 assert digest(mp)==r['files']['manifest.json']['sha256'];log=(f/'security/shared-gateway/output.log').read_text();assert re.search(r'^Infected files: 0\s*$',log,re.M)and re.search(r'^Scanned files: [1-9]',log,re.M)
 s=m['asset'];runtime=m['runtime'];p=f/'runtime'/runtime['file'];assert digest(p)==runtime['sha256'];assert digest(f/s['file'])==s['sha256']
 for png in s['renders']:assert digest(f/png)==r['files'][png]['sha256']
 proof=f/'sources/authoring-portability.json';packed=json.loads(data(proof));authoring=f/'sources'/('f3_'+a['id']+'_authoring.blend');assert packed['reopened']and digest(authoring)==packed['blendSha256']
 for image in runtime['images']:
  file=base/'shared_textures'/image['file'];assert digest(file)==image['sha256'];images['shared_textures/'+image['file']]={**image,'file':'shared_textures/'+image['file']}
 j['assets'].append({'id':a['id'],'name':a['name'],'existingUpgrade':a.get('existingUpgrade',False),'revisionOf':a.get('revisionOf'),'file':str(p.relative_to(base)),'sha256':runtime['sha256'],'bytes':runtime['bytes'],'triangles':s['tris'],'sourceCommit':s['sourceCommit'],'workflowRun':s['workflowRun'],'embeddedOriginal':a['id']+'/'+s['file'],'embeddedOriginalBytes':runtime['embeddedOriginalBytes'],'sizeMeters':s['sizeMeters'],'portableAuthoring':str(authoring.relative_to(base)),'portableSha256':packed['blendSha256']});done.append(a['id'])
j['sharedImages']=list(images.values());j['v3Pending']=[a['id']for a in parts if a['id'].startswith('v3_')and a['id']not in done];j['v3Complete']=not j['v3Pending'];j['totals'].update(individualParts=sum(not a.get('existingUpgrade')and not a.get('reusedApproved')for a in j['assets']),existingUpgrades=sum(bool(a.get('existingUpgrade'))for a in j['assets']),runtimeGeometryBytes=sum(a['bytes']for a in j['assets']),sharedImageBytes=sum(a['bytes']for a in j['sharedImages']),embeddedOriginalBytes=sum(a['embeddedOriginalBytes']for a in j['assets']))
(base/'catalog.json').write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'models':len(j['assets']),'v3Verified':done,'v3Pending':j['v3Pending']}))
