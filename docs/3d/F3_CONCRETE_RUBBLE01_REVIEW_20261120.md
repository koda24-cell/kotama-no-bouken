# 第3層 遺跡都市 — 単体コンクリート瓦礫01

更新: 2026-11-20。窓関連の新規制作はユーザーの方針により終了し、今回は瓦礫**1個**へ移行。

## 造形内容
- ソース: `tools/floor3/concrete_rubble01/build_v1.py`、`build_v2.py`
- 0.45×0.31×0.12m程度の崩落コンクリート。層ごとに不揃いな外周と破断側面、内部に部分的に埋まる小さな骨材を配置する。
- 自作256×256カラー/Roughness画像。外部素材未取得。既存のコンクリート壁、窓、鉄筋、ゲームコードを変更しない。

## V1実QA
- [Blender Actions #44651615471](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44651615471) **success**、Artifact #14590213635。
- GLB、Blend、4方向PNG、カラー+Roughness PNGの計8ファイルのmanifest SHA256を実取得・照合。
- 目視: **星形に近い不自然な尖り、上面が白飛び、破断した構造材としての説得力不足。V1美術不合格**。骨材がほぼ見えない。
- ベースの破断面形状と自作画像は比較用に保持する。

## V2改良
- ソース: `tools/floor3/concrete_rubble01/build_v2.py`
- 輪郭の変化を大きな周波数の自然な凹凸中心に再構築。極端な尖りの代わりに2か所程度の局所欠け。
- コンクリート基調色を抑え、露出と照明を下げ、上面の過剰な白さを修正。
- [V2 run #44652049862](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44652049862)。結果はGLB/PNG実取得後に判定する。
- 最優先の追加検査: 本来の廃墟コンクリートの割れ断面と照らし、骨材が側面に埋まり過ぎて見えない問題、上面と側面の境界が綺麗すぎる問題を点検する。

## 保存・安全
- [Draft PR #642](https://github.com/koda24-cell/kotama-no-bouken/pull/642)（development向け）。
- Asset Artifactsは一時保存。美術承認前のGLB/PNG正式フォルダ保存・ゲーム統合なし。
- ClamAV個別スキャンとThree.jsゲーム内FPSの検査は未完了。Blender 5.3+ClamAV入りDockerでの実レンダリング成功だけをもってスキャン済みとは扱わない。
