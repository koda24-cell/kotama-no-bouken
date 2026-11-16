"""Offline tests: vision opt-in, parsing and bounds, with NO real network calls."""
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
import vision_review

class MockResponse:
    status = 200
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, n): return json.dumps({
        "choices":[{"message":{"content":json.dumps({
          "analysis":"背面に厚みが足りない。アーチをもっと曲げる。",
          "visual_score":7.8,
          "confidence":0.9,
          "adjustments":{"rubble_delta":999,"relief_delta":-999,
                         "back_depth_delta":900,"arch_curvature_delta":-900,
                         "exposure_delta":999}
        },ensure_ascii=False)}}]}).encode()

class VisionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.directory=Path(self.temp.name)
        for name in ("front","side","angle"):
            Image.new("RGBA",(8,8),(125,80,110,255)).save(self.directory/(name+".png"))

    def tearDown(self):
        self.temp.cleanup()

    def test_disabled_never_calls_endpoint(self):
        with patch.dict(os.environ, {"ENABLE_VISION":"false"},clear=True),patch.object(vision_review,"urlopen",side_effect=AssertionError("unexpected network")):
            x=vision_review.evaluate(self.directory)
        self.assertEqual(x["mode"],"disabled")

    def test_unconfigured_never_calls_endpoint(self):
        with patch.dict(os.environ, {"ENABLE_VISION":"true"},clear=True),patch.object(vision_review,"urlopen",side_effect=AssertionError("unexpected network")):
            x=vision_review.evaluate(self.directory)
        self.assertEqual(x["mode"],"unconfigured")

    def test_explicit_response_is_clamped(self):
        env={"ENABLE_VISION":"true","VISION_API_URL":"https://example.test/chat/completions",
             "VISION_API_KEY":"test-token","VISION_MODEL":"test-model"}
        with patch.dict(os.environ,env,clear=True),patch.object(vision_review,"urlopen",return_value=MockResponse()) as call:
            x=vision_review.evaluate(self.directory)
        self.assertEqual(call.call_count,1)
        self.assertEqual(x["mode"],"model")
        self.assertEqual(x["adjustments"],{"rubble_delta":3,"relief_delta":-3,
                          "back_depth_delta":.15,"arch_curvature_delta":-.2,
                          "exposure_delta":.5})
        self.assertEqual(x["visual_score"],7.8)

    def test_refuse_plain_http(self):
        env={"ENABLE_VISION":"true","VISION_API_URL":"http://example.test/chat/completions",
             "VISION_API_KEY":"test-token","VISION_MODEL":"test-model"}
        with patch.dict(os.environ,env,clear=True),patch.object(vision_review,"urlopen",side_effect=AssertionError("unexpected network")):
            with self.assertRaises(ValueError):
                vision_review.evaluate(self.directory)

if __name__=="__main__":
    unittest.main()
