"""Recover existing self-authored models as unapproved originals. Never run their code."""
from pathlib import Path
import json,os,hashlib,subprocess,urllib.request,urllib.parse,urllib.error,zipfile,stat,shutil
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'render-output/f3-recovered';OUT.mkdir(parents=True,exist_ok=True)
items=[('wall_v5',44060951836,14317353990),('building_v3',44054029508,14315372618),('glass_v10',44644156219,14587893097),('rubble_v29',44686638121,14607256281),('rebar_v4',44447231928,14494485337)]
class SafeRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if urllib.parse.urlsplit(newurl).scheme!='https':raise RuntimeError('Non-HTTPS artifact redirect')
  result=super().redirect_request(req,fp,code,msg,headers,newurl)
  if result and urllib.parse.urlsplit(req.full_url).netloc!=urllib.parse.urlsplit(newurl).netloc:result.remove_header('Authorization')
  return result
opener=urllib.request.build_opener(SafeRedirect())
def scan(path,log):subprocess.run(['bash',str(ROOT/'tools/security/clamav_scan_gate.sh'),'scan',str(path),str(log)],check=True)
for name,run,artifact in items:
 base=OUT/name;base.mkdir(parents=True,exist_ok=True);arc=base/'download.zip'
 req=urllib.request.Request(f'https://api.github.com/repos/{os.environ["GITHUB_REPOSITORY"]}/actions/artifacts/{artifact}/zip',headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','User-Agent':'Kotama verified asset recovery'})
 with opener.open(req,timeout=120)as response:
  with arc.open('wb')as target:
   total=0
   while chunk:=response.read(1024*1024):
    total+=len(chunk);assert total<256*1024*1024;target.write(chunk)
 ziphash=hashlib.sha256(arc.read_bytes()).hexdigest();scan(arc,base/'security/zip-before-extraction.log')
 dest=base/'original';dest.mkdir()
 with zipfile.ZipFile(arc)as z:
  assert len(z.infolist())<5000 and sum(i.file_size for i in z.infolist())<1024*1024*1024
  for info in z.infolist():
   path=(dest/info.filename).resolve();assert path.is_relative_to(dest.resolve()) and not stat.S_ISLNK(info.external_attr>>16)
   assert info.file_size<256*1024*1024
   if info.is_dir():continue
   if path.suffix.lower()not in ['.glb','.blend','.blend1','.png','.jpg','.jpeg','.json','.txt','.md','.log']:continue
   path.parent.mkdir(parents=True,exist_ok=True)
   with z.open(info)as src,path.open('wb')as target:shutil.copyfileobj(src,target)
 scan(dest,base/'security/extracted-before-import.log');arc.unlink()
 files={str(p.relative_to(dest)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in dest.rglob('*')if p.is_file()}
 assert any(p.endswith('.glb')for p in files)
 (base/'recovery.json').write_text(json.dumps({'status':'NOT_APPROVED','role':'Preserved pre-existing self-authored outputs, no Blender import or artistic acceptance yet','sourceRun':run,'sourceArtifact':artifact,'zipSha256':ziphash,'recoveryRun':os.environ['GITHUB_RUN_ID'],'files':files},indent=2))
 print('RECOVERED',name,len(files))
