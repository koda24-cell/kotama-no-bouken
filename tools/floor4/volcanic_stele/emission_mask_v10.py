"""Original, non-Genshin emission-mask material for B4 volcanic pillar.
Blender 4.x: call attach_masked_emission(material, image_path).
The mask is non-color data: black = unlit, white = emissive.
"""
import bpy

def attach_masked_emission(material, image_path, color=(1.0, 0.12, 0.015, 1.0), strength=1.25):
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
    if principled is None:
        raise ValueError("Material needs a Principled BSDF")
    tex = nodes.new("ShaderNodeTexImage")
    tex.name = "B4_ORIGINAL_EMISSION_MASK"
    tex.label = "B4 custom rune mask / linear data"
    tex.image = bpy.data.images.load(str(image_path), check_existing=True)
    tex.image.colorspace_settings.name = "Non-Color"
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.name = "B4_EMISSION_THRESHOLD"
    ramp.color_ramp.elements[0].position = 0.12
    ramp.color_ramp.elements[1].position = 0.84
    scale = nodes.new("ShaderNodeMath")
    scale.operation = "MULTIPLY"
    scale.inputs[1].default_value = strength
    links.new(tex.outputs["Color"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], scale.inputs[0])
    principled.inputs["Emission Color"].default_value = color
    links.new(scale.outputs[0], principled.inputs["Emission Strength"])
    return {"mask_node": tex.name, "ramp_node": ramp.name}
