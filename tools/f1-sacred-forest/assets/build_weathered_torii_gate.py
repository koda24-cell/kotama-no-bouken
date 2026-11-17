"""One hand-authored weathered wooden torii; no scene assembly.

Blender -Y front, bottom-centre origin. Keep x=[-1,1], z=[0,3]
clear of geometry. Age is carved into the silhouette, not only painted on.
"""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bpy
import numpy as np
from common import reset_scene, material, mesh, cube, tube, finish, OUT

reset_scene()
rng = random.Random(713)


def aged_timber_maps():
    """Original 512px image PBR: faded paint and limited real-looking loss.

    U is across grain, V is along grain. The common normal is reused for all
    three timber finishes so high-frequency image bytes are embedded once.
    No source photograph, shrine inscription or external image is reused.
    """
    n=512
    generator=np.random.default_rng(204713)
    fy,fx=np.meshgrid(np.fft.fftfreq(n)*n,np.fft.fftfreq(n)*n,indexing='ij')
    def field(sx,sy):
        band=np.fft.ifft2(np.fft.fft2(generator.normal(size=(n,n)))*
                         np.exp(-.5*((fx/sx)**2+(fy/sy)**2))).real
        return (band-band.mean())/max(band.std(),1e-6)
    broad=field(3,2)
    grain=field(25,1.4)*.026+field(87,4)*.012+field(145,8)*.004
    peel_field=field(7,3)*.72+field(22,8)*.28
    threshold=np.quantile(peel_field,.915)
    # Binary coverage is 8.5%; transition is one subtle ink-free ragged edge.
    peel=np.clip((peel_field-threshold)*10+.5,0,1)
    yy,xx=np.mgrid[0:n,0:n]/n
    splits=np.zeros((n,n))
    for xpos,start,end in ((.09,.13,.68),(.24,.44,.94),(.53,.02,.31),(.72,.32,.74),(.89,.56,.97)):
        centre=xpos+.004*np.sin(yy*39+xpos*32)+.002*np.cos(yy*73)
        taper=np.clip(np.minimum(yy-start,end-yy)*28,0,1)
        splits+=np.exp(-((xx-centre)/.0018)**2)*taper*.11
    # Long, broad stain boundaries follow the fall of water and timber grain.
    rain=np.maximum(field(12,.8)-.75,0)*.035
    silver=np.clip(np.array((.435,.421,.373))[None,None,:]*(1+grain[:,:,None]*1.9+
                        broad[:,:,None]*.045)-rain[:,:,None]-splits[:,:,None],.04,.8)
    coat=np.clip(np.array((.47,.185,.113))[None,None,:]*(1+grain[:,:,None]*.80+
                       broad[:,:,None]*.10)-rain[:,:,None]-splits[:,:,None]*.6,.025,.8)
    red_rgb=coat*(1-peel[:,:,None])+silver*peel[:,:,None]
    dark_rgb=np.clip(np.array((.19,.176,.145))[None,None,:]*(1+grain[:,:,None]*1.9+
                         broad[:,:,None]*.065)-rain[:,:,None]*.7-splits[:,:,None],.025,.5)
    height=grain*.40-splits*.30-peel*.012
    gx=(np.roll(height,-1,1)-np.roll(height,1,1))*1.6
    gy=(np.roll(height,-1,0)-np.roll(height,1,0))*1.6
    normal=np.stack((.5-gx,.5-gy,np.ones_like(gx)),axis=-1)
    common_ao=np.clip(.985-splits*.5-peel*.025,.78,1)
    # Faded coating is rough, but exposed fibres are still substantially rougher.
    rough_coat=np.clip(.73+grain*.8+broad*.023,.62,.84)
    rough_red=rough_coat*(1-peel)+np.clip(.94+grain*.25,.90,.99)*peel
    dest=OUT/'sources'/'generated_materials';dest.mkdir(parents=True,exist_ok=True)
    def save(kind,pixels,noncolor=False,downsample=False):
        if downsample:pixels=pixels[::2,::2,:]
        size=pixels.shape[0];rgba=np.ones((size,size,4),dtype=np.float32);rgba[:,:,:3]=np.clip(pixels,0,1)
        img=bpy.data.images.new('torii_original_'+kind,width=size,height=size,alpha=False)
        if noncolor:img.colorspace_settings.name='Non-Color'
        img.pixels.foreach_set(rgba.ravel());img.filepath_raw=str(dest/('torii_weathering_v2_'+kind+'.jpg'))
        img.file_format='JPEG';img.save();path=Path(img.filepath_raw);bpy.data.images.remove(img)
        return path
    normal_path=save('grain_normal',normal,True)
    red_orm=np.stack((common_ao,rough_red,np.zeros_like(grain)),axis=-1)
    bare_orm=np.stack((common_ao,np.clip(.94+grain*.4,.88,.99),np.zeros_like(grain)),axis=-1)
    dark_orm=np.stack((common_ao,np.clip(.88+grain*.4,.80,.98),np.zeros_like(grain)),axis=-1)
    maps={
        'red':{'basecolor':save('paint_basecolor',red_rgb),'normal':normal_path,'orm':save('paint_orm',red_orm,True)},
        'bare':{'basecolor':save('silvered_basecolor',silver),'normal':normal_path,'orm':save('silvered_orm',bare_orm,True,True)},
        'dark':{'basecolor':save('soaked_basecolor',dark_rgb,False,True),'normal':normal_path,'orm':save('soaked_orm',dark_orm,True,True)}}
    print('TORII_PAINT_LOSS_AREA',round(float(np.mean(peel>.5)),4))
    return maps


