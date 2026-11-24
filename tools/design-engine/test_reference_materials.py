import unittest,tempfile,json,struct
from pathlib import Path
from reference_materials import analyze_materials
class MaterialTest(unittest.TestCase):
    def test_metadata(self):
        doc={"asset":{"version":"2.0"},"materials":[{"pbrMetallicRoughness":{"metallicFactor":.7,"baseColorTexture":{"index":0}}}],"textures":[{"source":0}],"images":[{"mimeType":"image/png","bufferView":0}],"accessors":[{"count":3,"componentType":5126}],"meshes":[{"primitives":[{"attributes":{"TEXCOORD_0":0},"material":0}]}]}
        b=json.dumps(doc).encode(); b+=b" "*(-len(b)%4)
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/"metadata.glb"; p.write_bytes(struct.pack("<4sII",b"glTF",2,20+len(b))+struct.pack("<I4s",len(b),b"JSON")+b)
            a=analyze_materials(p)
            self.assertEqual(a["materials"][0]["metallic"],.7)
            self.assertEqual(a["materials"][0]["slots"]["baseColorTexture"]["index"],0)
            self.assertEqual(a["primitives"][0]["uv_accessors"]["TEXCOORD_0"]["count"],3)
