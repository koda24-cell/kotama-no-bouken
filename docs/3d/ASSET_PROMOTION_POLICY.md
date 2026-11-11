# 3D素材の恒久保存・承認ルール

## 必須フロー
1. 3Dモデルを造形し、Docker版B4ワークフローでGLBと3方向PNGをArtifactsへ出力。
2. 実際のレンダリング画像を確認し、品質の承認を得る。未承認のGLBはゲーム本体に統合しない。
3. GitHub Actions `Promote approved B4 3D asset` を手動実行し、成功した元run ID、対象素材（cart/furnace/mine-rig）、文字列 `APPROVE` を入力。
4. ワークフローは元runの成功・ブランチ・ワークフローパスとGLB/PNGの基本形式を検証し、正式保存候補の独立ブランチとdevelopment向けDraft PRを作成する。
5. PRで造形・容量・ゲーム性能を再確認したうえでdevelopmentへマージする。mainは変更しない。
6. `assets/models/floor4/<asset>.glb` と `assets/models/floor4/reviews/<asset>/` に画像・出典をGitの履歴として残す。Artifactsの14日間の期限より前に承認・保存する。

## 重要
- 2026-11-12時点では上記昇格ワークフローは**未実行・未検証**。実行前にレビューする。
- `workflow_dispatch` の手動実行UIは通常デフォルトブランチへのワークフロー登録が必要。現在は作業ブランチにのみあるため、適切なレビュー・統合後に使用する。既存ブランチから勝手にmainへ導入しない。
- GitHub Actionsの権限設定でPR作成が制限される場合がある。ログを確認し、必要ならユーザーに権限設定を依頼する。
- 元runが期限切れになった場合は、再レンダリングして新しいrun IDを使用する。
- GLBが100MBを超える場合は通常のGitHubコミット不可。Git LFSや別の保管方法を検討する。
- これは「永続保存候補をPRにする」仕組みであり、自動でゲームに組み込むものではない。
- 承認はユーザーの明示的判断を前提とする。AIが独断でAPPROVEを入力しない。
- 本ガイドを別チャットでも参照すること。
