# 全制作ブランチ向け Blender 5.3 共通入口（実行検証済み・段階展開中）

## 現状
Blender 5.3.0 + ClamAV 固定Dockerイメージは既存の成功実績あり。`.github/workflows/shared-blender53-render.yml` は **2026-11-20 run #44660839692で別ブランチからの呼び出し、Blender 5.3実レンダリング、入力・出力ClamAV、成果物QA、Artifact保存が全成功**。ただし既存制作ジョブは未変更で、全ブランチ適用済みではない。

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
1. **完了**: PR #652を `development` に統合。QA修正PR #653・#654も統合済み。
2. **実行成功**: 別ブランチ `test/shared-blender53-gateway-smoke-20261120` のpushで [run #44660839692](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44660839692) 全工程成功。実際に生成したのはPNG・Blend・JSONで、**GLB出力の共通ゲートウェイ検証は未実施**。Artifact #14596140858。PNGの美観確認は別途必要。
3. 成功後に各既存制作ブランチを調査して対応するcallerを追加する。未検証の古いワークフローは保持。
4. 新規ブランチはdevelopmentから作成し、制作開始時にcallerを配置する運用をAGENTSに適用する。

実証済みの別ワークフロー: R01 run https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44655908253

## 既存ワークフローの実査（2026-11-20）

| 既存ワークフロー | 5.3 Docker確認 | 共通ゲートウェイへの直接置換 | 理由 |
| --- | --- | --- | --- |
| `b2-frozen-waterwheel-render.yml` | 確認 | **不可・要アダプタ** | Node 22/Three.jsで実シーンGLBを事前生成し、ClamAVでインポート前検査する多段工程 |
| `floor3-elevated-bridge-render.yml` | 確認 | **不可・要アダプタ** | CC0テクスチャ取得・検査、複数Blenderスクリプト、独自出力ディレクトリが必要 |
| `b2-ruined-aqueduct-render.yml` | 確認 | **候補・要実検証** | 単一Blender Pythonスクリプト。出力先を`OUTPUT_DIR`に対応させる必要がある |

**移行方針**: すでに5.3を使う上記既存ジョブはそのまま稼働可能に保ち、共通ゲートウェイへの強制置換はしない。新規単一スクリプト型ジョブから採用し、複雑な工程には別途共通アダプタを設計する。既存ブランチへの反映はブランチ固有のコード・PR・成果物の確認後。
