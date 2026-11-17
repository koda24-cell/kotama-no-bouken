"""V3 individual-asset adapter. Never writes the previous 17 assets."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/f1-sacred-forest'))
import common as c
c.OUT=ROOT/'assets/3d/dungeons/b1_closed_ruins_v3'
T=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates/textures'
from common import reset_scene, mesh, cube, tube, uv_world
import bpy

def materials():
    return dict(
      moss=c.material('v3_deep_moss',texture_set={'basecolor':c.OUT/'textures/moss_color.jpg','normal':T/'soil_normal.jpg','roughness':T/'soil_roughness.jpg'}),
      stone=c.material('v3_wet_stone',texture_set={'basecolor':T/'stone_color_graded.jpg','normal':T/'stone_normal.jpg','roughness':T/'stone_roughness.jpg'}),
      bark=c.material('v3_wet_root',texture_set={'basecolor':T/'bark_color_graded.jpg','normal':T/'bark_normal.jpg','roughness':T/'bark_roughness.jpg'}),
      leaf=c.material('v3_shade_leaf',(.038,.105,.018,1),.85),
      newleaf=c.material('v3_fresh_leaf',(.080,.16,.026,1),.88))

def finish(asset,desc):
    for im in bpy.data.images:
      if im.source=='FILE':
        _=im.pixels[0];im.pack()
    return c.finish(asset,'props',desc)
