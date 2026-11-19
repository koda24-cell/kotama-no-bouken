# 第2層 木製ハブ V01 — 実Blenderレンダリング検証

更新: 2026-11-19 JST / 状態: 技術検証成功、ユーザー美術承認待ち、NOT_APPROVED

- 設計: `docs/3d/B2_WATERWHEEL_SINGLE_HUB_V01_DESIGN.md`
- Workflow: [GitHub Actions run #44442920429](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44442920429) → **completed/success**, 全ステップ成功。
- Artifact ID: **14492890116**, 名称 `b2-waterwheel-single-wooden-hub-v01`、保持期限 2026-12-03 02:17 UTC (JST 11:17)。一時保存。
- 元材質V11 BLEND SHA: `addae90dd199b9f6d0417c70f5152a32bd504e83e2deffa8e0965a0fdf5e2c67`。Actionsで照合成功。
- モデル: 回転軸X、実中心穴半径.303m、外周R=.615m、全長.36m、差し込み座14、1つのGLB mesh、1452頂点/1273ポリゴン（Blender manifest値）。独立して制作した1部品でゲーム本体は変更なし。
- GLB: 1,533,560 bytes / one mesh / two materials / four embedded images。4枚のPNG、編集用BLEND、manifest。
- **実ファイル検証**: Action検証成功に加え、ZIP実ダウンロード後、manifest対象の全6ファイルのbytes・SHA256照合成功。GLB内1 mesh・4 embedded imagesも確認。
- **4方向実目視**: 正面・背面の円環木胴と貫通穴、側面と斜めで実形状の14差し込み穴が明瞭。V11からの木材写真の褐色・木目は維持。
- 美術判断: 古い水車の木材としては**新品の整った輪**に見える。14穴が均等すぎる、差し込み口の切削摩耗と欠けが少ない、表面がなめらか。これは技術合格であり外観最終合格ではない。
- 未実施: スポークV02を含む実組立・孔のサイズ干渉検査、外輪とハブの全体バランス、共通GLB Performance AuditのActions実行、ゲーム動作、正式GitHub素材保存。
- PR #531はDraft、未承認素材のゲーム統合・promotion・development/mainマージはしない。
