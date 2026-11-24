"""Technical reference similarity, not aesthetic or artistic judgment."""
from stitch_half_frame import read_rgba
def score(candidate,reference):
    w,h,a=read_rgba(candidate)
    W,H,b=read_rgba(reference)
    if (w,h)!=(W,H):
        raise ValueError("image size mismatch")
    error=sum(abs(x-y) for row,ref in zip(a,b) for x,y in zip(row,ref))/(w*h*4*255)
    return {"score":1-error,"technical_pass":error<=0.05,"reference_error":error,"aesthetic_qa":"NOT_TESTED"}
