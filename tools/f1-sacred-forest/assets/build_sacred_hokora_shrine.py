"""Independent fictional forest hokora: layered timber roof and damaged joinery.

One asset only, no existing props imported. Z up / -Y front; stone and wood
UVs are explicit metric projections. The long front roof is an interpretation
of flowing-roof proportions, without copying a particular real shrine.
"""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bpy
import numpy as np
from common import reset_scene, material, mesh, cube, tube, uv_world, finish, OUT

reset_scene()
rng = random.Random(2026111607)


def wood_maps(label, rgb, roughness):
    """Original longitudinal grain, pores, split fibres and subdued rain stains."""
    n=512
    random_field=np.random.default_rng(98)
    fy,fx=np.meshgrid(np.fft.fftfreq(n)*n,np.fft.fftfreq(n)*n,indexing='ij')
    field=np.zeros((n,n))
    for sx,sy,amp in ((5,1,.035),(18,2,.027),(75,4,.016),(150,9,.007)):
        frequency=np.fft.fft2(random_field.normal(size=(n,n)))
        band=np.fft.ifft2(frequency*np.exp(-.5*((fx/sx)**2+(fy/sy)**2))).real
        band=(band-band.mean())/max(band.std(),1e-6)
        field+=amp*band
    yy,xx=np.mgrid[0:n,0:n]/n
    # Sparse longitudinal fissures; no diagonal or square grid pattern.
    split=np.zeros_like(field)
    for xpos,start,end in ((.12,.09,.46),(.42,.27,.80),(.72,.05,.30),(.86,.60,.96)):
        centre=xpos+.004*np.sin(yy*31+xpos*40)
        split+=np.exp(-((xx-centre)/.0025)**2)*((yy>start)&(yy<end))*.12
    rain=np.maximum(0,np.sin(xx*math.tau*4.0+.5*np.cos(yy*8)))**12*.027
    height=field-split*.4
    base=np.clip(np.array(rgb)[None,None,:]*(1+field[:,:,None]*1.5)-split[:,:,None]-rain[:,:,None],.025,.9)
    gx=(np.roll(height,-1,1)-np.roll(height,1,1))*1.8
    gy=(np.roll(height,-1,0)-np.roll(height,1,0))*1.8
    normal=np.stack((.5-gx,.5-gy,np.full_like(gx,1)),axis=-1)
    orm=np.stack((np.clip(.97-split*.7,.65,1),np.clip(roughness+field*.35,.50,.99),np.zeros_like(field)),axis=-1)
    dst=OUT/'sources'/'generated_materials';dst.mkdir(parents=True,exist_ok=True)
    paths={}
    for kind,pixels in (('basecolor',base),('normal',normal),('orm',orm)):
        rgba=np.ones((n,n,4),dtype=np.float32);rgba[:,:,:3]=pixels
        img=bpy.data.images.new(label+'_'+kind,width=n,height=n,alpha=False)
        if kind!='basecolor':img.colorspace_settings.name='Non-Color'
        img.pixels.foreach_set(rgba.ravel());img.filepath_raw=str(dst/(label+'_'+kind+'.jpg'))
        img.file_format='JPEG';img.save();paths[kind]=Path(img.filepath_raw)
        bpy.data.images.remove(img)
    return paths


stone_maps={k:OUT/'textures'/p for k,p in {
    'basecolor':'stone_color_graded.jpg','normal':'stone_normal.jpg','roughness':'stone_roughness.jpg'}.items()}
stone=material('hokora_graded_foundation_stone',(.19,.18,.15,1),.93,texture_set=stone_maps)
wood=material('hokora_silvered_cedar_wood',(.11,.09,.065,1),.91,
              texture_set=wood_maps('hokora_silvered_cedar',(.36,.32,.255),.91))
roofwood=material('hokora_soaked_shingle_wood',(.055,.052,.042,1),.94,
                  texture_set=wood_maps('hokora_soaked_shingle',(.245,.247,.224),.94))
freshwood=material('hokora_exposed_split_wood',(.16,.11,.065,1),.94,
                   texture_set=wood_maps('hokora_exposed_split',(.45,.355,.235),.94))
