"""Reusable Blender-only non-destructive weathering helpers.
Geometry overlays are separate objects; deterministic seed and no third-party addon.
"""
import bpy, random, math
from mathutils import Vector

def rusty_patches(obj, rust_mat, count=24, seed=1, size=.10):
    """Attach visible raised corrosion flakes to exposed box faces."""
    rng=random.Random(seed)
    bpy.context.view_layer.update()
    dims=obj.dimensions; center=obj.location
    for i in range(count):
        axis=rng.randrange(3); sign=rng.choice((-1,1))
        pos=[center[j]+rng.uniform(-.43,.43)*dims[j] for j in range(3)]
        pos[axis]=center[axis]+sign*dims[axis]*.505
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=pos)
        p=bpy.context.object;p.name='WEATHER_rust_flake_%03d'%i
        scale=[rng.uniform(size*.45,size*1.45) for _ in range(3)]
        scale[axis]=rng.uniform(.008,.026)
        p.scale=scale;p.data.materials.append(rust_mat)
    return count

def chipped_edge(obj, rust_mat, count=10, seed=2):
    """Edge pitting/erosion silhouette with small attached fractured fragments.
    Preserves original mesh; does not pretend to perform boolean subtraction.
    """
    rng=random.Random(seed); dims=obj.dimensions;c=obj.location
    for i in range(count):
        axis=rng.randrange(3);other=[a for a in range(3) if a!=axis]
        p=[c[j] for j in range(3)]
        p[axis]+=rng.uniform(-.47,.47)*dims[axis]
        for a in other:p[a]+=rng.choice((-1,1))*.50*dims[a]
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p)
        o=bpy.context.object;o.name='WEATHER_edge_spall_%03d'%i
        o.scale=(rng.uniform(.045,.12),rng.uniform(.025,.09),rng.uniform(.02,.085))
        o.data.materials.append(rust_mat)

def abrasion_stripes(obj, worn_mat, count=8, seed=3):
    """Thin visible scuffs on front (-Y) surface of axis-aligned box."""
    rng=random.Random(seed);dims=obj.dimensions;c=obj.location
    for i in range(count):
        x=c.x+rng.uniform(-.38,.38)*dims.x
        z=c.z+rng.uniform(-.40,.40)*dims.z
        bpy.ops.mesh.primitive_cube_add(size=1,location=(x,c.y-dims.y*.508,z))
        o=bpy.context.object;o.name='WEATHER_scuff_%03d'%i
        o.dimensions=(rng.uniform(.018,.065),.012,rng.uniform(.09,.30))
        o.data.materials.append(worn_mat)
