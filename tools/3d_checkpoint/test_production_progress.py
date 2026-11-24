import unittest
import tempfile
import json
from pathlib import Path
from production_progress import new_session, record_verified, pending, save

class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.s = new_session("test", "a"*40, "b"*64, 100)
    def test_verified_only(self):
        record_verified(self.s, "front", 123, "c"*64)
        self.assertEqual(pending(self.s, ["front","side","side"], {}), ["front","side"])
        self.assertEqual(pending(self.s, ["front","side"], {"front":self.s["units"]["front"]}), ["side"])
    def test_conflict(self):
        record_verified(self.s, "front", 123, "c"*64)
        with self.assertRaises(ValueError):
            record_verified(self.s, "front", 124, "c"*64)
    def test_atomic(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/"progress.json"
            save(p,self.s)
            self.assertEqual(json.loads(p.read_text()),self.s)
    def test_limit(self):
        with self.assertRaises(ValueError):
            new_session("test","a"*40,"b"*64,100,1440)
