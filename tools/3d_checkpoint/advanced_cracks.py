"""Seeded branching crack relief, restricted to an explicit planar face."""
import random
import bpy
from mathutils import Vector
def add_cracks(obj, face_index, seed=42):
    face=obj.data.polygons[face_index]
    n=face.normal.normalized()
    verts=[obj.data.vertices[i].co.copy() for i in face.vertices]
    if len(verts)!=4:raise ValueError("quad face required")
    a,b,c,d=verts
    if (a+c-b-d).length>1e-5 or abs((d-a).dot(n))>1e-5:raise ValueError("planar parallelogram required")
    rng=random.Random(seed)
    width=min((b-a).length,(d-a).length)*.004
    if width<=0:raise ValueError("degenerate face")
    mat=bpy.data.materials.new("Crack shadow");mat.diffuse_color=(.035,.028,.022,1)
    def point(u,v):return obj.matrix_world @ (a+(b-a)*u+(d-a)*v+n*width*.15)
    def line(coords,name):
        curve=bpy.data.curves.new(name,"CURVE");curve.dimensions="3D";curve.bevel_depth=width;curve.bevel_resolution=1
        s=curve.splines.new("POLY");s.points.add(len(coords)-1)
        for p,(u,v) in zip(s.points,coords):p.co=(*point(u,v),1)
        o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);curve.materials.append(mat)
        bpy.ops.object.select_all(action="DESELECT");o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target="MESH")
        return bpy.context.object
    main=[(.12+i*.12,.5+rng.uniform(-.12,.12)) for i in range(7)]
    result=[line(main,"Crack main")]
    for i in (2,4):
        u,v=main[i];sign=rng.choice((-1,1))
        result.append(line([(u,v),(u+.05,v+sign*.1),(u+.12,v+sign*.19)],"Crack branch"))
    return result
