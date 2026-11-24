"""Bake procedural normal into a packed UV image for glTF export."""
import bpy
def bake_normal(obj, size=512):
    if len(obj.material_slots)!=1 or not obj.data.uv_layers:raise ValueError("single material and UV required")
    mat=obj.material_slots[0].material
    if not mat or not mat.use_nodes:raise ValueError("node material required")
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    p=next(n for n in nodes if n.type=="BSDF_PRINCIPLED")
    image=bpy.data.images.new("Baked surface normal",width=size,height=size,alpha=False)
    image.colorspace_settings.name="Non-Color"
    tex=nodes.new("ShaderNodeTexImage");tex.image=image;nodes.active=tex
    bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
    scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=8
    bpy.ops.object.bake(type="NORMAL",normal_space="TANGENT",margin=8)
    image.pack()
    normal=nodes.new("ShaderNodeNormalMap");links.new(tex.outputs["Color"],normal.inputs["Color"]);links.new(normal.outputs["Normal"],p.inputs["Normal"])
    return image
