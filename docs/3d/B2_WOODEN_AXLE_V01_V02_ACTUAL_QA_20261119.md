# 第2層 木製水車の車軸本体 V01・V02 実Blender/ClamAV検証（2026-11-19）

## 作業
ユーザー「おｋ。つぎ」から、次の独立モデルを木製車軸1本として制作。既存のハブV11、鉄カラー、下部/上部軸受け、丸頭ボルト、ナット、ワッシャー及びゲーム本体は一切変更なし。設計 docs/3d/B2_SINGLE_AGED_WOODEN_AXLE_V01_DESIGN.md。

## 物理設計の候補値
- 軸X、全長3.45m、ハブ候補中心穴R0.303mに対し中心軸の半径は上限約R0.3005m、軸受け予定部R0.291m前後。
- 実ハブ・鉄カラー・軸受け・木材接触面の**実GLB仮組み／干渉評価は未実施**。半径だけで組付け合格と主張しない。
- 実ソリッド単一木製メッシュ。長手の材木写真ではなく、完全オリジナルPython生成した512px PNG木目と512px木口の2枚を埋め込み、GLB・編集用Blendを出力。

## 実ジョブ
- V01 [GitHub Actions #44519495277](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44519495277): 全ジョブsuccess。Artifact 14527786374 ZIP実取得。GLB/Blend/4方向Cycles PNG/自作テクスチャ2/manifest9点。SHA256マニフェスト対象8ファイル全て照合成功。Blender5.3 Docker固定。ClamAV実スキャン成功。
- V02 [GitHub Actions #44520064091](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44520064091): 全ジョブsuccess。Artifact **14527512481** ZIP実取得。8ファイルSHA256/byte一致、GLB単一mesh、embedded images 2、674 faces。ClamAV 1.5.4で**生成9ファイル実スキャン・検出0件**（Known viruses 3,628,279、正常実行。絶対安全保証ではない）。

## 実レンダリングの審美評価
- V01：木口の年輪がほぼ等間隔の線、長手木目が明るい波線状のため、新品の人工丸太に見える。美術不合格。
- V02：長手木目を細く抑えて木材全体を少し落ち着かせ、木口の不規則な年輪と乾燥裂け目の暗色を強化。正面・側面・斜め・背面を実確認。
- **V02もまだ美術品質未合格**：軸の側面がなめらかで、古材特有のささくれ・かけ・節/汚れの立体感が少ない。特に表面が薄いベージュ、端面に黒い放射線が規則的に出る。角度によって木口の材質が明るすぎる。高品質の古木にするには物理的な割れ、面の荒れ、接触摩耗の差別化が必要。
- 技術成功と美術承認は区別。V02は現時点の最新候補、承認保留。

## 未確認
- 実ハブ/軸受けとの仮組み・回転接触、GLBゲーム内FPS、共有のShared 3D Performance Audit Action、ゲームへのLOD統合、正式素材昇格。
- Action Artifactsは2026-12-03に期限切れ予定。ユーザー美術承認前に正式素材フォルダへ入れず、PR #628をdevelopment向けDraftで保持。
- Pinterest候補（未閲覧/保存0）とGPT↔Claudeハンドオフ: https://github.com/koda24-cell/pinterest-reference-library/pull/34 .
