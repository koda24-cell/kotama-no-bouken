import unittest,tempfile,hashlib,struct,zlib
from pathlib import Path
from production_tiles import plan_tiles
from stitch_half_frame import SIGNATURE,png_chunk,read_rgba
from stitch_production_tiles import assemble
class StitchTest(unittest.TestCase):
    def test_assembly(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            s=dict(width=5,height=3,columns=2,rows=2)
            hashes={}
            for u in plan_tiles(5,3,2,2,["front"]):
                x,y,X,Y=u["bounds"]
                raw=b"".join(b"\0"+b"".join(bytes((i,j,0,255)) for i in range(x,X)) for j in reversed(range(y,Y)))
                data=SIGNATURE+png_chunk(b"IHDR",struct.pack(">IIBBBBB",X-x,Y-y,8,6,0,0,0))+png_chunk(b"IDAT",zlib.compress(raw))+png_chunk(b"IEND",b"")
                (p/(u["id"]+".png")).write_bytes(data)
                hashes[u["id"]]=hashlib.sha256(data).hexdigest()
            with self.assertRaises(ValueError): assemble(s,"front",1,p,{},p/"bad.png")
            bad=dict(hashes);bad[next(iter(bad))]="0"*64
            with self.assertRaises(ValueError): assemble(s,"front",1,p,bad,p/"bad.png")
            assemble(s,"front",1,p,hashes,p/"out.png")
            w,h,rows=read_rgba(p/"out.png")
            self.assertEqual((w,h),(5,3))
            self.assertEqual(rows,[b"".join(bytes((i,j,0,255)) for i in range(5)) for j in (2,1,0)])
