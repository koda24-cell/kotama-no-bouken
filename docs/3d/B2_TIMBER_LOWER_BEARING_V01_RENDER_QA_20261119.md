# 第2層・木製下部軸受け台 V01：実Blenderレンダリング検証（2026-11-19）

## 設計・実行
- 対象1部品: 木製軸受けの下部U字台。既存水車・外輪・スポーク・ハブ・鉄カラーは一切変更なし。
- 設計: `docs/3d/B2_WATERWHEEL_TIMBER_LOWER_BEARING_V01_DESIGN.md`
- Blender/Cycles Actions: [run #44456466568](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456466568) → **completed/success**、全ステップ成功。
- Artifact: `b2-single-lower-timber-axle-bearing-v01`、ID **14497822305**（2026-12-03T04:13:50Z期限、**一時保存**）。
- 外輪V11のPacked photo PBR: SHA256 `addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67` をjobで照合。追加外部写真素材の取得なし。
- 成果物ZIP実ダウンロード済み。GLB1、Blend1、正面側面斜め背面PNG4、manifest1。manifestで**対象6ファイル全てのbytesとSHA256一致**を独立確認。
- 木材の実U座R=.318m、ゲーム車軸R=.300mを設計値とする。一体メッシュの曲面内側68polygons、局所欠損2箇所（manifest）。ただし**実軸/ハブとの3D仮組みや衝突判定は未実施**。

## 実PNGの視覚評価
- 正面/背面: 物理的な凹半円座が明瞭に見え、太さと接地感がある。木目と木口の質感は前の単色模型より自然。
- **側面で白い水平帯・明度差が不自然**。UV方向とPhoto PBRの局所繰返しによる可能性。横に一本の装飾帯のように見える。
- 端面の2箇所の欠けは小さな人工的な穴に見え、自然な風化・ささくれとしては弱い。
- **V01は技術検査合格、美術品質保留**。

## V02改良候補
- 参照V01 BLEND SHA256 `c404c9187e1c029e789237453e2beac5cb2eb3fba19d54eb58d7260b5e787cf3` の読込チェック。V01メッシュを変更せず、側面に限定して写真木目UVと暗色ブレンド材を調整。
- Source: `tools/b2-waterwheel-bearing/build_lower_bearing_v02_resume.py`
- Workflow: `.github/workflows/b2-timber-lower-bearing-v02.yml`
- V02のBlender実行・成果物・品質はrun/artifactを実取得できるまで**未確認**。

## 制約
ユーザー承認までは正式素材フォルダへの保存PR、ゲーム統合、development/mainマージは行わない。GLB性能共通監査とゲーム内FPS、ClamAV新規外部ダウンロード（今回不要）は未検証。
