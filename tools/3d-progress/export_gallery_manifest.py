"""Package explicitly selected gallery PNGs; never grant game approval."""
import argparse, hashlib, json, os, re, shutil
from datetime import datetime, timezone
from pathlib import Path

def export(source, dest, meta, images):
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,79}", meta["id"]):
        raise ValueError("Invalid model ID")
    if meta["kind"] not in ("design","progress","render"):
        raise ValueError("Invalid stage")
    if meta.get("publication_cleared") is not True:
        raise ValueError("Explicit publication clearance required")
    if not images or dest.exists():
        raise ValueError("Empty selection or existing destination")
    prepared=[]
    for view, filename in images:
        p=(source/filename).resolve()
        if not p.is_relative_to(source.resolve()) or not p.is_file() or p.suffix.lower()!=".png":
            raise ValueError("Invalid image path")
        data=p.read_bytes()
        if not data.startswith(bytes.fromhex("89504e470d0a1a0a")) or len(data)>20_000_000:
            raise ValueError("Invalid PNG")
        prepared.append((view,p,hashlib.sha256(data).hexdigest()))
    dest.mkdir(parents=True)
    records=[]
    for i,(view,p,digest) in enumerate(prepared):
        filename=f"{i:03d}.png"
        shutil.copyfile(p,dest/filename)
        records.append(dict(view=view,file=filename,sha256=digest))
    result=dict(meta,approval_state="NOT_APPROVED",images=records)
    (dest/"manifest.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")

def main():
    p=argparse.ArgumentParser()
    for key in ("id","name","floor","version","kind"):
        p.add_argument("--"+key,required=True)
    p.add_argument("--source",type=Path,required=True)
    p.add_argument("--dest",type=Path,required=True)
    p.add_argument("--image",nargs=2,action="append",required=True)
    p.add_argument("--publication-cleared",action="store_true")
    a=p.parse_args()
    meta={k:getattr(a,k) for k in ("id","name","floor","version","kind","publication_cleared")}
    meta.update(status={"design":"設計中","progress":"制作中","render":"承認待ち"}[a.kind],
        run_id=int(os.environ["GITHUB_RUN_ID"]),source_sha=os.environ["GITHUB_SHA"],
        updated_at=datetime.now(timezone.utc).isoformat())
    export(a.source,a.dest,meta,a.image)

if __name__=="__main__":
    main()
