# 第6層 成木・葉束PNGと樹皮の画像貼付試作 V01

状態: **NOT_APPROVED / 未レンダリング**。V25で承認済みなのは**樹冠の横方向の広がりのみ**。正式素材、ゲーム本体、main/developmentの既存アセットは変更しない。

## 今回用意した実画像
- OpenAI生成の**6種類の枝付き葉束**透過PNG。外周用・陰影内部用の大小を変えたデザイン候補。葉1枚ごとの粒立ちを減らすため、複数葉を1枚の画像として扱う。
- 幹用は既にV27で動作した **ambientCG Bark015 / CC0** の実写真PBR（color/normal/roughness）を再利用。色の強い模様を抑えた stylized albedo（派生PNG）を追加。生成イメージボードは参考であり実モデルのレンダリングではない。
- ローカルで作った `f6_texture_assets_review_v01.zip` に上記画像、6個の個別PNG、SHA256付きmanifestを格納。**画像バイナリのGitHub正式素材への保存は未実施**。このPRには実験スクリプトと手順のみを保存。保存前にユーザーの承認とレンダリングQAが必要。

## 入力
1. GitHub Actions成功run [44447197961](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44447197961) のアーティファクト内の `nature/tree_mature_photo_v27/tree_mature_photo_v20.glb`（V25の葉の広がりを保持）。
2. 実画像のローカル配布zipを解凍したフォルダ。その中に `manifest.json`、`leaf_cluster_01.png`〜`06.png`、`bark015_stylized_albedo_candidate.png`、Bark015 PBRがある。

## Blender 5.3 での実行
```bash
blender -b -t 2 --python tools/floor6/painted_leaf_bunch_review.py -- \
 --source tree_mature_v27_source_verified.glb \
 --textures f6_textures_review_v01 \
 --output rendered/floor6/painted-leaves-v01
```

## QAと注意
- 元の葉メッシュはBlend内で保持して `hide_render`、試作GLBには葉束カードを出力。元の幹・枝を残す。
- Source GLBと各PNGを検証。実際の葉の広がりのX/Y外周が元の78%以上に保たれることを数値検査する（外形一致の美術証明ではない）。
- 正面・側面・斜め・真上の4PNG、Blend/GLB、SHA256 manifestを出力し、実画像を見てユーザーの美術承認を受けるまで正式保存しない。
- PNGのアルファ縁、色の境界、法線45%、内部AO、Three.js表示は**この段階では未検証**。とくにBlenderの特殊な裏面処理がGLBへ伝わらない以前の問題を踏まえ、GLBを実ブラウザで再検査する。
- 本番投入を急がず、最初は葉群と幹が同じ木として見えるかを優先する。


## PNGアルファとハッシュの実検査（2026-11-19）

6枚の生成PNGを個別化し、透明画素のRGBへ最近傍の葉色を拡張（Alpha値は不変）。GLBの透過材質で画像端が暗く縁取られるのを防ぐための処理。元の生成アトラスも同梱。生成PNGは新規制作、Bark015 PBRはambientCGのCC0素材。元V27 GLBはrun #44447197961から検査済みデータをコピー。

- leaf_cluster_01.png: 6bb9ff2170a5d5f13678adf580a55c642df79eb6e03973a7a85b880842b9da67
- leaf_cluster_02.png: aef9000e8a8901a9dbe442623b847772e86608b5b72cdf608fa47c552dc7ab09
- leaf_cluster_03.png: ea28ad585051505831faddf7bac43288e8c1e01f0c1d9fce0e55ae89f2c1eeea
- leaf_cluster_04.png: 24a0bfe54495e5a1e673de3001d298a8a1392bdb72d695651ba6b0e37733cc6b
- leaf_cluster_05.png: e6c7d55e4f7ed0a7e6f1c9c5a80a7907c811a8c170afc5b27bbacde37ba74a20
- leaf_cluster_06.png: dd6fb8ee06c3e92307082b59d9271e78875b116937a7cb0b65458d25829ae070
- bark015_stylized_albedo_candidate.png: 6889a468aaa86d38e05cb0e298815353db26fb71024dde53ba4c7e85f5d93350

**GitHub Actions source gate:** [#44524342517](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44524342517)、成功。Blender Python構文とV27元GLBハッシュ・幹/葉メッシュ存在を確認。**本検査はテクスチャ画像を実際にBlenderレンダリングしたものではない**。画像バイナリは今の段階では会話内の配布キットに保持し、承認後の正式素材フォルダ保存とは区別。

**Draft PR:** [#631](https://github.com/koda24-cell/kotama-no-bouken/pull/631)。ユーザーから採用済みなのはV25樹冠の広がりだけ。葉束と樹皮の画風・造形は未承認。


## 2026-11-20：実テクスチャGLB + 4方向ローカル3D描画結果（未承認）

- 使用: このタスク用に生成した枝付き葉束PNG6種 / Bark015の明度を抑えた派生Albedo / 元V27の検証済みGLB。葉は本番GLBを編集せず独立候補に実際に貼った。
- **実行環境はローカルPython trimesh + VTK EGL 9.6.2**。この結果は実際の3D座標・UV・透過テクスチャを読み込んで4方向から描画したもので、生成AIの完成イメージ画像ではない。**Blender5.3でのレンダリングはまだ実行できていない**ため混同しない。
- V01: 元V27の葉12,402メッシュ由来の分布と、幹・枝248メッシュ保持。カード1,205枚（6つのPNG）、GLB 254メッシュ。初回は葉が粒状・暗い印象。
- V02: **カード788枚**、葉束カードを大型化し照明を調整、元幹・枝248メッシュ保持、GLB254メッシュ（葉の6メッシュをUVで集約）。4方向（front, side, angle, top）の実3D PNG生成成功。Alpha BLEND + doubleSided をGLB JSONで検証。
- 元葉中心のGLB座標範囲: min(-1.247,1.413,-1.431) max(1.447,3.189,1.286)。V02 GLB候補全体範囲 min(-1.468,-0.031,-1.647) max(1.613,3.310,1.488)。**V25の広がりを元の葉座標でサンプリングして保持**したが、全体範囲は幹を含むので厳密な樹冠シルエット一致を保証しない。
- V02 GLB SHA256: 62d505967f2322e91b2cab51f70aa7ad49940e38d72bf08665890862dd89c513。会話内に、GLB+4PNG+QAノートの一時キット `f6_tree_painted_real_3d_V02_NOT_APPROVED.zip` を作成。
- **実画像目視: 未合格**。大きな葉束で粒状感は軽減したが、幹が高く露出し、枝の結合が粗く、葉群が暗く重い。ライトや法線だけでは解決しない。葉束の輪郭、枝先への接続と幹の太さ・分岐に追加造形が必要。
- トーンと自然なAO/法線45%は、今回のVTKプレビューとゲームのThree.js表示を混同しないで別検証する。
- **正式素材へ昇格しない**。Blender5.3での実レンダリング、Three.jsローダーでのGLB表示、ユーザー美術承認が必須。