darkwood=material('hokora_sheltered_wood',(.040,.031,.020,1),.96)
moss=material('hokora_sparse_eave_moss',(.036,.052,.014,1),.99)
straw=material('hokora_old_straw_binding',(.24,.20,.12,1),.98)
paper=material('hokora_folded_paper',(.65,.63,.53,1),.96)


def grain_uv(obj, axis=2, across=.27, along=1.5):
    layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        facing=max(range(3),key=lambda a:abs(poly.normal[a]))
        transverse=next(a for a in range(3) if a!=axis and a!=facing) if facing!=axis else (axis+1)%3
        for li in poly.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            # End grain uses a transverse projection rather than a collapsed UV.
            v=co[axis] if facing!=axis else co[(axis+2)%3]
            layer.data[li].uv=(co[transverse]/across,v/along)
    return obj


def timber(name,loc,size,mat=wood,axis=2,bevel=.006):
    return grain_uv(cube(name,loc,size,mat,bevel),axis)


def remove_corner(obj,loc,size,rotation):
    cutter=cube('temporary_removed_material',loc,size,None,0)
    cutter.rotation_euler=rotation
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('real_missing_timber_or_stone','BOOLEAN');mod.operation='DIFFERENCE'
    mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)


# Three dry-laid courses, front step, chipped arrises; top of plinth is 0.37m.
for course,z in enumerate((.075,.205,.325)):
    widths=(.56,.51,.56) if course%2==0 else (.39,.68,.56)
    x=-.815
    for j,w in enumerate(widths):
        block=cube('foundation_course_%d_stone_%d'%(course,j),(x+w*.5,0,z),(w-.014,1.24,.145 if course==0 else .108),stone,.014)
        if (course,j) in ((0,0),(2,2)):
            remove_corner(block,(x+.018,-.61,z+.035),(.11,.10,.10),(.2,.35,.2))
        uv_world(block,3.0);x+=w
for y,z,width in ((-.78,.05,1.02),(-.66,.15,1.12)):
    step=cube('worn_front_stone_step',(0,y,z),(width,.27,.10),stone,.016)
    uv_world(step,3.0)

# Suspended cedar platform and its under-floor cross joinery.
for x in (-.48,.48):timber('floor_sill_longitudinal',(x,0,.43),(.12,1.04,.15),wood,1)
for j in range(7):
    x=-.51+j*.17
    timber('floorboard_%02d'%j,(x,0,.505),(.164,1.0,.065),wood,1,.004)

# Four structural posts are independent square timbers; one has a rotted foot.
for x in (-.54,.54):
    for y in (-.39,.39):
        post=timber('principal_square_cedar_post',(x,y,1.08),(.115,.115,1.18),wood,2,.009)
        if x>.0 and y<0:
            remove_corner(post,(x+.04,y-.04,.59),(.095,.10,.21),(.18,-.23,.15))
            grain_uv(post,2)
for y in (-.40,.40):
    timber('upper_tie_beam',(0,y,1.645),(1.34,.13,.15),wood,0)
    timber('lower_tie_beam',(0,y,.62),(1.20,.10,.10),wood,0)
for x in (-.54,.54):timber('side_upper_wall_plate',(x,0,1.64),(.12,.97,.14),wood,1)

# Rear planks and two side walls. Decay gaps are real absent/truncated boards.
for j in range(9):
    x=-.475+j*.118
    p=timber('rear_vertical_cladding_%02d'%j,(x,.435,1.105),(.112,.043,.91),wood,2,.003)
    if j==1:
        remove_corner(p,(x-.035,.43,.70),(.08,.09,.16),(.1,.2,.2));grain_uv(p,2)
for side in (-1,1):
    for j in range(7):
        y=-.327+j*.109
        if side==1 and j==3:continue
        height=.87 if not(side==1 and j==4) else .44
        z=.69+height*.5 if not(side==1 and j==4) else 1.35
        p=timber('side_cladding_%s_%02d'%(side,j),(side*.58,y,z),(.039,.102,height),wood,2,.003)
        if side==1 and j==4:
            remove_corner(p,(.58,y-.04,1.16),(.10,.075,.12),(.3,.2,.1));grain_uv(p,2)
    timber('side_wall_lower_rail',(side*.596,0,.79),(.045,.88,.047),darkwood,1,.004)

