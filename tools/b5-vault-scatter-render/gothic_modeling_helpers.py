"""Reusable Blender stone/ruin modeling helpers for Stage 5.
Original MIT-licensed project code, no third-party meshes.
Run with Blender's bundled Python: import via sys.path.
"""
import bpy, bmesh, math, random
from mathutils import Vector

def chipped_stone(name, location=(0,0,0), size=(1,1,1), seed=1, bevel=.045, subdivisions=1):
    """Irregular bevelled masonry with deliberately broad faces."""
    rng=random.Random(seed)
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    ob=bpy.context.object;ob.name=name
    for v in ob.data.vertices:
        v.co.x*=size[0]*(1+rng.uniform(-.10,.10))
        v.co.y*=size[1]*(1+rng.uniform(-.10,.10))
        v.co.z*=size[2]*(1+rng.uniform(-.08,.08))
    if bevel>0:
        mod=ob.modifiers.new("worn_edges","BEVEL")
        mod.width=min(bevel,min(size)*.15);mod.segments=2
        if hasattr(mod,'affect'): mod.affect='EDGES'
        mod2=ob.modifiers.new("weighted_normals","WEIGHTED_NORMAL")
    return ob

def chipped_rock_cluster(name="rubble", count=12, radius=1.0, seed=17, major_ratio=.35):
    rng=random.Random(seed);objects=[]
    for i in range(count):
        large=i<round(count*major_ratio)
        k=rng.uniform(.34,.58) if large else rng.uniform(.08,.22)
        a=rng.uniform(0,2*math.pi);r=radius*math.sqrt(rng.random())
        ob=chipped_stone(f"{name}_{i:02d}",(r*math.cos(a),r*math.sin(a),k*.35),
                         (k*1.4,k,k*.8),seed+i,bevel=.035)
        ob.rotation_euler.z=rng.uniform(-math.pi,math.pi)
        objects.append(ob)
    return objects

def stone_arch(name="gothic_arch", span=2.0, rise=1.8, depth=.4, blocks=11, seed=1):
    """Two-sided pointed Gothic arch, segmented into individual voussoirs."""
    rng=random.Random(seed);objects=[]
    for side in (-1,1):
        for i in range(blocks):
            t=(i+.5)/blocks
            x=side*span*.5*(1-t)
            z=rise*(.12+.88*(1-(1-t)**1.55))
            ob=chipped_stone(f"{name}_{side}_{i}",(x,0,z),
                             (.18+span/blocks*.45,depth,.18+rise/blocks*.45),
                             seed+100*i+(side+1),bevel=.03)
            ob.rotation_euler.y=side*(.18+.33*t)
            objects.append(ob)
    return objects

def carved_quatrefoil(name="quatrefoil", center=(0,0,0), radius=.25, thickness=.035):
    """Four-lobed carved relief using curves; no external addon."""
    cu=bpy.data.curves.new(name,"CURVE");cu.dimensions='3D';cu.bevel_depth=thickness;cu.bevel_resolution=2
    for i in range(4):
        spline=cu.splines.new('BEZIER');spline.bezier_points.add(3)
        for j,p in enumerate(spline.bezier_points):
            a=(i+j/3)*math.pi/2
            rr=radius*(1+.15*math.sin(a*4))
            p.co=(center[0]+rr*math.cos(a),center[1],center[2]+rr*math.sin(a))
            p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob)
    return ob

def chain(name="broken_chain", links=9, radius=.12, spacing=.16):
    """Real torus links with alternating axes, for detached chain debris."""
    result=[]
    for i in range(links):
        bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=.024,
                                        location=(i*spacing,0,.13+(i%2)*.02))
        ob=bpy.context.object;ob.name=f"{name}_{i:02d}"
        ob.rotation_euler.x=(i%2)*math.pi/2;result.append(ob)
    return result

def apply_modifiers(objects):
    for ob in objects:
        bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers):
            try:bpy.ops.object.modifier_apply(modifier=mod.name)
            except RuntimeError:pass
