import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CLI = Path(__file__).with_name("checkpoint.py").resolve()


class CheckpointTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.script = self.root / "build.py"
        self.script.write_text("print('hello')", encoding="utf-8")
        self.out = self.root / "output"
        self.out.mkdir()
        (self.out / "scene.blend").write_bytes(b"BLENDER-v1")
        (self.out / "front.png").write_bytes(b"PNG-candidate")

    def run_cli(self, mode, ok=True):
        command = [sys.executable, str(CLI), mode, "--directory", str(self.out),
                   "--asset-id", "watergate", "--source-script", str(self.script),
                   "--source-commit", "commit1"]
        if mode == "pack":
            command += ["--iteration", "1"]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, ok, result.stdout + result.stderr)

    def test_round_trip_and_immutable(self):
        self.run_cli("pack")
        self.run_cli("verify")
        self.run_cli("pack", ok=False)
        data = json.loads((self.out / "checkpoint.json").read_text())
        self.assertEqual(data["status"], "NOT_APPROVED")
        self.assertEqual(len(data["files"]), 2)

    def test_corruption_rejected(self):
        self.run_cli("pack")
        (self.out / "front.png").write_bytes(b"changed")
        self.run_cli("verify", ok=False)

    def test_missing_file_rejected(self):
        self.run_cli("pack")
        (self.out / "scene.blend").unlink()
        self.run_cli("verify", ok=False)

    def test_source_change_rejected(self):
        self.run_cli("pack")
        self.script.write_text("print('modified')")
        self.run_cli("verify", ok=False)

    def test_unexpected_file_rejected(self):
        self.run_cli("pack")
        (self.out / "unexpected.txt").write_text("extra")
        self.run_cli("verify", ok=False)

    def test_symlink_rejected(self):
        (self.out / "escape").symlink_to(self.script)
        self.run_cli("pack", ok=False)


if __name__ == "__main__":
    unittest.main()
