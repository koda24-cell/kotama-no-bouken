# 全制作ブランチ向け Blender 5.3 共通入口（導入候補）

## 現状
Blender 5.3.0 + ClamAV 固定Dockerイメージは既存の成功実績あり。新しい `.github/workflows/shared-blender53-render.yml` は共通実行の **未検証候補**。既存制作ジョブは変更しない。

## 重要なGitHub Actionsの制約
- **全ブランチへの一括適用は、このファイルを一つのブランチに置いただけでは成立しない。**
- reusable workflow を `development` に統合後、各制作ブランチの既存ワークフローから `uses: koda24-cell/kotama-no-bouken/.github/workflows/shared-blender53-render.yml@development` を呼ぶ（GitHub Actionsが参照を許可することを確認）。新規ブランチは `development` から切る。
- `workflow_dispatch` はワークフローがデフォルトブランチに存在する必要があるため、mainへの無断追加はしない。代わりに、ブランチ内のpushトリガー付きcaller workflowを使う。
- 既存ブランチは開発中の未マージ変更を保持したまま、callerを**個別に**追加・検証する。全既存ブランチに無条件でコミットしない。
- 3D無関係のコミットでは実行しない。対象スクリプトの変更や明示的な起動要求のみ実行する。
- 全ジョブの自動5.3移行は行わない。互換性・ClamAV・実PNG/GLB確認後に個別切替。
- `OUTPUT_DIR` は `render-output/...` の相対パス。スクリプトは `OUTPUT_DIR` 環境変数を参照して成果物を書き出す。
- `NOT_APPROVED` の成果物は正式保存しない。

## 新規callerの例
```yaml
name: Asset Blender 5.3
on:
  push:
    branches: ['feature/my-asset-branch']
    paths: ['tools/my-asset/**', '.github/workflows/my-asset-render.yml']
jobs:
  render:
    uses: koda24-cell/kotama-no-bouken/.github/workflows/shared-blender53-render.yml@development
    with:
      script: tools/my-asset/render.py
      output_dir: render-output/my-asset
    permissions:
      contents: read
      packages: read
```

## 検証順序
1. このDraft PRをレビューして `development` に統合する（ユーザー承認前は統合しない）。
2. 一つの検証用callerで実際にpush起動し、5.3.0/ClamAV/PNG/GLB/Artifactを確認する。
3. 成功後に各既存制作ブランチを調査して対応するcallerを追加する。未検証の古いワークフローは保持。
4. 新規ブランチはdevelopmentから作成し、制作開始時にcallerを配置する運用をAGENTSに適用する。

実証済みの別ワークフロー: R01 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44655908253
