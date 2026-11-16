# 第5階層・朽ちた騎士像 4種の制作・迷宮配置設計（2026-11-16）
状態: 設計・V1候補（NOT_APPROVED）。正式素材やゲームへの自動統合は禁止。

## 目的・方向性
- 4種の異なるシルエットを独立したGLBで用意する。単純な色違いではなく、姿勢・武器・破損と立面を変える
- 主材料は冷たい黒灰色の古い石、乾いた薄灰の摩耗、部分的な金属/石の帯飾り。紫の環境光に馴染む彩度低めの統一トーン
- 個々の顔面は閉じた兜。表面の形状変化、ベベル、剥離、左右非対称の破断、台座の石材接合を優先
- 崩れた石塊が空中に浮かないよう床と接地を確認。再利用で目立つ規則配列を避ける

## アセット一覧（個別承認）
1. sentinel: 剣を地面に支えにして直立する門番。兜の冠と片肩が欠け、剣と足元に礫
2. kneeling: 頭を垂れ片膝をつく騎士。折れた剣と片方の肩甲が崩れている
3. shield: 片腕の盾を掲げる騎士。盾に大きな欠損、背と台座にひび
4. fallen: 倒れかけて台座に引っ掛かった像。頭部/腕の一部は足元に落下

## 形状・技術仕様
- Blenderで1体ずつ制作、3方向PNG front/side/angle とGLB、元Blend、manifest、SHA-256を生成。
- テクスチャは実際のマップで確認できるGLB互換PBRへ。Blender内のみのprocedural bumpをGLB実装済みとは記録しない。
- 1マス=4m。台座とモデルの最大水平幅をおおむね1.8m以内に抑える。高さは約3m（実測はmanifest）
- 導入前にGLBのサイズ・原点・破損エッジ・マテリアル・透過・三方向の顔つき・負荷を検査する

## 迷宮内の設置案（未実装）
- `field/b5-scene-dressing.js` のwall-cell spot selection方式を再利用。#壁セル、通路に隣接、イベント/階段/門付近を避ける
- 通行可能セルや当たり判定は書換えない。壁の凹みまたは広間の端の装飾として設置
- 同一型の連続を避け、形状4種 + 90/180度回転 + 3種の欠損シード。配置はhash(tx,ty)で決定的にする
- ボスの正面・儀式祭壇への動線は優先して視界を確保し、極端な密集を防ぐ
- 数は暫定: 通常魔王城1エリアにつき3〜7体、広間は2〜4体。性能と視認性の実測後に調整
- 各種承認と正式保存後、読み込み/配置は独立したDraft PRで確認する。未承認GLBはゲームに自動組込しない

## 参照
Pinterest候補と引継ぎ: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b5-decayed-knight-statues-20261116.md
※ ピンのメタデータ取得済み、画像そのものの詳細美術評価は未完了。参考ピンの画像をテクスチャ転用しない。

## 現在の制作順
sentinel V1 -> レンダリング目視 -> 形状修正 -> 承認待ち -> kneeling -> shield -> fallen -> マップ表示検証

## 制作実績と品質判定（2026-11-16）
- V1〜V6は全て作業ブランチ内に独立コードとして保持。ユーザー承認・ゲーム組み込みは未実施。
- 成功した最新のBlender実行: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43826564411
- Artifact: 14206468671 `b5-knight-sentinel-v6-review-NOT-APPROVED`（14日間の一時保存）
- 実画像: `front.png`, `side.png`, `angle.png` 各800×800。GLB `sentinel_v6.glb`、編集用 `sentinel_v6.blend`、`manifest.json`、SHA-256を確認。
- V6 GLB: 1,104,764 bytes。149個のメッシュ。BBox実測 x=2.312m, y=3.727m, z=1.593m (glTF y-up)。4mセルへは0.72〜0.78倍で縮小するDraft配置コードを用意。通路側の残り幅・壁遮蔽はゲーム未検証。
- V3/V4不具合: Blender生成normal mapのGLB埋込PNGが黒一色でエクスポートされ、石材が暗くつぶれた。実際にGLB内の画像bufferViewを開き色平均0を確認。V5/V6は不正Normal Mapを未接続、GLBのメッシュ法線を使用。カラーテクスチャは埋込み済み。**正常なNormal Map実装・美術品質は別途再検証**。
- V6の見た目: V1より鎧の彫刻・肩甲・胸甲は増え、暗灰色の材質が見える。ただし依然、角張ったシルエットが強く、実世界水準の彫像としては品質改善余地あり。正式保存とゲーム反映はしない。
- 配置計画: `tools/b5-knights/placement-plan.js`。通行可能セルを削除せず、壁の1方向だけが通路に面するセルを抽出。周辺イベント回避・4種分配・離隔制御を設計。まだ実ゲームに呼び出していない。
- 次: 参考ピンの実画像を確認→V6石表面・人体比率・真の破断を改善→レビュー承認後に次のkneelingなどを個別制作→4種揃ってから実ゲーム配置テスト。

## V7→V9 Blender反復制作・2026-11-16 夜
- V7: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43855732074 ；Artifact `14220977156`。V6原本を保持して胸甲リブ・肩甲・石面の摩耗を追加。167 mesh、GLB 1,227,168 bytes。正面/側面/斜め実PNGを取得、SHA-256照合済み。遠目は依然機械的。
- V8: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43856358943 ；Artifact `14221222688`。旧メッシュ保持、ring-loft曲面胸甲、兜、すね当てを追加。177 mesh、GLB 1,380,448 bytes。3方向PNGとhash照合済み。側面の厚みは改善したが、兜が大きい。
- V9: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43856838479 ；Artifact `14221004238`。旧メッシュ保持、破損した石彫りの外套・前垂れ・礫を追加。193 mesh、GLB 1,484,876 bytes。3方向PNGとhash照合済み。下半身の空洞が減った反面、外套が平面板に見えるため**未完成**。
- 各反復の `.blend`, `.glb`, `front.png`, `side.png`, `angle.png`, `manifest.json` は14日間のGitHub Actions Artifactで保持。ユーザー承認・正式素材への昇格・development/game実装は**行わない**。
- 次回優先: V9の薄板外套を折れた布の3Dボリュームに改善、鎧装飾の規則正しさ解消、頭身・兜大きさの検証、粗い石面のNormal Mapを有効なPNG/GLBへベイクして確認。単にメッシュ数を増やすのでなく、少数の大きな彫刻形状・重量・欠損の物理的説得力を優先。既存形状は保持。
