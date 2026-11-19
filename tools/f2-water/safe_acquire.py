#!/usr/bin/env python3
"""Download one first-party Poly Haven PBR map into quarantine; ClamAV scan BEFORE decoding."""
import argparse, hashlib, json, os, pathlib, subprocess, sys, time, urllib.parse, urllib.request

ASSET = "river_small_rocks"
URL = f"https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{ASSET}/{ASSET}_diff_1k.jpg"
ALLOWED = {"dl.polyhaven.org"}
OUT = pathlib.Path("out/f2-water")
Q = OUT / "quarantine"
SAFE = OUT / "verified"
MAX_SIZE = 12 * 1024 * 1024

def manifest(status, **kwargs):
    OUT.mkdir(parents=True,exist_ok=True)
    obj = dict(status=status, asset=ASSET, source_url=URL, **kwargs)
    (OUT/"scan_manifest.json").write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(obj,ensure_ascii=False,indent=2),flush=True)

def check_command(argv):
    p=subprocess.run(argv,capture_output=True,text=True,timeout=180)
    return dict(argv=argv,exit_code=p.returncode,stdout=p.stdout[-6000:],stderr=p.stderr[-3000:])

def fetch():
    # Disallow cross-host redirect into untrusted origin.
    class Redirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,req,fp,code,msg,headers,newurl):
            p=urllib.parse.urlsplit(newurl)
            if p.scheme!="https" or p.hostname not in ALLOWED:
                raise RuntimeError("Unexpected redirect target: "+newurl)
            return super().redirect_request(req,fp,code,msg,headers,newurl)
    req=urllib.request.Request(URL,headers={"User-Agent":"KotamaWaterStudy/1.0"})
    opener=urllib.request.build_opener(Redirect())
    Q.mkdir(parents=True,exist_ok=True)
    tmp=Q/"river_small_rocks_diff_1k.jpg.partial"
    with opener.open(req,timeout=35) as response,open(tmp,"wb") as f:
        effective=response.geturl()
        target=urllib.parse.urlsplit(effective)
        if target.scheme!="https" or target.hostname not in ALLOWED:raise RuntimeError("Untrusted final URL")
        count=0;sha=hashlib.sha256()
        while True:
            b=response.read(65536)
            if not b:break
            count+=len(b)
            if count>MAX_SIZE:raise RuntimeError("File exceeds allowed size")
            f.write(b);sha.update(b)
    final=Q/"river_small_rocks_diff_1k.jpg"
    tmp.rename(final)
    return final,count,sha.hexdigest()

def main():
    try:
        version=check_command(["clamscan","--version"])
        if version["exit_code"]!=0:raise RuntimeError("ClamAV unavailable")
        path=None
        for i in range(1,4):
            try:
                path,size,digest=fetch()
                break
            except Exception as ex:
                print("DOWNLOAD_RETRY",i,repr(ex),flush=True)
                if i==3:raise
                time.sleep(i*8)
        scan=check_command(["clamscan","--no-summary",str(path)])
        if scan["exit_code"]!=0:
            manifest("QUARANTINED_DETECTION" if scan["exit_code"]==1 else "BLOCKED_UNSCANNED",
                     sha256=digest,bytes=size,scanner_version=version["stdout"],scan=scan)
            return 1
        # ONLY NOW inspect actual image bytes / dimensions.
        from PIL import Image
        with Image.open(path) as im:
            im.verify()
        SAFE.mkdir(parents=True,exist_ok=True)
        dest=SAFE/path.name
        path.rename(dest)
        manifest("SCANNED_OK_NOT_APPROVED",sha256=digest,bytes=size,
                 scanner_version=version["stdout"],scan=scan,approved_path=str(dest))
        return 0
    except Exception as ex:
        manifest("BLOCKED_UNSCANNED",error=repr(ex))
        return 1

if __name__=="__main__":sys.exit(main())
