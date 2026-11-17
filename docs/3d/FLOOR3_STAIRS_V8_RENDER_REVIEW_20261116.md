# 第3層・崩壊階段 V6→V8 Blender実レンダリング品質レビュー

- レビュー日: 2026-11-16 JST
- 対象: 第3層「遺跡都市」、階段タイル 2m×2m、PR #376
- 状態: **V8が最新の未承認制作候補（NOT_APPROVED）**。GLB正式保存なし、ゲーム実装なし。従来版は消さない。
- 参照する世界観設計: docs/3d/FLOOR3_WORLDCLASS_ENVIRONMENT_ART_BIBLE_20261116.md（development）
- 役割: GPT＝アートディレクション／Blender Python造形／3方向目視QA。GitHub Actions＝実レンダリング／形式検査。Claude＝承認後のGLB/PNG/manifestを使うゲーム統合のみ。

## 実行の証拠・成果物
| 版 | Blender成功run | 品質・実体検査 | Artifacts |
|---|---|---|---|
| V5 基準 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43727085752 | 実PNG9・GLB3 / レビュー済み | floor3-irregular-stair-v5 |
| V6 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43856807521 | 全ステップsuccess、GLB3・PNG9・Blend3・Normal/manifest検査success | 14222160493 / floor3-irregular-stair-v6 |
| V7 階段のみ | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43858189587 | success、GLB1・PNG3・Blend1・manifest検査success | 14221502403 / floor3-stairs-v7-review |
| V8 階段のみ | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43858942490 | success、GLB1・PNG3・Blend1・manifest検査success | 14221847568 / floor3-stairs-v8-review |

Artifactsは期限付き一時保存。全GLB/PNGがGitHubに正式コミットされたと誤認しない。
Blenderの画像は実際にZIP取得・正面/側面/斜めを目視確認済み。ダウンロード済みローカル合成比較シートはチャットに提示済み（Gitに未保存）。

## アート評価
### V6
- 初期版よりも手すり支柱は踏み面に近づき、Normal MapがglTFに入ることを構造検査できた。
- 問題: 薄い踏み板を並べただけの印象、支えが細く物理構造が弱い、コンクリート面が過度に均一。
### V7
- 2本の大きなコンクリート支持梁を追加し、荷重を支える構造を成立させる方向に改善。
- 踏み板の大きな角欠損3箇所、埋込鉄筋端、折れた左手すりを追加。
- 問題: 支持梁が新品の直線角材に見える、切欠き/破断の層が不足。
### V8
- 両側支持梁に不規則な大きな欠け（実Boolean除去）を追加。支持構造の連続性は残した。
- 2箇所の踏み板に実際の凹型亀裂。構造が自然に古びた方向へ改善。
- **視覚的課題**: 表面のコンクリートが比較的均一な灰色、雨筋/錆汁/酸化やコールドジョイントが弱い。支持梁の破損位置と鉄筋露出がまだ因果関係として不足。階段が周囲の地形と接する場面・視点から未検証。
- **判定: 完成ではない / NOT_APPROVED**。V8はV7より構造劣化が改善したが、世界基準の完成には材質・植生・接続検査が必要。

## その次の改善（V9案。実行は未着手）
1. 既存V8を原本として保持。階段のみ制作する。上/下の既存高架・地形を配置した接合レンダーを追加し、手すりと梁の浮きを評価。
2. 支持梁と踏み板の破断面に鉄筋の断面を2–4本配置し、石材破断部にだけ錆汁を沿わせる。ランダムな点状の粒をまかない。
3. GLBへ確実に埋め込まれたPBR BaseColor/Normal/Roughnessを、公式CC0の実テクスチャ（取得・ハッシュ・利用条件確認後）で改善。Blender内Noise/Bumpだけの差分をGLB材質向上と誤認しない。
4. 中立光/ゲーム内視点で再レンダーし、コンクリートが白飛び/黒つぶれ/プラスチック質感にならないか目視。
5. 寸法と接合パターン・透視・裏面・マテリアルを確認。完成候補はユーザーが実画像を承認してから正式フォルダへ別PRで保存。

## 制作・QAルール
- one-asset-at-a-time。V8成果物は stairs のみ。ramp/landingはV6のまま保持。
- V6/V7のPR更新での重複実行は解除して、各旧版の明示的なコード/Workflow pushによる再実行経路を残した。最新V8はPR同期にも対応。
- 造形/形式検査の自動合格は人間による美術承認を意味しない。
- 全版を比較可能なGLB/PNG/Blendへ隔離し、development/mainのゲームファイルには未統合。
