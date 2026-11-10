# Codex引き継ぎ：第4階層「竜炎の迷宮」3D配置・品質改善
更新: 2026-11-10 / 対象: development（mainは変更しない）

## 統合済み
- PR #197: docs/art-direction/FLOOR4_DRAGONFIRE_3D_GUIDELINES.md（最初に読む）
- PR #194: 巨大岩・密集鉱石
- PR #199: field/b4-mine-rig-props.js（独立廃坑セット）、preview/b4-mine-rig-preview.html
- このPR: field/b4-abandoned-mine.js、field/b4-fortress-skyline.js、field/b4-citadel-backdrop.js、preview/b4-fortress-preview.html
- 元PR #198・#182は共有 field/field-3d-b4-b5-map.js の競合で未マージ。独立素材のみ回収した。

## Codexの優先作業
1. 最新developmentと並行PRを確認し、共有 field/field-3d-b4-b5-map.js に競合なく配置接続。B4限定で呼び出し、B5を変更しない。
2. addB4AbandonedMine、addB4FortressSkyline、addB4CitadelBackdrop と createB4MineRigProps の配置を実装する。
3. 通行可能セル・FOE・イベント・壁操作・カメラ・視界を遮らないようにする。廃坑のsite再親子化と回転・座標、wallCellの意味を必ず確認する。
4. 実際のゲーム画面で近景と遠景のスクリーンショットを比較し、重なり、浮遊、サイズ、形状、遮蔽を修正する。
5. Three.jsの描画負荷・メッシュ数・ジオメトリ/マテリアル破棄を確認。disposeB4MineRig、disposeFortress、廃坑素材のdisposeを整理する。
6. JS構文・ゲーム起動・マップ移動・FOE・セーブ互換・B5への影響を検証しPRで報告する。

## 世界観と制限
溶岩洞窟、廃坑、トロッコ、線路、巨大に欠けた岩盤、密集鉱石、尖塔・城塞。質感より先に造形とシルエットを重視。
素材はThree.js手続きモデル（GLBではない）。ブラウザプレビューと本編配置の動作検証は未実施。
戦闘・セーブ・ストーリーの仕様は変更しない。作業ブランチからdevelopmentへPRを提出し、mainはユーザー承認待ち。