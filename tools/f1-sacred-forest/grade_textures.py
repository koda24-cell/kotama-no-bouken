"""Make traceable palette derivatives of CC0 albedo, preserving originals."""
import hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
T=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates/textures'
record=[]
for kind,factor,saturation in [('stone',.80,.72),('bark',.70,.72),('soil',.65,.73)]:
    for suffix in ('','_hero'):
        source=T/(kind+'_color'+suffix+'.jpg')
        rgb=np.asarray(Image.open(source).convert('RGB'),dtype=np.float32)/255
        linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
        lum=(linear*np.array([.2126,.7152,.0722])).sum(axis=2,keepdims=True)
        linear=(lum+(linear-lum)*saturation)*factor
        rgb=np.where(linear<=.0031308,linear*12.92,1.055*np.maximum(linear,0)**(1/2.4)-.055)
        dest=T/(kind+'_color_graded'+suffix+'.jpg')
        Image.fromarray((np.clip(rgb,0,1)*255+.5).astype('uint8')).save(dest,quality=90,subsampling=0)
        record.append({'file':dest.name,'source':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
          'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'license':'CC0-1.0',
          'method':'sRGB to linear, Rec709 luminance-relative saturation, linear exposure multiply, back to sRGB JPEG90',
          'linearExposureFactor':factor,'saturation':saturation,'normalRoughness':'unchanged data maps'})
    # Soil module has 256px ancillary stone and bark maps for byte budget.
    if kind in ('stone','bark'):
        source=T/(kind+'_color_graded.jpg');dest=T/('soil_module_'+kind+'_color_graded.jpg')
        Image.open(source).resize((256,256),Image.Resampling.LANCZOS).save(dest,quality=88,subsampling=0)
        record.append({'file':dest.name,'source':source.name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),
         'license':'CC0-1.0','method':'256px ancillary-map derivative; source photographed albedo retained'})
(T/'palette-derivatives.json').write_text(json.dumps({'dateJst':'2026-11-16','records':record},indent=2)+'\n')
print('Wrote',len(record),'traceable albedo derivatives')
