# Claude用引き継ぎ — B2 雪つきシダ V02

## 対象・状態
2026-11-17 外観承認。推奨 `balanced`、派生 `light` と `heavy`。モデル本体はレビューZIPで受け渡し可能だが**GitHubには未アップロード**。ClaudeにBlender操作を要求しない。

## 受け取るファイル構成
```text
assets/models/floor2/vegetation/
  b2_frost_fern_v02_balanced.glb
  b2_frost_fern_v02_light.glb
  b2_frost_fern_v02_heavy.glb
  b2_frost_fern_v02_manifest.json
  reviews/b2_frost_fern_v02/
    balanced_front.png balanced_side.png balanced_angle.png
    light_front.png light_side.png light_angle.png
    heavy_front.png heavy_side.png heavy_angle.png
    comparison_3x3.png
tools/b2-vegetation/
  build_snow_v02.py
  render_snow_v02.py
docs/3d/
  B2_FROST_FERN_V02_CLAUDE_HANDOFF.md
  B2_FROST_FERN_V02_COMPLETION.md
```
各GLBのSHA256は `docs/3d/B2_FROST_FERN_V02_ASSET_MANIFEST.json` を使用。レビューZIPにも元の生成・検証データがある。

## Claudeの実作業
1. 本体のGitHub保存を先に検証。無いなら`assets/`にあると仮定しない。
2. GLBの読み込みを`GLTFLoader`で確認し、頂点色、法線、裏面(`DoubleSide`)、積雪メッシュの干渉をチェック。
3. 第2層での配置は`wet_rock`,`ruin_crack`,`shore_soil`,`cave_floor`等の既存タグ・シード付き配置と互換にする。既存橋・氷岸・遺跡・水面・通路は改変しない。
4. 葉V08の形状、雪の分布、GLBの出現位置を保ち、勝手に美術的な「修正済み別モデル」として入れ替えない。
5. 第2層の視点3方向、FPS、透過/材質、連結状態を確認した変更のみ独立PRで`development`へ。`main`には無断マージしない。

## 確認済み／未確認
- 確認済み: ローカル実GLB 3個 + 実GLBからVTK生成PNG 9枚。実ファイルのSHA256を照合。
- 未確認: GitHubバイナリ保存、Blender、ブラウザ、実ゲーム使用、写真PBR。
- ユーザーの完成判定は**見た目の完成**。ゲーム統合の完了宣言には別の動作検証が必要。

## 元PR・資料
- [葉～株の造形試作PR #451](https://github.com/koda24-cell/kotama-no-bouken/pull/451)
- [完成メモ](B2_FROST_FERN_V02_COMPLETION.md)
- [SHA256台帳](B2_FROST_FERN_V02_ASSET_MANIFEST.json)
