"""Static reference metadata; no texture copying or shader reconstruction."""
import hashlib,json,sys,struct
from pathlib import Path

def analyze_materials(path):
    raw=Path(path).read_bytes()
    magic,version,length=struct.unpack_from("<4sII",raw)
    if magic!=b"glTF" or version!=2 or length!=len(raw): raise ValueError("Invalid GLB")
    n,kind=struct.unpack_from("<I4s",raw,12)
    if kind!=b"JSON" or 20+n>len(raw): raise ValueError("Invalid JSON chunk")
    doc=json.loads(raw[20:20+n])
    materials=[]
    for i,m in enumerate(doc.get("materials",[])):
        p=m.get("pbrMetallicRoughness",{})
        materials.append({"index":i,"name":m.get("name"),"base_color_factor":p.get("baseColorFactor",[1,1,1,1]),"metallic":p.get("metallicFactor",1),"roughness":p.get("roughnessFactor",1),"alpha_mode":m.get("alphaMode","OPAQUE"),"alpha_cutoff":m.get("alphaCutoff",.5),"double_sided":m.get("doubleSided",False),"emissive_factor":m.get("emissiveFactor",[0,0,0]),"slots":{k:v for k,v in {**p,**m}.items() if k.endswith("Texture")},"extensions":m.get("extensions",{})})
    primitives=[]
    for i,mesh in enumerate(doc.get("meshes",[])):
        for j,prim in enumerate(mesh["primitives"]):
            uv={}
            for key,index in prim["attributes"].items():
                if key.startswith("TEXCOORD_"):
                    a=doc["accessors"][index]
                    uv[key]={k:a[k] for k in ("count","componentType","normalized","min","max") if k in a}
            primitives.append({"mesh":i,"primitive":j,"material":prim.get("material"),"uv_accessors":uv})
    return {"source_sha256":hashlib.sha256(raw).hexdigest(),"materials":materials,"primitives":primitives,"textures":doc.get("textures",[]),"images":[{k:v for k,v in im.items() if k in ("name","mimeType","bufferView")} for im in doc.get("images",[])],"samplers":doc.get("samplers",[]),"status":"REFERENCE_ONLY","limitations":"UV accessor metadata only; no UV island, pixel or procedural shader analysis."}
if __name__=="__main__":
    with Path(sys.argv[2]).open("x") as f: json.dump(analyze_materials(sys.argv[1]),f,indent=2,allow_nan=False)
