# 第2層 石造遺跡・橋周辺 V4 完成／Claude引き継ぎ

## 承認・保存
- ユーザー承認: 2026-11-15 「okとします。次に行こう」
- Blender成功 run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43721313749
- 永続保存成功 run: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43723453333
- 作業PR: https://github.com/koda24-cell/kotama-no-bouken/pull/374 （development向け、未マージ）
- 保存先: `assets/3d/dungeons/b2_water_source/models/stone_ruins_v4/`
- **完成の意味:** 3D造形のユーザー承認と作業ブランチへのGit保存。ゲーム実装・development統合は未完了。

## 完成素材一覧
| ファイル | 内容 |
| --- | --- |
| broken_parapet.glb | 不揃いな二段基礎＋破損した石積み欄干。V4で段違いの目地、欠落部、落石を追加 |
| fallen_pillar.glb | 倒れた細長い石柱＋柱頭・周辺瓦礫 |
| embedded_spire.glb | 瓦礫に埋もれた直立石柱 |
| rubble_ice_scatter.glb | **実体は石片・瓦礫のみ**。旧命名との互換性で ice を含むが、氷の意図はない |

各GLBの `reviews/<name>_front.png`、`_side.png`、`_angle.png` を参照。
`SHA256SUMS.txt` にGLB/PNGのチェックサム。元橋V04・V1〜V3は保持。

## Claudeが編集できる形式と範囲
- **ゲーム側の配置・スケール・回転・色調整:** GLBを Three.js の `GLTFLoader` で読み込み、複製・配置・材質変更を行える。Blender不要。
- **元の形状を再造形:** 編集可能な Blender Python ソース `tools/b2-render/build-stone-ruins-v4.py` をテキスト編集し、`.github/workflows/b2-stone-ruins-v4-render.yml` でGPT/Blender側に再レンダリングを依頼する。ClaudeはBlenderを直接実行しない。
- **調整値の共有:** `claude_edit_config.json` に素材のGLBパスと配置・色調整の初期値を保存。実際のゲーム座標系・1マスの寸法はゲームコードで確認し、値を決める。
- **禁止:** 旧GLBの上書き、承認済み形状の無断変更、氷結晶の再追加、未確認のゲーム統合完了報告。
- **注意:** GLBは交換形式であり、Blenderの編集履歴・モディファイアを保持するネイティブ形式ではない。形状修正の正本はPythonソース。

## 次工程
1. ClaudeがPNGとGLBを確認し、ゲーム側の座標・マス接続・負荷を検証。
2. 承認済み素材をdevelopmentへ統合する際はPR #374の依存PR #323を確認し、差分をレビュー。
3. 次の造形候補: 崩れた石造アーチ／壁接続パーツ。既存橋と石材の大きさ・色を合わせ、単体GLB＋3方向PNGでレビュー。
4. 砂埃・漂う塵・薄い霧の動的VFXは未実装。VFXと静的石造形状を別管理。
