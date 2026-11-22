#!/usr/bin/env python3
"""Minimal view-level technical validation; full render_qa requires all three views."""
import argparse
from pathlib import Path
import struct

p = argparse.ArgumentParser()
p.add_argument("--file", required=True)
p.add_argument("--view", choices=["front","side","angle"], required=True)
a = p.parse_args()
f = Path(a.file)
if f.name != a.view+".png" or not f.is_file() or f.is_symlink():
    raise SystemExit("VIEW_QA_FAILED: missing or unexpected filename")
data = f.read_bytes()
if len(data) < 100 or data[:8] != bytes.fromhex("89504e470d0a1a0a") or data[12:16] != b"IHDR":
    raise SystemExit("VIEW_QA_FAILED: missing PNG header")
w,h = struct.unpack(">II",data[16:24])
if not (256 <= w <= 8192 and 256 <= h <= 8192) or not data.endswith(bytes.fromhex("49454e44ae426082")):
    raise SystemExit("VIEW_QA_FAILED: dimensions or incomplete PNG end")
print(f"VIEW_QA_PASS={a.view} {w}x{h} {len(data)} bytes")
