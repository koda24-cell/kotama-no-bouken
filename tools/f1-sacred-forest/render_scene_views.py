"""Photograph the completed assembly; reuse the same Cycles scene cache."""
import argparse
from pathlib import Path
import sys
import bpy

sys.path.insert(0,str(Path(__file__).resolve().parent))
import assemble_scene as stage

argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser=argparse.ArgumentParser()
parser.add_argument('--views',default='courtyard,sealed_corridor,shrine_detail,birdseye')
parser.add_argument('--samples',type=int,default=48)
parser.add_argument('--width',type=int,default=1600)
parser.add_argument('--height',type=int,default=1000)
args=parser.parse_args(argv)
views=args.views.split(',')
if any(v not in stage.VIEWS for v in views):raise ValueError('Unknown camera')
bpy.ops.wm.open_mainfile(filepath=str(stage.SCENE_FILE))
bpy.context.scene.render.use_persistent_data=True
for view in views:
    print('F1_PHOTOGRAPH_BEGIN '+view,flush=True)
    stage.render_view(view,args)
    print('F1_PHOTOGRAPH_COMPLETE '+view,flush=True)
