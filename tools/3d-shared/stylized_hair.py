"""Reusable Blender mesh-hair helpers (Blender 4.x/5.x, bpy required).

This module is independent of any game stage or character. It creates new objects
without changing the source head, and can be imported in other Blender scripts.
"""
from math import sin, cos, pi
import bpy
from mathutils import Vector

def tapered_strand(name, points, widths, material=None, sides=12, depth_ratio=0.3, collection=None):
    """Create a closed, smooth-shaded tapered 3D hair clump.

    points: world-space XYZ vectors/tuples, at least two
    widths: per-point cross-section widths, same length as points
    depth_ratio: depth relative to width
    returns: a new Blender mesh object
    """
    pts = [Vector(p) for p in points]
    if len(pts) < 2 or len(pts) != len(widths):
        raise ValueError("points and widths must have matching lengths >= 2")
    if sides < 3 or depth_ratio <= 0 or any(w <= 0 for w in widths):
        raise ValueError("invalid strand cross-section")
    verts, faces = [], []
    for i, (p, width) in enumerate(zip(pts, widths)):
        tangent = (pts[min(i+1, len(pts)-1)] - pts[max(0, i-1)]).normalized()
        if tangent.length < 1e-6:
            raise ValueError("adjacent strand points cannot coincide")
        ref = Vector((0, 1, 0))
        if abs(tangent.dot(ref)) > 0.95:
            ref = Vector((0, 0, 1))
        across = tangent.cross(ref).normalized()
        depth = tangent.cross(across).normalized()
        for j in range(sides):
            a = 2*pi*j/sides
            v = p + across*(cos(a)*width*0.5) + depth*(sin(a)*width*depth_ratio*0.5)
            verts.append(tuple(v))
    for i in range(len(pts)-1):
        for j in range(sides):
            a = i*sides+j
            b = i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
    mesh = bpy.data.meshes.new(name+"_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.collection).objects.link(obj)
    if material is not None:
        mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj

def create_hair_material(name="Silver lavender hair", rgba=(0.72, 0.68, 0.82, 1.0)):
    material = bpy.data.materials.new(name)
    material.diffuse_color = rgba
    return material
