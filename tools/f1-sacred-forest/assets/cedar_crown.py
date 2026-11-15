"""Original needle-spray texture and bent alpha-mask cards for the cedar.

Tree-only helper. Does not modify broad-leaf materials used by other plants.
No outside picture or atlas is used. Image alpha is exported as glTF MASK by
the explicit GREATER_THAN node; geometry remains standard glTF triangles.
"""
from pathlib import Path
import math
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import OUT, material, mesh
from mathutils import Vector


def _spray_arrays():
    import numpy as np
    n=512
    twig=np.zeros((n,n),dtype=np.float32)
    needle=np.zeros_like(twig)
    variation=np.zeros_like(twig)
    rng=np.random.default_rng(411023)

    def stroke(target,a,b,width0,width1):
        a=np.asarray(a,dtype=float)*(n-1); b=np.asarray(b,dtype=float)*(n-1)
        margin=max(width0,width1)+2
        x0=max(0,int(min(a[0],b[0])-margin)); x1=min(n,int(max(a[0],b[0])+margin)+1)
        y0=max(0,int(min(a[1],b[1])-margin)); y1=min(n,int(max(a[1],b[1])+margin)+1)
        if x1<=x0 or y1<=y0:return
        yy,xx=np.mgrid[y0:y1,x0:x1]
        d=b-a
        t=np.clip(((xx-a[0])*d[0]+(yy-a[1])*d[1])/max(float(d@d),1e-5),0,1)
        distance=np.sqrt((xx-a[0]-t*d[0])**2+(yy-a[1]-t*d[1])**2)
        width=width0+(width1-width0)*t
        coverage=np.clip(width+.65-distance,0,1)
        patch=target[y0:y1,x0:x1]
        np.maximum(patch,coverage,out=patch)

    def fan(a,b,scale,hand):
        a=np.asarray(a);b=np.asarray(b);d=b-a
        axis=d/max(np.linalg.norm(d),1e-6);side=np.array([-axis[1],axis[0]])
        stroke(twig,a,b,1.35*scale,.35)
        # Fine awl-shaped leaves are inclined along the twig, not broad ovals.
        for j in range(34):
            t=.055+j*.0268
            center=a+d*t
            for sign in (-1,1):
                length=(.028+.017*(1-t))*scale*rng.uniform(.80,1.18)
                direction=axis*.45+side*sign*.86
                tip=center+direction*length
                stroke(needle,center,tip,1.70*scale,.08)
        # Small terminal tuft fills the growing point.
        for j in range(5):
            aa=(j-2)*.25
            direction=axis*math.cos(aa)+side*math.sin(aa)
            stroke(needle,b-axis*.015*scale,b+direction*.025*scale,1.0*scale,.05)

    # Curved principal twig, with thirteen distinct attached lateral sprays.
    def trunk(t):return np.array([.49+.036*math.sin(t*2.8),.065+t*.85])
    for j in range(16):stroke(twig,trunk(j/16),trunk((j+1)/16),2.7*(1-j/20),1.2*(1-j/20))
    for j in range(13):
        t=.12+j*.060
        a=trunk(t); sign=-1 if j%2 else 1
        span=.31*(math.sin(t*math.pi)**.65)*(1-.32*t)
        b=a+np.array([sign*span,.11+span*.24])
        fan(a,b,.85+(.16 if j<5 else 0),sign)
        # An attached sub-fan near each lateral end gives a feathered edge.
        c=a+(b-a)*.58
        end=c+np.array([sign*span*.40,.10])
        fan(c,end,.60,sign)
    fan(trunk(.78),np.array([.52,.985]),.72,1)
    alpha=np.maximum(twig,needle)
    yy,xx=np.mgrid[0:n,0:n]
    v=yy/(n-1);u=xx/(n-1)
    broad=.024*np.sin(u*13+v*6)+.018*np.cos(u*9-v*17)
    grain=rng.normal(0,.012,(n,n))
    # Low-chroma olive, with slightly brighter young tips; neutral transparent
    # RGB avoids dark fringes when minified. Alpha contains the fine silhouette.
    base=np.array([.047,.102,.027])[None,None,:]
    rgb=np.broadcast_to(base,(n,n,3)).copy()
    rgb*=1+(broad+grain+v*.09)[:,:,None]
    woody=np.clip(twig-needle*.85,0,1)
    wood=np.array([.112,.090,.050])
    rgb=rgb*(1-woody[:,:,None])+wood[None,None,:]*woody[:,:,None]
    srgb=np.where(rgb<=.0031308,rgb*12.92,1.055*np.maximum(rgb,0)**(1/2.4)-.055)
    color=np.ones((n,n,4),dtype=np.float32);color[:,:,:3]=np.clip(srgb,0,1);color[:,:,3]=alpha
    height=needle*.00012+twig*.00020
    gy,gx=np.gradient(height,1/(n-1),1/(n-1))
    xyz=np.stack((-gx,-gy,np.ones_like(gx)),axis=-1);xyz/=np.linalg.norm(xyz,axis=-1,keepdims=True)
    normal=np.ones_like(color);normal[:,:,:3]=xyz*.5+.5
    orm=np.ones_like(color);orm[:,:,0]=.99;orm[:,:,1]=np.clip(.83+broad*.2,.76,.9);orm[:,:,2]=0
    return color,normal,orm


