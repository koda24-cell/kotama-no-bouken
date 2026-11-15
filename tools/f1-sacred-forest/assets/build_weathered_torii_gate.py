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
from common import reset_scene, material, mesh, cube, tube, finish

reset_scene()
rng = random.Random(713)
red = material('aged_vermilion_wood', (.22, .052, .030, 1), .86)
bare = material('exposed_cedar_wood', (.105, .068, .041, 1), .90)
dark = material('rain_darkened_wood', (.031, .027, .020, 1), .93)
rope = material('straw_shimenawa', (.29, .235, .127, 1), .97)
paper = material('worn_rice_paper', (.69, .665, .53, 1), .94)
moss = material('torii_moss', (.045, .071, .019, 1), .99)


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
    return mesh(name,verts,faces,mat)


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

finish('weathered_torii_gate', description='退色した木造鳥居。幅3.8m高さ3.8m、底面中央原点/正面+Z。笠木の反り、貫の木組、実欠損、しめ縄と紙垂。中央幅2m高さ3mの通行空間を保持。')
