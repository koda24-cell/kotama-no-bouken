import unittest,tempfile,io,json,struct
from pathlib import Path
from PIL import Image
from reference_pixels import pixels
class PixelsTest(unittest.TestCase):
    def test_red(self):
        b=io.BytesIO(); Image.new("RGBA",(4,4),(255,0,0,255)).save(b,format="PNG"); raw=b.getvalue()
        d=json.dumps({"asset":{"version":"2.0"},"images":[{"mimeType":"image/png","bufferView":0}],"bufferViews":[{"buffer":0,"byteLength":len(raw)}]}).encode()
        d+=b" "*(-len(d)%4); raw+=b"\0"*(-len(raw)%4)
        body=struct.pack("<I4s",len(d),b"JSON")+d+struct.pack("<I4s",len(raw),b"BIN\0")+raw
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/"image.glb"; p.write_bytes(struct.pack("<4sII",b"glTF",2,12+len(body))+body)
            a=pixels(p)["images"][0]
            self.assertEqual(a["mean_rgb"],[1,0,0])
            self.assertEqual(a["size"],[4,4])
            self.assertEqual(a["mean_neighbor_contrast"],0)
