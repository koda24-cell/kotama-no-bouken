"""Non-destructive static mesh detail candidates. Procedural nodes require baking for GLB."""
import bpy, math
from mathutils import Vector
from advanced_material_policy import classify
def apply(obj, mode):
    if obj.type!="MESH" or obj.data.shape_keys or obj.animation_data: raise ValueError("static mesh required")
    added=[]
    for slot in obj.material_slots:
        if not slot.material or not slot.material.use_nodes:continue
        mat=slot.material.copy();slot.material=mat
        nodes=mat.node_tree.nodes;links=mat.node_tree.links
        for p in list(nodes):
            if p.type!="BSDF_PRINCIPLED":continue
            kind,_=classify(mat.name,p.inputs["Metallic"].default_value if not p.inputs["Metallic"].is_linked else None)
            if kind=="unknown":continue
            if mode=="surface":
                tex=nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=45
                if kind=="wood":
                    tex=nodes.new("ShaderNodeTexWave");tex.wave_type="BANDS";tex.bands_direction="X";tex.inputs["Scale"].default_value=12;tex.inputs["Distortion"].default_value=5
                bump=nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.18;bump.inputs["Distance"].default_value=.008
                links.new(tex.outputs["Fac"],bump.inputs["Height"])
                normal=p.inputs["Normal"]
                if normal.is_linked:links.new(normal.links[0].from_socket,bump.inputs["Normal"])
                links.new(bump.outputs["Normal"],normal)
            if mode=="material" and not p.inputs["Roughness"].is_linked:
                p.inputs["Roughness"].default_value={"stone":.78,"wood":.62,"metal":.35}[kind]
    if mode in ("chips","ornament"):
        obj.data.calc_loop_triangles()
        tris=sorted(obj.data.loop_triangles,key=lambda t:t.area,reverse=True)[:8]
        for i,t in enumerate(tris):
            if t.area<=0:continue
            p=sum((obj.data.vertices[j].co for j in t.vertices),Vector())/3
            n=t.normal.normalized();r=min(math.sqrt(t.area)*.12,max(obj.dimensions)*.012)
            if r<=0:continue
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=obj.matrix_world @ (p+n*r*.2))
            detail=bpy.context.object;detail.name="Review detail "+str(i);detail.scale=(1,.65,.3) if mode=="chips" else (1,1,.55)
            detail.rotation_euler=(obj.matrix_world.to_3x3() @ n).to_track_quat("Z","Y").to_euler()
            if obj.data.materials:detail.data.materials.append(obj.data.materials[0])
            added.append(detail)
    return added
