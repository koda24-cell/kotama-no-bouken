# B4 Magma River V8 — Claude / GPT 引き継ぎ

## 現状
- **品質確認用候補・未承認**。完成素材フォルダへ移動しない。
- GitHub Actions成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43991538698
- Artifact: `b4-magma-river-v8-review` (ID 14288227282)、14日間の一時保存
- Blender生成コード: `tools/floor4/magma_river/build_magma_river.py`
- 生成ワークフロー: `.github/workflows/b4-magma-river-iterative-render.yml`
- 詳細設計/反復記録: `docs/3d/B4_MAGMA_RIVER_TRANSITION_DESIGN_20261117.md`
- Pinterest資料: `koda24-cell/pinterest-reference-library/handoff/b4-magma-river-transition-20261117.md`

## GLB・PNG・manifestの引き継ぎ構造
Artifacts ZIPの中（GitHubの正式assetsパスではない）:
```json
{
  "asset_id": "b4_magma_river_v8_candidate",
  "floor": 4,
  "status": "NOT_APPROVED",
  "run_id": 43991538698,
  "source_sha": "e5392df326b4f5a9f5813921a907d42a7f4c278e",
  "glb": "b4-magma-river-v8.glb",
  "blender_source": "b4-magma-river-v8.blend",
  "previews": {
    "angle": "b4-magma-river-v8-angle.png",
    "front": "b4-magma-river-v8-front.png",
    "side": "b4-magma-river-v8-side.png",
    "top": "b4-magma-river-v8-top.png"
  },
  "manifest": "manifest-v8.json",
  "meshes": 182,
  "embedded_images": 10,
  "integration_status": "not_integrated"
}
```

## Claude向け制約
ClaudeはBlenderを使わず、上記GLB/PNG/manifestを参照する。ゲームへの統合はまだ行わない。正式素材承認後に、既存第4層を壊さずに新しいタイル/床と既存V33マグマ壁の接続を別PRで実装する。

### 動的VFX実装案（未検証）
- 溶岩BaseColor/EmissionのUVを流れに沿って低速スクロール。GLB自体は静的で、アニメーションはゲーム側Three.jsシェーダに分離。
- 冷却殻は静的岩と異なる速度・揺らぎを設定し、動く赤熱亀裂が部分的に現れるようにする。
- 熱ゆらぎは画面空間の屈折/ディストーションを局所的に適用。ブラウザ負荷・アクセシビリティ配慮が必要。
- 火の粉は落下地点と亀裂に偏らせ、ランダムに飛ぶInstancedMesh/Pointsを使う。
- 煙・蒸気は半透明のレイヤーとソフトパーティクルで、火山洞窟の暗さを保つ。
- 現在のGLBにはVFXの実時間動作は含まれていない。視覚検証は未実施。

## 未解決
- 本来の1マス寸法、隣接方向、溶岩岸/陸の接続タイル、衝突判定
- ゲーム内視点での見え方と描画性能
- 既存PBR素材の出典・再配布条件（ASSETS_CREDITS.md）
- Pinterest参考画像の実画像目視（取得候補のリンクのみ）
- フォトリアルな浸食・多層岩盤・マグマ表面の物理感
- ユーザーの最終承認

## 制作経過
V1–V3はY-up/Z-up座標ミス。V4で修正。V5で滝の岩壁と地面。V6で溶岩溜まり。V7で熱分布ベイクと支流（初回numpy dtype失敗、修正版成功）。V8で岩肌の高密度化・非対称化。
