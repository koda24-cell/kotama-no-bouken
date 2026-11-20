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

## V2 / V3 実レンダリング比較
- [V2 Actions #44652049862](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44652049862) **success**。Artifact #14591711234を実ダウンロード、GLB/Blend/4PNG/テクスチャ2PNG計8ファイルのmanifest SHA256全一致確認。GLBは11 mesh、338 triangles。V1の星形を改善したが上面が平たい円盤に近く、割れた骨材が目立たない。**美術未承認**。
- [V3 Actions #44652457581](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44652457581) **success**。Artifact #14591816424を実ダウンロード、8ファイルのmanifest SHA256全一致確認。GLB実測**2 mesh / 418 triangles / 184,612 bytes**。
- V3では上面に実形状の起伏を加え、小さな骨材14点を2番目の1メッシュへバッチ化。GLB 2メッシュでサブパーツを保持しながらメッシュ数を減らした。ただし**上面に白い石粒が浮いて見え、コンクリート内に埋まった骨材に見えにくい**。外観全体も薄い円盤形が強い。美術品質は**不合格・未承認**。
- 次の修正候補は、上面石粒ではなく**破断側面内部の粒子露出**へ移動、側面の複数階層を不規則な破断・陥没面に変更、コンクリートの実破壊面参考と比較すること。以前のV1〜V3は全て非破壊に保持。
- V3テクスチャ自作のSHA256は `F3_RUBBLE01_CONCRETE_ALBEDO.png`: `50f91cbde203fc6525c3ca4ad8d35a8f73207396bf9eba57756217003a3afd01`、`F3_RUBBLE01_CONCRETE_ROUGHNESS.png`: `87f343a86c0faeafb81243d9cbd7bb2da0f9191213f319920a8d698c139ba664`。
- Blender環境は5.3.0のdigest固定。V3固有のClamAVスキャンとThree.js FPS測定は未実施。未承認GLBの正式フォルダ保存・ゲーム統合なし。