# Front lintel, two door jambs, one closed lattice, one half-open lattice.
timber('front_door_lintel',(0,-.46,1.52),(1.05,.09,.12),wood,0)
for x in (-.46,0,.46):timber('front_door_jamb',(x,-.46,1.09),(.046,.07,.77),wood,2)
def lattice_door(name,cx,angle):
    objects=[]
    for x in (-.195,.195):objects.append(timber(name+'_outer_stile',(cx+x,-.49,1.095),(.035,.039,.73),wood,2,.003))
    for z in (.745,1.445):objects.append(timber(name+'_outer_rail',(cx,-.49,z),(.42,.038,.035),wood,0,.003))
    for j in range(5):objects.append(timber(name+'_fine_vertical',(cx-.15+j*.075,-.495,1.095),(.018,.024,.66),wood,2,.002))
    for z in (.90,1.18,1.32):objects.append(timber(name+'_fine_horizontal',(cx,-.508,z),(.39,.022,.018),wood,0,.002))
    if angle:
        pivot=(cx+.21,-.49)
        for o in objects:
            x=o.location.x-pivot[0];y=o.location.y-pivot[1]
            o.location.x=pivot[0]+x*math.cos(angle)-y*math.sin(angle)
            o.location.y=pivot[1]+x*math.sin(angle)+y*math.cos(angle)
            o.rotation_euler[2]=angle
lattice_door('left_closed_lattice',-.228,0)
lattice_door('right_partly_open_lattice',.228,.58)

# Small interior altar, original unmarked sacred stone and plain offering trays.
for x in (-.23,.23):timber('altar_trestle_leg',(x,.14,.69),(.055,.30,.30),darkwood,2)
timber('small_inner_altar_table',(0,.14,.86),(.65,.36,.07),freshwood,0)
timber('altar_top_dark_rim',(0,.14,.906),(.66,.37,.024),wood,0)
v=[(-.11,.12,.92),(.11,.12,.92),(.10,.22,.92),(-.10,.22,.92),
   (-.06,.15,1.20),(.05,.15,1.25),(.06,.20,1.18),(-.06,.21,1.16)]
altarstone=mesh('plain_uninscribed_inner_stone',v,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],stone)
uv_world(altarstone,3)
for x in (-.22,.22):timber('empty_plain_offering_tray',(x,-.005,.93),(.12,.13,.018),freshwood,0,.003)

# Nagare-like asymmetric roof: ridge is behind the facade, front slope is longer.
# Front eave underside is at 1.74m; peak including ridge cap is below 2.45m.
def roof_pos(t,front=True):
    if front:return (.13-1.27*t,2.30-.67*t+.13*t*t)
    return (.13+.58*t,2.30-.66*t+.07*t*t)

# Visible paired gable braces and supporting curved rafters, no opaque roof sheet.
for x in (-.63,.63):
    timber('gable_bottom_tie',(x,.08,1.73),(.105,1.07,.11),wood,1)
    timber('gable_central_kingpost',(x,.13,1.99),(.085,.10,.48),wood,2)
    for front in (True,False):
        pts=[]
        for i in range(13):
            t=i/12;y,z=roof_pos(t,front);pts.append((x,y,z-.052))
        grain_uv(tube('bent_gable_barge_timber',pts,.047,wood,8),1)
for x in (-.84,-.42,0,.42,.84):
    for front in (True,False):
        pts=[]
        for i in range(13):
            t=i/12;y,z=roof_pos(t,front);pts.append((x,y,z-.035))
        grain_uv(tube('roof_supporting_curved_rafter',pts,.026,darkwood,6),1)


def shingle(name,x0,x1,t0,t1,front,row,col):
    # Three longitudinal divisions carry roof curvature and a broken eave tooth.
    ts=[t0,t0+(t1-t0)*.5,t1]
    verts=[]
    lift=.009+(1-t0)*.012
    for i,t in enumerate(ts):
        y,z=roof_pos(t,front)
        edge_loss=.022 if row==7 and col in (1,6) and i==2 else 0
        for x in (x0,x1):
            zz=z+lift+rng.uniform(-.002,.002)
            if i==2 and x==x1:zz-=edge_loss
            verts.extend([(x,y,zz),(x,y,zz-.017)])
    faces=[(0,4,6,2),(4,8,10,6),(1,3,7,5),(5,7,11,9),
           (0,1,5,4),(4,5,9,8),(2,6,7,3),(6,10,11,7),(0,2,3,1),(8,9,11,10)]
    mat=roofwood if (row+col)%7 else wood
    obj=mesh(name,verts,faces,mat)
    layer=obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        for li in poly.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            # Across plank -> U, roof fall and rain grain -> V.
            layer.data[li].uv=(co.x/.27,co.y/1.5)
    return obj


