# F6成木：失われたV08/V09 ZIPの代替原本回収と実レンダリング（2026-11-20）

- V08/V09の `f6_tree_v09_pruned_actual_GLBRenders_NOT_APPROVED.zip` 自体はGitHubブランチ・Actions run一覧・会話ファイル検索では確認できなかった。**発見したとは報告しない**。
- **V1原本を回収**: GitHub Actions run [44195613379](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44195613379) artifact `14378657638` (`f6-tree-mature-v1-NOT-APPROVED`) から `tree_mature.blend`, `tree_mature.glb`, 正面/側面/斜め等PNG。
- **V14枝葉バッチGLBを回収**: GitHub Actions [44467151529](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467151529) artifact `14502133565` (`blender53-f6-tree-v14-compat-NOT-APPROVED`) の `tree_mature_v14_leaf_batched_NOT_APPROVED.glb` とPNG。
- **復元試作**: V14の145 scene geometry nodesから8枝関連ノード（`v14_crown_interior` 4 / `v12_upward_fork` 4）を候補として除外した137ノードの独立GLB。幹・13主枝・4葉群バッチは保持。原本SHA256 `314ae3c2e82cc03bce8d729087a3991ba91256480fecf1a3b6901150a31a9466`、候補SHA256 `9de3683afd9e38fdb59a97b3451115a9cd3f86be0843f625322bb90374a7de59`。
- **実描画**: ローカルVTK EGLオフスクリーンで正面・側面・斜め・分岐接写を原本/候補それぞれ900×780 PNGで描画、左右比較JPGを制作。**Blender 5.3による候補の再レンダリング、Three.jsチェックは未実施**。
- **美術判断**: 枝が8ノード減った効果は見た目ではわずか。密集した主分岐や浮いた葉先は残る。**NOT_APPROVED**。この復元候補はV08/V09と別系統のV14派生であり、V08の後継モデルであるとはみなさない。
- **ユーザー向け配布**: 会話添付 `f6_tree_recovery_and_render_NOT_APPROVED.zip` にV1原本、V14派生候補GLB、レンダリングPNG/JPG、候補生成コードとSHA manifest同梱。GitHub Actions Artifactsの期限を注視すること。正式素材フォルダやゲームへ昇格しない。
