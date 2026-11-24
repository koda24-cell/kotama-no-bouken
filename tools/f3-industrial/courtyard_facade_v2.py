"""One 4m structural bay of an abandoned five-storey courtyard building.

Original geometry studied from real courtyard/industrial photographs; no Pin
pixels or game geometry are embedded. Units metres, Z up, facade toward -Y.
"""
def build(e):
    import math
    from mathutils import Vector, Matrix
    c,bpy,box,rod,scar,pbr,rng=[e[k] for k in ['c','bpy','box','rod','scar','pbr','rng']]
    rust,moss,fracture,dark,steel=[e[k] for k in ['rust','moss','fracture','dark','steel']]
    from facade_weathering_v2 import make,map_surfaces
    aged=make(c,bpy,e['textures']);concrete=aged['structure'];render=aged['render']
    rubble=pbr('v2_crushed_aggregate','concrete_debris')
    inner=c.material('v2_unlit_room_concrete',(.105,.119,.108,1),.97)
    brick=c.material('v2_exposed_infill_brick',(.19,.105,.067,1),.94)
    paint=c.material('v2_remaining_oxide_primer',(.18,.12,.073,1),.88)
    stem=c.material('v2_dry_woody_liana',(.075,.081,.037,1),.96)

    def slab(name,z,broken=False):
        # Full rear bearing remains; the torn front edge exposes the slab depth.
        xy=[(-2,-1.70),(2,-1.70),(2,1.72),(-2,1.72)]
        if broken:
            xy=[(-2,-1.70),(-1.42,-1.70),(-1.28,-1.35),(-.85,-1.46),
                (-.44,-.83),(.02,-1.06),(.26,-.54),(.75,-.64),
                (1.04,-.08),(1.54,-.27),(2,.10),(2,1.72),(-2,1.72)]
        n=len(xy)
        verts=[(x,y,h) for h in [z-.12,z+.12] for x,y in xy]
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
        faces += [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
        o=c.mesh(name,verts,faces,concrete);o.data.materials.append(fracture)
        for poly in list(o.data.polygons)[2:]:
            if broken and poly.index<11:poly.material_index=1
        c.uv_world(o)
        if broken:
            for i,(x,y) in enumerate(xy[1:10]):
                pts=[(x,y+.38,z-.012),(x-.025,y-.14,z-.025),
                     (x+.04,y-.48,z-.15-rng.random()*.10)]
                rod('exposed slab reinforcing bar',pts[0],pts[1],.012,rust,8)
                rod('bent hanging reinforcing bar',pts[1],pts[2],.012,rust,8)
                for j in range(4):
                    p=Vector(pts[0]).lerp(Vector(pts[1]),j/5)
                    rod('raised rebar rib',p+Vector((-.015,0,0)),p+Vector((.015,0,0)),.003,rust,5)
        return o

    levels=[.18,3.22,6.26,9.30,12.34,15.38]
    for i,z in enumerate(levels):slab('storey slab '+str(i),z,broken=i>=4)
    for k,x in enumerate([-1.80,0,1.80]):
        for i in range(5):
            if i==4 and k==2:continue
            z=levels[i]+1.52
            o=box('continuous reinforced column',(x,-1.44,z),(.32,.44,2.92),concrete,.025)
            if (k,i) in [(0,3),(1,1),(2,2)]:
                scar(o,(x-.11,-1.64,z+.34),(.24,.25,.38),(.12,.16,.22))
                for delta in [-.065,.065]:rod('column cage behind spall',(x+delta,-1.49,z+.13),(x+delta,-1.49,z+.60),.013,rust,8)
        # Recessed rear frame and actual room depth, including a ceiling underside.
        box('rear bearing column',(x,1.47,7.76),(.33,.38,15.16),inner,.018)
    for i,z in enumerate(levels[:-1]):
        box('rear room wall',(0,1.65,z+1.51),(3.66,.16,2.78),inner,.012)
        for side in [-1,1]:
            if side==1 and i==4:
                # The upper return has fallen away with its front bearing.
                box('surviving rear return pier',(side*1.96,1.30,z+1.51),(.16,.48,2.78),render,.018)
                continue
            if i in [1,3]:
                for y in [-1.18,1.35]:box('side window bearing jamb',(side*1.96,y,z+1.51),(.16,.34,2.78),render,.015)
                box('side window parapet',(side*1.96,.10,z+.44),(.16,2.28,.66),render,.015)
                box('side window lintel',(side*1.96,.10,z+2.65),(.20,2.28,.25),concrete,.015)
                for y in [-.91,1.06]:rod('side window rusted upright',(side*1.97,y,z+.90),(side*1.97,y,z+2.51),.018,rust,7)
            else:box('room return wall',(side*1.96,.10,z+1.51),(.16,2.91,2.78),render,.018)
        if i<4:
            box('front lintel bearing',(0,-1.45,z+2.77),(3.85,.38,.29),concrete,.018)
        # Each window has a projecting sill, thick jambs and a dark real room.
        for bay,x in enumerate([-.90,.90]):
            if i==4 and bay==1:continue
            sillz=z+.87
            panel=box('weathered window spandrel',(x,-1.53,z+.45),(1.47,.21,.67),render,.018)
            box('projecting chipped sill',(x,-1.70,sillz),(1.60,.38,.12),concrete,.014)
            if (i+bay)%3==0:scar(panel,(x+.61,-1.66,z+.67),(.30,.20,.22),(.24,.06,.18))
            # Infill patches expose individual brick courses where plaster has fallen.
            if (i,bay) in [(0,0),(2,1),(3,0)]:
                for row in range(3):
                    for col in range(3-row//2):
                        brickx=x-.53+col*.24+(row%2)*.11
                        box('exposed masonry infill',(brickx,-1.66,z+.16+row*.15),(.215,.075,.115),brick,.009)
            for side in [-1,1]:
                box('rusted window upright',(x+side*.59,-1.59,z+1.74),(.036,.045,1.61),rust,.005)
            box('window frame head',(x,-1.59,z+2.53),(1.20,.046,.040),rust,.005)
            if (i+bay)%4!=1:
                box('remaining sash mullion',(x-.07,-1.59,z+1.73),(.026,.035,1.58),rust,.003)
                box('cross sash',(x,-1.59,z+1.67),(1.18,.035,.025),rust,.003)
            if (i,bay) in [(1,0),(2,1),(4,0)]:
                # Only attached remnants survive; most glazing is missing.
                for side in [-1,1]:
                    verts=[(x+side*.56,-1.612,z+1.0),(x+side*.56,-1.612,z+1.68),
                           (x+side*.22,-1.612,z+1.51),(x+side*.40,-1.612,z+1.24)]
                    o=c.mesh('opaque dirt-coated broken glazing remnant',verts,[(0,1,2,3)],dark);c.uv_world(o)
            # Missing guard rail segments have bent attached ends, not floating bars.
            if i in [1,2,3]:
                for end in [-1,1]:rod('balcony guard post',(x+end*.64,-1.84,z+.13),(x+end*.64,-1.84,z+.85),.016,rust,8)
                right=x+.64 if (i+bay)%2 else x+.22
                rod('surviving balcony top rail',(x-.64,-1.84,z+.85),(right,-1.84,z+.85),.018,rust,8)
                if right<x+.5:rod('bent attached rail',(right,-1.84,z+.85),(right+.13,-1.92,z+.61),.018,rust,8)
    # An irregular broken right-hand crown stops the volume being a perfect box.
    box('surviving roof pier left',(-1.80,-1.44,15.72),(.32,.44,.62),concrete,.02)
    for x in [-1.86,-1.73]:
        c.tube('bent roof reinforcing cage',[(x,-1.46,15.38),(x,-1.46,16.05),(x+.12,-1.53,16.20)],.013,rust,8)
    for x in [.08,1.77]:
        c.tube('hanging severed facade cable',[(x,-1.73,12.35),(x+.06,-1.86,10.70),
               (x-.12,-1.91,9.35),(x+.09,-1.88,8.62)],.012,dark,7)
    # Rain pipe has supports at every floor and an open-looking split lower end.
    c.tube('corroded rain downpipe',[(-1.62,-1.88,12.7),(-1.62,-1.88,1.8),
           (-1.46,-1.94,1.42),(-1.48,-1.94,.72)],.042,rust,12)
    for z in levels[1:-1]:
        box('pipe wall standoff',(-1.62,-1.69,z+.36),(.09,.34,.055),steel,.006)
        rod('pipe bracket bolt',(-1.62,-1.69,z+.35),(-1.62,-1.93,z+.35),.018,rust,6)
    # Local rubble accumulates in gravity pockets: ground and surviving ledges.
    for i in range(38):
        upper=i>20;z=levels[3 if i%2 else 2]+.17 if upper else .10
        x=rng.uniform(-1.65,1.65);y=rng.uniform(-1.70,-1.22)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,z))
        o=bpy.context.object;o.name='lodged broken concrete and plaster'
        o.scale=(rng.uniform(.055,.16),rng.uniform(.045,.12),rng.uniform(.035,.10));o.rotation_euler=(rng.random()*.5,rng.random()*.5,rng.random()*math.tau)
        for v in o.data.vertices:v.co*=rng.uniform(.76,1.18)
        o.data.materials.append(rubble);c.uv_world(o)
    # Reuse the already authored original ivy, rooted on ledges rather than dots.
    import ivy
    for x,z,scale in [(-.7,6.42,.78),(.55,12.50,.83)]:
        before=set(bpy.data.objects);ivy.build(e)
        bpy.context.view_layer.update()
        transform=Matrix.Translation((x,-1.87,z))@Matrix.Diagonal((scale,scale,scale,1))
        for o in set(bpy.data.objects)-before:
            if o.type=='MESH':o.matrix_world=transform@o.matrix_world
    for x,z in [(-.7,6.42),(.55,12.50)]:
        c.tube('woody root gripping slab',[(x+.11,-1.73,z+.04),(x+.07,-1.86,z-.20),
               (x-.06,-1.90,z-.73),(x+.16,-1.89,z-1.2)],.022,stem,8)
    # A small back-side service ladder makes side/back review meaningful.
    for x in [-.24,.24]:rod('rear fixed ladder rail',(x,1.90,.4),(x,1.90,9.7),.026,rust,10)
    for i in range(30):rod('rear fixed ladder rung',(-.24,1.90,.55+i*.30),(.24,1.90,.55+i*.30),.018,rust,8)
    for z in [1,4,7,9.5]:
        for x in [-.24,.24]:rod('ladder bearing anchor',(x,1.90,z),(x,1.70,z),.022,steel,8)

    map_surfaces(bpy,{concrete,render})
