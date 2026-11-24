import unittest,tempfile
from pathlib import Path
from advanced_material_policy import classify,plan,compare_geometry,review
from advanced_recovery import recovery
from advanced_session import run
class Tests(unittest.TestCase):
    def test_material(self):
        for name,kind in [("granite","stone"),("iron","metal"),("oak","wood"),("unknown","unknown")]:
            self.assertEqual(classify(name)[0],kind)
        self.assertFalse(plan("stone",{"silhouette":.5})["actions"])
        self.assertTrue(plan("wood",{})["actions"])
    def test_reference(self):
        a=dict(aspect_x=1,aspect_y=1,aspect_z=1,surface_density=2)
        self.assertEqual(min(compare_geometry(a,a).values()),1)
        self.assertEqual(review({"front":{"score":1,"technical_pass":True}},compare_geometry(a,a))["approval"],"NOT_APPROVED")
    def test_recovery(self):
        self.assertEqual(recovery("CUDA error: out of memory",0)["device"],"CPU")
        self.assertIsNone(recovery("unknown",0))
        self.assertIsNone(recovery("CUDA error",3))
    def test_session(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);src=p/"source";ref=p/"reference";src.write_text("s");ref.write_text("r")
            calls=[]
            def worker(step,settings,deadline):
                calls.append(step)
                if not settings:return {"ok":False,"error":"CUDA error"}
                f=p/step;f.write_text(step);return {"ok":True,"scan_pass":True,"files":[f]}
            self.assertEqual(run(p/"state",src,ref,["a","b"],worker),"COMPLETE")
            self.assertEqual(len(calls),4)
            self.assertEqual(run(p/"state",src,ref,["a","b"],worker),"COMPLETE")
            self.assertEqual(len(calls),4)
            (p/"a").write_text("corrupt")
            with self.assertRaises(ValueError):run(p/"state",src,ref,["a","b"],worker)
    def test_aesthetic_selection(self):
        import struct,zlib,copy
        from stitch_half_frame import SIGNATURE,png_chunk
        from advanced_aesthetic import compare
        from advanced_selection import score,select,VIEWS
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            def images(name,color):
                folder=root/name;folder.mkdir()
                raw=b"".join(b"\x00"+b"".join(bytes((*color,255)) if 2<=x<14 and 2<=y<14 else bytes(4) for x in range(16)) for y in range(16))
                data=SIGNATURE+png_chunk(b"IHDR",struct.pack(">IIBBBBB",16,16,8,6,0,0,0))+png_chunk(b"IDAT",zlib.compress(raw))+png_chunk(b"IEND",b"")
                for v in VIEWS:(folder/(v+".png")).write_bytes(data)
                return folder
            ref=images("ref",(180,120,60))
            bad=images("bad",(20,20,20))
            a=compare(ref/"front.png",ref/"front.png")
            b=compare(bad/"front.png",ref/"front.png")
            self.assertEqual(len(a["metrics"]),9)
            self.assertAlmostEqual(a["score"],1)
            self.assertFalse(a["instructions"])
            self.assertTrue(b["instructions"])
            base=score(bad,ref)
            good=score(ref,ref);good.update(verified=True,preserved=True)
            self.assertIs(select(base,[good]),good)
            self.assertIs(select(good,[base]),good)
            rejected=copy.deepcopy(good);rejected["views"]["side"]["metrics"]["silhouette"]=.1
            self.assertIs(select(base,[rejected]),base)
            self.assertEqual(good["approval"],"NOT_APPROVED")
    def test_art_review(self):
        import copy
        from advanced_art_review import packet,validate,choose_reviewed,VIEWS,CRITERIA
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            for v in VIEWS:(folder/(v+".png")).write_bytes(v.encode())
            p=packet(folder)
            review={"images":p["images"],"reference":None,"reviewer":"GPT","views":{v:{"scores":{k:3 for k in CRITERIA},"observation":"fixture only"} for v in VIEWS},"actions":["surface"],"approval":"NOT_APPROVED"}
            base={"review":review,"summary":validate(review,p)}
            self.assertEqual(base["summary"]["mean"],3)
            improved=copy.deepcopy(review)
            improved["views"]["front"]["scores"]["craftsmanship"]=4
            candidate={"review":improved,"summary":validate(improved,p),"technical_eligible":True}
            self.assertIs(choose_reviewed(base,[candidate]),candidate)
            candidate["technical_eligible"]=False
            self.assertIs(choose_reviewed(base,[candidate]),base)
            invalid=copy.deepcopy(review);invalid["views"]["front"]["scores"]["craftsmanship"]=6
            with self.assertRaises(ValueError):validate(invalid,p)
            invalid=copy.deepcopy(review);invalid["approval"]="APPROVED"
            with self.assertRaises(ValueError):validate(invalid,p)
            (folder/"front.png").write_bytes(b"changed")
            with self.assertRaises(ValueError):validate(review,packet(folder))
if __name__=="__main__":unittest.main()
