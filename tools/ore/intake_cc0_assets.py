#!/usr/bin/env python3
"""Opt-in intake of verified CC0 ore references into a temporary review folder.
Does not promote to gameplay or commit binaries. Network required.
"""
import argparse, hashlib, json, os, pathlib, urllib.request, urllib.parse, zipfile, io, sys
ASSETS = {
 "boulder_01": {"provider":"polyhaven","id":"boulder_01","page":"https://polyhaven.com/a/boulder_01","kind":"model"},
 "rock_boulder_dry":{"provider":"polyhaven","id":"rock_boulder_dry","page":"https://polyhaven.com/a/rock_boulder_dry","kind":"texture"},
 "rock_surface":{"provider":"polyhaven","id":"rock_surface","page":"https://polyhaven.com/a/rock_surface","kind":"texture"},
 "Rock002":{"provider":"ambientcg","id":"Rock002","page":"https://ambientcg.com/view?id=Rock002","kind":"texture"},
 "Rock060":{"provider":"ambientcg","id":"Rock060","page":"https://ambientcg.com/view?id=Rock060","kind":"texture"}
}
LICENSES={"polyhaven":"https://polyhaven.com/license","ambientcg":"https://ambientcg.com/license"}
def get(url, limit=180*1024*1024):
    req=urllib.request.Request(url,headers={"User-Agent":"KotamaOreCC0Review/0.1 (research)"})
    with urllib.request.urlopen(req,timeout=45) as r:
        length=r.headers.get("Content-Length")
        if length and int(length)>limit:raise ValueError("too large")
        data=r.read(limit+1)
        if len(data)>limit:raise ValueError("too large")
        return data
def poly_url(id,kind):
    info=json.loads(get("https://api.polyhaven.com/files/"+urllib.parse.quote(id),4*1024*1024))
    # Select the smallest downloadable mesh or JPG map, based on actual API metadata.
    candidates=[]
    def walk(obj,path=()):
        if isinstance(obj,dict):
            if isinstance(obj.get("url"),str):
                url=obj["url"]
                if url.startswith("https://") and any(url.lower().split("?")[0].endswith(ext) for ext in (".glb",".blend",".fbx",".jpg",".png",".zip")):
                    candidates.append((path,url,obj.get("size",0)))
            for k,v in obj.items():walk(v,path+(str(k),))
        elif isinstance(obj,list):
            for i,v in enumerate(obj):walk(v,path+(str(i),))
    walk(info)
    def rank(item):
        path,url,size=item;name="/".join(path).lower()
        prefer=("1k" in name or "2k" in name)
        if kind=="model":return (0 if url.lower().split("?")[0].endswith(".glb") else 1,0 if prefer else 1,size if isinstance(size,int) else 0)
        return (0 if "diff" in name or "col" in name else 1,0 if prefer else 1,size if isinstance(size,int) else 0)
    if not candidates:raise ValueError("no suitable asset file in API response")
    return sorted(candidates,key=rank)[0][1]
def ambient_url(id):
    return "https://ambientcg.com/get?file="+urllib.parse.quote(id+"_1K-JPG.zip")
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--out",default="ore-cc0-review")
    p.add_argument("--assets",nargs="+",choices=sorted(ASSETS),default=list(ASSETS))
    p.add_argument("--max-mb",type=int,default=180)
    a=p.parse_args();root=pathlib.Path(a.out);root.mkdir(parents=True,exist_ok=True)
    report={"status":"NOT_APPROVED","source_license":"CC0","assets":[]}
    for key in a.assets:
        spec=ASSETS[key];entry=dict(spec,license_url=LICENSES[spec["provider"]],state="failed")
        try:
            url=poly_url(key,spec["kind"]) if spec["provider"]=="polyhaven" else ambient_url(key)
            data=get(url,a.max_mb*1024*1024)
            suffix=pathlib.PurePosixPath(urllib.parse.urlsplit(url).path).suffix.lower()\n            if not suffix:\n                suffix=pathlib.PurePosixPath(urllib.parse.parse_qs(urllib.parse.urlsplit(url).query).get("file",[""])[0]).suffix.lower()
            if suffix not in (".zip",".jpg",".png",".glb",".blend",".fbx"):raise ValueError("unexpected file type")
            if suffix==".zip" and not zipfile.is_zipfile(io.BytesIO(data)):raise ValueError("invalid ZIP")
            if suffix==".glb" and data[:4]!=b"glTF":raise ValueError("invalid GLB")
            if suffix in (".jpg",".png") and not (data.startswith(b"\\xff\\xd8") or data.startswith(b"\\x89PNG")):raise ValueError("invalid image")
            filename=key+suffix;path=root/filename;path.write_bytes(data)
            entry.update(state="downloaded_unreviewed",file=filename,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),download_url=url)
        except Exception as exc:
            entry["error"]=str(exc)
        report["assets"].append(entry)
        (root/"intake_manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(key,entry["state"],entry.get("error",""))
    print("Downloaded:",sum(e["state"]=="downloaded_unreviewed" for e in report["assets"]))
    return 0 if all(e["state"]=="downloaded_unreviewed" for e in report["assets"]) else 1
if __name__=="__main__":sys.exit(main())
