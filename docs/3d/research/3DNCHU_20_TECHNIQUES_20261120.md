# 3dnchu 技術記事20件 — コタマへの適用研究台帳 (2026-11-20)

> **状態**: 先行会話で列挙された20記事を対象とした**実装仮説・適用設計**。今回の外部検索では記事本文の追加取得に成功していないため、各本文・元動画・リンクの生存性・詳細な実装値は**未再検証**。記事タイトルから推定した部分は公式仕様や検証済み手順として扱わない。Blender実行・レンダリング・ゲーム統合は未実施。

## 運用方針
- 新しい3D素材の設計時に対象分野の行を確認し、品質に寄与するものを優先して試す。すべての技術を無条件に適用しない。
- Blender 5.3 + ClamAV共通Docker、GitHub Actionsを標準とする。外部アドオン・有料講座・素材取得を前提とせず、標準Geometry Nodes、Shader Nodes、ベイク、Three.jsで再現可能な部分から試す。
- 元形状・既存ゲーム・セーブ互換を保持。before/afterの正面/側面/斜めPNG、GLB、manifest、容量、三角形数、ドローコールを比較。
- BlenderだけのシェーダーやノードはglTFで直接再現されると仮定しない。PBRベイク・Three.js実機表示を確認。
- ClamAV取得直後・展開後・生成物検査、ライセンス確認、ユーザー美術承認、正式保存は既存ポリシーを守る。

## 個別分析（暫定、検証前）

