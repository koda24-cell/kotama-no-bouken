#!/usr/bin/env python3
"""No-execution inspection of zstd wrapped pseudo-blend payloads."""
import pathlib,hashlib,re,json,csv,subprocess,os
base=pathlib.Path("assets")
out=pathlib.Path("security-audit-output")
out.mkdir(parents=True,exist_ok=True)
items=[]
patterns={
 "python_import":rb"\b(?:import\s+(?:bpy|os|sys|subprocess|socket|requests|urllib)|from\s+(?:bpy|os|subprocess|socket))\b",
 "python_execution":rb"\b(?:exec|eval|compile|__import__|Popen)\s*\(",
 "shell_execution":rb"\b(?:os\.system|subprocess\.(?:run|call|Popen)|powershell|cmd\.exe|/bin/sh)\b",
 "network_reference":rb"https?://[^\x00\s\"\'<>]{4,160}",
 "external_path":rb"(?:[A-Z]:\\|/home/|/etc/|/Users/|\\\\\\\\)[^\x00\s]{3,150}"
}
for p in sorted(base.rglob("*.blend")):
    result={"file":str(p),"status":"unverified","compressed_bytes":p.stat().st_size,
            "decoded_bytes":None,"decoded_header":None,
            "standard_blender_header":False,"signals":{},"error":None}
    try:
        with p.open("rb") as f: magic=f.read(4)
        if magic!=bytes((0x28,0xb5,0x2f,0xfd)):
            raise ValueError("unexpected wrapper signature")
        # Size-limited streaming; never execute payload or load in Blender.
        proc=subprocess.Popen(["zstd","-d","-q","-c",str(p)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        data=bytearray()
        try:
            while True:
                block=proc.stdout.read(65536)
                if not block:break
                data.extend(block)
                if len(data)>256*1024*1024:
                    proc.kill();raise ValueError("decoded size over 256MiB")
            err=proc.stderr.read()
            if proc.wait(timeout=15)!=0:raise ValueError("zstd failed: "+err.decode(errors="replace")[:130])
        finally:
            if proc.poll() is None:proc.kill()
        raw=bytes(data)
        result["decoded_bytes"]=len(raw)
        result["decoded_header"]=repr(raw[:24])
        result["standard_blender_header"]=(len(raw)>=12 and raw.startswith(b"BLENDER") and raw[7:8] in (b"_",b"-") and raw[8:9] in (b"v",b"V") and raw[9:12].isdigit())
        for name,pattern in patterns.items():
            found=re.findall(pattern,raw,re.I)
            result["signals"][name]={"matches":len(found),"examples":[x.decode("utf-8","replace")[:100] for x in found[:5]]}
        result["status"]="static_decoded"
        if not result["standard_blender_header"]:
            result["note"]="Nonstandard Blender header; cannot assert that Blender embedded Python was fully examined"
    except Exception as e: result["error"]=str(e)[:200]
    items.append(result)
with (out/"blend-payload-analysis.json").open("w",encoding="utf-8") as f:json.dump(items,f,ensure_ascii=False,indent=2)
with (out/"blend-payload-analysis.csv").open("w",encoding="utf-8",newline="") as f:
    w=csv.writer(f);w.writerow(["path","status","standard_blender_header","decoded_bytes","python_imports","python_execution","shell_execution","network_references","external_paths","error"])
    for i in items:
        w.writerow([i["file"],i["status"],i["standard_blender_header"],i["decoded_bytes"]]+[i["signals"].get(k,{}).get("matches","") for k in ["python_import","python_execution","shell_execution","network_reference","external_path"]]+[i["error"]])
print("FILES",len(items),"SUCCESSFUL_DECODE",sum(i["status"]=="static_decoded" for i in items),"STANDARD_BLEND",sum(i["standard_blender_header"] for i in items))
print("INDICATOR_COUNTS",json.dumps({k:sum(i["signals"].get(k,{}).get("matches",0) for i in items) for k in patterns}))
