#!/usr/bin/env python3
"""Strict dependency-free RGBA8 PNG tiling for isolated Blender QA; no rescaling."""
import argparse
import struct
import zlib
from pathlib import Path

SIGNATURE = b"\x89PNG\r\n\x1a\n"


def chunks(data):
    if not data.startswith(SIGNATURE):
        raise ValueError("Bad PNG signature")
    i = len(SIGNATURE)
    while i < len(data):
        if i + 12 > len(data):
            raise ValueError("Truncated PNG chunk")
        count = struct.unpack(">I", data[i:i + 4])[0]
        if count > 32 * 1024 * 1024 or i + 12 + count > len(data):
            raise ValueError("Invalid PNG chunk size")
        tag = data[i + 4:i + 8]
        body = data[i + 8:i + 8 + count]
        crc = struct.unpack(">I", data[i + 8 + count:i + 12 + count])[0]
        if zlib.crc32(tag + body) & 0xffffffff != crc:
            raise ValueError("PNG CRC mismatch")
        yield tag, body
        i += count + 12
        if tag == b"IEND":
            if i != len(data):
                raise ValueError("Unexpected data after IEND")
            break


def read_rgba(path):
    parts = list(chunks(Path(path).read_bytes()))
    if not parts or parts[0][0] != b"IHDR" or parts[-1][0] != b"IEND":
        raise ValueError("Missing PNG IHDR/IEND")
    w, h, bit, mode, comp, filt, interlace = struct.unpack(">IIBBBBB", parts[0][1])
    if (bit, mode, comp, filt, interlace) != (8, 6, 0, 0, 0) or not (1 <= w <= 8192 and 1 <= h <= 8192):
        raise ValueError("Expected non-interlaced 8-bit RGBA tile")
    if any(tag not in (b"IHDR", b"IDAT", b"IEND", b"sRGB", b"gAMA", b"pHYs", b"tEXt", b"iTXt") for tag, _ in parts):
        raise ValueError("Unrecognized PNG chunk type")
    raw = zlib.decompress(b"".join(data for tag, data in parts if tag == b"IDAT"))
    stride = w * 4
    if len(raw) != (stride + 1) * h:
        raise ValueError("Invalid PNG pixel byte length")
    rows = []
    previous = bytearray(stride)
    for row in range(h):
        start = row * (stride + 1)
        mode = raw[start]
        encoded = raw[start + 1:start + 1 + stride]
        if mode > 4:
            raise ValueError("Unsupported PNG row filter")
        out = bytearray(stride)
        for i, value in enumerate(encoded):
            a = out[i - 4] if i >= 4 else 0
            b = previous[i]
            c = previous[i - 4] if i >= 4 else 0
            if mode == 0:
                predictor = 0
            elif mode == 1:
                predictor = a
            elif mode == 2:
                predictor = b
            elif mode == 3:
                predictor = (a + b) // 2
            else:
                p = a + b - c
                da, db, dc = abs(p - a), abs(p - b), abs(p - c)
                predictor = a if da <= db and da <= dc else (b if db <= dc else c)
            out[i] = (value + predictor) & 255
        rows.append(bytes(out))
        previous = out
    return w, h, rows


def png_chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)


def merge(left, right, target):
    lw, lh, lr = read_rgba(left)
    rw, rh, rr = read_rgba(right)
    if (lw, lh, rw, rh) != (500, 760, 500, 760):
        raise ValueError(f"Tile dimensions invalid: {lw}x{lh}, {rw}x{rh}")
    content = b"".join(b"\x00" + a + b for a, b in zip(lr, rr))
    header = struct.pack(">IIBBBBB", lw + rw, lh, 8, 6, 0, 0, 0)
    payload = SIGNATURE + png_chunk(b"IHDR", header) + png_chunk(b"IDAT", zlib.compress(content, 6)) + png_chunk(b"IEND", b"")
    path = Path(target)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    print(f"HALF_FRAME_STITCH_COMPLETE=1000x760 bytes={len(payload)}")
    if read_rgba(path)[:2] != (1000, 760):
        raise ValueError("Merged PNG unreadable")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--left", required=True)
    p.add_argument("--right", required=True)
    p.add_argument("--output", required=True)
    a = p.parse_args()
    merge(a.left, a.right, a.output)
