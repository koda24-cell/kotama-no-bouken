"""Make each saved blend portable, and prove its images decode from the pack.

Post-processing only: no models or GLBs are generated or modified here.
Run after the individual asset queue has stopped.
"""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
import bpy

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates'

def geometry_fingerprint():
    h=hashlib.sha256()
    for obj in sorted(bpy.context.scene.objects,key=lambda o:o.name):
        if obj.type!='MESH':continue
        h.update(obj.name.encode());h.update(struct.pack('<16f',*(v for row in obj.matrix_world for v in row)))
        positions=array.array('f',[0])*(len(obj.data.vertices)*3)
        obj.data.vertices.foreach_get('co',positions);h.update(positions.tobytes())
        indices=array.array('i',[0])*len(obj.data.loops)
        obj.data.loops.foreach_get('vertex_index',indices);h.update(indices.tobytes())
    return h.hexdigest()

def pack_one(asset_id):
    metric_path=OUT/'metrics'/(asset_id+'.json')
    metric=json.loads(metric_path.read_text());source=OUT/metric['source']
    bpy.ops.wm.open_mainfile(filepath=str(source))
    before=geometry_fingerprint();image_count=0
    for image in bpy.data.images:
        if image.source!='FILE':continue
        if not image.packed_file:
            original=Path(bpy.path.abspath(image.filepath))
            if not original.is_file():raise FileNotFoundError(str(original))
            image.reload()
            # Do not gate packing on has_data: Blender loads images lazily.
            image.pack()
        assert image.packed_file and image.packed_file.size>0,image.name
        filename=Path(image.filepath).name
        image.filepath='//packed_textures/'+filename
        image_count+=1
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    assert geometry_fingerprint()==before,'Packing altered geometry'
    decoded=[]
    for image in bpy.data.images:
        if image.source!='FILE':continue
        assert image.packed_file and image.packed_file.size>0,image.name
        # These relative paths intentionally do not exist. Decoding must use
        # the packed bytes, rather than a surviving workspace image file.
        assert not Path(bpy.path.abspath(image.filepath)).exists(),image.filepath
        assert image.size[0]>0 and image.size[1]>0 and math.isfinite(image.pixels[0]),image.name
        decoded.append(dict(name=image.name,width=image.size[0],height=image.size[1],packedBytes=image.packed_file.size))
    assert len(decoded)==image_count
    record=dict(assetId=asset_id,file=metric['source'],sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
      bytes=source.stat().st_size,imagesPacked=image_count,imagesDecoded=len(decoded),geometryPreserved=True,
      geometryFingerprint=before,externalImagesRequired=False,blender=bpy.app.version_string,
      packagingScriptSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
      sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),images=decoded)
    metric['sourcePackaging']=record
    metric_path.write_text(json.dumps(metric,ensure_ascii=False,indent=2)+'\n')
    print('F1_SOURCE_PACKED '+asset_id+' '+str(image_count),flush=True)
    return record

def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser();parser.add_argument('--asset');options=parser.parse_args(args)
    names=[options.asset] if options.asset else [p.stem for p in sorted((OUT/'metrics').glob('*.json'))]
    records=[pack_one(name) for name in names]
    folder=OUT/'verification';folder.mkdir(exist_ok=True)
    destination=folder/('source-packaging-'+options.asset+'.json' if options.asset else 'source-packaging.json')
    destination.write_text(json.dumps({'scope':'portable editing sources, no GLB modifications','records':records},ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
