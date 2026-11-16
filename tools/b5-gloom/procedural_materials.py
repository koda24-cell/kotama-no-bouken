"""Reusable procedural corruption PBR material for Blender 4.x.
No external downloads, add-on installation or paid textures required.
Blender-only nodes must be baked to PBR maps before Three.js GLB delivery.
"""
import bpy

def make_gloom_material(name="B5 procedural gloom V4", scale=18.0):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes=True
    nt=mat.node_tree
    nt.nodes.clear()
    out=nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf=nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value=.79
    bsdf.inputs["Metallic"].default_value=.06
    nt.links.new(bsdf.outputs["BSDF"],out.inputs["Surface"])
    tex=nt.nodes.new("ShaderNodeTexCoord")
    noise=nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value=scale
    noise.inputs["Detail"].default_value=5
    noise.inputs["Roughness"].default_value=.73
    nt.links.new(tex.outputs["Generated"],noise.inputs["Vector"])
    ramp=nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position=.24
    ramp.color_ramp.elements[0].color=(.009,.006,.018,1)
    ramp.color_ramp.elements[1].position=.77
    ramp.color_ramp.elements[1].color=(.082,.016,.063,1)
    nt.links.new(noise.outputs["Fac"],ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"],bsdf.inputs["Base Color"])
    vor=nt.nodes.new("ShaderNodeTexVoronoi")
    vor.feature="DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value=6
    nt.links.new(tex.outputs["Generated"],vor.inputs["Vector"])
    crack=nt.nodes.new("ShaderNodeValToRGB")
    crack.color_ramp.elements[0].position=.015
    crack.color_ramp.elements[0].color=(1,.025,.10,1)
    crack.color_ramp.elements[1].position=.09
    crack.color_ramp.elements[1].color=(0,0,0,1)
    nt.links.new(vor.outputs["Distance"],crack.inputs["Fac"])
    nt.links.new(crack.outputs["Color"],bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value=1.7
    bump=nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.42
    bump.inputs["Distance"].default_value=.022
    nt.links.new(noise.outputs["Fac"],bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"],bsdf.inputs["Normal"])
    return mat

def make_rock_material(name="B5 procedural weathered rock"):
    mat=make_gloom_material(name,scale=32)
    p=next(n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
    p.inputs["Emission Strength"].default_value=0
    ramp=next(n for n in mat.node_tree.nodes if n.type=="VALTORGB")
    ramp.color_ramp.elements[0].color=(.065,.06,.071,1)
    ramp.color_ramp.elements[1].color=(.27,.255,.29,1)
    return mat