timber_maps=aged_timber_maps()
red = material('aged_vermilion_wood', (.22, .052, .030, 1), .86,texture_set=timber_maps['red'])
bare = material('exposed_cedar_wood', (.105, .068, .041, 1), .94,texture_set=timber_maps['bare'])
dark = material('rain_darkened_wood', (.031, .027, .020, 1), .91,texture_set=timber_maps['dark'])
rope = material('straw_shimenawa', (.29, .235, .127, 1), .97)
paper = material('worn_rice_paper', (.69, .665, .53, 1), .94)
moss = material('torii_moss', (.045, .071, .019, 1), .99)


def grain_uv(obj,axis=2,cylindrical=False):
    """Explicit along-grain V: Z for posts, X for every cross timber."""
    layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        normal=obj.matrix_world.to_3x3()@poly.normal
        facing=max(range(3),key=lambda i:abs(normal[i]))
        transverse=next(i for i in range(3) if i!=axis and i!=facing) if facing!=axis else (axis+1)%3
        face_uv=[]
        for li in poly.loop_indices:
            co=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co
            if cylindrical:
                side=-1 if co.x<0 else 1
                centre=side*(1.32-.025*co.z/3.65)
                u=(math.atan2(co.y,co.x-centre)/math.tau+.5)
                # Slight side offset prevents a visibly mirrored loss pattern.
                u=(u+(.17 if side<0 else .53))%1
                v=co.z/3.65
            elif facing==axis:
                u=co[(axis+1)%3]/.36
                v=co[(axis+2)%3]/.36
            else:
                u=co[transverse]/.36
                v=(co[axis]+(1.9 if axis==0 else 0))/(3.8 if axis==0 else 3.65)
            face_uv.append((li,u,v))
        if cylindrical and face_uv and max(u for _,u,_ in face_uv)-min(u for _,u,_ in face_uv)>.5:
            face_uv=[(li,u+1 if u<.5 else u,v) for li,u,v in face_uv]
        for li,u,v in face_uv:layer.data[li].uv=(u,v)
    return obj


def beam(name, width, depth, bottom, thickness, mat, curvature=0):
    verts=[]
    count=25
    for i in range(count):
        x=-width/2+width*i/(count-1)
        z=bottom+curvature*(2*x/width)**2
        # Deliberate uneven edge losses: distinct from uniform random noise.
        loss = .027 if i in (2,3,18) else (.01 if i==19 else 0)
        verts.extend([(x,-depth/2,z+loss),(x,depth/2,z),
                      (x,depth/2,z+thickness),(x,-depth/2,z+thickness-loss)])
    faces=[(3,2,1,0)]
    for i in range(count-1):
        a=i*4;b=(i+1)*4
        for j in range(4):faces.append((a+j,a+(j+1)%4,b+(j+1)%4,b+j))
    faces.append(tuple(4*(count-1)+j for j in range(4)))
    return grain_uv(mesh(name,verts,faces,mat),axis=0)


def chip(obj, loc, size, angles):
    cutter=cube('temporary carved chip',loc,size,None,0)
    cutter.rotation_euler=angles
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('removed corner timber loss','BOOLEAN')
    mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)


