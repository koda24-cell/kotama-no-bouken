import unittest, tempfile, json, struct, zlib
from pathlib import Path
from register import register
def chunk(t,d):
    return struct.pack(">I",len(d))+t+d+struct.pack(">I",zlib.crc32(t+d))
def png():
    return b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",1,1,8,2,0,0,0))+chunk(b"IDAT",zlib.compress(b"\0\xff\0\0"))+chunk(b"IEND",b"")
class RegistryTest(unittest.TestCase):
    def test_lifecycle(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); src=root/"source"; src.mkdir()
            (src/"front.png").write_bytes(png())
            index=root/"index.json"; index.write_text('{"schema":1,"models":[]}')
            m=dict(id="test-model",name="test",floor="第2層",version="V01",status="制作中",publication_cleared=True,run_id=1,source_sha="a"*40,updated_at="2026-11-24T01:00:00Z",images=[dict(view="front",file="front.png")])
            self.assertTrue(register(root,m,src))
            self.assertFalse(register(root,m,src))
            m.update(version="V02",updated_at="2026-11-24T02:00:00Z")
            self.assertTrue(register(root,m,src))
            before=index.read_bytes()
            m.update(updated_at="2026-11-24T03:00:00Z")
            (src/"front.png").write_bytes(b"broken")
            with self.assertRaises(ValueError): register(root,m,src)
            self.assertEqual(before,index.read_bytes())
            m["publication_cleared"]=False
            with self.assertRaises(ValueError): register(root,m,src)
            self.assertEqual(before,index.read_bytes())
    def test_independent_design_and_render(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); src=root/"source"; src.mkdir()
            (src/"front.png").write_bytes(png())
            index=root/"index.json"; index.write_text('{"schema":1,"models":[]}')
            m=dict(id="test-model",name="test",floor="第2層",version="D01",status="設計中",kind="design",publication_cleared=True,run_id=1,source_sha="a"*40,updated_at="2026-11-24T03:00:00Z",images=[dict(view="front",file="front.png")])
            self.assertTrue(register(root,m,src))
            row=json.loads(index.read_text())["models"][0]
            self.assertEqual(row["images"],[])
            self.assertEqual(len(row["designs"]),1)
            m.update(kind="render",version="V01",status="制作中",updated_at="2026-11-24T02:00:00Z")
            self.assertTrue(register(root,m,src))
            row=json.loads(index.read_text())["models"][0]
            self.assertEqual(len(row["images"]),1)
            self.assertEqual(row["design_version"],"D01")
            m.update(kind="design",version="D02",updated_at="2026-11-24T04:00:00Z")
            self.assertTrue(register(root,m,src))
            row=json.loads(index.read_text())["models"][0]
            self.assertEqual(row["render_version"],"V01")
            self.assertEqual(row["design_version"],"D02")
            self.assertEqual(row["status"],"制作中")
            self.assertFalse(register(root,m,src))
if __name__=="__main__": unittest.main()
