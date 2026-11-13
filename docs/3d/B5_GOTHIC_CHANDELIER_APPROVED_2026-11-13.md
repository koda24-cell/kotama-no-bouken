# 第5階層：崩壊ゴシックシャンデリア V7（ユーザー承認済み）

- 承認日：2026-11-13
- 状態：**形状完成・ユーザー承認済み**。GLB/PNGのGit正式素材フォルダへの昇格は未完了。
- 制作コード：`field/assets/b5-ruined-gothic-chandelier.js`
- 形状コミット：`47cdcfed9ed2b4fc40288cf55033e95c8c1299d8`
- レンダリング成功： https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43381085985
- Artifacts ID：`14016543090`、名前：`b5-ruined-gothic-chandelier-glb-png`
- PR：https://github.com/koda24-cell/kotama-no-bouken/pull/275 （development向けDraft）
- 参考・引き継ぎ：https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/b5-chandelier-vine-silhouette-20261113.md

## 完成仕様

- 6方向回転対称の鍛鉄カール、外側へ広がりすぎない輪郭
- V7では曲線の座標を保持し、装飾チューブ半径を85%、奥行き厚みを42%へ縮小
- 中央リング、チェーン、燭台、破損要素を保持
- ゲーム用マテリアルの金属感調整はCodex側で実施予定
- 参考Pinterest画像の実ピクセルからの輪郭トレースは未実施（手動ベクトル輪郭）

## Claude / Codexへの引き継ぎ

1. GitHub Actions run `43381085985` のArtifactsからGLBと正面・背面・斜めPNGを取得する。
2. GLBはThree.jsの`GLTFLoader`で読み込める。元のJS形状を再生成する場合は上記ソースを参照。
3. **形状の再設計は不要**。金属感・反射・配置の調整のみを行い、ユーザーが承認したV7のシルエットを維持する。
4. 正式素材への昇格時は `assets/models/floor5/` 配下などにGLB・レビューPNGを永続保存し、development向けPRで検証する。第4階層専用の昇格ワークフローをそのまま流用しない。
5. Artifactsは一時保存であり、恒久保存とみなさない。
