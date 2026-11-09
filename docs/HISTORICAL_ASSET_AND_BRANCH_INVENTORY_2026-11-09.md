# 過去制作データの整理台帳（2026-11-09）

対象: **2026-11-08以前に制作された履歴・資産を優先**。現在の `development` を基準に確認。ファイルやブランチを機械的に削除しない。

## 保存・参照先の分類

| 分類 | 場所 | 方針 |
| --- | --- | --- |
| 現行の共同開発ルール | `AI_DEVELOPMENT_RULES.md`, `AI_HANDOFF.md` | 常用。削除しない |
| 現行ゲームコード | `index.html`, `script.js`, `css/`, `data/`, `field/` 等 | 常用。実行時の参照調査なしに移動・削除しない |
| 素材と権利表記 | `assets/`, `ASSETS_CREDITS.md` | 保存。未使用に見えても素材・クレジットは保持 |
| 制作履歴・旧仕様 | `docs/world-tree-recreation/`, `docs/field-and-story/`, `docs/battle-visual-refresh/` | 履歴として保存。現行仕様より優先しない |
| 参考資料 | `references/` | 原典・利用条件の確認に必要。保存 |
| テスト・再現 | `tools/`, `.github/workflows/` | 回帰防止に必要。削除しない |
| レビュー記録 | `docs/reviews/` | 履歴として保存。日付・PRで追跡 |

## 旧ブランチの判定

`feature/ai-claude-wt-loot-save` と `feature/ai-claude-wt-labyrinth-foe` は後継の v2 ブランチが存在するが、`development` との比較では **diverged**（旧ブランチ独自コミットあり）。同様に `feature/gpt-world-tree-cartography-ui`, `feature/ai-gpt-skill-upgrade-confirm`, `feature/ai-gpt-field-visual`, `feature/ai-claude-wt-labyrinth-foe-v2` も diverged。**未取り込み差分の確認なしに削除しない。**

過去の閉鎖PRでも「closed」は「merged」と同義ではない。未マージの旧PR・ブランチは保留。

## 大容量ファイル・アーカイブ

`assets/floor4_Part1_Models.zip`（約16.4MB）、`assets/floor4_Part2_Textures.zip`（約13.9MB）、`assets/3d/dungeons/b2_water_source/models/floor2-water-source-quality-v3.zip`（約0.1MB）はアーカイブ形式。展開済み素材との一致・ゲーム実行時参照・制作元データの有無を未検証のため保持。

**注意:** Gitの通常削除だけでは過去コミット中の大容量データは消えない。履歴書き換えは共同開発のブランチ・PRを壊し得るため、実施しない。

## 今後の整理ルール

1. 実行中のゲームと他AIの作業を優先し、`main` は変更しない。
2. 古い資料は削除せず、この台帳から分類して参照する。仕様の優先順位は現行実装・現行ルール・最新承認仕様・旧資料の順。
3. 削除候補は「完全に同一内容」「現行コードから未参照」「未取り込みコミットなし」「他の作業ブランチが利用していない」を確認してから個別に判断する。
4. 素材・音源・クレジット・セーブ互換に関係するものは、確認なしに削除・改名しない。

## 今回の作業結果

過去データの保管場所と現行/履歴の役割を整理。独自コミットを持つ旧ブランチや、使用状況が不明な素材を不用意に削除しない方針とした。**安全に不要と断定できるファイルは現段階では未特定**。
