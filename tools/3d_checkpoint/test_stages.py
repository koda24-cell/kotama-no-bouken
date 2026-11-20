import json
from pathlib import Path
import tempfile
import unittest
from stages import validate


class StageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "tools").mkdir()
        (self.root / "tools" / "stage.py").write_text("print('ok')")
        self.config = {"asset_id": "b2-test", "stages": [{"name": "build", "script": "tools/stage.py"}]}

    def test_valid(self):
        self.assertEqual(len(validate(self.config, self.root)), 1)

    def test_missing_script(self):
        self.config["stages"][0]["script"] = "tools/missing.py"
        with self.assertRaises(ValueError):
            validate(self.config, self.root)

    def test_traversal(self):
        self.config["stages"][0]["script"] = "tools/../stage.py"
        with self.assertRaises(ValueError):
            validate(self.config, self.root)

    def test_duplicate_stage(self):
        self.config["stages"].append(dict(self.config["stages"][0]))
        with self.assertRaises(ValueError):
            validate(self.config, self.root)

    def test_unknown_key(self):
        self.config["stages"][0]["shell"] = "rm -rf"
        with self.assertRaises(ValueError):
            validate(self.config, self.root)


if __name__ == "__main__":
    unittest.main()