def cedar_spray_material():
    import bpy
    folder=OUT/'sources'/'generated_materials';folder.mkdir(parents=True,exist_ok=True)
    paths={'basecolor':folder/'cedar_spray_v1_basecolor.png',
           'normal':folder/'cedar_spray_v1_normal.jpg',
           'orm':folder/'cedar_spray_v1_orm.jpg'}
    if not all(p.exists() for p in paths.values()):
        color,normal,orm=_spray_arrays()
        for key,pixels in [('basecolor',color),('normal',normal),('orm',orm)]:
            image=bpy.data.images.new(paths[key].stem,width=512,height=512,alpha=key=='basecolor')
            image.colorspace_settings.name='Non-Color';image.alpha_mode='STRAIGHT'
            image.pixels.foreach_set(pixels.ravel());image.filepath_raw=str(paths[key])
            image.file_format='PNG' if key=='basecolor' else 'JPEG';image.save();bpy.data.images.remove(image)
    mat=material('cedar_fine_needle_spray',(.047,.102,.027,1),.83,texture_set=paths)
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    tex=nodes.get('cedar_fine_needle_spray_basecolor');bsdf=nodes.get('Principled BSDF')
    cutoff=nodes.new('ShaderNodeMath');cutoff.operation='GREATER_THAN';cutoff.inputs[1].default_value=.45
    cutoff.label='glTF MASK alpha cutoff .45'
    links.new(tex.outputs['Alpha'],cutoff.inputs[0]);links.new(cutoff.outputs[0],bsdf.inputs['Alpha'])
    mat.use_backface_culling=False
    if hasattr(mat,'surface_render_method'):mat.surface_render_method='DITHERED'
    return mat


def spray_card(name,base,tip,width,mat,roll=0,bend=.06):
    """Two-segment blade-card, bowed and rolled to avoid edge-on canopies."""
    a,b=Vector(base),Vector(tip);axis=(b-a).normalized()
    side=axis.cross(Vector((0,0,1)))
    if side.length<.001:side=axis.cross(Vector((0,1,0)))
    side.normalize();normal=side.cross(axis).normalized()
    side=side*math.cos(roll)+normal*math.sin(roll);normal=side.cross(axis).normalized()
    vertices=[]
    for j in range(3):
        t=j/2
        c=a.lerp(b,t)+normal*bend*math.sin(t*math.pi)
        for u in (0,.5,1):
            p=c+side*(u-.5)*width-normal*abs(u-.5)*bend*.4
            vertices.append(tuple(p))
    faces=[]
    for j in range(2):
        for i in range(2):
            k=j*3+i;faces.append((k,k+3,k+4,k+1))
    obj=mesh(name,vertices,faces,mat)
    uv=obj.data.uv_layers.new(name='UVMap');uv.active_render=True;obj.data.uv_layers.active=uv
    for loop in obj.data.loops:
        vi=loop.vertex_index;uv.data[loop.index].uv=(vi%3/2,vi//3/2)
    for p in obj.data.polygons:p.use_smooth=True
    return obj