### 1. Stylized Materials — A
- 3dnchu紹介URL: https://3dnchu.com/archives/how-i-make-stylized-materials-b3d-lassyla/
- 対象: 全階層の岩/木材/石壁
- 応用仮説: Noise/Voronoi/ColorRampで色・粗さ・法線を分離。近景は粗さと凹凸を細かく、遠景は色の大きな面を優先
- 検証ポイント: 色むら強度・ノイズスケールのA/B、ベイク後の継ぎ目
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 2. Don't use height maps — A
- 3dnchu紹介URL: https://3dnchu.com/archives/dont-use-height-maps-default-cube/
- 対象: 4層岩壁・5層石像
- 応用仮説: 高さ一方向だけでなく法線方向の変位を比較。大中小の破断スケールを分離しシルエットを保持
- 検証ポイント: 自己交差・尖り・三角形数
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 3. Mesh Seam Blending — A
- 3dnchu紹介URL: https://3dnchu.com/archives/mesh-seam-blending/
- 対象: 4層岩根元/6層岩と土
- 応用仮説: 交差境界の距離/深度マスクと色・粗さ混合。まずBlenderでベイクし、必要ならThree.jsで画面空間処理
- 検証ポイント: カメラ角度別の境界破綻、GLB再現
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 4. Flow Map — A
- 3dnchu紹介URL: https://3dnchu.com/archives/flow-map-meshbites/
- 対象: 2層川・4層溶岩・6層浅瀬
- 応用仮説: RG方向ベクトルをUV移動に利用。岸に沿う流れと流速差を別制御し、溶岩には固化・発光を追加
- 検証ポイント: 方向逆転・UV継ぎ目・反復周期・精度
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 5. Stylised Animated Grass — A
- 3dnchu紹介URL: https://3dnchu.com/archives/stylised-animated-grass-b3d/
- 対象: 6層草原・1層樹海
- 応用仮説: 根元固定の高さマスク、風の低周波波動、位相差、遠景LODを分離
- 検証ポイント: 根元浮き・ループ・GPU負荷
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 6. Forgotten Metal Knowledge — A
- 3dnchu紹介URL: https://3dnchu.com/archives/forgotten-metal-knowledge/
- 対象: 5層鎧/2層水車金具
- 応用仮説: 微細傷の方向性、粗さ、異方性、酸化・摩耗を部位別に設計。白飛びを避ける
- 検証ポイント: 正面/斜め照明、傷の方向とハイライト
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 7. 神社風景メイキング — A
- 3dnchu紹介URL: https://3dnchu.com/archives/t_kamiwada_b3d_making/
- 対象: 1層後半神社
- 応用仮説: 鳥居・石段・石碑・樹木の視線誘導、前中後景の密度、植生の非均一配置
- 検証ポイント: 1マス通路の視界・シルエット・導線
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 8. 中庭風景メイキング — A
- 3dnchu紹介URL: https://3dnchu.com/archives/t_kamiwada_b3d_making2/
- 対象: 3層廃墟/6層庭園
- 応用仮説: 建築ブロックアウト、モジュール寸法、経年劣化と植生の接触表現
- 検証ポイント: 壁高さ・スケール感・反復感
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 9. White Water Simulation — A
- 3dnchu紹介URL: https://3dnchu.com/archives/float-white-water-simulation-aaws/
- 対象: 2層滝・水車
- 応用仮説: 泡・飛沫・流体本体を別レイヤー化し、滝下で密度を上げる。実時間シミュレーションは避ける
- 検証ポイント: アルファ・重なり・描画負荷
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 10. Exposure 101 — A
- 3dnchu紹介URL: https://3dnchu.com/archives/101-exposure/
- 対象: 全階層の照明QA
- 応用仮説: 露出・トーンマッピング・色管理を固定してA/B撮影。黒潰れと白飛びを定量チェック
- 検証ポイント: 同一照明下の比較・sRGB/glTF差
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 11. 植物Geometry Nodes — A
- 3dnchu紹介URL: https://3dnchu.com/archives/blender3-beginner-geonode-tutor-badnormals/
- 対象: 6層草木/1層茂み
- 応用仮説: 幹/枝/葉の階層配置、密度マスク、ランダムシード固定、インスタンス利用
- 検証ポイント: 葉向き・法線・インスタンス実体化
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 12. Geometry Nodes Made Easy — B
- 3dnchu紹介URL: https://3dnchu.com/archives/architecture-topics-geonode-2024/
- 対象: 3層建築/5層城
- 応用仮説: 柱・窓・石積みの規則配置に欠損・傾き・経年差を重ねる
- 検証ポイント: 繰返し感・部品接合
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 13. Geometry Nodes仕様まとめ — B
- 3dnchu紹介URL: https://3dnchu.com/archives/blender-geometry-nodes-spec-summary-v3-6/
- 対象: 全階層の自動制作
- 応用仮説: 旧3.6のノード名・挙動を5.3 APIと照合して移植。古い例をそのまま実行しない
- 検証ポイント: 5.3互換・警告・再現性
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 14. Blender Conference 2023 — B
- 3dnchu紹介URL: https://3dnchu.com/archives/blender-conference-2023/
- 対象: キャラ・アニメ・制作管理
- 応用仮説: 個別講演を索引化し、キャラ髪・リトポ・自動化に関連するものだけ深掘り
- 検証ポイント: 会議一覧自体は実装レシピではない
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 15. MeshBlend — B
- 3dnchu紹介URL: https://3dnchu.com/archives/meshblend/
- 対象: 岩と地面の接続
- 応用仮説: マテリアル混合・メッシュ交差の別方式をSurface Blendと比較。外部ツール本体は導入しない
- 検証ポイント: 機能の重複・GLBへの移植
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 16. Hard-surface retopology — B
- 3dnchu紹介URL: https://3dnchu.com/archives/retopotechnique-hard-surface-zremesher-zbrush/
- 対象: 5層鎧/3層機械
- 応用仮説: 曲率が大きい部分にループを残し、平面は簡素化。ベベル/法線ベイクを併用
- 検証ポイント: 陰影の歪み・面密度
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 17. RetopoFlow tutorial — B
- 3dnchu紹介URL: https://3dnchu.com/archives/retopoflow-v3-0/
- 対象: アサシン頭部
- 応用仮説: 眼・口・耳・首の変形ループを意識して手動リトポを設計
- 検証ポイント: 目周辺のリング・表情変形
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 18. Stylized Fantasy Environment — B
- 3dnchu紹介URL: https://3dnchu.com/archives/stylized-fantasy-env-b3d-aniket-rawat-wingfox/
- 対象: 1層/6層
- 応用仮説: 大中小の形状リズム、配色・空気遠近、フォーカルポイントを参考にする
- 検証ポイント: 有料講座本編は未確認
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 19. Stylized Texturing for Games — B
- 3dnchu紹介URL: https://3dnchu.com/archives/tylized-texturing-for-video-games-with-blender/
- 対象: 全階層テクスチャ
- 応用仮説: 手描きアクセントとPBRを併用し、摩耗・苔・傷を場所別マスクで配置
- 検証ポイント: 講座本編未確認、UV・容量
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