# Pillars: slightly bowed, tapered, irregular octagonal timbers, not cylinders.
for side in (-1,1):
    pts=[(side*(1.32-.025*t),.016*math.sin(t*math.pi),t*3.65) for t in (0,.04,.19,.43,.73,1)]
    p=tube(('left' if side<0 else 'right')+'_tapered_cedar_pillar',pts,[.168,.171,.164,.157,.149,.139],red,16)
    # Foot rot occurs on outer faces; cuts cannot reach passage clearance.
    chip(p,(side*1.47,-.085,.13),(.18,.16,.29),(.1,side*.28,.2))
    chip(p,(side*1.445,-.10,1.23),(.12,.10,.28),(.04,side*.35,.2))
    foot=tube('charcoal_dark_pillar_foot',[(side*1.32,0,.018),(side*1.319,0,.24)],[.171,.166],dark,16)
    # Eroded exposed grain is a narrow irregular ribbon, rooted on the surface.
    for j in range(5):
        a=-math.pi/2 + (j-2)*.15
        points=[]
        for k in range(8):
            z=.32+k*.33+rng.uniform(-.05,.05)
            x=side*(1.32-.025*z/3.65)+.162*math.cos(a)+.004*math.sin(k*2+j)
            points.append((x,.162*math.sin(a)-.004,z))
        tube('weather_exposed_vertical_wood_fibre',points,[.004,.007,.006,.005,.008,.004,.003,.001],bare,4)

# Kasagi carries an upward curve and a dark protective cap.
upper=beam('kasagi_curved_main_timber',3.8,.34,3.49,.16,red,.15)
cap=beam('kasagi_rain_darkened_top_cap',3.8,.37,3.65,.04,dark,.11)
chip(upper,(-1.83,-.14,3.69),(.24,.15,.14),(.30,.3,-.25))
chip(upper,(1.71,-.15,3.55),(.24,.14,.17),(.18,-.18,.2))
beam('shimaki_lower_parallel_timber',3.56,.28,3.40,.09,bare,.075)
nuki=beam('nuki_crossbar_through_posts',3.20,.21,3.105,.145,red,.015)
chip(nuki,(1.54,-.10,3.13),(.16,.10,.14),(.1,.18,.1))
for side in (-1,1):
    cube('through_mortise_wedge',(side*1.32,-.13,3.19),(.09,.07,.22),dark,.008)
    cube('wood_joint_pin',(side*1.32,-.152,3.31),(.042,.025,.055),bare,.005)
cube('gakuzuka_central_support',(0,0,3.325),(.16,.18,.21),red,.014)

# Rope is twisted from three coherent strands. Lowest paper stays above 3m.
for strand in range(3):
    pts=[]
    for i in range(121):
        t=i/120;x=-1.23+2.46*t
        z=3.48-.105*math.sin(math.pi*t)
        a=t*math.tau*19+strand*math.tau/3
        pts.append((x,-.232+.018*math.cos(a),z+.018*math.sin(a)))
    tube('three_strand_twisted_shimenawa',pts,.018,rope,6)
for x in (-.87,-.31,.31,.87):
    z=3.48-.105*math.sin(math.pi*(x+1.23)/2.46)
    # Zig-zag folded shide, with an actual torn corner and alternating fold depth.
    outline=[(-.05,0),(.04,0),(.04,-.055),(.071,-.055),(.071,-.092),
             (.025,-.092),(.025,-.14),(.055,-.14),(.043,-.19),
             (-.026,-.184),(-.026,-.128),(-.058,-.128),(-.058,-.08),(-.05,-.08)]
    verts=[(x+a,-.251+(.009 if i%4 in (2,3) else 0),z+b) for i,(a,b) in enumerate(outline)]
    sh=mesh('folded_paper_shide',verts,[tuple(range(len(verts)))],paper)
    solid=sh.modifiers.new('paper fibre thickness','SOLIDIFY');solid.thickness=.0012
    tube('rope_short_binding',[(x,-.24,z+.025),(x,-.25,z-.018)],.007,rope,5)

# A few sheltered moss cushions sit on the timber, not across every surface.
for x in (-1.63,-1.45,.91,1.02,1.42):
    z=3.69+.11*(2*x/3.8)**2
    tube('moss_on_upward_facing_cap',[(x-.06,0,z),(x,.015,z+.01),(x+.06,.004,z)], [.009,.016,.008],moss,6)

# Re-project after Boolean subtraction so new fracture faces also carry UVs.
cross_timbers={'kasagi_curved_main_timber','kasagi_rain_darkened_top_cap',
               'shimaki_lower_parallel_timber','nuki_crossbar_through_posts'}
for obj in bpy.context.scene.objects:
    if obj.type!='MESH' or not obj.data.materials:continue
    if obj.data.materials[0] not in (red,bare,dark):continue
    if 'pillar' in obj.name:
        grain_uv(obj,axis=2,cylindrical=True)
    else:
        grain_uv(obj,axis=0 if obj.name in cross_timbers else 2)

finish('weathered_torii_gate', description='退色した木造鳥居。幅3.8m高さ3.8m、底面中央原点/正面+Z。笠木の反り、貫の木組、実欠損、しめ縄と紙垂。中央幅2m高さ3mの通行空間を保持。')
