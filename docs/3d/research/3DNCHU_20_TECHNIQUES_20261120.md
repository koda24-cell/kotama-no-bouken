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
