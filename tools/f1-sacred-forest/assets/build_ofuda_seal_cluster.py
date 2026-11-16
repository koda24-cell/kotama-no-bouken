"""Five original fictional paper seals with UV-mapped ink and curled/torn geometry.

Wall attachment origin is lower centre. Blender -Y faces the player; back at
Y=0 lies on the wall and paper curls toward -Y. No real shrine seal is copied.
"""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import bpy
import numpy as np
import common
from common import reset_scene, material, mesh, finish, OUT

reset_scene()
rng=random.Random(731)


def paper_atlas():
    n=512
    yy,xx=np.mgrid[0:n,0:n]
    noise=np.random.default_rng(47).normal(0,.009,(n,n))
    broad=.015*np.sin(xx*.043+np.sin(yy*.027))+.012*np.cos(yy*.035)
    fibres=.009*np.sin(xx*.9+yy*.041)+.005*np.cos(yy*1.6)
    stain=np.exp(-((xx%128-19)**2/1200+(yy-440)**2/4500))*.12
    field=noise+broad+fibres-stain
    rgb=np.stack((.82+field,.787+field,.675+field),axis=-1)

    def stroke(ax,ay,bx,by,width,col):
        # Original synthetic ink, with irregular saturation and edges.
        vx=bx-ax;vy=by-ay
        t=np.clip(((xx-ax)*vx+(yy-ay)*vy)/max(vx*vx+vy*vy,1),0,1)
        dist=np.sqrt((xx-(ax+t*vx))**2+(yy-(ay+t*vy))**2)
        mask=dist<width*(.84+.12*np.sin(yy*.9)+.12*np.cos(xx*.7))
        rgb[mask]=np.array(col)+noise[mask,None]*.8

    for col in range(4):
        x=col*128
        # Interrupted rectangular register, no imitated text/glyph font.
        for a,b,c,d in [(x+21,40,x+21,468),(x+107,48,x+107,458),
                        (x+21,467,x+75,467),(x+91,467,x+107,467),
                        (x+21,39,x+107,39)]:stroke(a,b,c,d,.9,(.29,.16,.11))
        for j in range(5):
            cy=110+j*65
            flip=1 if (j+col)%2 else -1
            points=[(x+64-26*flip,cy+18),(x+64+20*flip,cy+4),
                    (x+64-7*flip,cy-12),(x+64+23*flip,cy-23)]
            for p,q in zip(points,points[1:]):stroke(*p,*q,2.1,(.065,.059,.045))
            stroke(x+64,cy+25,x+64,cy-23,1.8,(.065,.059,.045))
        # Faded original square registration stamp, geometric only.
        for ax,ay,bx,by in [(x+45,59,x+85,59),(x+85,59,x+85,86),
                            (x+85,86,x+45,86),(x+45,86,x+45,59),
                            (x+52,65,x+78,79),(x+78,65,x+52,79)]:
            stroke(ax,ay,bx,by,1,(.37,.13,.075))
    rgba=np.ones((n,n,4),dtype=np.float32)
    rgba[:,:,:3]=np.clip(rgb,0,1)
    dst=OUT/'sources'/'generated_materials'/'fictional_paper_seal_atlas.jpg'
    dst.parent.mkdir(parents=True,exist_ok=True)
    im=bpy.data.images.new('Original fictional ink paper atlas',width=n,height=n,alpha=False)
    im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(dst);im.file_format='JPEG';im.save()
    bpy.data.images.remove(im)
    return dst


maps=common._fallback_images('original_talisman_paper',(.62,.58,.43,1),.95)
maps['basecolor']=paper_atlas()
paper=material('original_fictional_ofuda_paper',(.62,.58,.43,1),.95,texture_set=maps)


def seal(index,cx,width,height,angle):
    count=14
    verts=[]
    # Each seal has a ragged edge, bowed folds and a curled lower end.
    for i in range(count):
        t=i/(count-1)
        curl=.045*max(0,(.29-t)/.29)**2
        fold=.0035*math.sin(t*math.pi*5+index)
        z=.60-height+height*t
        for side in (-1,1):
            notch=.009 if i in (2,5,9) and side==(-1 if index%2 else 1) else 0
            local_x=side*(width*.5-notch)+.004*math.sin(i*2+index)
            local_z=z-.60
            x=cx+local_x*math.cos(angle)-local_z*math.sin(angle)
            zz=.60+local_x*math.sin(angle)+local_z*math.cos(angle)
            y=-.003-curl-fold-.003*index
            # A little missing lower corner, not only an alpha cutout.
            if i==0 and side==1:zz+=.018
            verts.append((x,y,zz))
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(count-1)]
    obj=mesh('paper_seal_%02d'%index,verts,faces,paper)
    uv=obj.data.uv_layers.new(name='UVMap')
    col=index%4
    for poly in obj.data.polygons:
        for li in poly.loop_indices:
            vi=obj.data.loops[li].vertex_index
            # Keep 2px atlas gutters to prevent other strips bleeding into ink.
            u=(col+(0.025 if vi%2==0 else .975))/4
            v=.025+.95*(vi//2)/(count-1)
            uv.data[li].uv=(u,v)
    solid=obj.modifiers.new('thin_fibrous_paper_edge','SOLIDIFY');solid.thickness=.0008
    return obj


# Deliberately different pitches/heights and overlaps; no random paper cloud.
for i,args in enumerate([(-.235,.087,.48,-.11),(-.123,.091,.555,.07),
                         (.006,.104,.60,-.025),(.139,.085,.51,.14),
                         (.241,.08,.455,-.08)]):
    seal(i,*args)

# Put the wall overlay origin exactly at its lower edge and centre the width.
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
coords=[v.co for o in objects for v in o.data.vertices]
minz=min(v.z for v in coords);maxz=max(v.z for v in coords)
cx=(min(v.x for v in coords)+max(v.x for v in coords))*.5
for o in objects:
    for v in o.data.vertices:
        v.co.x-=cx
        v.co.z=(v.co.z-minz)*.6/(maxz-minz)

finish('ofuda_seal_cluster',description='壁用の貼り札5枚、約0.6m高。壁面下端中央原点、正面+Z。紙端の破れ/折れ/反りと独自描画の架空墨紋様。実宗教の札・文字・印章を複製していない。')
