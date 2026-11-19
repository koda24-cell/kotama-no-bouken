"""Paint six coherent leaf-spray RGBA sprites (independent of Blender)."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math,random,json,hashlib
W=512; H=512; S=2
OUT=Path("render-output/floor6/painted-spray-v30-source")
OUT.mkdir(parents=True,exist_ok=True)
atlas=Image.new("RGBA",(3*W,2*H),(0,0,0,0))
variants=[
    ("broad_lit",17,1.16,0.85,0.06),
    ("upright_mid",15,0.76,1.16,0.15),
    ("drooping",14,1.02,1.0,0.18),
    ("rounded_dense",22,1.1,0.99,0.29),
    ("branch_air",12,1.15,0.72,0.14),
    ("underside_dark",20,1.08,0.93,-0.12),
]
palettes=[
    [(108,154,58),(79,137,68),(49,116,71),(140,169,64)],
    [(86,148,78),(58,123,71),(127,169,76),(43,103,65)],
    [(70,139,69),(53,114,74),(120,157,71),(96,153,69)],
    [(66,131,69),(47,108,68),(93,145,71),(124,160,63)],
    [(96,145,72),(74,130,66),(128,162,83),(46,113,73)],
    [(47,101,66),(37,95,60),(74,126,70),(92,130,70)],
]
def leaf_points(root,tip,width,bend):
    x0,y0=root;x1,y1=tip
    dx=x1-x0;dy=y1-y0
    d=max(1,math.hypot(dx,dy))
    ux=-dy/d;uy=dx/d
    points_a=[];points_b=[]
    for i in range(17):
        t=i/16
        # near-base leaf slender, round/soft blade at tip, gentle asymmetric tip
        weight=(math.sin(math.pi*t)**.83)*(0.77+0.4*t)
        x=x0+dx*t+ux*bend*math.sin(math.pi*t)
        y=y0+dy*t+uy*bend*math.sin(math.pi*t)
        points_a.append((int((x+ux*width*weight)*S),int((y+uy*width*weight)*S)))
        points_b.append((int((x-ux*width*weight*.82)*S),int((y-uy*width*weight*.82)*S)))
    return points_a+list(reversed(points_b))
for ix,(name,count,wscale,hscale,sway) in enumerate(variants):
    rng=random.Random(63000+ix)
    im=Image.new("RGBA",(W*S,H*S),(0,0,0,0))
    d=ImageDraw.Draw(im,"RGBA")
    cx=W*.50;cy=H*.51
    # Dense, overlapping broadleaf rosettes. Unlike V29, no long radial
    # empty sticks ending in tiny isolated leaves. This should read as
    # one coherent painted foliage mass even from several meters away.
    n=count+17 if ix!=4 else count+9
    leaves=[]
    for k in range(n):
        theta=(k/n)*math.tau+rng.uniform(-.6,.6)
        # Low discrepancy spatial positions, with dense weighted center
        r=(rng.random()**.7)*(165 if ix!=4 else 188)
        tx=cx+math.cos(theta)*r*wscale+rng.uniform(-20,20)
        ty=cy+math.sin(theta)*r*.84*hscale+rng.uniform(-22,22)
        tx=max(90,min(W-90,tx));ty=max(85,min(H-86,ty))
        direction=theta+rng.uniform(-.7,.7)
        leaf_len=rng.uniform(112,157) if ix!=4 else rng.uniform(104,143)
        width=leaf_len*rng.uniform(.32,.43)
        leaves.append((ty,tx,direction,leaf_len,width,k))
    # Short, thin attached stalks, mostly occluded by large blades
    root=(cx,cy+103)
    for _,tx,ang,length,width,k in leaves:
        y=next(v[0] for v in leaves if v[-1]==k)
        anchor=(tx-math.cos(ang)*length*.40,y-math.sin(ang)*length*.40)
        mid=((root[0]+anchor[0])*.5,(root[1]+anchor[1])*.5)
        d.line([(int(root[0]*S),int(root[1]*S)),
                (int(mid[0]*S),int(mid[1]*S)),
                (int(anchor[0]*S),int(anchor[1]*S))],
                fill=(57,76,47,115),width=2*S)
    for y,tx,ang,length,width,k in sorted(leaves,key=lambda x:x[0]):
        mid=Vector((tx,y))
        dir=Vector((math.cos(ang),math.sin(ang)))
        base=mid-dir*length*.48
        tip=mid+dir*length*.52
        palette=palettes[ix]
        # Shadows stay in dark-green shades, never neon/white.
        pick=palette[rng.randrange(len(palette))]
        jitter=rng.uniform(.90,1.08)
        col=tuple(max(0,min(255,round(c*jitter))) for c in pick)+(255,)
        contour=leaf_points(tuple(base),tuple(tip),width,rng.uniform(-8,8))
        shadow=tuple((x+3*S,y+5*S) for x,y in contour)
        d.polygon(shadow,fill=(27,69,44,77))
        d.polygon(contour,fill=col)
        # Subtle leaf midrib and occasional broad soft vein; dark interior
        d.line([(int(base.x*S),int(base.y*S)),
                (int(tip.x*S),int(tip.y*S))],
                fill=(157,174,95,68),width=S)
        if k%4==0:
            d.ellipse((int((mid.x-12)*S),int((mid.y-9)*S),
                       int((mid.x+10)*S),int((mid.y+8)*S)),fill=(137,177,90,25))
    im=im.resize((W,H),Image.Resampling.LANCZOS)
    alpha=im.getchannel("A")
    assert alpha.getbbox() is not None and max(alpha.getextrema())==255
    im.save(OUT/(name+".png"),optimize=True)
    atlas.alpha_composite(im,(ix%3*W,ix//3*H))
atlas.save(OUT/"six_sprays_atlas.png",optimize=True)
files=list(OUT.glob("*.png"))
manifest={"version":"F6_PAINTED_SPRAYS_V30","status":"NOT_APPROVED",
    "generator":"tools/floor6/generate_painted_sprays_v30.py","license":"original procedural artwork",
    "variants":[i[0] for i in variants],
    "files":[{"name":p.name,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"size":p.stat().st_size} for p in files]}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("F6_PAINTED_V30_ATLAS_READY",len(variants),atlas.size)
