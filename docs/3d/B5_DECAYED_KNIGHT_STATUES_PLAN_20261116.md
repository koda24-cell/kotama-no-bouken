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

## V10: 7頭身再設計・実測 (2026-11-16)
- V9を削除・上書きせず `tools/b5-knights/build_sentinel_v10.py` を作成。既存のメッシュを残し、各座標の垂直リマップで脚長・胴長・頭部比率を変えた。頭部の水平縮小0.81倍。
- 頭身評価は台座上面を除く実メッシュ最大Zと基準頭長の比。技術QAは `6.35 < head_units < 8.0`（目標約7）。**メッシュの数値判定は美術的な人体解剖学評価ではない**。
- 撮影は高さに合わせ ortho scale 5.2 → 6.1、注視点約2.2mへ変更。既存V9のBlender/GLB/PNGを保持。
- PBR写真テクスチャ候補（未取得・未使用）: [ambientCG Rock063](https://ambientcg.com/view?id=Rock063) 2026年2月公開、CC0、写真測量由来の灰色の風化岩。自然岩表現の参考には有効だが、人工彫像の筋/面を覆い隠さないようマスクを調整。GLBに実画像を取り込む際は原本hash、CC0確認、正しいUV/normal GL仕様、レンダ比較が必須。
- 実制作・品質判定を混同しない。前処理・写真系PBR適用は技術的な候補にとどまり、未確認のうちは『適用済み』と記録しない。

## V10–V13 7頭身・実写真PBR比較（2026-11-16）
- V10: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43888936019 。Artifact `14234513834` 。台座を除く実メッシュ比約 **6.886頭身**。脚の縦長化と頭部縮小。GLB/Blend/PNG3枚のhash一致。見た目は依然ずんぐり感が残る。
- V11: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43889626292 。Artifact `14236791099` 。肩を狭め、脚と剣をわずかに非対称化。比率6.886。GLB/Blend/PNG3枚のhash一致。旧版との差は小さい。
- V12: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43890338792 。Artifact `14235499089` 。ambientCG Rock063の**実CC0写真測量PBR**を公式から取得成功、Color/Roughnessの写真を取り込み、全メッシュUVを作成、Blender3方向/GLB/Blend出力、manifest/画像hash一致。写真由来の黄緑が強すぎ、**芸術的には不採用**。NormalGLのファイルは取得・同梱したが、黒画像化の回帰を避けるためモデルへは未接続。
- V13: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43891093819 。Artifact `14237047268` 。元のCC0写真はそのまま残し、実写真Colorをグレースケール＋冷灰色に色補正した `Color_ColdStone.jpg` を生成して使用。変換後画像のhash `1d6adcab3189cf25afbd402df6a3465c75d5a70d05f2dc32788d68f6f3adbc12`。比率6.886、GLB/Blend/PNG3枚のhash一致。魔王城らしいトーンへ戻ったが、面/破損の不自然さが残るため**未承認**。
- 同梱 `photo_source/source.json` に公式URL、ライセンス、採用Color/Normal/Roughnessのhashを記録。原本Rock063はCC0、別途調色画像は派生物。公式 https://ambientcg.com/view?id=Rock063
- 素材昇格・ゲーム組み込み・developmentマージは行わない。全バージョン独立の生成コードとActions成果物を残す。
- 次は部品の追加のみでなく、実人体の7頭身を意識した肩甲/胴腰/脚/外套の**大きな形状再設計**が必要。V13は完成ではない。

## V14 結果・人間の美術レビュー（2026-11-16）
- 実Blender 3方向レンダー: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43891804429
- Artifact `14237965600`。GLB・Blend・front/side/angle PNG（各800px）の manifest SHA-256全件一致。`head_units=6.886`。写真測量カラーの低彩度変換を保持。
- V13から大きな片肩や胴の横幅を縮め、前垂れと外套の板を後方・中央側へ再配置。胸部全体が少し細く見えるようになった。
- **品質評価: 未承認**。V10〜14とも成人騎士として細いバランスには寄ったが、元の角柱状ロボット鎧・平板の外套・不自然に重なる大量の石パーツは残る。今後細部を積み増すだけでは高品質化しない。
- 次段階では **別ファイルで成人騎士の解剖学的基本メッシュ（7頭身の肩/胸/腰/膝・手・足の連続面）を先に造形**し、現V14の装飾形状・色調・石欠けを参照として一部移植する。V1–V14原本ファイルは全部保持する。ベース構造を置換する候補はユーザーの明示的承認までゲーム用に昇格しない。
- CC0写真の見た目を「本物の法線マップで改善済」とはしない。Roughness＋Albedoの実使用のみ確認。normal mapは今後GLB内の画像検査を通したうえで導入する。
