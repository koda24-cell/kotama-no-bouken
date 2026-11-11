# B5 ゴシック天井 5モデル並列制作・レンダリング手順

## 構成
- モデル定義: `field/assets/b5-modular-vault-kit.js`
- GLB書き出し: `tools/b5-vault-render/export.mjs`
- Blender撮影: `tools/b5-vault-render/render.py`
- Actions: `.github/workflows/b5-parallel-vault-render.yml`
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/255
- 初回成功確認用run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43067290553

## 対象5モデル
| ID | 概要 |
|---|---|
| basic-vault | 通常通路用の基本アーチ天井 |
| collapsed-vault | 一部が欠損しリブが露出する天井 |
| royal-vault | 魔王の間用の石造彫刻・追加リブ |
| vault-support | アーチを支えるゴシック柱 |
| fallen-vault-rubble | 地面に落下した石梁と瓦礫 |

## 手順
1. 独立ブランチのモデルを追加造形してpush。
2. GitHub Actions `B5 Parallel Vault Model Render` を開く。
3. matrix 5ジョブが独立実行され、各ジョブがGLB1個＋PNG3枚を生成する。
4. FRONT / BACK / TOP-OBLIQUE のグレーモデルを確認する。
5. 造形・破断面・地面接触・他モデルとの接続・負荷を評価する。
6. ユーザー承認後、正式保存候補の別PRで `assets/models/floor5/` にGLBとレビューPNGを保存する。ゲーム組込は別途。

## Artifacts（期限14日）
各ジョブの出力名は `b5-vault-<ID>-glb-png`。
展開後は `<ID>.glb`, `<ID>-front.png`, `<ID>-back.png`, `<ID>-top-oblique.png`。
GLB・PNGの基本形式とファイルサイズを各ジョブで検証する。

## 注意
- 本制作PRはプレビューと独立モジュールのみで、ゲーム本体への配置・衝突判定には未統合。
- Artifactsは一時領域。承認前のゲーム統合と独断での正式素材昇格は禁止。
- 各ジョブは最大5並列設定。ただしGitHubランナーの実際の空き状況に依存。
- 実モデルのFRONT/BACK/TOP-OBLIQUEのBlender撮影は、画像生成AIによる概念図と区別する。
- BlenderはZ-up、Three.jsはY-up。インポート後のバウンディングボックスからカメラと床面を決定。
- 既存のPR #254のゴシック門とは独立。先にマージせず差分の整合性を確認する。
