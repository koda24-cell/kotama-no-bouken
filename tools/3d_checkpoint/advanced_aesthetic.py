"""Deterministic reference-based aesthetic proxies; not semantic artistic approval."""
from stitch_half_frame import read_rgba
from production_visual_quality import evaluate
import math

def features(path):
    w,h,rows=read_rgba(path)
    p=[tuple(row[i:i+4]) for row in rows for i in range(0,len(row),4)]
    mask=[x[3]>=128 for x in p]
    if not any(mask):raise ValueError("empty foreground")
    lum=[sum(a*b for a,b in zip(x[:3],(.2126,.7152,.0722)))/255 for x in p]
    visible=sorted(v for v,m in zip(lum,mask) if m)
    def quantile(q):return visible[int(q*(len(visible)-1))]
    def hist(values):
        bins=[0]*16
        for v in values:bins[min(15,int(v*16))]+=1
        return [x/len(values) for x in bins]
    saturation=[(max(x[:3])-min(x[:3]))/max(1,max(x[:3])) for x,m in zip(p,mask) if m]
    scales=[]
    for d in (1,2,4,8):
        edges=[]
        for y in range(h):
            for x in range(w):
                i=y*w+x
                if not mask[i]:continue
                for j in ([i+d] if x+d<w else [])+([i+d*w] if y+d<h else []):
                    if mask[j]:edges.append(abs(lum[i]-lum[j]))
        scales.append(sum(edges)/max(1,len(edges)))
    return {"tone":hist(visible),"saturation":hist(saturation),"contrast":quantile(.95)-quantile(.05),"dark":sum(v<.035 for v in visible)/len(visible),"bright":sum(v>.965 for v in visible)/len(visible),"scales":scales}
def compare(candidate,reference):
    old=evaluate(candidate,reference)
    a,b=features(candidate),features(reference)
    def similarity(x,y):return 1-sum(abs(i-j) for i,j in zip(x,y))/2
    m=dict(old["metrics"])
    m.update(tone=similarity(a["tone"],b["tone"]),saturation=similarity(a["saturation"],b["saturation"]),contrast=1-abs(a["contrast"]-b["contrast"]),exposure=1-max(abs(a["dark"]-b["dark"]),abs(a["bright"]-b["bright"])),multiscale=1-min(1,5*sum(abs(x-y) for x,y in zip(a["scales"],b["scales"]))/4))
    instructions={"silhouette":"Inspect proportions and camera alignment","color":"Review base color and palette","lighting":"Review lighting before changing materials","detail":"Review surface texture strength","tone":"Review tonal distribution","saturation":"Review material saturation","contrast":"Review roughness and tonal contrast","exposure":"Inspect clipped highlights and dark regions","multiscale":"Inspect fine and coarse surface detail"}
    old.update(metrics=m,score=sum(m.values())/len(m),instructions=[instructions[k] for k in sorted(m,key=m.get) if m[k]<.95],aesthetic_qa="MULTISCALE_REFERENCE_PROXY_ONLY",human_approval="NOT_APPROVED")
    return old
