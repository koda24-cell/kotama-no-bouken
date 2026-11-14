#!/usr/bin/env python3
"""Download a bounded CC0 Poly Haven scan through its official API.
Store license/source/hash metadata. Do not guess asset URLs or accept arbitrary hosts.
"""
import hashlib,json,os,pathlib,urllib.request,urllib.parse
ASSET="rock_07"
BASE="https://api.polyhaven.com"
OUT=pathlib.Path("render-output/b5-scan-source")
OUT.mkdir(parents=True,exist_ok=True)
def get(url):
 req=urllib.request.Request(url,headers={"User-Agent":"kotama-b5-cc0-asset-research/1.0"})
 with urllib.request.urlopen(req,timeout=35) as r:return r.read()
info=json.loads(get(BASE+"/info/"+ASSET))
files=json.loads(get(BASE+"/files/"+ASSET))
print("info",str(info)[:900],flush=True)
print("file groups",list(files),flush=True)
# Choose lowest-resolution actual mesh: preferred GLB then blend, then FBX.
candidates=[]
def walk(x,path=()):
 if isinstance(x,dict):
  if "url" in x and isinstance(x["url"],str):
   candidates.append((path,x))
  for k,v in x.items():walk(v,path+(str(k),))
 elif isinstance(x,list):
  for i,v in enumerate(x):walk(v,path+(str(i),))
walk(files)
for p,d in candidates:print("CANDIDATE","/".join(p),d.get("size"),d["url"][:180],flush=True)
def score(item):
 p,d=item;s="/".join(p).lower();u=d["url"].lower()
 ext=urllib.parse.urlparse(u).path.lower()
 if not ext.endswith((".glb",".blend",".fbx",".gltf")):return -1000
 if any(z in s for z in ("1k","2k","low")):resolution=30
 elif "4k" in s:resolution=0
 elif "8k" in s:resolution=-30
 else:resolution=10
 return resolution+(100 if ext.endswith(".glb") else 60 if ext.endswith(".blend") else 20)
candidates.sort(key=score,reverse=True)
selected=next(((p,d) for p,d in candidates if score((p,d))>-1000),None)
if not selected:raise RuntimeError("No supported mesh download found in official API")
p,d=selected;url=d["url"];parsed=urllib.parse.urlparse(url)
if parsed.scheme!="https" or not (parsed.hostname=="polyhaven.com" or parsed.hostname.endswith(".polyhaven.com") or parsed.hostname=="dl.polyhaven.org" or parsed.hostname.endswith(".polyhaven.org")):
 raise RuntimeError("Unexpected download host "+str(parsed.hostname))
extension=pathlib.Path(parsed.path).suffix.lower()
dest=OUT/("rock_07"+extension)
request=urllib.request.Request(url,headers={"User-Agent":"kotama-b5-cc0-asset-research/1.0"})
maxbytes=85*1024*1024
h=hashlib.sha256();total=0
with urllib.request.urlopen(request,timeout=90) as response, dest.open("wb") as target:
 while True:
  chunk=response.read(1024*1024)
  if not chunk:break
  total+=len(chunk)
  if total>maxbytes:raise RuntimeError("Scan exceeds bounded download limit")
  h.update(chunk);target.write(chunk)
if total<2048:raise RuntimeError("Downloaded file unexpectedly small")
metadata={"asset":ASSET,"source":BASE+"/info/"+ASSET,"download_url":url,"file":dest.name,"bytes":total,"sha256":h.hexdigest(),"declared_license":info.get("license","CC0 (Poly Haven)"),"api_path":list(p),"validated":True}
(OUT/"manifest.json").write_text(json.dumps(metadata,indent=2,ensure_ascii=False))
print("DOWNLOADED",json.dumps(metadata),flush=True)
