"""Embedded PNG/JPEG statistics; no external URI retrieval."""
import io,json,struct,hashlib,sys
from pathlib import Path
from PIL import Image
import numpy as np

def pixels(path):
    raw=Path(path).read_bytes()
    if len(raw)<20 or struct.unpack_from("<4sII",raw)!=(b"glTF",2,len(raw)): raise ValueError("Invalid GLB")
    chunks={}; pos=12
    while pos<len(raw):
        n,k=struct.unpack_from("<I4s",raw,pos); pos+=8
        if pos+n>len(raw): raise ValueError("Truncated chunk")
        chunks[k]=raw[pos:pos+n]; pos+=n
    doc=json.loads(chunks[b"JSON"]); binary=chunks.get(b"BIN\x00",b"")
    result=[]
    for i,im in enumerate(doc.get("images",[])):
        row={"index":i,"mime":im.get("mimeType")}
        if "bufferView" not in im or im.get("mimeType") not in ("image/png","image/jpeg"):
            result.append({**row,"status":"UNSUPPORTED_OR_EXTERNAL"}); continue
        v=doc["bufferViews"][im["bufferView"]]; start=v.get("byteOffset",0); end=start+v["byteLength"]
        if v["buffer"]!=0 or start<0 or end>len(binary): raise ValueError("Invalid image buffer")
        data=binary[start:end]
        with Image.open(io.BytesIO(data)) as image:
            w,h=image.size
            if w*h>16777216: raise ValueError("Texture exceeds analysis limit")
            a=np.asarray(image.convert("RGBA"),dtype=np.float32)/255
        rgb=a[:,:,:3]; lum=rgb@np.array([.2126,.7152,.0722])
        mask=a[:,:,3]>0
        values=rgb[mask]
        grad=[]
        if w>1:
            m=mask[:,1:]&mask[:,:-1]; grad.extend([float(np.abs(np.diff(lum,axis=1))[m].mean())] if m.any() else [])
        if h>1:
            m=mask[1:]&mask[:-1]; grad.extend([float(np.abs(np.diff(lum,axis=0))[m].mean())] if m.any() else [])
        result.append({**row,"status":"ANALYZED","size":[w,h],"sha256":hashlib.sha256(data).hexdigest(),"mean_rgb":values.mean(axis=0).tolist() if len(values) else None,"luminance_percentiles":np.percentile(lum[mask],[5,50,95]).tolist() if mask.any() else None,"alpha_coverage":float(mask.mean()),"mean_neighbor_contrast":sum(grad)/len(grad) if grad else None})
    return {"source_sha256":hashlib.sha256(raw).hexdigest(),"images":result,"limitations":"Encoded channel statistics, not rendered color or physical roughness."}
if __name__=="__main__":
    with Path(sys.argv[2]).open("x") as f: json.dump(pixels(sys.argv[1]),f,indent=2,allow_nan=False)
