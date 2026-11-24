"""Run in a checkout of 3d-progress-data after render QA and publication clearance."""
import argparse, hashlib, json, os, re, shutil
from pathlib import Path
from datetime import datetime, timezone
import struct, zlib

def png_check(p):
    data=p.read_bytes()
    if len(data)>20_000_000 or data[:8]!=b'\x89PNG\r\n\x1a\n':
        raise ValueError("Invalid PNG")
    pos=8; first=True; seen_data=False
    while pos+12<=len(data):
        n,kind=struct.unpack_from(">I4s",data,pos)
        end=pos+12+n
        if end>len(data) or zlib.crc32(data[pos+4:end-4])!=struct.unpack_from(">I",data,end-4)[0]:
            raise ValueError("PNG CRC/length")
        if first:
            if kind!=b'IHDR' or n!=13: raise ValueError("PNG header")
            w,h=struct.unpack_from(">II",data,pos+8)
            if not 0<w<=8192 or not 0<h<=8192: raise ValueError("PNG dimensions")
            first=False
        if kind==b'IDAT': seen_data=True
        if kind==b'IEND' and n==0 and end==len(data) and seen_data: return hashlib.sha256(data).hexdigest()
        pos=end
    raise ValueError("Incomplete PNG")

def register(root, meta, source):
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,79}",meta["id"]): raise ValueError("Invalid id")
    if meta.get("publication_cleared") is not True: raise ValueError("Publication clearance required")
    if meta.get("status") not in ("設計中","制作中","承認待ち","完成"): raise ValueError("Invalid status")
    for k in ("name","floor","version"):
        if not isinstance(meta[k],str) or not meta[k]: raise ValueError(k)
    if type(meta["run_id"]) is not int or meta["run_id"]<=0: raise ValueError("run_id")
    if not re.fullmatch(r"[0-9a-f]{40}",meta["source_sha"]): raise ValueError("source_sha")
    stamp=datetime.fromisoformat(meta["updated_at"].replace("Z","+00:00"))
    if stamp.tzinfo is None: raise ValueError("Timezone required")
    stamp=stamp.astimezone(timezone.utc).isoformat()
    index=root/"index.json"
    data=json.loads(index.read_text(encoding="utf-8"))
    old=next((x for x in data["models"] if x["id"]==meta["id"]),None)
    kind=meta.get("kind","render")
    if kind not in ("render","design"): raise ValueError("Invalid kind")
    field="designs" if kind=="design" else "images"
    previous=(old or {}).get(kind+"_updated_at")
    if not previous and kind=="render" and old and old.get("images"): previous=old["updated_at"]
    if previous and datetime.fromisoformat(previous)>=datetime.fromisoformat(stamp): return False
    prepared=[]
    for v in meta["images"]:
        p=(source/v["file"]).resolve()
        if not p.is_relative_to(source.resolve()) or not p.is_file(): raise ValueError("Invalid source")
        digest=png_check(p)
        path=f'renders/{meta["id"]}/{digest}.png'
        prepared.append((p,path,{"view":v["view"],"path":path,"sha256":digest}))
    if not prepared: raise ValueError("No images")
    for p,path,_ in prepared:
        dest=root/path
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(p,dest)
    row=dict(old or {})
    if kind=="render" or not row.get("images"):
        row.update({k:meta[k] for k in ("id","name","floor","version","status","run_id","source_sha")})
    row.setdefault("images",[])
    row[field]=[v for _,_,v in prepared]
    row[kind+"_updated_at"]=stamp
    row[kind+"_version"]=meta["version"]
    row[kind+"_source_sha"]=meta["source_sha"]
    row[kind+"_run_id"]=meta["run_id"]
    row["updated_at"]=max(stamp,row.get("updated_at",stamp))
    data["models"]=[x for x in data["models"] if x["id"]!=row["id"]]+[row]
    tmp=index.with_suffix(".tmp")
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,index)
    return True

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--registry",type=Path,required=True)
    p.add_argument("--manifest",type=Path,required=True)
    p.add_argument("--source",type=Path,required=True)
    a=p.parse_args()
    print("updated" if register(a.registry,json.loads(a.manifest.read_text(encoding="utf-8")),a.source) else "unchanged")
