#!/usr/bin/env python3
"""Inventory existing assets without executing any untrusted asset."""
import csv, hashlib, pathlib, zipfile
out=pathlib.Path("security-audit-output")
out.mkdir(exist_ok=True)
bad={".exe",".msi",".dll",".bat",".cmd",".ps1",".vbs",".scr",".lnk",".jar",".sh",".py",".so",".dylib"}
rows=[]
critical=[]
for p in sorted(pathlib.Path(".").rglob("*")):
    if not p.is_file() or any(x in {".git","node_modules","security-audit-output"} for x in p.parts): continue
    issues=[]
    try:
        with p.open("rb") as f: head=f.read(12)
        if p.suffix.lower()==".blend" and head[:7]!=b"BLENDER": issues.append("compressed/nonstandard blend: needs sandbox review")
        if p.suffix.lower()==".zip":
            with zipfile.ZipFile(p) as z:
                infos=z.infolist()
                if len(infos)>20000: issues.append("too many zip entries")
                if sum(i.file_size for i in infos)>1024**3: issues.append("archive expands >1GiB")
                for i in infos:
                    n=i.filename.replace(chr(92),"/")
                    if n.startswith("/") or n.startswith("../") or "/../" in n or (len(n)>1 and n[1]==":"): issues.append("unsafe path: "+n[:90])
                    if i.flag_bits&1: issues.append("encrypted member")
                    if i.file_size>5*1024*1024 and i.file_size>max(1,i.compress_size)*500: issues.append("high expansion: "+n[:90])
                    if pathlib.PurePosixPath(n).suffix.lower() in bad: issues.append("script/executable: "+n[:90])
                    if ((i.external_attr>>16)&0o170000)==0o120000: issues.append("symlink: "+n[:90])
        if p.suffix.lower()==".zip":
            critical.extend(p.as_posix()+": "+item for item in issues)
        if p.suffix.lower() in bad: issues.append("script/executable: manual code review required")
        h=hashlib.sha256()
        with p.open("rb") as f:
            for block in iter(lambda:f.read(1024*1024),b""):h.update(block)
        rows.append({"path":p.as_posix(),"bytes":p.stat().st_size,"sha256":h.hexdigest(),"static_findings":"; ".join(sorted(set(issues)))})
    except Exception as e:
        critical.append(p.as_posix()+": inspection failed "+str(e)[:130])
        rows.append({"path":p.as_posix(),"bytes":"","sha256":"","static_findings":"READ_ERROR "+str(e)[:130]})
with (out/"file-inventory.csv").open("w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=["path","bytes","sha256","static_findings"])
    w.writeheader();w.writerows(rows)
print("Inventoried",len(rows),"files; static flags",sum(bool(r["static_findings"]) for r in rows))

if critical:
    (out/"blocking-findings.txt").write_text("\n".join(critical),encoding="utf-8")
    print("BLOCKING_FINDINGS",len(critical))
    raise SystemExit(1)
print("Blocking findings: 0")
