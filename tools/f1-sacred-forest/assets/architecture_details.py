"""Geometric stone construction helpers for individually authored architecture."""
from pathlib import Path
import random, math
import bpy
from mathutils import Vector
from common import mesh, cube, tube, material, OUT


def stone_materials():
    t=OUT/'textures'
    tex={'basecolor':t/'stone_color.jpg','normal':t/'stone_normal.jpg','roughness':t/'stone_roughness.jpg'}
    bark={'basecolor':t/'bark_color.jpg','normal':t/'bark_normal.jpg','roughness':t/'bark_roughness.jpg'}
    return (material('sacred_weathered_stone',(.40,.39,.33,1),.85,tex),
            material('sacred_fresh_fracture',(.34,.32,.265,1),.91),
            material('sacred_earth_mortar',(.115,.117,.081,1),.96),
            material('sacred_velvet_moss',(.105,.145,.055,1),.96),
            material('sacred_root_bark',(.15,.12,.075,1),.91,bark if all(p.exists() for p in bark.values()) else None))


def prism(name, polygon, lo, hi, mat, axis='z', bevel=.012):
    """An irregular closed extruded stone. polygon winding is counter-clockwise."""
    n=len(polygon)
    if axis=='z':
        vs=[(x,y,z) for z in (lo,hi) for x,y in polygon]
        faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
        faces += [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    else:
        vs=[(x,y,z) for y in (lo,hi) for x,z in polygon]
        faces=[tuple(range(n)),tuple(reversed([n+i for i in range(n)]))]
        faces += [(i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n)]
    o=mesh(name,vs,faces,mat)
    if bevel:
        m=o.modifiers.new('small rounded weathered arris','BEVEL');m.width=bevel;m.segments=2
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def chipped_rect(x0,x1,y0,y1,seed,amount=.04):
    r=random.Random(seed);a=[amount*r.uniform(.45,1.6) for _ in range(8)]
    return [(x0+a[0],y0),(x1-a[1],y0),(x1,y0+a[2]),(x1,y1-a[3]),
            (x1-a[4],y1),(x0+a[5],y1),(x0,y1-a[6]),(x0,y0+a[7])]


def wall_block(name,x0,x1,z0,z1,mat,seed,front=.005,back=.7,damage=.055):
    return prism(name,chipped_rect(x0,x1,z0,z1,seed,damage),front,back,mat,axis='y',bevel=.018)


def moss_lobe(name,loc,scale,mat,seed=0):
    """Low, irregular growth patches rather than floating spheres."""
    r=random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc)
    o=bpy.context.object;o.name=name
    for v in o.data.vertices:
        v.co*=r.uniform(.84,1.13)
    o.scale=scale;o.data.materials.append(mat)
    return o


def crack_line(name,points,mat,width=.008):
    return tube(name,points,width,mat,sides=4)
