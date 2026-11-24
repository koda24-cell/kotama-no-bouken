import unittest,tempfile,json,hashlib
from pathlib import Path
from PIL import Image
from preflight import check,REQUIRED,VIEWS
class PreflightTest(unittest.TestCase):
    def test_gate(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t); evidence={}
            for key in REQUIRED:
                f=p/(key+(".png" if key in VIEWS else ".txt"))
                if key in VIEWS: Image.new("RGB",(16,16)).save(f)
                else: f.write_text("fixture "+key)
                evidence[key]={"path":f.name,"sha256":hashlib.sha256(f.read_bytes()).hexdigest()}
            m={"revision":"V01","review_status":"DESIGN_REVIEWED","evidence":evidence}
            (p/"preflight.json").write_text(json.dumps(m))
            self.assertEqual(check(p)["status"],"EVIDENCE_COMPLETE")
            (p/"front.png").unlink()
            with self.assertRaises(ValueError): check(p)
