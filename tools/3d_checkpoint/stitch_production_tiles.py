"""Assemble verified RGBA tiles; bounds use Blender bottom-left coordinates."""
import hashlib,struct,zlib
from pathlib import Path
from production_tiles import plan_tiles
from stitch_half_frame import read_rgba,png_chunk,SIGNATURE

def assemble(settings, view, frame, directory, hashes, target):
    w,h=settings["width"],settings["height"]
    if not 1<=w<=8192 or not 1<=h<=8192:
        raise ValueError("unsupported image dimensions")
    units=plan_tiles(w,h,settings["columns"],settings["rows"],[view],[frame])
    if set(hashes)!={u["id"] for u in units}:
        raise ValueError("missing or unexpected tile evidence")
    rows=[bytearray(w*4) for _ in range(h)]
    for u in units:
        p=Path(directory)/(u["id"]+".png")
        if p.is_symlink() or hashlib.sha256(p.read_bytes()).hexdigest()!=hashes[u["id"]]:
            raise ValueError("tile hash mismatch")
        x0,y0,x1,y1=u["bounds"]
        tw,th,pixels=read_rgba(p)
        if (tw,th)!=(x1-x0,y1-y0):
            raise ValueError("tile dimensions mismatch")
        for i,row in enumerate(pixels):
            rows[h-y1+i][4*x0:4*x1]=row
    header=struct.pack(">IIBBBBB",w,h,8,6,0,0,0)
    data=zlib.compress(b"".join(b"\0"+row for row in rows),6)
    payload=SIGNATURE+png_chunk(b"IHDR",header)+b"".join(png_chunk(b"IDAT",data[i:i+1048576]) for i in range(0,len(data),1048576))+png_chunk(b"IEND",b"")
    target=Path(target)
    if target.exists():
        raise FileExistsError(target)
    target.write_bytes(payload)
    return hashlib.sha256(payload).hexdigest()
