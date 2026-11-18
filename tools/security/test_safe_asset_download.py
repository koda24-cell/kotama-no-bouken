"""Offline tests for download quarantine: no external network required."""
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from safe_asset_download import fetch


class Response(io.BytesIO):
    url = "https://example.org/asset.zip"
    def __enter__(self): return self
    def __exit__(self, *args): self.close()


def archive(entries):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as zf:
        for name, data in entries:
            zf.writestr(name, data)
    return output.getvalue()


class DownloadSafetyTests(unittest.TestCase):
    def test_clean_zip_scans_before_and_after_extraction(self):
        data = archive([("safe/texture.png", b"example content")])
        scanned = []
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "accepted"
            with patch("safe_asset_download.urllib.request.urlopen", return_value=Response(data)), \
                 patch("safe_asset_download.scan", side_effect=lambda p: scanned.append(p.read_bytes())):
                result = fetch("https://example.org/asset.zip", dest, True, 1000000)
            self.assertEqual(scanned, [data, b"example content"])
            self.assertTrue((dest / "safe/texture.png").is_file())
            self.assertEqual(result["clamav"], "passed")

    def test_infected_archive_never_released(self):
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "asset"
            with patch("safe_asset_download.urllib.request.urlopen", return_value=Response(b"bad")), \
                 patch("safe_asset_download.scan", side_effect=RuntimeError("infected")):
                with self.assertRaises(RuntimeError):
                    fetch("https://example.org/asset.zip", dest, False, 1000000)
            self.assertFalse(dest.exists())

    def test_zip_traversal_blocked(self):
        data = archive([("../escape.txt", b"bad")])
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "accepted"
            with patch("safe_asset_download.urllib.request.urlopen", return_value=Response(data)), \
                 patch("safe_asset_download.scan"):
                with self.assertRaises(ValueError):
                    fetch("https://example.org/asset.zip", dest, True, 1000000)
            self.assertFalse(dest.exists())

    def test_http_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                fetch("http://example.org/a.zip", Path(d) / "asset", False, 1000000)


if __name__ == "__main__":
    unittest.main()
