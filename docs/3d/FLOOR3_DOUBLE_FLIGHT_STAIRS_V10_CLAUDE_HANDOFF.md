# Claude向け正式引き継ぎ — 第3層 二段折り返し階段 V10

**状態:** ユーザー承認済・正式素材Git保存済。ただし**ゲーム内実装/動作は未検証**。

## Claudeが直接利用するもの
- **GLB**: `assets/models/floor3/double_flight/stairs_v10.glb`
- **正面/側面/斜め/接写PNG**: `assets/models/floor3/double_flight/reviews/stairs_v10/{front,side,angle,detail}.png`
- **機械可読JSON**: `assets/models/floor3/double_flight/stairs_v10.manifest.json`
- **テクスチャ原本とライセンス・取得元ハッシュ**: `assets/models/floor3/double_flight/textures/sources.json`、同フォルダ内の6 JPEG
- **GPT/Blender用原本（Claudeは操作不要）**: `assets/models/floor3/double_flight/sources/stairs_v10.blend`
- **再生成コード**: `tools/floor3/double_flight/build_v10.py`（V1～V9への依存、`fetch_pbr_v4.py`）
- **Blenderで成功した元run**: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44035057067

## 内容・素材仕様
- 第3層の廃墟都市用・大型の二段折り返し階段。既存2m×2m階段 `assets/models/floor3/ruined_connector/stairs_v8.glb` とは別アセット。
- コンクリート柱、支持梁、厚い踏み板、踊り場、錆びた鉄手すり、苔・雨垂れの写真PBR。
- Poly Haven CC0 `chipped_concrete` / `concrete_moss` のDiffuse/Normal/Roughnessを使って生成。**GLBに画像を内包しているため、ゲーム実行時の外部テクスチャ取得は不要**。
- manifestの `approval.approved` はtrue、`status` は `USER_APPROVED_PENDING_GAME_INTEGRATION`。SHA-256を確認して利用する。

## Claudeの工程（Blenderは使用しない）
1. manifest、GLB、レンダー画像4枚の存在・ハッシュ・承認を確認。
2. Three.js `GLTFLoader` でGLBを**実際のブラウザ環境に読み込み**、原点/バウンディングボックス/高さ/入口・出口の方向を数値検証。既存の第3層高架橋と階段、1マス移動の仕様に対し接続方法を設計。
3. 通路の段差と歩行可能判定、足場、手すりの衝突範囲、FOEとカメラの視界、描画負荷を確認。既存のゲーム挙動・戦闘・セーブ互換を守る。
4. 色空間・Normal/Roughness・UV・カリング・Three.jsライト設定を実表示で評価し、添付のPNGと比較する。
5. ゲーム組み込みは**別のfeatureブランチからdevelopment向けPR**としてレビュー。既存ランタイムに直接一括反映しない。mainは触れない。
6. 造形・レンダリングの修正はGPTへ戻す。ClaudeはGLB/PNG/manifestの消費とゲーム接続担当。

## 未検証・境界
- これは美術的な完成承認であり、ゲームプレイの階段機能の動作保証ではない。
- スロープPR #440は別の未完成制作。こちらの承認・統合に巻き込まない。
- 元のモデル制作PR #469は比較用に維持し、**丸ごと統合しない**。
- 問題があれば完成モデルは保持し、別PRで修正・検証する。
