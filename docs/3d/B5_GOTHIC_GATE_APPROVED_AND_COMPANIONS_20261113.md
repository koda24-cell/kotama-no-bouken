# 第5階層：完成したゴシック門と周辺パーツの引き継ぎ

更新日: 2026-11-13

## 完成承認済みの門（ユーザー承認）
- 元ブランチ: `feature/b5-gothic-arch-slab-proportions-20261112`
- 完成時コミット: `d087a785e2e9cb7eb3dec2ea6d43289969e7ba9f`
- 造形ソース: `field/assets/b5-gothic-arch-detail-additions.js`
- GLBとPNGを実際に生成したGitHub Actions run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43370087930
- Artifact ID: `14012656071` / `b5-gothic-arch-before-after`
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/281
- 注意: ユーザーは**この造形を完成と承認**。門本体や30個の瓦礫を後続作業で変更しないこと。
- **Claude向け**: ソースはThree.jsのJavaScript。Blenderを使わず読み込み・配置できる。GLBはレンダリング成果物に含まれるが、GitHub Actions Artifactsは一時保存であり、永続保存と混同しない。
- 永続GLB/PNGのGitへの正式配置は別途実施・確認が必要。保存完了とは報告しない。

## 次の制作：門周囲の独立パーツ
- 新ブランチ: `feature/b5-gate-surrounding-pillars-rubble-20261113`
- ファイル: `field/assets/b5-gate-companion-assets.js`
- API: `createB5GateCompanion(THREE, variant, seed)`
- バリエーション: `standing-pillar`, `broken-pillar`, `fallen-column`, `capital-fragment`, `shaft-fragment`, `rubble-cluster`, `rubble-scatter`
- すべて原点を中心にした独立したThree.js Group。1マス単位でのランダム配置を想定。
- 既存門のメッシュや配置は変更しない。
- この新パーツはコード生成済みだが、GLB化・Blenderレンダリング・品質承認は**未実施**。完成扱いにしない。

## 配置の目安
- `standing-pillar`: 門の左右にまばらに残る柱。
- `broken-pillar`: 欠けた柱の切り株。
- `fallen-column`: 地面に倒れた柱。
- `capital-fragment` / `shaft-fragment`: 柱頭・柱身の落下破片。
- `rubble-cluster`: 柱の根元の瓦礫密集。
- `rubble-scatter`: 隣接マスへの散乱。

## 次の検証
1. 新しい7種をGLBへエクスポートし、正面・側面・斜めをBlenderでレンダリング。
2. 柱の接地、倒壊方向、石材の厚み、門とのサイズ感を確認。
3. 承認済み門のGLB/PNGを正式フォルダへ保存し、差分とPRを検証。
4. `development`へはPRレビュー後に統合し、`main`は触らない。

## 完成承認：直立ゴシック柱（2026-11-14）
- **ステータス：完成・ユーザー承認済み。造形変更は別途依頼がある場合のみ。**
- バリエーション: `standing-pillar`。ほかの6バリエーションは完成扱いしない。
- 確定コミット: `6c2720316eb5aba7d6f2d76ec3736ae9bef62a31`
- 正面・背面・斜め上レンダリング成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43444201112
- Artifact ID: `14047851080` / `b5-standing-gothic-pillar-glb-png`（14日で期限切れの一時保存）
- 完成造形: 48頂点の柱身、8本の縦溝、亀裂、面追加ベベルのある土台・柱頭、中央柱身の長さは従来の1.5倍（1.53→2.295）。
- **Claude向け生成コード:** `field/assets/b5-gate-companion-assets.js` の `createB5GateCompanion(THREE,'standing-pillar',seed)`。Three.jsで直接使えるためBlender不要。
- **Claude向けGLB生成手順:** `npm install --no-save --ignore-scripts --no-package-lock three@0.160.1` → `node tools/b5-render/export-standing-pillar.mjs` → `render-output/b5-standing-gothic-pillar.glb`。
- GitHub正式保存候補: `assets/models/floor5/b5-standing-gothic-pillar.glb` と `assets/models/floor5/reviews/b5-standing-gothic-pillar/` のPNG3枚。
- **作業終了リスト：第5階層／ゴシック建築／直立ゴシック柱：完成。** 他の柱や瓦礫の完成を意味しない。
- ゲーム内配置・軽量化は別作業。現状のランダムマップやゲームの既存機能を変更しない。
