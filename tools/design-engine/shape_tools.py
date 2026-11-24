import math
from PIL import Image

def cubic(points, segments=32):
    if len(points)!=4 or type(segments)!=int or not 1<=segments<=4096:
        raise ValueError("Expected four control points and 1..4096 segments")
    if any(len(p)!=3 or any(not math.isfinite(v) for v in p) for p in points):
        raise ValueError("Expected finite XYZ")
    return [tuple(sum(w*p[k] for w,p in zip(((1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3),points)) for k in range(3)) for t in (i/segments for i in range(segments+1))]

def profile(path):
    with Image.open(path) as source: im=source.convert("L")
    if any(im.histogram()[1:255]): raise ValueError("Binary mask required")
    bounds=im.getbbox()
    if bounds is None: raise ValueError("Empty mask")
    x0,y0,x1,y1=bounds
    rows=[]
    for y in range(y0,y1):
        box=im.crop((0,y,im.width,y+1)).getbbox()
        rows.append(None if box is None else {"y":y,"left":box[0],"right_exclusive":box[2],"span":box[2]-box[0]})
    return {"bounds":bounds,"width":x1-x0,"height":y1-y0,"aspect":(x1-x0)/(y1-y0),"rows":rows}
