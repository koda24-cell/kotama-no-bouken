"""Fast, actual-Cycles composition checks; never replace delivery receipts."""
import argparse, hashlib, json, sys
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates'
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser()
p.add_argument('--output',required=True)
p.add_argument('--views',default='entry,courtyard,sealed_corridor,shrine_detail,birdseye')
p.add_argument('--samples',type=int,default=8)
p.add_argument('--width',type=int,default=640)
p.add_argument('--height',type=int,default=400)
a=p.parse_args(argv)
source=BASE/'scene/scene.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
s=bpy.context.scene;s.render.use_persistent_data=True
s.cycles.samples=a.samples
s.render.resolution_x=a.width;s.render.resolution_y=a.height
s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG'
out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
receipt={'status':'iteration_preview_not_final_delivery','sceneBlendSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'views':{}}
for name in a.views.split(','):
    camera=bpy.data.objects['camera_'+name];s.camera=camera
    image=out/(name+'.png');s.render.filepath=str(image)
    bpy.ops.render.render(write_still=True)
    receipt['views'][name]={'file':str(image),'camera':camera.name,'width':a.width,'height':a.height,'samples':a.samples,'sha256':hashlib.sha256(image.read_bytes()).hexdigest()}
    (out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print('F1_ITERATION_PREVIEW '+name,flush=True)
