import hashlib
import json
import unittest
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory
import importlib.util

spec = importlib.util.spec_from_file_location("bridge", Path(__file__).with_name("fetch.py"))
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

class BridgeTests(unittest.TestCase):
    def test_supported_signatures(self):
        self.assertTrue(b"\xff\xd8\xff\x00".startswith(bridge.MAGIC[".jpg"]))
        self.assertTrue(b"\x89PNG\r\n\x1a\nrest".startswith(bridge.MAGIC[".png"]))
        self.assertTrue(b"RIFFxxxxWEBP".startswith(bridge.MAGIC[".webp"]))
    def test_max_size(self):
        self.assertEqual(bridge.MAX_BYTES, 20 * 1024 * 1024)
    def test_digest(self):
        self.assertEqual(hashlib.sha256(b"test").hexdigest(), "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08")

if __name__ == "__main__":
    unittest.main()
