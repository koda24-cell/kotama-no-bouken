# 実3F候補・独立Three.jsレビュアーの実行証拠

対象: `preview/f1-game-layout-candidate.html`。生成source checkpoint: `1991a91dac120885e5c28ec186d5f840ee0021df`。
候補: `assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-candidate.json`。

- 274歩行床（石187・soil-only87）、178壁、129小物、杉25本、177非歩行用soil支持床を実GLTFLoaderで配置。
- soil-only全87枚と支持床177枚のノード・材質・SHA・祖先変換・Y=0上面を確認。元のメッシュ・マテリアル・UVを共有。
- 17天井は既存B1素材を再利用。初期offの切替を確認し、候補行のSHA pin・ブラウザ計算値・ローカルbytesを照合。新17素材のmanifestには含めない。
- 2種の床を2×2で配置し、8m外周高さY=0を確認。9種の非対応・不一致を拒否。console error/warningは各0件。
- 全instanceを実際にロードしたtriangle/material primitive総計は見積3,911,334/2,092と一致。全域表示のコスト資料であり、FPSやGPU時間の合格ではない。
- 17個別GLB、候補JSON、ゲーム関連source7ファイルの計25ファイルは検証前後のSHAが同じ。元のmap、固定7object identity、FOE、274床配列の一致も確認。

[機械可読レポート](browser-verification.json) / [斜め配置図の実ブラウザ画像](perspective.png) / [平面図の実ブラウザ画像](plan.png)

水、固定オブジェクト7点、FOEは描画していない。衝突・戦闘・セーブ等のゲーム回帰は実行していない。既存mapへの適用やユーザー承認は行っていない。

112×72m相当を一画面に収めた俯瞰では、針葉alphaカードのminificationにより樹冠が疎に見える。近景デモと全マップでの外観は同じ承認対象ではなく、遠景LOD・植物の視認性・実ゲームの空間演出は今後の確認事項。個別GLBの形状や材質をこのレビュアーのために変更していない。

再現:

```sh
node tools/f1-sacred-forest/build_game_layout.cjs --require-assets
node tools/f1-sacred-forest/verify-game-layout-preview.cjs
```

ブラウザ検証の出力先は `/workspace/work/f1-game-layout-review/`。本フォルダは実行成功後のコピーであり、凍結したデモ5視点・68個別PNG・scene GLB/Blend・既存verificationとは別の記録。
