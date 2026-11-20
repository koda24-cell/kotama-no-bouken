"""Paint six coherent leaf-spray RGBA sprites (independent of Blender)."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math,random,json,hashlib
W=512; H=512; S=2
OUT=Path("render-output/floor6/painted-spray-source")
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
    rng=random.Random(61900+ix)
    im=Image.new("RGBA",(W*S,H*S),(0,0,0,0))
    d=ImageDraw.Draw(im,"RGBA")
    root=(W/2+(-22 if ix==4 else 0),H*.90)
    # branched wood and petioles embedded under overlapping leaves
    branches=[]
    for k in range(count):
        phi=(k+.5)/count * math.tau
        rad=rng.uniform(.21,.49)*W
        tx=W/2+math.cos(phi)*rad*wscale+rng.uniform(-13,13)
        ty=H*.52+math.sin(phi)*rad*.65*hscale-rng.uniform(2,38)
        if ix==1: ty-=36
        if ix==2: ty+=42*(math.cos(phi)+1)/2
        tx=max(64,min(W-64,tx));ty=max(65,min(H-85,ty))
        stem=(root[0]+(tx-root[0])*.58,root[1]+(ty-root[1])*.56)
        branches.append((stem,(tx,ty)))
    for stem,tip in branches:
        d.line([(int(root[0]*S),int(root[1]*S)),
                (int(stem[0]*S),int(stem[1]*S)),
                (int(tip[0]*S),int(tip[1]*S))],
                fill=(76,68,45,225),width=rng.randint(3,5)*S,joint="curve")
    for k,(stem,tip) in enumerate(branches):
        leaf_len=rng.uniform(59,116)*(1.05 if ix in (0,3) else 1)
        angle=math.atan2(tip[1]-stem[1],tip[0]-stem[0])
        tw=(tip[0]+math.cos(angle)*leaf_len*.52,
            tip[1]+math.sin(angle)*leaf_len*.52)
        tw=(max(25,min(W-25,tw[0])),max(15,min(H-25,tw[1])))
        width=leaf_len*rng.uniform(.22,.33)
        palette=palettes[ix]
        shade=palette[rng.randrange(len(palette))]
        jitter=rng.uniform(.89,1.09)
        col=tuple(max(0,min(255,round(c*jitter))) for c in shade)+(255,)
        contour=leaf_points(tip,tw,width,rng.uniform(-12,12))
        d.polygon(contour,fill=col)
        # soft lit blade and visible but restrained central vein
        d.line([(int(tip[0]*S),int(tip[1]*S)),(int(tw[0]*S),int(tw[1]*S))],
               fill=(188,194,112,115 if ix!=5 else 80),width=1*S)
        if k%3==0:
            middle=((tip[0]+tw[0])*.5,(tip[1]+tw[1])*.5)
            for side in (-1,1):
                d.line([(int(middle[0]*S),int(middle[1]*S)),
                    (int((middle[0]+side*width*.55)*S),int((middle[1]-leaf_len*.12)*S))],
                    fill=(165,175,104,73),width=S)
    # Antialias coverage to preserve smooth cutout, not neon blurred fog
    im=im.resize((W,H),Image.Resampling.LANCZOS)
    alpha=im.getchannel("A")
    assert alpha.getbbox() is not None and max(alpha.getextrema())==255
    im.save(OUT/(name+".png"),optimize=True)
    atlas.alpha_composite(im,(ix%3*W,ix//3*H))
atlas.save(OUT/"six_sprays_atlas.png",optimize=True)
files=list(OUT.glob("*.png"))
manifest={"version":"F6_PAINTED_SPRAYS_V01","status":"NOT_APPROVED",
    "generator":"tools/floor6/generate_painted_sprays.py","license":"original procedural artwork",
    "variants":[i[0] for i in variants],
    "files":[{"name":p.name,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"size":p.stat().st_size} for p in files]}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("F6_PAINTED_LEAF_ATLAS_READY",len(variants),atlas.size)
