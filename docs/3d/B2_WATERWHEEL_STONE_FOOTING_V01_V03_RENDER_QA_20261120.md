# 第2層水車：石製支柱基礎 V01〜V03 実レンダリングレビュー
2026-11-20 / **NOT_APPROVED** / Draft PR #650

## 実行・検証の事実
- V01 run [#44655787803](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44655787803) **failure**。Cycles PNG4/GLB/Blendは生成されたが、GLB画像マテリアル埋込assertで停止。入力ClamAV成功。成果物の最終QAは未実行。
- V02 run [#44656057016](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44656057016) **success**。元メッシュのポリゴン全体へのマテリアル割当を修正、GLB画像2枚を実確認。4方向レンダリング、SHA、ClamAV、GLB監査成功。目視の問題：球状の欠けが穴のように見える、側面テクスチャに規則的な格子が出る。
- V03 run [#44656479623](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44656479623) **success**。球状のBoolean穴を廃止し、上部輪郭を局所的に凹ませた。格子状のsin高周波テクスチャを不規則な低周波＋ランダム粒状へ置換。正面・側面・斜め・上面PNG4、GLB、Blend、albedo/roughness PNG2、hash manifest、共有構造監査、ClamAV入力出力を実行・検証済み。
- V03 GLB: 1 mesh / 1 material / image2 / 476 estimated triangles / 528204 bytes。ゲームFPSとは異なる構造評価。
- V03の美術確認：穴/格子問題は改善。**ただし石材の平面が大きく、自然な割れ目・不規則な大欠損・層状摩耗が不足。上面の受け口も直線的で人工的。ハイクオリティ美術合格ではない。**
- 既存支柱V03/車軸/軸受け/鉄帯を変更していない。組立干渉/水車稼働/ゲーム内FPSは未検証。

## 次回の改善
1. 上面の大きな自然亀裂を亀裂メッシュや局所面で実際に作る。直線的な黒いペイント線は避ける。
2. 角に段差状の破断面を増やし、1箇所を大きく崩した自然石の輪郭にする。
3. 局所的な暗い水染み/苔と石の粒子Normalを追加し、材質の単調さを解消。
4. ユーザー美術承認後に限り正式素材保存。Artifactは一時保存。
