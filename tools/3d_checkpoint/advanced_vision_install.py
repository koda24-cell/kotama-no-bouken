"""Download only known data files, never remote executable model code."""
import urllib.request,json,hashlib,sys,re
from pathlib import Path
MODEL="laion/CLIP-ViT-B-32-laion2B-s34B-b79K"
FILES=("config.json","preprocessor_config.json","tokenizer_config.json","vocab.json","merges.txt","special_tokens_map.json","model.safetensors")
def get(url):
    return urllib.request.urlopen(url,timeout=120)
def main():
    root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=False)
    with get("https://huggingface.co/api/models/"+MODEL+"?blobs=true") as r:meta=json.load(r)
    rev=meta["sha"]
    if not re.fullmatch("[0-9a-f]{40}",rev):raise ValueError("invalid revision")
    entries={x["rfilename"]:x for x in meta["siblings"]}
    manifest={}
    for name in FILES:
        e=entries[name];size=e["size"]
        if not 0<size<=700_000_000:raise ValueError("size limit")
        h=hashlib.sha256();git=hashlib.sha1(("blob "+str(size)+"\\0").encode().replace(b"\\0",b"\x00"));n=0
        with get("https://huggingface.co/"+MODEL+"/resolve/"+rev+"/"+name) as r,(root/name).open("xb") as f:
            while chunk:=r.read(1024*1024):
                n+=len(chunk)
                if n>size:raise ValueError("oversize")
                h.update(chunk);git.update(chunk);f.write(chunk)
        if n!=size:raise ValueError("size mismatch")
        if e.get("lfs"):
            if h.hexdigest()!=e["lfs"]["sha256"]:raise ValueError("weight hash mismatch")
        elif git.hexdigest()!=e["blobId"]:raise ValueError("blob hash mismatch")
        manifest[name]=h.hexdigest()
    (root/"manifest.json").write_text(json.dumps({"model":MODEL,"revision":rev,"sha256":manifest},indent=2))
if __name__=="__main__":main()
