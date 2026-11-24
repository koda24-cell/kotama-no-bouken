"""Experimental CLIP rubric proxy; no network or paid API during inference."""
from pathlib import Path
from advanced_art_review import VIEWS,CRITERIA,validate
PROMPTS={
"material_identity":("a convincing recognizable material","an ambiguous artificial material"),
"natural_form":("a coherent naturally shaped object","an awkward distorted object"),
"style_coherence":("a cohesive stylized fantasy game asset","an inconsistent mismatched game asset"),
"readability":("a clearly readable object with distinct parts","a confusing unreadable object"),
"detail_hierarchy":("a balanced hierarchy of large forms and fine details","a cluttered object with poorly balanced details"),
"craftsmanship":("a carefully crafted polished 3D game prop","a rough unfinished 3D game prop")}
class LocalVision:
    def __init__(self,model_dir):
        import torch
        from transformers import CLIPModel,CLIPProcessor
        p=Path(model_dir).resolve()
        if not p.is_dir() or not (p/"model.safetensors").is_file():raise ValueError("verified local safetensors model required")
        self.torch=torch
        self.model=CLIPModel.from_pretrained(str(p),local_files_only=True,use_safetensors=True,trust_remote_code=False).eval()
        self.processor=CLIPProcessor.from_pretrained(str(p),local_files_only=True,trust_remote_code=False)
    def review(self,item):
        from PIL import Image
        expected=item["art_review_packet"]
        views={}
        for v in VIEWS:
            path=Path(item["path"])/"reimport"/(v+".png")
            from advanced_art_review import digest
            if digest(path)!=expected["images"][v]:raise ValueError("image changed")
            with Image.open(path) as im:
                rgba=im.convert("RGBA");bg=Image.new("RGBA",rgba.size,(128,128,128,255));bg.alpha_composite(rgba)
                inputs=self.processor(text=[t for k in CRITERIA for t in PROMPTS[k]],images=bg.convert("RGB"),return_tensors="pt",padding=True)
            with self.torch.inference_mode():
                logits=self.model(**inputs).logits_per_image.reshape(-1,2)
                probs=logits.softmax(dim=1)[:,0].tolist()
            scores={k:max(1,min(5,1+round(4*p))) for k,p in zip(CRITERIA,probs)}
            views[v]={"scores":scores,"observation":"Experimental CLIP prompt preference: "+str(dict(zip(CRITERIA,probs)))}
        actions=[]
        if min(v["scores"]["material_identity"] for v in views.values())<3:actions.append("material")
        if min(v["scores"]["detail_hierarchy"] for v in views.values())<3:actions.append("surface")
        if min(v["scores"]["natural_form"] for v in views.values())<3:actions.append("manual_geometry_review")
        r={"images":expected["images"],"reference":expected["reference"],"reviewer":"LOCAL_CLIP","views":views,"actions":actions,"approval":"NOT_APPROVED"}
        return {"review":r,"summary":validate(r,expected),"item":item}
