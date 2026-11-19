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
def poly_urls(asset_id, kind):
    """Resolve actual mesh and PBR map files; never substitute AO for a mesh."""
    info=json.loads(get("https://api.polyhaven.com/files/"+urllib.parse.quote(asset_id),4*1024*1024))
    found=[]
    def walk(obj,path=()):
        if isinstance(obj,dict):
            url=obj.get("url")
            if isinstance(url,str) and url.startswith("https://"):
                ext=pathlib.PurePosixPath(urllib.parse.urlsplit(url).path).suffix.lower()
                if ext in (".glb",".blend",".fbx",".gltf",".jpg",".png",".exr",".zip"):
                    found.append((path,url,ext))
            for k,v in obj.items():walk(v,path+(str(k),))
        elif isinstance(obj,list):
            for i,v in enumerate(obj):walk(v,path+(str(i),))
    walk(info)
    def lowres(path):
        label="/".join(path).lower()
        return 0 if "1k" in label else 1 if "2k" in label else 2
    if kind=="model":
        mesh=[x for x in found if x[2] in (".glb",".blend",".fbx",".gltf")]
        if not mesh:raise ValueError("NO_MESH_FORMAT_IN_POLYHAVEN_API")
        mesh.sort(key=lambda x:({".glb":0,".blend":1,".fbx":2,".gltf":3}[x[2]],lowres(x[0])))
        selected=[("mesh",mesh[0][1])]
    else:
        selected=[]
    for tag,needles in (("diff",("diff","color","albedo")),("nor",("nor_gl","normal","nor")),("rough",("rough",)),("disp",("disp","height")),("ao",("ao",))):
        options=[x for x in found if x[2] in (".jpg",".png",".exr") and any(n in "/".join(x[0]).lower() for n in needles)]
        options.sort(key=lambda x:(lowres(x[0]),0 if x[2]==".jpg" else 1))
        if options:selected.append((tag,options[0][1]))
    if kind=="texture" and not any(tag=="diff" for tag,_ in selected):
        raise ValueError("MISSING_DIFFUSE_MAP")
    return selected
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
            targets=poly_urls(key,spec["kind"]) if spec["provider"]=="polyhaven" else [("bundle",ambient_url(key))]
            downloads=[]
            for tag,url in targets:
                data=get(url,a.max_mb*1024*1024)
                suffix=pathlib.PurePosixPath(urllib.parse.urlsplit(url).path).suffix.lower()
                if not suffix:
                    suffix=pathlib.PurePosixPath(urllib.parse.parse_qs(urllib.parse.urlsplit(url).query).get("file",[""])[0]).suffix.lower()
                if suffix not in (".zip",".jpg",".png",".glb",".blend",".fbx",".gltf",".exr"):raise ValueError("unexpected file type")
                if suffix==".zip" and not zipfile.is_zipfile(io.BytesIO(data)):raise ValueError("invalid ZIP")
                if suffix==".glb" and data[:4]!=b"glTF":raise ValueError("invalid GLB")
                if suffix==".jpg" and not data.startswith(bytes([0xff,0xd8])):raise ValueError("invalid JPEG")
                if suffix==".png" and not data.startswith(bytes([0x89,0x50,0x4e,0x47])):raise ValueError("invalid PNG")
                filename=key+"_"+tag+suffix
                dest=root/filename;dest.write_bytes(data)
                downloads.append(dict(role=tag,file=filename,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),download_url=url))
            entry.update(state="downloaded_unreviewed",downloads=downloads)
            if spec["kind"]=="model" and not any(x["role"]=="mesh" for x in downloads):
                raise ValueError("mesh missing")
        except Exception as exc:
            entry["error"]=str(exc)
        report["assets"].append(entry)
        (root/"intake_manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(key,entry["state"],entry.get("error",""))
    print("Downloaded:",sum(e["state"]=="downloaded_unreviewed" for e in report["assets"]))
    return 0 if all(e["state"]=="downloaded_unreviewed" for e in report["assets"]) else 1
if __name__=="__main__":sys.exit(main())
