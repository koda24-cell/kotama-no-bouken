"""Single damaged votive stele, 1.8m tall, fictional non-language markings."""
import math
import random
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import bpy
from common import reset_scene, material, mesh, cube, tube, finish, OUT

reset_scene()
rng=random.Random(901)
tex=OUT/'textures'
source={k:tex/v for k,v in {'basecolor':'stone_color_graded.jpg','normal':'stone_normal.jpg','roughness':'stone_roughness.jpg'}.items()}
stone=material('stele_weathered_stone',(.24,.235,.205,1),.89,
               texture_set=source if all(p.exists() for p in source.values()) else None)
fresh=material('stele_old_fracture',(.29,.275,.23,1),.93)
dark=material('stele_recessed_carving',(.064,.061,.043,1),.98)
moss=material('stele_cushion_moss',(.043,.064,.019,1),.99)


def slab(name,outline,depth,mat):
    n=len(outline)
    vs=[(x,-depth/2,z) for x,z in outline]+[(x,depth/2,z) for x,z in outline]
    fs=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    return mesh(name,vs,fs,mat)


# The left shoulder is actually absent. Right side has a stepped old spall.
base=slab('partly_broken_socle',[(-.53,0),(.51,0),(.53,.14),(.44,.22),(.11,.23),(-.48,.19),(-.55,.11)],.47,stone)
body=slab('monolith_with_missing_upper_shoulder',[
    (-.37,.19),(.37,.19),(.405,.62),(.395,1.22),(.33,1.39),
    (.35,1.54),(.27,1.72),(.105,1.80),(-.12,1.77),
    (-.17,1.62),(-.31,1.57),(-.36,1.35),(-.385,.75)],.26,stone)
# Matching cutter/body material slots assign darkened stone only to the
# subtractive groove's new interior faces, never to a raised overlay.
body.data.materials.append(dark)


def carve_recess(name,points,radius,centre_y=-.127):
    """A four-sided diamond cutter makes an actual V-shaped inscription.

    Body front is Y=-0.13m. Most cutter centres are 3mm behind that plane;
    the thinner tapered fissure is centred 1mm behind to intersect the face.
    All x/z path positions are retained, including the four original rows.
    """
    cutter=tube('temporary_'+name,[(x,centre_y,z) for x,_,z in points],radius,None,4)
    cutter.data.materials.append(stone)
    cutter.data.materials.append(dark)
    for polygon in cutter.data.polygons:polygon.material_index=1
    bpy.context.view_layer.objects.active=body
    mod=body.modifiers.new('actual_v_groove_'+name,'BOOLEAN')
    mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    if hasattr(mod,'material_mode'):mod.material_mode='INDEX'
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

# V-shaped side losses created by subtraction; no floating dark chip decals.
for loc,size,ang in [((-.37,-.115,.58),(.16,.11,.20),(.21,.14,.25)),
                     ((.36,-.10,1.22),(.18,.13,.23),(.08,-.28,.22)),
                     ((-.24,-.11,1.64),(.15,.12,.13),(.32,-.17,.3))]:
    cut=cube('temporary_stone_spall_cutter',loc,size,None,0)
    cut.rotation_euler=ang
    bpy.context.view_layer.objects.active=body
    mod=body.modifiers.new('carved_out_spall','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;mod.solver='EXACT'
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)

# Flattened carved field: a split border suggests a purpose without copying text.
for pts in [[(-.25,-.134,.37),(-.25,-.134,1.36),(-.14,-.134,1.53)],
            [(.22,-.134,.37),(.22,-.134,1.47),(.08,-.134,1.61)],
            [(-.25,-.134,.36),(-.06,-.134,.35)],[(.04,-.134,.35),(.22,-.134,.36)]]:
    carve_recess('worn_border_recess',pts,.008)

# These angular symbols are original geometric marks, not kanji or religious seals.
for z,flip in [(1.36,1),(1.11,-1),(.86,1),(.61,-1)]:
    pts=[(-.105*flip,-.138,z+.065),(.08*flip,-.138,z+.035),
         (-.015*flip,-.138,z-.025),(.09*flip,-.138,z-.085)]
    carve_recess('fictional_nonverbal_angular_glyph',pts,.011)
    carve_recess('short_cross_glyph',[(0,-.139,z+.10),(0,-.139,z-.10)],.008)

# A real fissure crosses the face and side rather than a regular seam.
carve_recess('tapering_fissure_on_face',[(-.37,-.132,.96),(-.15,-.139,.93),(-.07,-.138,.97),(.03,-.139,.89),(.29,-.135,.85)], [.006,.008,.005,.004,.002],centre_y=-.129)
mesh('exposed_shoulder_fracture',[(-.31,-.132,1.57),(-.17,-.132,1.62),(-.12,.12,1.77),(-.17,.13,1.62),(-.31,.13,1.57)],[(0,1,2,3,4)],fresh)

# Moss is patchy and sits on the pedestal ledge and fractured shoulder.
for x,y,z,scale in [(-.38,-.15,.204,.075),(-.20,-.13,.223,.05),(.27,.04,.228,.07),
                    (.34,.09,.22,.06),(-.28,-.02,1.595,.045)]:
    for j in range(6):
        a=j*math.tau/6
        tube('small_irregular_moss_cushion',[(x+math.cos(a)*scale*.7,y+math.sin(a)*scale*.6,z),
                (x+math.cos(a)*scale*.2,y+math.sin(a)*scale*.2,z+.018)], [.018,.008],moss,5)

# A detached fragment rests at the foot, with a new silhouette but old surface.
fragment=slab('detached_small_stele_shard',[(-.09,0),(.11,0),(.08,.09),(-.04,.13),(-.12,.05)],.13,fresh)
fragment.location=(.42,-.25,0);fragment.rotation_euler[2]=.35

# Match the 3m real-world scan scale used by the architecture kit.
from common import uv_world
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and any(m and m.name=='stele_weathered_stone' for m in obj.data.materials):uv_world(obj,scale=3.0)

finish('broken_votive_stele',description='高さ1.8mの欠損石碑。底面中央原点、正面+Z。失われた肩/角の実欠損、Boolean陰刻の架空角形紋様・縁線・細い割れ溝と苔。実宗教の文字・札は複製していない。')
