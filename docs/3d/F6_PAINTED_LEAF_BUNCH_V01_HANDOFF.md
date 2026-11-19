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
