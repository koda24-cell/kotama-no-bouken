"""Individually sculpted granite landmark: mineral mass, fracture and sheltered moss."""
from pathlib import Path
import sys, math, random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import bpy
from mathutils import Vector
from mathutils.noise import noise_vector, noise
from common import reset_scene, material, finish, uv_world, OUT

reset_scene()
t=OUT/'textures'
stone=material('sacred_granite',(.32,.31,.27),.88,{'basecolor':t/'stone_color.jpg','normal':t/'stone_normal.jpg','roughness':t/'stone_roughness.jpg'})
moss=material('sheltered_boulder_moss',(.075,.105,.027),.97)
lichen=material('mineral_lichen',(.23,.255,.165),.96)
fresh=material('old_granite_fracture',(.22,.225,.20),.92)

# A continuous sculpt, with flat seating and a distinct planar fracture shoulder.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5,radius=1)
rock=bpy.context.object;rock.name='continuous_weathered_granite'
for v in rock.data.vertices:
    p=v.co.copy()
    n=noise_vector(p*2.7,noise_basis='PERLIN_ORIGINAL')
    large=noise(p*1.6,noise_basis='PERLIN_ORIGINAL')-.5
    v.co.x=(p.x+.16*n.x+.12*large)*1.2
    v.co.y=(p.y+.12*n.y)*.84
    z=(p.z+.09*n.z)*.79+.66
    # Weathered layers erode at different rates, rather than uniform jitter.
    v.co.x+=.028*math.sin(z*31+p.y*2)*max(0,1-p.z*p.z)
    v.co.z=max(.012,z)
    if v.co.x>.81 and v.co.z>.72:
        v.co.x=min(v.co.x,1.10-.34*(v.co.z-.72))
rock.data.materials.append(stone);rock.data.materials.append(moss);rock.data.materials.append(lichen)
rock.data.update()
for face in rock.data.polygons:
    c=face.center;n=face.normal
    damp=noise(c*5.5,noise_basis='PERLIN_ORIGINAL')
    if n.z>.48 and c.y>.02 and damp>.40:
        face.material_index=1
    elif n.z>.05 and noise(c*14.8,noise_basis='PERLIN_ORIGINAL')>.74:
        face.material_index=2
    face.use_smooth=True

# Remove actual geometry at the front shoulder. This is not a painted chip.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(.89,-.52,.88))
cutter=bpy.context.object;cutter.name='fracture_cutter';cutter.scale=(.30,.24,.23)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.context.view_layer.objects.active=rock
mod=rock.modifiers.new('missing_granite_corner','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter,do_unlink=True)
uv_world(rock,scale=3.0)

# Fine rubble lies under the broken shoulder, its sizes fall off with distance.
r=random.Random(814)
for i in range(7):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(.86+r.uniform(-.32,.32),-.66+r.uniform(-.20,.20),.055))
    o=bpy.context.object;o.name='fracture_spall_%02d'%i
    s=r.uniform(.035,.09);o.scale=(s,s*r.uniform(.6,1),s*.6)
    o.rotation_euler=(r.random(),r.random(),r.random()*6)
    o.data.materials.append(fresh);uv_world(o,3)

finish('mossy_granite_boulder','props','Continuous granite mass with an actual removed shoulder, sheltered moss and mineral lichen; footprint about 2.5m; bottom-centred origin.')
