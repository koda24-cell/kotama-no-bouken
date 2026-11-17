# 第2階層 水面タイル v0.7（16種）— 再生成・未承認

**状態: 未承認（候補）。** GPT の v0.7 造形は 2026-11-13 にユーザーが「一旦これでおｋ」と暫定判断したが、正式素材への昇格（`docs/3d/ASSET_PROMOTION_POLICY.md`）は未実施。ゲームでは B2 v4 の危険な水面（非通行）の見た目にだけ試験的に使う。

## 出典
- 造形・生成スクリプト: GPT 作 `tools/b2-render/build-modular-water-tiles.py`（**改変なし**）。仕様は `docs/3d/B2_WATER_TILE_CLAUDE_HANDOFF.md`
- 元の生成 run（Artifact は期限切れ）: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43382401669
- 再生成: Claude（B2 v4 水面班 W）のワークフロー `.github/workflows/claude-b2-water-tiles.yml`（Blender Docker `lscr.io/linuxserver/blender:latest`）。run ID・Blender 版は `RUN.txt`
- 後処理: `tools/b2-render/claude-water-tiles-lite.py`（Claude）。頂点を溶接し、平らな格子（水面・川底・浅い棚・岸）だけを平面の間引き（5°）。岩棚・水たまり・水中の岩は元のまま

## 中身
| 場所 | 内容 |
|---|---|
| `source/water_tile_00〜15.glb` | GPT スクリプトの出力そのまま（1枚 約4.2〜4.9万三角形、計 約39MB） |
| `lite/water_tile_00〜15.glb` | ゲーム用の間引き版（1枚 約0.6〜1.6万三角形、計 約8MB） |
| `previews/gpt_top/angle/side.jpg` | GPT スクリプトの撮影（16種の一覧） |
| `previews/claude_seam_*.jpg` | lite 版を接続マスクどおりに並べた接合テスト（十字・T字・L字・行き止まり・単体・2×2・3×3） |
| `manifest.json` | 各タイルの三角形数（元・lite）、接合テストの配置とマスク不一致数（0） |
| `SHA256SUMS.txt` | 全 GLB の sha256 |

## 接続マスク
`water_tile_<mask>.glb` の mask は N=8 / E=2 / S=1 / W=4（ビットが立つ辺が水の接続側）。GLB の +X が東、-Z（Blender の +Y）が北で、ゲームの「ty が小さい＝北（up）」と一致するので回転は不要。1マス＝1単位（ゲームでは 4m に拡大）。
隣接セル A・B は A.E == B.W、A.S == B.N を必須とする。ゲームでは両方が水面かどうかからマスクを作るため必ず一致する（`field/b2-water-tiles.js` が組み立てごとに検査）。水面はマップ外周に接してはいけない。

## 使用箇所
`field/b2-water-tiles.js`（危険な水面＝マップ文字 `~` または役割 `water-hazard`）。色・透明度・発光はゲーム側の素材で #203 の水に合わせて置き換える（GLB の色は使わない）。
