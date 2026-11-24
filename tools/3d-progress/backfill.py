"""Import reviewed manifests from extracted, scanned artifact directories."""
import argparse,json
from pathlib import Path
from register import register
p=argparse.ArgumentParser()
p.add_argument("--registry",type=Path,required=True)
p.add_argument("--batch",type=Path,required=True)
p.add_argument("--source",type=Path,required=True)
a=p.parse_args()
items=json.loads(a.batch.read_text(encoding="utf-8"))
for item in items:
    folder=(a.source/item["directory"]).resolve()
    if not folder.is_relative_to(a.source.resolve()): raise ValueError("Invalid directory")
    meta=item["manifest"]
    print(meta["id"],"updated" if register(a.registry,meta,folder) else "unchanged")
