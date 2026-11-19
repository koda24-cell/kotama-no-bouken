# B5 サレット兜 V21 — 頭頂中心のみ小さく尖らせる

2026-11-19 / **NOT_APPROVED** / V20〜旧モデルはすべて保持。

## ユーザー指示
「頭の頂点だけ少しとがらせて」

## 改修内容
- 元V20スクリプトから独立した `tools/b5-knights/build_sallet_v21.py`。
- 元の丸みを持つ鉢部分と長い後部テール・バイザー・鋲・V18の局所ひび3領域・V16の錆PBRテクスチャを保持。
- 上端リングの中心に **z=0.269m の共有頂点1つ** を作り、上端96頂点から三角形ファンを張って閉じる。V20の上端リングのz=0.263mより約6mmだけ高い。
- 別オブジェクトの突起、金属棒、鋭い飾りや広い範囲の角張りは作らない。
- 正面から弱い山形が見える程度を目指し、上面・側面で「針」や「円錐帽」のようなら失敗判定。
- 既存UV/PBR、背面の亀裂画像、クリーンなバイザー材質を変更しない。
- 現在の同一個体一次資料: Walters Art Museum 51.470、`koda24-cell/pinterest-reference-library/handoff/b5-sallet-full-view-20261118.md`。

## QA
- ワークフロー `.github/workflows/b5-knight-sallet-v21-render.yml`
- 実行 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456049460
- Blender+ClamAV検証済みGHCRコンテナにて source/texture/outputスキャンと6方向PNG、GLB、Blend、manifest SHAを検証。
- V20 front/left/angle/topとV21同方向を並べて、頭頂だけ変化していることを確認。
- **実画像未確認時点では美術合格を宣言しない。** 明示的なユーザー承認後のみ正式保存。
