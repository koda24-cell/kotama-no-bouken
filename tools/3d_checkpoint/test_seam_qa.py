#!/usr/bin/env python3
"""Technical seam QA unit tests including injected vertical image seam."""
import tempfile
from pathlib import Path
from stitch_half_frame import png_chunk, SIGNATURE
from seam_qa import evaluate
import struct
import zlib


def write_image(path, *, seam=False):
    width, height = 1000, 760
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            v = (x // 7 + y // 9) % 180 + 20
            if seam and x >= 500:
                v = min(255, v + 45)
            raw.extend((v, v, v, 255))
    hdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    path.write_bytes(SIGNATURE + png_chunk(b"IHDR", hdr) + png_chunk(b"IDAT", zlib.compress(raw)) + png_chunk(b"IEND", b""))


def main():
    with tempfile.TemporaryDirectory() as root:
        folder = Path(root)
        ref = folder / "reference.png"
        good = folder / "good.png"
        bad = folder / "seam.png"
        write_image(ref)
        write_image(good)
        write_image(bad, seam=True)
        expected = evaluate(good, ref)
        assert expected["status"] == "PASS", expected
        injected = evaluate(bad, ref)
        assert injected["status"] == "FAIL", injected
        assert not injected["checks"]["seam_excess_over_reference"], injected
        print("SEAM_QA_UNIT_TEST_PASS clean image accepted, synthetic 45-level seam rejected")


if __name__ == "__main__":
    main()
