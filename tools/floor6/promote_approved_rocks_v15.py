#!/usr/bin/env python3
"""Promote only user-approved F6 nature rock V15 render outputs (run 43814108717)."""
import hashlib, json, pathlib, shutil
ROOT=pathlib.Path(".")
SOURCE=pathlib.Path("/tmp/f6-rocks-v15")
DEST=ROOT/"assets/models/floor6/nature"
RUN=43814108717
ARTIFACT=14201817785
COMMIT="5a6bba6bc60f3febb19ca2e59c0e9a2c906486f0"
IDS=("rock_small","rock_medium","rock_large")
PNG=("front.png","side.png","angle.png","top.png")
def sha(b): return hashlib.sha256(b).hexdigest()
def checked(src,entry):
    b=src.read_bytes()
    assert sha(b)==entry["sha256"],str(src)+" hash mismatch"
    assert len(b)==entry["bytes"],str(src)+" size mismatch"
    if src.suffix==".glb": assert b.startswith(b"glTF")
    if src.suffix==".png": assert b.startswith(bytes([137,80,78,71,13,10,26,10]))
    return b
for asset in IDS:
    src=SOURCE/asset
    old=json.loads((src/"manifest.json").read_text())
    assert old["asset_id"]==asset and old["status"]=="preview_unapproved",asset
    files={e["name"]:e for e in old["files"]}
    assert set(files)==set([asset+".glb",*PNG]),asset
    out_glb=DEST/(asset+".glb")
    out_glb.parent.mkdir(parents=True,exist_ok=True)
    out_glb.write_bytes(checked(src/(asset+".glb"),files[asset+".glb"]))
    review=DEST/"reviews"/asset
    review.mkdir(parents=True,exist_ok=True)
    manifest_files=[{"path":str(out_glb.relative_to(ROOT)),"bytes":out_glb.stat().st_size,"sha256":sha(out_glb.read_bytes()),"role":"glb"}]
    for name in PNG:
        b=checked(src/name,files[name])
        target=review/name
        target.write_bytes(b)
        manifest_files.append({"path":str(target.relative_to(ROOT)),"bytes":len(b),"sha256":sha(b),"role":"review_png"})
    manifest={
        "asset_id":asset, "version":"V15", "status":"APPROVED",
        "approved_by":"user", "approved_date_jst":"2026-11-16",
        "game_integration":"NOT_INTEGRATED",
        "tile_size":old["tile_size"], "source_script":"tools/floor6/nature_rocks_v1.py",
        "source_commit":COMMIT, "source_pr":364,
        "render_run_id":RUN, "render_artifact_id":ARTIFACT,
        "render_url":f"https://github.com/koda24-cell/kotama-no-bouken/actions/runs/{RUN}",
        "files":manifest_files,
        "notes":"Visual approval only; Three.js performance and integration require separate validation."
    }
    (review/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
    print("APPROVED_F6_ROCK",asset,"files",len(manifest_files))
# Keep a copy of the precise source generator for reproducible rerenders.
src_script=ROOT/"source_f6"/"tools/floor6/nature_rocks_v1.py"
assert src_script.exists(), "pinned generation source missing"
dest_script=ROOT/"tools/floor6/nature_rocks_v1.py"
dest_script.parent.mkdir(parents=True,exist_ok=True)
shutil.copyfile(src_script,dest_script)
# Do not copy the old F6 render workflow automatically; it targets the work branch.
completion=ROOT/"docs/3d/F6_COMPLETED_ASSETS.md"
content=completion.read_text()
anchor="\n## 草原床 V7"
block="""\n| 自然岩3種（小・中・大）V15 | **ユーザー承認済み（2026-11-16）** | `assets/models/floor6/nature/rock_{small,medium,large}.glb` | [F6_NATURE_ROCKS_V15_CLAUDE_HANDOFF.md](F6_NATURE_ROCKS_V15_CLAUDE_HANDOFF.md) |\n"""
if "自然岩3種（小・中・大）V15" not in content:
    assert anchor in content
    content=content.replace(anchor,block+anchor)
completion.write_text(content)
handoff=ROOT/"docs/3d/F6_NATURE_ROCKS_V15_CLAUDE_HANDOFF.md"
handoff.write_text("""# 第6層 花園・自然岩 V15 完成（Claude受け渡し）

状態: **ユーザー承認済み / GLB・4方向PNG正式保存 / ゲーム未統合**

- 承認日: 2026-11-16 JST
- 制作元: PR #364 / commit `5a6bba6bc60f3febb19ca2e59c0e9a2c906486f0`
- Blender実レンダリング: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43814108717
- Artifact ID: `14201817785`（一時保管。正式ファイルはGitを参照）
- 造形再現コード: `tools/floor6/nature_rocks_v1.py`（V15の内容。名前は歴史的にv1のまま）
- 対象: `rock_small`, `rock_medium`, `rock_large`
- GLB: `assets/models/floor6/nature/<asset_id>.glb`
- 正面・側面・斜め・真上PNGとmanifest: `assets/models/floor6/nature/reviews/<asset_id>/`
- 形式: glTF 2.0 binary (GLB)、PNG、JSON
- 各manifestの `files` にハッシュ（SHA-256）・バイト数・パスを記録。
- GLBは形状・マテリアル・埋込テクスチャを含む。個別にGLTFLoaderからロードする。
- 草原床との接地、ワールドスケール、UV/Normal Map、ゲーム内Three.js表示とパフォーマンスは**統合時に再検証**。見た目の承認≠ゲーム統合の検証。
- ClaudeはBlenderを開かず、保存済みGLBとPNG/manifestを参照する。
- ロック表現はV1～V15で改修。V10のUV連続化で三角面の色模様を改善し、V15は表面ノイズを調整。ユーザーがV15を最終承認。
- 次の制作系統は砂利: `gravel_sparse`, `gravel_dense`, `gravel_path` （自然岩とは別PRで制作）。
""")
print("PROMOTION_COMPLETE",RUN,ARTIFACT)
