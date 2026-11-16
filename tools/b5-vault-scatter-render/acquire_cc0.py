#!/usr/bin/env python3
"""Fetch a small, verified CC0 Poly Haven texture set into Git staging.
Never downloads Nintendo assets; limits size and checks image signatures.
"""
import hashlib,json,os,pathlib,re,sys,urllib.request
API="https://api.polyhaven.com"
ROOT=pathlib.Path("tools/third_party_cc0/polyhaven")
UA={"User-Agent":"kotama-cc0-asset-research/1.0","Accept":"application/json"}
def request(url,maxbytes=12000000):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=40) as resp:
        data=resp.read(maxbytes+1)
        if len(data)>maxbytes:raise ValueError("oversize response: "+url)
        return data
def jsonget(path):return json.loads(request(API+path))
def main():
    catalog=jsonget("/assets?t=textures")
    matches=[]
    for key,v in catalog.items():
        label=(key+" "+str(v.get("name",""))).lower()
        if re.search(r"rock|stone|cliff|cobble|masonry",label):
            matches.append((key,v))
    matches.sort(key=lambda x:(not bool(re.search(r"rock|stone",x[0])),x[0]))
    print("Candidate textures:",len(matches))
    successes=[]
    for asset,meta in matches[:30]:
        if len(successes)>=3:break
        try:
            files=jsonget("/files/"+asset)
            diffuse=files.get("Diffuse") or files.get("diffuse")
            if not isinstance(diffuse,dict):continue
            variants=diffuse.get("1k") or diffuse.get("2k")
            if not isinstance(variants,dict):continue
            choice=None
            for ext in ("jpg","png"):
                if isinstance(variants.get(ext),dict) and variants[ext].get("url"):
                    choice=(ext,variants[ext]);break
            if not choice:continue
            ext,entry=choice;url=entry["url"]
            if not url.startswith("https://"):continue
            b=request(url,5500000)
            if ext=="png" and not b.startswith(b"\x89PNG\r\n\x1a\n"):raise ValueError("not png")
            if ext=="jpg" and not b.startswith(b"\xff\xd8\xff"):raise ValueError("not jpg")
            folder=ROOT/asset;folder.mkdir(parents=True,exist_ok=True)
            dest=folder/("diffuse_1k."+ext);dest.write_bytes(b)
            record={"source":"Poly Haven","asset_id":asset,"asset_page":"https://polyhaven.com/a/"+asset,
              "license":"CC0","license_url":"https://polyhaven.com/license","source_url":url,
              "original_filename":entry.get("filename"),"sha256":hashlib.sha256(b).hexdigest(),
              "bytes":len(b),"file":dest.name,"status":"downloaded_unreviewed"}
            (folder/"SOURCE.json").write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n")
            successes.append(record);print("DOWNLOADED",asset,len(b),dest)
        except Exception as e:print("SKIP",asset,str(e)[:180])
    (ROOT/"manifest.json").parent.mkdir(parents=True,exist_ok=True)
    (ROOT/"manifest.json").write_text(json.dumps(successes,ensure_ascii=False,indent=2)+"\n")
    if not successes:raise SystemExit("No usable CC0 texture downloaded; no success claim")
if __name__=="__main__":main()
