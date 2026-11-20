import struct
from pathlib import Path
import tempfile
import unittest
from render_qa import inspect


def png(width, height):
    return bytes.fromhex("89504e470d0a1a0a") + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", width, height) + b"\x08\x06\x00\x00\x00"


class RenderQATests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for view in ("front", "side", "angle"):
            (self.root / (view + ".png")).write_bytes(png(1000, 760))
        (self.root / "model.blend").write_bytes(b"BLENDER")
        (self.root / "model.glb").write_bytes(b"glTF" + struct.pack("<II", 2, 12))

    def test_valid(self):
        self.assertEqual(inspect(self.root)["technical_qa"], "PASS")

    def test_missing_view(self):
        (self.root / "side.png").unlink()
        with self.assertRaises(ValueError):
            inspect(self.root)

    def test_invalid_dimensions(self):
        (self.root / "front.png").write_bytes(png(32, 32))
        with self.assertRaises(ValueError):
            inspect(self.root)

    def test_invalid_glb_length(self):
        (self.root / "model.glb").write_bytes(b"glTF" + struct.pack("<II", 2, 999))
        with self.assertRaises(ValueError):
            inspect(self.root)


if __name__ == "__main__":
    unittest.main()
