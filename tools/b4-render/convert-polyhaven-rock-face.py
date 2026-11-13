import bpy,os,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
folder=root/'assets/reference/cc0/polyhaven-rock-face-02'
sources=list(folder.glob('*.gltf'))
if len(sources)!=1:raise RuntimeError('No single glTF to convert')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(sources[0]))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise RuntimeError('No mesh imported')
tris=sum(len(o.data.polygons) for o in meshes)
target=folder/'rock_face_02_1k.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB')
if target.stat().st_size<10000:raise RuntimeError('Suspiciously small GLB')
print('VALIDATED_POLYHAVEN_GLB',target,'mesh_count',len(meshes),'faces',tris,'bytes',target.stat().st_size)
