from PIL import Image, ImageDraw, ImageChops
import os, sys, json, csv, math
ref=Image.open(sys.argv[1]).convert('RGB')
folder=sys.argv[2]
# Hand-traced Pinterest front and side OUTER envelopes, not ground-truth topology.
# Pixel rows measured in 563x740 image; independent X origins for two views.
FRONT=[
 (47,168,226),(69,153,243),(93,152,243),(105,147,246),
 (125,163,227),(156,183,211),(179,167,228),(193,145,251),
 (220,151,237),(250,117,269),(283,92,308),(313,67,331),
 (343,43,353),(367,30,353),(396,20,371),
 (411,142,256),(456,148,250),(499,153,240),(555,154,237),
 (609,158,231),(654,158,229),(705,152,242)]
SIDE=[
 (46,428,452),(70,387,474),(94,383,482),(117,389,482),
 (131,404,482),(156,421,447),(174,418,446),(195,412,452),
 (221,414,487),(251,413,491),(287,414,499),(321,414,502),
 (352,414,491),(386,405,475),(430,410,471),(463,413,467),
 (498,410,465),(555,410,452),(608,407,440),(663,407,467),
 (705,406,495)]
# These landmark spans include arm/leg overlaps; comparison is a proxy only.
def interp(rows,y):
 rows=sorted(rows)
 if y<=rows[0][0]:return rows[0][1:]
 if y>=rows[-1][0]:return rows[-1][1:]
 for a,b in zip(rows,rows[1:]):
  if a[0]<=y<=b[0]:
   t=(y-a[0])/(b[0]-a[0])
   return a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])
def model_silhouette(img):
 # Border-derived background, with tolerance to antialiasing and illumination.
 bg=img.getpixel((0,0))
 pix=img.load()
 return [[(sum(abs(pix[x,y][k]-bg[k]) for k in range(3))>65)
          for x in range(img.width)] for y in range(img.height)]
def paste_mask_and_extract(name,center,rows):
 image=Image.open(os.path.join(folder,name+'.png')).convert('RGB')
 w,h=image.size
 # Correct orthographic calibration: world 7u = 660 reference pixels.
 # Blender orthographic scale is vertical frame height, 8.15 units.
 factor=(660/7)/(h/8.15)
 image=image.resize((round(w*factor),round(h*factor)),Image.Resampling.LANCZOS)
 mask=model_silhouette(image)
 x0=round(center-image.width/2)
 y0=round(375-image.height/2)
 output=ref.copy()
 d=ImageDraw.Draw(output,'RGBA')
 # Paint model in translucent red and outline its true silhouette in bright red.
 bounds={}
 for py in range(45,706):
  sy=py-y0
  if not 0<=sy<image.height:continue
  xs=[sx+x0 for sx,flag in enumerate(mask[sy]) if flag and 0<=sx+x0<ref.width]
  if xs:
   bounds[py]=(min(xs),max(xs))
   # transparent model area; original reference remains visible
   for x in xs:d.point((x,py),fill=(245,45,55,65))
   d.point((min(xs),py),fill=(250,10,20,255))
   d.point((max(xs),py),fill=(250,10,20,255))
 # Blue = traced reference; red = rendered silhouette; yellow connectors = mismatch.
 for y in range(46,706,8):
  left,right=interp(rows,y)
  d.line([(left,y),(right,y)],fill=(40,165,255,55),width=1)
  d.ellipse((left-2,y-2,left+2,y+2),fill=(10,115,255,255))
  d.ellipse((right-2,y-2,right+2,y+2),fill=(10,115,255,255))
  if y in bounds:
   ml,mr=bounds[y]
   d.line((left,y,ml,y),fill=(255,185,0,200),width=2)
   d.line((right,y,mr,y),fill=(255,185,0,200),width=2)
 d.text((7,8),'BLUE reference | RED Eevee | YELLOW error',fill=(10,10,10,255))
 output.save(os.path.join(folder,name+'_overlay.png'))
 # Quantitative error only for measured rows: not an IoU of reference silhouette.
 measurements=[]
 for y,rl,rr in rows:
  if y not in bounds:continue
  ml,mr=bounds[y]
  measurements.append(dict(y_px=y,ref_left_px=rl,model_left_px=ml,
    left_error_px=round(ml-rl,1),ref_right_px=rr,model_right_px=mr,
    right_error_px=round(mr-rr,1)))
 with open(os.path.join(folder,name+'_landmark_errors.csv'),'w',newline='') as file:
  writer=csv.DictWriter(file,fieldnames=list(measurements[0]) if measurements else ['y_px'])
  writer.writeheader();writer.writerows(measurements)
 if measurements:
  mae=sum(abs(m['left_error_px'])+abs(m['right_error_px']) for m in measurements)/(2*len(measurements))
 else:mae=None
 # High resolution crop focuses on silhouette without stretching vertical alignment.
 xlo,xhi=(0,375) if name=='front' else (375,563)
 crop=output.crop((xlo,25,xhi,720))
 crop.resize((crop.width*2,crop.height*2),Image.Resampling.NEAREST).save(
  os.path.join(folder,name+'_overlay_zoom.png'))
 return {'landmark_count':len(measurements),'mean_absolute_edge_error_px':round(mae,2) if mae is not None else None,
         'note':'Proxy error against hand-traced outer bounds, not full mesh correspondence'}
report={}
for name,center,rows in [('front',197,FRONT),('right_side',442,SIDE)]:
 report[name]=paste_mask_and_extract(name,center,rows)
with open(os.path.join(folder,'overlay_metrics.json'),'w') as file:json.dump(report,file,indent=2)
print(json.dumps(report,indent=2))
