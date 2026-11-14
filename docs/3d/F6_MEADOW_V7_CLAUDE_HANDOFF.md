# 第6層・花園 草原床 V7 完成素材 / Claude 引き継ぎ

## 承認
- ユーザー承認済み（2026-11-14「これでおkとします」）
- 承認対象は V7。V6以前は比較・復元用として保持
- ゲームへの配置は未実施。developmentへのマージはPRレビュー後

## 元データ
- リポジトリ: `koda24-cell/kotama-no-bouken`
- 作業ブランチ: `feature/f6-wind-meadow-floor-20261114`
- PR: https://github.com/koda24-cell/kotama-no-bouken/pull/346
- ソース: `tools/floor6/meadow_floor_v1.py`
- カラー: `tools/floor6/meadow_color_preset.json`
- Blenderレンダリング成功: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43602069517
- Artifact ID: `14117056247`
- ZIP SHA256: `371afe6c8c8ca54eb4198f9d90d4edadad6c0b5303eb225bc6f7153ff59171ae`

## 正式素材の予定パス
- `assets/models/floor6/f6_meadow_floor_v7.glb`
- `assets/models/floor6/reviews/f6_meadow_floor_v7/angle.png`
- `assets/models/floor6/reviews/f6_meadow_floor_v7/front.png`
- `assets/models/floor6/reviews/f6_meadow_floor_v7/side.png`
- `assets/models/floor6/reviews/f6_meadow_floor_v7/top.png`
- `assets/models/floor6/reviews/f6_meadow_floor_v7/manifest.json`

## 仕様
- 1マスの草原床。タイル平面は1×1。隣接配置を想定
- 根元は幅広い葉440枚のレイヤーでまとめ、個別草3,200枚を維持
- 風向き約32度、ばらつき19度、淡い低彩度の緑
- 葉先は明るい黄緑。マテリアルには暗部の色保持設定
- 生成GLBには静止形状を保存。時間変化する風アニメーションは別途検証
- メッシュ・頂点色・マテリアルはGLBに含む。Blender不要でThree.js等から読み込み可能

## Claudeの次の作業
1. 正式GLBと4 PNG、manifestが存在し、SHA256とGLB/PNGヘッダが妥当か確認
2. ランダムマップの1マス床に配置する際は、原点・高さ・隣接境界・GPU負荷を検証
3. 既存の草むら単体V5と本タイルV7を混同しない
4. 既存のマップ・戦闘・セーブ等を変更せず、必要な場合は別PRで実装
5. 完成済み造形を無断で変更しない

## Claudeの実行環境に関する必須注意
ClaudeはBlenderを操作できない。**この引き継ぎはBlenderで再生成する依頼ではない**。Claudeは上記GLBをThree.jsの`GLTFLoader`で読み込み、PNGで造形・色を確認し、manifestのSHA-256とバージョンを検証する。Blender固有の修正・再レンダリングはGPT/Blender Actions担当に依頼する。正式フォルダにGLB/PNGが存在しない間は、生成元Actions Artifactだけを完成データの恒久保存と見なさない。
