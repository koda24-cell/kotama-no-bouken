from PIL import Image,ImageDraw
import os,sys
ref=Image.open(sys.argv[1]).convert('RGB')
folder=sys.argv[2]
# Output is a calibrated comparison at identical head-to-sole height (660px).
# Background removed approximately using corner color difference; silhouettes
# are transparent, so reference wireframe remains visible.
for name,cx in [('front',197),('right_side',442),('left_side',442)]:
 model=Image.open(os.path.join(folder,name+'.png')).convert('RGB')
 w,h=model.size
 # Rendering uses ortho_scale=8.15, hence 7 units -> 7/8.15 of image height.
 px_per_unit=h/8.15
 # Reference 660px/7units. Reproject the whole render into source pixel coordinates.
 scale=(660/7)/px_per_unit
 new=(round(w*scale),round(h*scale))
 model=model.resize(new,Image.Resampling.LANCZOS)
 # In original render center is Z=3.5, hence center of reference y=(705+45)/2.
 x0=round(cx-new[0]/2)
 y0=round(375-new[1]/2)
 out=ref.copy().convert('RGBA')
 overlay=Image.new('RGBA',model.size,(0,0,0,0))
 src=model.load();dest=overlay.load()
 bg=model.getpixel((0,0))
 for y in range(model.height):
  for x in range(model.width):
   rgb=src[x,y]
   if sum(abs(rgb[i]-bg[i]) for i in range(3))>33:
    dest[x,y]=(238,75,68,125)
 out.alpha_composite(overlay,(x0,y0))
 draw=ImageDraw.Draw(out)
 draw.text((8,8),'Reference + Eevee silhouette overlay: '+name,fill=(0,0,0,255))
 out.convert('RGB').save(os.path.join(folder,name+'_overlay.png'))
