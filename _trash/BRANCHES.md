# 不要と判定した旧ブランチ（2026-11-09）

ユーザーの判断により、以下6件を **今後マージしない旧制作履歴** として記録します。ブランチの実削除とは別の台帳です。

| 旧ブランチ | 最終コミット SHA | 理由・後継 |
| --- | --- | --- |
| `feature/ai-claude-wt-loot-save` | `ef595b214bf548f47d7aab27dcb7df26f561ed44` | 宝箱・採集・セーブ形式。後継PR #100 |
| `feature/ai-claude-wt-labyrinth-foe` | `7a029d0d8538299409ccaf88d04a8dd643e87f9d` | 迷宮移動・FOE。後継PR #99 |
| `feature/gpt-world-tree-cartography-ui` | `a626c28e2175676efc0812e8b336191bddefe5fb` | 地図UI。後継PR #98 |
| `feature/ai-gpt-skill-upgrade-confirm` | `2fe6bfc2a60ed23a3c3b223eaa005db1b46257b5` | スキル強化確認。後継PR #107 |
| `feature/ai-gpt-field-visual` | `0a1b1d64f4a69456efd6d9cfbace26501a057915` | 旧2Dフィールド素材・演出。現行3D探索には採用しない |
| `feature/ai-claude-wt-labyrinth-foe-v2` | `61b3829484a1b31efa526037a1818a32ded55f3b` | PR #99マージ済み。再マージ不要 |

**注意:** 旧ブランチには現行 `development` に存在しない独自コミットがあるため、削除前にこのSHAを保管しています。GitHubのブランチ削除操作はこの台帳では実施されません。

## 復元

GitHubのコミットURL `https://github.com/koda24-cell/kotama-no-bouken/commit/<SHA>` から対象を確認できます。Gitオブジェクトが保持されている間はSHAを基にブランチを再作成できますが、ブランチ削除後の長期保持は保証されません。
