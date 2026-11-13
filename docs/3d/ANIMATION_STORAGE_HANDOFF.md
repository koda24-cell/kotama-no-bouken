# アニメーション枠の保存 — 引継ぎ

確認日: 2026-11-14（日本時間）。対象PR: #328、統合先: development。

## GitHubで確認した状態

PR #328 はopen・未マージ。確認時headは5979d15b3e2b4d34d956d1a490091f1a53d27640。説明にはアニメーション保存済みとあるが、このheadの差分はMPFB素体とキャラ制作資料が中心で、アニメーション追加コミットは含まれていない。PR本文だけで保存完了と判断しない。

## 手元に残っている追加コミット

ローカルブランチ docs/character-animation-resources-20261114、commit 5e874b7（Add reusable CC0 animation packs and mandatory animation workflow）。作業ディレクトリ /workspace/scratch/3aff1c6d69a7/kotama-no-bouken。これは一時環境なので恒久保存とは扱わない。

- tools/animation/vendor/quaternius/: Universal Animation Library Standard と Library 2 Standard の原本ZIP。
- tools/animation/vendor/rokoko/: 上流コミット固定の未改変ソース、ライセンス。
- tools/animation/vendor/SOURCES.json: 出典、ライセンス、SHA-256。
- docs/3d/CHARACTER_ANIMATION_RESOURCES.md: GPT・Claude向け必読入口、Mixamo/DeepMotionの利用案内、制作順序。
- tools/animation/reviews/blender-import.json: Blender読込記録。
- AGENTS.md: アニメーション制作前の必読案内。

引継ぎ時に58ファイルのSHA-256を再照合し一致。両ZIPの整合性確認成功。ローカル資料は各パック43アクション・1骨格の読込記録を持つ。以前の報告の46と食い違うため、対象ファイルとBlender読込記録を基準に確認する。通常版とRM版を別の新規動作として二重計上しない。

## 未完了

ローカル追加コミットのGitHub pushを試したが、HTTPS認証が利用できず `could not read Username` で失敗。docs/character-animation-resources-20261114 はGitHub APIで404を確認。素材本体のGitHub保存完了とは報告しない。

次の担当は認証済みGit環境でコミット5e874b7の追加差分を確認して独立ブランチへpushし、development向けPRを作成する。#328の資料と重複するため、必要に応じて#328のブランチを土台とする。既存作業ディレクトリをreset/cleanしない。PR本文の保存状況も実際の差分に合わせて修正する。

自作キャラへの転送、Rokoko有効化、歩行の実レンダリング、ゲーム再生は未検証。素材保存と動作検証を区別する。Mixamo/DeepMotionは手順のみで、サービス由来データの取得・公開再配布はしていない。正式ゲーム素材への採用はASSET_PROMOTION_POLICY.mdに従う。
