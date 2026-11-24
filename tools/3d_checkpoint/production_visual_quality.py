"""Reference-guided visual proxy, not a human or vision-model aesthetic verdict."""
from stitch_half_frame import read_rgba
import math

def evaluate(candidate, reference):
    w,h,a=read_rgba(candidate)
    W,H,b=read_rgba(reference)
    if (w,h)!=(W,H): raise ValueError("size mismatch")
    n=w*h
    if not n: raise ValueError("empty image")
    def features(rows):
        pixels=[tuple(row[i:i+4]) for row in rows for i in range(0,len(row),4)]
        mask=[p[3]>=128 for p in pixels]
        if not any(mask): raise ValueError("empty silhouette")
        lum=[(0.2126*p[0]+0.7152*p[1]+0.0722*p[2])/255 for p in pixels]
        edges=[abs(lum[i]-lum[i+1]) for i in range(n-1) if i%w!=w-1 and mask[i] and mask[i+1]]
        edges += [abs(lum[i]-lum[i+w]) for i in range(n-w) if mask[i] and mask[i+w]]
        visible=[v for v,m in zip(lum,mask) if m]
        return pixels,mask,sum(visible)/len(visible),sum(edges)/max(1,len(edges))
    p,m,l,e=features(a); q,k,L,E=features(b)
    union=sum(x or y for x,y in zip(m,k))
    overlap=sum(x and y for x,y in zip(m,k))
    color=sum(abs(x[c]-y[c]) for x,y,u,v in zip(p,q,m,k) if u and v for c in range(3))/max(1,overlap*765)
    metrics={"silhouette":overlap/union,"color":1-color,"lighting":1-abs(l-L),"detail":1-min(1,abs(e-E)*5)}
    return {"score":sum(metrics.values())/4,"metrics":metrics,"technical_pass":overlap/union>=0.90,"aesthetic_qa":"REFERENCE_PROXY_ONLY","human_approval":"NOT_APPROVED"}

def choose(baseline,candidates,minimum_gain=0.005):
    if not baseline["technical_pass"]: raise ValueError("invalid baseline")
    best=baseline
    for c in candidates:
        if c.get("technical_pass") and c.get("geometry_preserved") and c.get("artifact_verified") and math.isfinite(c["score"]) and c["score"]>best["score"] and c["score"]-baseline["score"]>=minimum_gain and all(c["metrics"][k]>=baseline["metrics"][k]-0.03 for k in baseline["metrics"]):
            best=c
    return best