### 20. Realistic Foliage for Game — B
- 3dnchu紹介URL: https://3dnchu.com/archives/realistic-foliage-creating-for-game/
- 対象: 6層樹木/草
- 応用仮説: 葉カードの形・法線・アルファ、近中遠LOD、樹冠の塊を優先
- 検証ポイント: 講座本編未確認、透過オーバードロー
- エビデンス: 元記事・一次資料の詳細照合 **未完了** / Blender 5.3実行 **未実施** / 本番適用 **未実施**

## 制作前チェック
1. 対象階層・部品に該当する技術を1〜3件選ぶ。
2. 元記事・一次資料を開き、技術内容とライセンス、Blender 5.3互換を再確認。
3. 変更前モデルを固定し、隔離ブランチでA/Bを生成。
4. 3方向以上の実レンダリング、ベイク後GLB、Three.js表示、性能監査、ClamAV結果を記録。
5. 品質に利点がある技術のみ共通レシピへ昇格。未承認のゲーム本番適用はしない。

## 優先実験
1. B4岩: 法線変位＋スタイライズド素材＋境界混合（#1,#2,#3）。
2. B2水/B4溶岩: Flow Map＋泡・飛沫（#4,#9）。
3. B5鎧: 金属微細傷＋ハードサーフェスリトポ（#6,#16）。
4. F6樹木・草: 草アニメ＋植物Geometry Nodes＋葉カードLOD（#5,#11,#20）。
5. F1神社/F3廃墟: 空間構成＋モジュール建築（#7,#8,#12）。

## 記録ルール
記事の確認、ノード試作、Blender 5.3実レンダリング、GLB変換、Three.js検証、ユーザー承認を別々の状態として更新する。


# 再現実験レシピ v2（2026-11-20追記）

**重要な区別**：以下の数値・ノード接続・式は、3dnchu記事の著者が提示した設定値ではなく、**コタマ向けに独自設計した初期実験値**。各記事・動画の忠実な再現手順ではない。Blender 5.3で未実行であり、存在するノード名やソケットは実機で再確認する。実験時は元記事と元動画を再確認し、相違点を記録する。

## 共通実験条件
- Blender 5.3.0 + ClamAV既存digest固定コンテナ。原本はread-only扱い。実験用に別blend/GLBを作る。
- カメラ: front/side/three-quarter/topの4視点、同一焦点距離50mm・同一露出・同一照明・同一解像度1024×1024（比較用の初期案）。
- 保存: before/after PNG、blend、glb、manifest.jsonにcommit SHA・Blender版・ノード値・seed・生成日時・ファイルSHA256・QA結果。
- 性能: triangles、materials、draw calls、texture memory、GLB bytes、ロード時間、平均/最低FPS。機器差があるため同一環境で比較。
- 合格条件: 原形状/衝突保持、意図した品質改善が4視点で確認できる、GLB/Three.js表示が破綻しない、性能退行を数値で説明できる、ClamAV結果記録、ユーザー承認前はNOT_APPROVED。

