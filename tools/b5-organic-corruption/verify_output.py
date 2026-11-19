#!/usr/bin/env python3
"""Check real Blender output and integrity; NOT an antivirus replacement."""
import hashlib, json, pathlib, struct, sys, zlib
root=pathlib.Path("render-output/b5-organic-corruption")
m=json.loads((root/"manifest.json").read_text(encoding="utf-8"))
assert m["status"]=="NOT_APPROVED" and not m["external_assets"]
assert m["original_game_mesh_modified"] is False
assert m["mesh_objects"]>=20
assert m["render_views"]==["front","side","angle"]
for item in m["files"]:
    p=pathlib.Path(item["path"])
    assert p.is_file() and p.stat().st_size==item["bytes"],p
    assert hashlib.sha256(p.read_bytes()).hexdigest()==item["sha256"],p
    if p.suffix==".png":
        b=p.read_bytes()
        assert b[:8]==b"\x89PNG\r\n\x1a\n"
        width,height=struct.unpack(">II",b[16:24])
        assert width==960 and height==720,(p,width,height)
        assert b[-12:-8]==b"\x00\x00\x00\x00" and b[-8:-4]==b"IEND"
    if p.suffix==".glb":
        b=p.read_bytes()
        assert b[:4]==b"glTF" and struct.unpack("<I",b[4:8])[0]==2
        assert struct.unpack("<I",b[8:12])[0]==len(b)
    if p.suffix==".blend":
        assert p.stat().st_size>10000
print("B5_OVERLAY_MANIFEST_SHA256_PNG_GLB_VALIDATED")
