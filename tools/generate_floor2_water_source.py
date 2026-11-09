# Floor 2 Water Source procedural mesh generator
# Requirements: Python 3.10+, trimesh, numpy
#   pip install trimesh numpy
# Run: python tools/generate_floor2_water_source.py
# Output: assets/floor2-water-source/models/floor2-water-source-prototype.glb
import os
import numpy as np
import trimesh
from trimesh.transformations import translation_matrix, rotation_matrix

OUT = os.path.join("assets", "floor2-water-source", "models", "floor2-water-source-prototype.glb")
scene = trimesh.Scene()

def add(mesh, name, color, metal=0.0, rough=0.45):
    mesh.visual.material = trimesh.visual.material.PBRMaterial(
        name=name, baseColorFactor=color, metallicFactor=metal, roughnessFactor=rough
    )
    scene.add_geometry(mesh, geom_name=name, node_name=name)

def crystal(name, pos, height, radius, color):
    n = 6
    verts = []
    for z, rad in [(-height/2, radius), (height*.32, radius*.72), (height/2, 0)]:
        for i in range(n):
            a = 2*np.pi*i/n
            verts.append([pos[0]+rad*np.cos(a), pos[1]+rad*np.sin(a), pos[2]+z])
    faces = []
    for i in range(n):
        j = (i+1) % n
        faces += [[i,j,n+j], [i,n+j,n+i], [n+i,n+j,2*n]]
    add(trimesh.Trimesh(vertices=verts, faces=faces, process=True), name, color, .35, .22)

# Crystal cluster: individually named, reusable faceted meshes.
crystal("Crystal_Cyan_Large", (0,0,1.5), 3.0,.62,[.20,.78,1,1])
crystal("Crystal_Blue_Medium",(-1,.1,.95),1.9,.43,[.20,.42,.95,1])
crystal("Crystal_Violet_Medium",(1.05,.05,1),2,.42,[.58,.28,.92,1])
crystal("Crystal_Cyan_Small",(.2,-.85,.58),1.15,.28,[.38,.88,1,1])
crystal("Crystal_Blue_Small",(-.65,-.8,.52),1,.25,[.22,.5,.95,1])
for i,(p,s) in enumerate([((0,0,.18),(1.65,1.15,.55)),((-1,.2,.2),(.85,.8,.48)),((1,.15,.2),(.9,.75,.5))]):
    m=trimesh.creation.icosphere(subdivisions=2); m.apply_scale(s); m.apply_translation(p)
    add(m,f"Crystal_Base_Rock_{i+1}",[.20,.29,.39,1],.12,.82)

# Modular rock wall chunks.
for i,(p,s) in enumerate([((4,0,1.2),(2.3,.65,1.6)),((5.2,.1,1),(1.6,.7,1.3)),((3.1,.2,.75),(1.3,.75,.9))]):
    m=trimesh.creation.icosphere(subdivisions=2); m.apply_scale(s); m.apply_translation(p)
    add(m,f"RockWall_Boulder_{i+1}",[.30,.40,.52,1],.05,.9)

# Ancient arch: two pillars and individually editable crown stones.
stone=[.43,.55,.62,1]
for x in [7.0,9.8]:
    m=trimesh.creation.box(extents=[.55,.65,3.4]); m.apply_translation([x,0,1.7])
    add(m,f"Arch_Column_{x}",stone,.12,.72)
    for z in [.35,3.0]:
        b=trimesh.creation.box(extents=[.78,.82,.28]); b.apply_translation([x,0,z])
        add(b,f"Arch_BaseCap_{x}_{z}",[.53,.65,.70,1],.12,.7)
for i,ang in enumerate(np.linspace(0,np.pi,9)):
    x=8.4+1.4*np.cos(ang); z=3.25+1.4*np.sin(ang)
    b=trimesh.creation.box(extents=[.48,.68,.42])
    b.apply_transform(translation_matrix([x,0,z]) @ rotation_matrix(-ang,[0,1,0]))
    add(b,f"Arch_Crown_Block_{i+1}",stone,.1,.75)
crystal("Arch_Keystone",(8.4,-.03,4.8),.75,.3,[.18,.78,1,1])

# Ancient sluice gate.
for x in [12,14.6]:
    b=trimesh.creation.box(extents=[.32,.45,2.6]); b.apply_translation([x,0,1.3])
    add(b,f"WaterGate_Post_{x}",[.45,.57,.64,1],.1,.7)
for z in [.35,.9,1.45,2.0,2.55]:
    b=trimesh.creation.box(extents=[2.6,.22,.12]); b.apply_translation([13.3,-.03,z])
    add(b,f"WaterGate_Bar_{z}",[.28,.46,.58,1],.35,.4)

# Wet stone modular floor slabs.
for i in range(3):
    b=trimesh.creation.box(extents=[2,2,.22]); b.apply_translation([i*2.1,-3,-.12])
    add(b,f"WetStone_Tile_{i+1}",[.38,.50,.58,1],.08,.78)

scene.metadata["asset_pack"] = "Kotama no Bouken Floor 2 Water Source"
scene.metadata["note"] = "Modular prototype meshes; inspect scale and materials in Blender before game integration."
os.makedirs(os.path.dirname(OUT), exist_ok=True)
scene.export(OUT)
print(f"Exported {len(scene.geometry)} meshes to {OUT}")
