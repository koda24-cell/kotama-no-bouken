# 第3層・遺跡都市 — 古い窓ガラス押さえ金具01

## 設計
ユーザーがOKした `F3_GLASS_DETACHED_SHARD01_DIRT_V10`（汚れた破片）を保持し、**次の独立パーツ**として作成する。前のモデルは編集しない。

- ID: `F3_GLAZING_RETAINER_CLIP01_V1`
- 役割: 旧式金属窓枠へガラスの縁を押さえて固定する薄い金具（単品）
- 外寸: 約48×22×18mmの折り曲げ金属板（板厚約2mm）。既存の約100mm窓枠部品に合わせて設置可能な小物
- 構造: 背面取付フランジ、橋部、前面の短い爪、2つの浅い固定ネジ頭。周辺の窓枠やガラスそのものは出力しない
- 劣化: 破損が大げさにならないよう、塗膜にムラのあるPBR 256pxカラー＋Roughness画像を自作して適用。面形状は低ポリゴンのまま。
- 目標: 正面で固定パーツ、側面で薄い折曲形状、斜めで金属材とネジ、拡大で端部のすり減りを見せる。
- 既存のガラス片V10、窓枠縦材V5、横材V4、接合金具V5、コンクリート壁と露出鉄筋はすべて保持。

## 実行
- `tools/floor3/glazing_clip01/build_v1.py`
- `.github/workflows/f3-glazing-clip01-render.yml`
- [PR #637](https://github.com/koda24-cell/kotama-no-bouken/pull/637)
- [Blender Actions run #44645562340](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44645562340)
- Blender 5.3.0のdigest固定Dockerを利用。GLB、Blend、正面・側面・斜め・端部拡大の4 PNG、カラー/Roughness 2 PNGを生成する。
- **完了/美術合格は実行結果・画像取得・GLB検証後にのみ記録する。** 
- バイナリのGitHub正式保存・ゲーム組み込みはユーザーの承認後。Actions Artifactsは一時保存として扱う。
