from stitch_half_frame import read_rgba
from seam_qa import image_mae,rgb_column_delta
def evaluate(stitched,reference,columns,rows,max_mae=12,max_excess=8):
    w,h,a=read_rgba(stitched)
    W,H,b=read_rgba(reference)
    if (w,h)!=(W,H) or not 1<=columns<=w or not 1<=rows<=h:
        raise ValueError("invalid dimensions or grid")
    def horizontal(p,y):
        return sum(abs(p[y][i]-p[y-1][i]) for i in range(w*4) if i%4!=3)/(w*3)
    seams=[]
    for x in range(1,columns):
        k=x*w//columns
        seams.append(("vertical",k,rgb_column_delta(a,k)-rgb_column_delta(b,k)))
    for y in range(1,rows):
        k=h-y*h//rows
        seams.append(("horizontal",k,horizontal(a,k)-horizontal(b,k)))
    mae=image_mae(a,b)
    return {"status":"PASS" if mae<=max_mae and all(s[2]<=max_excess for s in seams) else "FAIL","mae":mae,"seams":seams,"aesthetic_qa":"NOT_TESTED"}
