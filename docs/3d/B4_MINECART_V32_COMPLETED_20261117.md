# 第4層・廃坑トロッコ V32 — 完成承認・Claude引き継ぎ
**状態**: ユーザー完成承認（2026-11-17）／GLB・PNG正式保存はGitHub Actions実行結果を要検証。
**対象**: 第4層、鉱石を積んだ木製トロッコ（既存ゲーム機能には未接続）。

## 完成採用
- 採用バージョン: V32（V31の増量した積荷、より細かい鉱石メッシュ、抑えた変位）。V27/V28の失敗シェル方式は不採用。
- 元の車輪、既存荷台、既存鉱石メッシュは保持。車体の金属補強、軸受、修理板、上縁の不規則な傷、積荷を追加。
- Blender Cycles実レンダー成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43893048261
- Artifact ID: 14239320641 / 2026-11-30頃期限。**Artifactsは一時保存**。
- 元GLBに加えて画像PBR入りのGLBを採用。GLBには9画像が埋め込まれていることを検証。
- 元runソースSHA: `6af57ddb9202eff0f82464de47d4405abeeca6c0`。
- ユーザーの完成判断によりV32を採用。レールとの軌間実測、ゲーム内性能、内部材の二重見えなどは未検証事項として残す。

## 正式保存予定パス（アーカイブActions成功後に存在確認）
- `assets/models/floor4/b4-minecart-v32.glb` — ゲーム用、画像PBRを内包
- `assets/models/floor4/reviews/b4-minecart-v32/front.png`
- `assets/models/floor4/reviews/b4-minecart-v32/side.png`
- `assets/models/floor4/reviews/b4-minecart-v32/angle.png`
- `assets/models/floor4/reviews/b4-minecart-v32/source.blend` — GPT/Blender修正用のみ
- `assets/models/floor4/reviews/b4-minecart-v32/manifest.json` — SHA256、元run、承認記録
- 保存ワークフロー: `.github/workflows/b4-v32-approved-archive.yml`。保存完了はrun成功とGitHub上の実ファイルを確認して初めて確定。

## Claude向け実装データ形式
Claudeは**Blenderを操作しない**。上記 `GLB` と `PNG`、`manifest.json` のみを使用する。
```json
{
  "asset_id": "floor4_minecart_v32",
  "display_name": "第4層 廃坑の鉱石トロッコ",
  "floor": 4,
  "category": "prop",
  "status": "approved",
  "glb": "assets/models/floor4/b4-minecart-v32.glb",
  "preview": {
    "front": "assets/models/floor4/reviews/b4-minecart-v32/front.png",
    "side": "assets/models/floor4/reviews/b4-minecart-v32/side.png",
    "angle": "assets/models/floor4/reviews/b4-minecart-v32/angle.png"
  },
  "manifest": "assets/models/floor4/reviews/b4-minecart-v32/manifest.json",
  "source_run_id": 43893048261,
  "source_sha": "6af57ddb9202eff0f82464de47d4405abeeca6c0",
  "integration_status": "not_yet_integrated"
}
```
### Claude実装前の必須検証
1. GLBとPNGがGitHubに存在し、manifestのハッシュが一致することを確認。
2. Three.js GLTFLoaderで読み込み、スケール・原点・回転・鉱石のめり込み・テクスチャ・ライティング・実機性能を確認。
3. 第4層の既存トロッコを破壊的に置き換えず、参照先切替は別PRで行う。レールとの車輪位置を合わせる。
4. 問題があればGPT/Blenderへ差し戻す。ClaudeはBlend編集・レンダー成功を主張しない。

## 制作・失敗記録
- V26: 最初の安定PBRベース。
- V27: 球状シェルで岩が膨張、不採用。
- V28: 岩面の追加細分シェルで黒い継ぎ目/白抜け、不採用。
- V29–30: 金属軸受と木板補修、傷が直線的で存在感が弱い。
- V31: 岩12個増量。ローポリ感・白い斑点の改善が必要。
- V32: 追加岩の細分を5にし、変位振幅を減少。完成承認。
- 制作PR: #431。参照PR: #423。詳しい比較は `docs/3d/B4_CART_V29_V30_REVIEW_20261116.md`。

## 次の対象
トロッコ完成後は第4層の**レール接続・枕木・分岐・欠損**を別アセットとして扱う。ゲームへの統合は別途レビューする。
