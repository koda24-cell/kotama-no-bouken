import unittest, tempfile, json, hashlib
from pathlib import Path
from blueprint import generate
from export_png import export

class BlueprintTest(unittest.TestCase):
    def test_fixture(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(__file__).with_name("example.json")
            out=generate(source,tmp)
            svg=(out/"blueprint.svg").read_text()
            for label in ("1200 x 1800 mm","120 x 1800 mm","1200 x 120 mm"):
                self.assertIn(label,svg)
            export(out)
            m=json.loads((out/"manifest.json").read_text())
            self.assertEqual(set(m["sha256"]),{"design.json","blueprint.svg","blueprint.png"})
            for name,digest in m["sha256"].items():
                self.assertEqual(hashlib.sha256((out/name).read_bytes()).hexdigest(),digest)
            with self.assertRaises(FileExistsError): generate(source,tmp)
    def test_invalid(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"bad.json"
            p.write_text(json.dumps({"units":"mm","revision":"V01","parts":[{"id":"x","origin":[0,0,0],"size":[0,1,1]}]}))
            with self.assertRaises(ValueError): generate(p,tmp)
if __name__=="__main__": unittest.main()
