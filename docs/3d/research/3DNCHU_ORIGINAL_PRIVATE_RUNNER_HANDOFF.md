# R01 作者Blend：公開リポジトリへ原本を置かない検査経路

## 検証済み
- GitHub Actions run [44931503109](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44931503109) は **自作テスト球体のみ**、Blender 5.3.0 / ClamAV / inspection / Eevee PNG / Artifact の全工程成功。
- 原本2ファイルはこのrunに含まれない。原本レンダリングの成功証拠ではない。
- 原本の既知SHA256:
  - Lassyla_Material.blend: ecda84d13cf48e98e571d434cba4dc49d30f01aeaabc93e118fa7fed1ec4d2c0
  - Palm_Tree_Demo.blend: da01d11a6ad24032bcc63e48cc2f0e8c9dc068f4e7a56bd7176aaebf1de7d44e

## 非公開の原本を扱う方式（未実行）
- `.github/workflows/3dnchu-author-originals-self-hosted.yml` は専用Windows self-hosted runnerの **明示的手動実行専用**。現在のGitHub-hosted runnerでは動かない。
- 専用ラベル `original-blend-audit` を付けた、信頼できるPCにのみrunnerを登録。公開PR由来のコードを同じrunnerで実行しないこと。可能なら専用マシンと隔離アカウントを使用。
- GitHub Actions secretsに、ローカルの絶対パスを設定: `ORIGINAL_BLEND_AUDIT_SOURCE_DIR`, `ORIGINAL_BLEND_AUDIT_BLENDER_EXE`, `ORIGINAL_BLEND_AUDIT_CLAMSCAN_EXE`。原本はsource dirに置く。原本自体をGitHubへpush/secret登録しない。
- Blender 5.3.0、ClamAV定義更新済みを事前に用意。workflowはハッシュ照合→ClamAV→自動スクリプト無効でBlender解析→Eeveeレンダリング→出力ClamAV→PNG/JSON検査の順。
- Artifactには検査JSON・レンダリングPNG・manifestのみ。原本Blendを含めない。**ただしPNG/JSONにも作者の著作物由来の情報が含まれる**ため、共有・公開前に権利とプライバシーを確認すること。
- `workflow_dispatch` はdefault branchへの登録が必要な場合がある。**このためにmainへ無断でワークフローをマージしない**。ユーザーの許可とレビューを得ること。
- この方式は準備段階であり、runner未登録・未実行。従来のDocker/合成テスト成功と混同しない。

## 次の確認
1. 専用runnerの有無、Blender/ClamAV実行パス、原本所在を確認
2. 実際のrun ID、各ステップの終了コード、PNG/JSON、SHA256、ClamAVログを検証
3. 原本と独立再現A/B/CのShader to RGB、Noise/Voronoi/Fresnelノード結線を比較
4. 作者素材の再配布はしない。ゲームへの昇格・マージはユーザー承認後