for front in (True,False):
    for row in range(8):
        t0=row*.125;t1=min(1,t0+.22)
        for col in range(10):
            # Sparse actual losses of end-course shingles reveal rafters below.
            if front and (row,col) in ((7,0),(7,8),(6,9)):continue
            shift=.025 if row%2 else 0
            x0=max(-1.04,-1.04+col*.208+shift)
            x1=min(1.04,-1.04+(col+1)*.208+shift-.006)
            if x1-x0<.025:continue
            shingle('overlapping_%s_roof_board_%02d_%02d'%('front' if front else 'rear',row,col),x0,x1,t0,t1,front,row,col)

# Ridge is a proper layered cedar cap, not an angular block floating above roof.
timber('ridge_bedding_beam',(0,.13,2.302),(2.07,.19,.09),darkwood,0,.014)
for y,z,w in ((.13,2.362,.24),(.13,2.402,.19)):
    timber('overlapping_ridge_cover',(0,y,z),(2.11,w,.045),roofwood,0,.012)
for x in (-.94,-.47,0,.47,.94):
    timber('wooden_ridge_clamp',(x,.13,2.438),(.052,.25,.022),wood,1,.004)

# Wooden pegs and corbel blocks show how weight reaches the four posts.
for x in (-.54,.54):
    for y in (-.39,.39):
        timber('small_load_bearing_corbel',(x,y,1.74),(.19,.20,.10),freshwood,0,.012)
        timber('square_mortise_end_pin',(x,y-.075,1.645),(.035,.025,.053),darkwood,2,.003)

# Discreet straw and paper: symbols are folded blank strips, no copied writing.
rope_points=[]
for i in range(35):
    x=-.47+i*.94/34
    rope_points.append((x,-.54,1.59-.065*math.cos(x/.47*math.pi/2)))
grain_uv(tube('small_straw_sacred_binding',rope_points,.014,straw,7),0)
for x in (-.25,.22):
    top=1.59-.065*math.cos(x/.47*math.pi/2)
    outline=[(-.028,0),(.025,0),(.025,-.045),(.048,-.045),(.048,-.08),(.013,-.08),
             (.013,-.12),(.034,-.12),(.025,-.153),(-.024,-.15),(-.024,-.105),(-.041,-.105),(-.041,-.066),(-.028,-.066)]
    verts=[(x+a,-.558+(i%3)*.003,top+b) for i,(a,b) in enumerate(outline)]
    sh=mesh('blank_folded_shide',verts,[tuple(range(len(verts)))],paper)
    grain_uv(sh,2)
    solid=sh.modifiers.new('paper_edge_thickness','SOLIDIFY');solid.thickness=.0008

# Moisture is local: sparse moss beside rear ridge and one sheltered foundation edge.
for x,t in [(-.82,.65),(-.72,.67),(.62,.51),(.71,.54),(.78,.58)]:
    y,z=roof_pos(t,False)
    tube('small_rear_roof_moss_island',[(x-.028,y,z+.024),(x,y+.012,z+.034),(x+.03,y,z+.025)], [.012,.019,.009],moss,6)
for x in (-.68,-.56,-.43):
    tube('foundation_shaded_edge_moss',[(x-.04,.61,.25),(x,.62,.27),(x+.035,.61,.25)],[.012,.021,.008],moss,6)

# Two split boards below the damaged side explain the missing cladding.
for x,y,a in [(.68,.22,.32),(.72,-.12,-.14)]:
    board=timber('fallen_split_cladding_board',(x,y,.40),(.085,.42,.018),freshwood,1,.002)
    board.rotation_euler[2]=a

finish('sacred_hokora_shrine',description='朽ちた架空森祠。底面中央原点/正面+Z。幅約2.1m高約2.45m。石基壇、四柱木組、半開き前面格子、一部失われた側板、前へ長い流造風木葺き屋根。板を実geometryで重ね、軒の損失・少量の苔と紙垂・内部小祭壇。実在宗教文言の複製なし。')