## R01 岩・木材のスタイライズ材質
- **入力/試験モデル**: Plane 2m四方とUV Sphere半径0.5m
- **操作・ノード構成（試案）**: Texture Coordinate(Object)→Noise Texture(scale 3,detail 4,roughness .55)→ColorRamp(4色)→Principled Base Color。別Noise(scale 35,detail 2)→Bump(strength .12,distance .015)→Normal。RoughnessはMap Range(.35〜.8)で制御
- **パラメータ比較**: Noise scale 2/3/5、Bump .06/.12/.2
- **評価・失敗判定**: 4方向で模様の繰返し・Bumpの逆転がない。BaseColor/Normal/Roughnessを1024pxでベイクしGLB確認
- **出力**: `r01_before.glb`, `r01_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R02 法線方向の岩の変位
- **入力/試験モデル**: 2m×2m×1m岩のコピー、Subdivision 3の実験専用高密度版
- **操作・ノード構成（試案）**: Geometry Nodes: Position→Noise(scale 1.5,detail 3)→Map Range(-1..1)→Vector Math SCALE(Normal×変位)→Set Position Offset。大変位 .12m、中 .035m、小 .008mを別周波数で重畳。最後に低密度版へ法線ベイク
- **パラメータ比較**: 大変位 .06/.12/.18m、seed 0/11/29
- **評価・失敗判定**: シルエットの破綻/自己交差/法線反転がない。低密度版と比較し三角形増加を監査
- **出力**: `r02_before.glb`, `r02_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R03 地形継ぎ目混合
- **入力/試験モデル**: 2m地面＋半径0.5m岩を5cm交差
- **操作・ノード構成（試案）**: Geometry Proximityで岩/地面距離を計測しMap Range(0..0.25m)→Smoothstepマスク。Noise(scale 7)で境界を±.04m揺らす。Mix Colorで土/岩色、Mix roughnessで境界を混合。Blender内のみで完結させずUVベイク
- **パラメータ比較**: 幅 .10/.25/.40m、ノイズ振幅 .02/.04/.08m
- **評価・失敗判定**: 3方向＋俯瞰で境界輪郭、GLBとBlenderの色差、UVシームを検査
- **出力**: `r03_before.glb`, `r03_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R04 Flow Map
- **入力/試験モデル**: 長さ4m×幅1mの川平面、UV(0..1)
- **操作・ノード構成（試案）**: RG画像の値を[-1,1]に復号: v=2*(RG-.5)。UV(t)=UV0+v*speed*t、2相位テクスチャを位相差0.5で混合し周期ジャンプを隠す。Three.js ShaderMaterialで試作、glTF標準だけでは動かない
- **パラメータ比較**: speed .02/.05/.1 UV/s、流速マスク .5/1/1.5
- **評価・失敗判定**: 岸に沿った方向・タイル境界・ループ周期・モバイル描画を確認
- **出力**: `r04_before.glb`, `r04_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R05 草アニメ
- **入力/試験モデル**: 高さ0.35m草カード10×10株、根元UV.y=0
- **操作・ノード構成（試案）**: vertex offset = windDir * pow(height01,2) * amplitude * sin(time*frequency+worldX*.8+worldZ*.6)。根元高さ0では変位0。波は低周波と小振幅高周波の2層。BlenderプレビューとThree.js実装を分離
- **パラメータ比較**: amplitude .015/.035/.06m、frequency .7/1.2/1.8Hz
- **評価・失敗判定**: 根元固定、ループのちらつき、透明カード重なり、遠景LODを比較
- **出力**: `r05_before.glb`, `r05_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R06 金属の微細傷
- **入力/試験モデル**: 兜コピー＋長方形金属板
- **操作・ノード構成（試案）**: Principled metallic 1.0, roughness .25〜.55。Noise(scale 80)→Bump(strength .04,distance .001)で微細傷。Wave Bandsを回転させAnisotropic 0/.25/.5を比較。エッジ摩耗はGeometry/Curvature相当マスクをベイク
- **パラメータ比較**: roughness .25/.4/.55、anisotropy 0/.25/.5
- **評価・失敗判定**: 斜光・正面光で白飛びしない。GLBのanisotropy拡張対応を確認し非対応なら粗さ/法線へベイク
- **出力**: `r06_before.glb`, `r06_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R07 神社空間設計
- **入力/試験モデル**: 1マス幅を既存ゲームから取得し2×3マスの試験区画
- **操作・ノード構成（試案）**: 入口→鳥居→石段→石碑の視線軸をブロックアウト。主要物の高さ比 鳥居:石碑=3:1 を初期案、左右の樹木密度を非対称にし、地面に小中大の石と植生を配置
- **パラメータ比較**: 鳥居比 2.5/3/3.5、遮蔽率 20/35/50%
- **評価・失敗判定**: プレイヤー目線から進行先が読めるか、1マス移動と当たり判定が崩れないか
- **出力**: `r07_before.glb`, `r07_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R08 中庭・廃墟構成
- **入力/試験モデル**: 壁1区画2m×3mのテスト（ゲーム尺度に合わせ再換算）
- **操作・ノード構成（試案）**: 柱・壁・窓をモジュール化。欠損を角/中央/窓周りで別マスク、瓦礫は崩落方向に沿って配置。植生は割れ目と水のたまる場所に集中
- **パラメータ比較**: 欠損面積5/15/30%、蔓密度3/8/15本
- **評価・失敗判定**: 壁高さ・反復パターン・浮いた瓦礫・窓ガラスの破断を確認
- **出力**: `r08_before.glb`, `r08_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R09 泡・飛沫
- **入力/試験モデル**: 滝落差2m、幅1mの試験シーン
- **操作・ノード構成（試案）**: 水本体/泡帯/飛沫カードを別オブジェクト。滝下で泡密度最大、距離とともに指数減衰。カードはカメラに向けるが水面法線と整合。透明ソートを避けるため可能ならalpha clip
- **パラメータ比較**: 泡幅 .15/.3/.5m、カード数 30/60/120
- **評価・失敗判定**: 水が白濁し過ぎないか、透過重なり、描画コール
- **出力**: `r09_before.glb`, `r09_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R10 露出QA
- **入力/試験モデル**: 18%グレー球・白球・黒球を各階層照明に設置
- **操作・ノード構成（試案）**: レンダーエンジン・Color Management・露出を固定し同一カメラで比較。PNG輝度ヒストグラムから暗部<5/255と明部>250/255の画素比を計算。明るさ補正は材質修正と分離
- **パラメータ比較**: 露出 -1/0/+1 EV
- **評価・失敗判定**: 暗部・白飛び率、色の保持、Three.jsトーンマッピングとの差
- **出力**: `r10_before.glb`, `r10_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R11 植物Geometry Nodes
- **入力/試験モデル**: 幹1本、枝3段、葉カード50枚
- **操作・ノード構成（試案）**: Curve Line/Resample Curve→Instance on Pointsで枝配置。枝先へ葉束を配置しNormal/Rotationを整列。Seed固定、Realize InstancesはGLB出力直前に必要な場合のみ
- **パラメータ比較**: 枝3/5/7、葉50/100/200
- **評価・失敗判定**: 葉裏面、法線、アルファ、GLBノード数
- **出力**: `r11_before.glb`, `r11_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R12 建築Geometry Nodes
- **入力/試験モデル**: 柱間2m、5区画の回廊
- **操作・ノード構成（試案）**: Mesh Lineで規則ポイント生成→Instance on Pointsで柱・梁・壁。Random Value(seed固定)で欠損/傾き、Boolean/手作業で主破断を追加
- **パラメータ比較**: 柱間1.5/2/2.5m、欠損率 0/10/25%
- **評価・失敗判定**: 柱接続、視界、衝突、インスタンス軽量化
- **出力**: `r12_before.glb`, `r12_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R13 旧Geometry Nodes移植
- **入力/試験モデル**: 旧3.6ノード例を隔離ファイルへコピー
- **操作・ノード構成（試案）**: Node Group入力/出力名、Field、Geometry Socket、Instance/Realizeの差をBlender5.3 Python APIで列挙。警告と置換ノードを記録
- **パラメータ比較**: ノード群3例
- **評価・失敗判定**: 旧版と5.3で同じ座標・インスタンス数・PNGになるか
- **出力**: `r13_before.glb`, `r13_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R14 Conference講演索引
- **入力/試験モデル**: 関係講演を個別に選定
- **操作・ノード構成（試案）**: 動画タイトル・登壇者・公開日・該当タイムコード・操作手順を収集してからレシピ化。会議一覧だけでは実装できない
- **パラメータ比較**: キャラ/リトポ/パイプラインの3テーマ
- **評価・失敗判定**: 一次動画確認前に技術採用済みとしない
- **出力**: `r14_before.glb`, `r14_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R15 MeshBlend比較
- **入力/試験モデル**: 継ぎ目混合#3と同一シーン
- **操作・ノード構成（試案）**: 距離マスク混合と頂点色混合とデカールの3方式を同じ岩で比較。外部ツールに依存しないノード試験
- **パラメータ比較**: 混合幅 .1/.25m、頂点色解像度 16/32/64
- **評価・失敗判定**: GLB互換、継ぎ目、マテリアル数、ドローコール
- **出力**: `r15_before.glb`, `r15_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R16 ハードサーフェスリトポ
- **入力/試験モデル**: 鎧プレート1枚と機械フック
- **操作・ノード構成（試案）**: 輪郭・穴・曲率変化にループを集中し平面部は四角面を大きく。Weighted NormalとBevel(width .005/.01m,segments 2/3)を比較。高精細傷はNormalベイク
- **パラメータ比較**: ベベル .005/.01/.02m
- **評価・失敗判定**: 斜光で陰影歪み・シルエット・三角形数
- **出力**: `r16_before.glb`, `r16_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R17 顔リトポ
- **入力/試験モデル**: オリジナル頭部のコピー（参照原本は変更禁止）
- **操作・ノード構成（試案）**: 眼輪5〜7本、口輪4〜6本を初期試験案にして、鼻翼→頬→顎へループを流す。耳付け根と首の接続を別QA。これらの数値は作品の顔に合わせ再設計
- **パラメータ比較**: 眼輪5/6/7、口輪4/5/6
- **評価・失敗判定**: 閉眼/開口/首回転で折れと伸びを確認
- **出力**: `r17_before.glb`, `r17_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R18 ファンタジー背景構成
- **入力/試験モデル**: 3つの距離帯（近/中/遠）でブロックアウト
- **操作・ノード構成（試案）**: 大きな形→中景の導線→小物の順。主色60%、副色30%、アクセント10%は仮の配色実験値。遠景は彩度とコントラストを抑制
- **パラメータ比較**: 配色60/30/10と70/20/10
- **評価・失敗判定**: 主役の読みやすさ・背景の情報過多・FPS
- **出力**: `r18_before.glb`, `r18_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R19 ゲーム用スタイライズテクスチャ
- **入力/試験モデル**: UV付き石壁と木材各1枚
- **操作・ノード構成（試案）**: BaseColorに大きな色むら、Normalに小傷、Roughnessに汚れ差を別ベイク。AOを色へ強く焼き込まず照明変化を保持。ORMパックはglTF規約に従う
- **パラメータ比較**: 解像度512/1024/2048、roughness .4/.6/.8
- **評価・失敗判定**: UV継ぎ目、テクスチャ容量、sRGB/linearの扱い
- **出力**: `r19_before.glb`, `r19_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## R20 ゲーム用葉カード
- **入力/試験モデル**: 樹冠1個、葉カード50/100/200枚
- **操作・ノード構成（試案）**: 葉カードに透過PNG、両面描画、球面方向へ頂点法線を混合。近距離はカード束、中距離は束統合、遠距離はImpostor。透過はalpha test優先で比較
- **パラメータ比較**: 法線混合 .25/.45/.65、alpha cutoff .3/.5/.7
- **評価・失敗判定**: 正面/裏面の光、ちらつき、オーバードロー、遠景シルエット
- **出力**: `r20_before.glb`, `r20_candidate.glb`, 4視点PNG、manifest、QAログ。未検証のため成功記録なし。

## 実装時の追加必須情報
各レシピの初回検証後に、正確なBlender 5.3ノード名・入出力ソケット・Python実行スクリプト・使用画像とライセンス・シード・実測値・Actions run URL・失敗ログ・スクリーンショットを追記する。**この追記なしでは「実機で再現済み」と扱わない。**
