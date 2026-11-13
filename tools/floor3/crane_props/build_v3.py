"""Render V1/V2 unchanged and V3 with Blender-native damage overlays."""
exec(compile(open('/work/tools/floor3/crane_props/build.py').read(),'build.py','exec'))
exec(compile(open('/work/tools/floor3/crane_props/weathering.py').read(),'weathering.py','exec'))
# Preserve all original V2 geometry: the V3 versions add only separate surface meshes.
# Distinct assets remain standalone, independently exportable.
new_prop('floor3_crane_cable_reel_v3')
for x in (-.58,.58):
    flange=cyl('reel flange',(x,0,.83),.72,.085,iron,'X',40)
    cyl('rusty concentric ring',(x+(.052 if x>0 else -.052),0,.83),.63,.04,rust,'X',40)
    for k in range(8):
        t=2*pi*k/8
        cyl('rim rivet',(x+(.095 if x>0 else -.095),.47*cos(t),.83+.47*sin(t)),.038,.03,edge,'X',12)
barrel=cyl('barrel',(0,0,.83),.39,1.12,dark,'X',36)
cyl('axle',(0,0,.83),.15,1.48,edge,'X',24)
for x in [-.43,-.29,-.15,-.01,.13,.27,.41]:
    tube('wound cable',[(x,.42*cos(2*pi*k/48),.83+.42*sin(2*pi*k/48)) for k in range(49)],.038,edge,12)
for x in (-.45,.45):
    support=cube('reel support',(x,0,.12),(.21,1.24,.24),rust,.025)
    chipped_edge(support,edge,count=8,seed=int((x+1)*100))
tube('loose cable dragging on ground',[(.41,.42,.83),(.53,.62,.65),(.64,.83,.36),(.78,1.04,.12),(1.04,1.14,.07),(1.31,.92,.07),(1.44,.63,.07),(1.31,.44,.08)],.034,dark,12)
for k in range(5):
    t=2*pi*k/5
    cube('rust patch on reel',(.62,.57*cos(t),.83+.57*sin(t)),(.024,.13,.075),rust,.01)
cube('broken support plank',(.8,-.22,.09),(.65,.15,.13),dark,.025)
# Corrosion nodules across the cylindrical drum (radial orientation).
for i in range(80):
    a=2*pi*i/80;x=-.48+(i*37%97)/97*.96
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,.43*cos(a),.83+.43*sin(a)))
    p=bpy.context.object;p.name='WEATHER_cable_reel_corrosion';p.scale=(.034,.045,.027);p.data.materials.append(rust)
export_prop('floor3_crane_cable_reel_v3')

new_prop('floor3_crane_counterweight_v3')
core=cube('weight core',(0,0,.72),(1.85,1.20,1.32),dark,.11)
rusty_patches(core,rust,count=45,seed=31,size=.12)
chipped_edge(core,iron,count=23,seed=32)
abrasion_stripes(core,edge,count=13,seed=33)
for x in (-.68,.68):
    plate=cube('armour plate',(x,0,.74),(.16,1.25,1.37),iron,.035)
    rusty_patches(plate,rust,count=12,seed=int(100*(x+1)),size=.07)
for y in (-.45,.45):
    strap=cube('rusty strap',(0,y,.72),(1.85,.09,1.42),rust,.025)
    chipped_edge(strap,edge,count=8,seed=int(100*(y+1)))
for x in (-.48,.48):
    tube('lifting eye',[(x-.15,0,1.37),(x-.15,0,1.57),(x,0,1.73),(x+.15,0,1.57),(x+.15,0,1.37)],.07,edge,16)
for x in (-.52,.52):
    tube('front deep fracture',[(x,-.63,1.17),(x+.13,-.64,.91),(x-.035,-.64,.72),(x+.17,-.64,.40)],.026,rust,10)
    tube('branch crack',[(x+.13,-.65,.91),(x+.34,-.65,.79),(x+.29,-.65,.61)],.013,edge,8)
for x in (-.76,.76):
    for z in (.27,1.04):
        cyl('strap anchor',(x,-.63,z),.045,.06,edge,'Y',12)
for x,y,size in [(-1.02,-.58,.24),(1.07,.31,.31),(.76,-.77,.19)]:
    cube('fallen concrete fragment',(x,y,.12),(size,size*.82,size*.62),dark,.035)
export_prop('floor3_crane_counterweight_v3')

new_prop('floor3_crane_fallen_truss_v3')
for y in (-.32,.32):
    for z in (.23,.78):
        chord=cube('original long beam chord',(0,y,z),(2.8,.10,.10),iron,.025)
        rusty_patches(chord,rust,count=22,seed=int((y+1)*100+z*100),size=.08)
        chipped_edge(chord,dark,count=7,seed=int((y+1)*100+z*200))
for x in (-1.30,-.65,0,.65,1.20):
    for y in (-.32,.32):
        post=cube('original vertical post',(x,y,.50),(.075,.09,.55),rust,.018)
        chipped_edge(post,edge,count=3,seed=int((x+2)*100+(y+1)*10))
for y in (-.32,.32):
    for i in range(4):
        x=-1.25+i*.66
        tube('original lattice diagonal',[(x,y,.23),(x+.65,y,.78)],.045,edge,10)
for x in (-1.25,1.25):
    plate=cube('original end plate',(x,0,.50),(.10,.76,.67),rust,.02)
    chipped_edge(plate,edge,count=10,seed=int((x+2)*100))
    for y in (-.23,.23):
        cyl('end bolt',(x,y,.50),.04,.14,edge,'X',12)
for y in (-.32,.32):
    tube('buckled secondary brace',[(-1.22,y,.77),(-.90,y+.06,.69),(-.58,y-.10,.46),(-.23,y,.23)],.055,rust,12)
    tube('hanging torn steel',[(.58,y,.78),(.72,y+.04,.60),(.84,y+.16,.35),(1.02,y+.24,.13)],.042,dark,10)
for x,y in [(-1.34,-.43),(1.43,.39),(.86,-.66)]:
    cube('fallen joint scrap',(x,y,.10),(.24,.16,.11),rust,.02)
export_prop('floor3_crane_fallen_truss_v3')
print('CRANE_V3_WEATHERING_RENDER_COMPLETE')
