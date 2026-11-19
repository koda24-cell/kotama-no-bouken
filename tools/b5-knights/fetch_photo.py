#!/usr/bin/env python3
"""Fetch a genuinely photographic CC0 PBR stone material. No mock images."""
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile
from io import BytesIO
import hashlib, json
url="https://ambientcg.com/get?file=Rock063_1K-JPG.zip"
folder=Path("render-output/b5-knights/photo_source")
folder.mkdir(parents=True,exist_ok=True)
report={"source":"ambientCG Rock063","url":url,"license":"CC0 1.0",
        "status":"NOT_FETCHED","files":{}}
try:
    req=Request(url,headers={"User-Agent":"Kotama-3D-review/1.0","Accept":"application/zip"})
    with urlopen(req,timeout=40) as response:
        raw=response.read(20_000_000)
    if len(raw)<2048 or not raw[:2]==b"PK":
        raise ValueError("Not a ZIP archive")
    with ZipFile(BytesIO(raw)) as pack:
        for suffix in ("_Color.jpg","_Roughness.jpg","_NormalGL.jpg"):
            files=[f for f in pack.namelist() if f.endswith(suffix)]
            if not files:
                raise ValueError("Archive missing "+suffix)
            data=pack.read(files[0])
            if not data.startswith(b"\xff\xd8") or len(data)<2048:
                raise ValueError("Invalid JPG "+suffix)
            name=suffix[1:]
            dest=folder/name
            dest.write_bytes(data)
            report["files"][name]={"sha256":hashlib.sha256(data).hexdigest(),
                                  "source_member":files[0],"bytes":len(data)}
    report["status"]="FETCHED_CC0"
except Exception as exc:
    report["status"]="UNAVAILABLE"
    report["error"]=type(exc).__name__+": "+str(exc)
(folder/"source.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print("PHOTO_SOURCE",json.dumps(report,ensure_ascii=False))
