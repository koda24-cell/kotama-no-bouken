# 無料VFX素材・技法 共通ライブラリ（GPT / Claude）

更新: 2026-11-15。対象: コタマのぼうけん全階層。**このコミットは情報・導入計画の保存のみ**。素材ZIP/PNGの取得、Three.js動作、Blenderレンダリングを完了した意味ではない。

## CC0素材の候補（配布元・出典）

| 優先 | 配布元 | 内容 | 用途 | 状態 |
| --- | --- | --- | --- | --- |
| A | [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) | PNG 80点・512px・公式CC0 | 火の粉、火花、発光、魔法、溶岩亀裂の光 | 配布元ライセンス確認済み／本体未取得 |
| A | [Kenney Smoke Particles](https://kenney.nl/assets/smoke-particles) | PNG 70点・公式CC0 | 第4層の噴気、第5層の瘴気、第2層の冷気 | 配布元ライセンス確認済み／本体未取得 |
| A | [Brackeys VFX Bundle](https://brackeysgames.itch.io/brackeys-vfx-bundle) | 26MB・粒子/flipbook/spritesheet・公式CC0 | 炎・煙・爆発・魔法 | 配布元ライセンス確認済み／本体未取得 |
| B | [Kenney smoke (OpenGameArt)](https://opengameart.org/content/smoke-particle-assets) | 旧煙素材77 PNG、CC0、13.2MB ZIP | 予備の煙・爆発素材 | 配布ページ確認済み／本体未取得 |
| B | [Kenney VFX GitHub index](https://github.com/GeorgeQLe/assets-vfx-particles) | Kenney由来527ファイルの分類・manifest・LICENSES | ファイル名/タグ検索と原本照合の補助 | 第三者ミラーのため、採用時は公式原本・個別ライセンスとSHA照合必須 |

## 技術とゲームへの適用方針
- Three.js: `THREE.Points` / `Sprite` / `ShaderMaterial`、アルファ付きPNG、加算合成、深度書き込み無効化などを候補とする。**この資料での実装は未実施**。
- 第4層: 溶岩亀裂はEmissiveシェーダー、火の粉は軽量スプライト、噴気は低枚数flipbook。発光を強くしすぎず、岩肌を視認可能にする。
- 第2層: 同じ煙テクスチャを青白くして冷気。第5層: 紫黒の瘴気と非同期の明滅。戦闘: 魔法、斬撃、命中エフェクト。
- 1マス単位の迷宮描画で、視界外の粒子更新を停止し、同時粒子数を制限する。ブラウザ実機でFPS・GPU負荷を確認する。
- 既存の `docs/3d/VFX_TOOL_CATALOG.md` に記録されたB5瘴気V6のKenney Smoke実使用は**別の既存検証**。今回の素材新規保存・新規動作検証とは区別する。

## 取り込み時の必須手順
1. 公式配布ページから原本取得。配布物に同梱のライセンスも確認。
2. 原本のSHA-256、取得日、元URL、原作者、元パック名をmanifestに記録。重複素材は共通ライブラリに1回だけ保存。
3. `assets/vfx/shared/<pack>/` に選別済みPNGとLICENSE/manifestを保存。重い原本ZIPは必要性・Git容量を確認して別管理。
4. Three.jsで実描画し、ゲーム側に統合する前に画面キャプチャと動作ログを残す。
5. GPTはBlender・プレビュー、ClaudeはPNGとGLB・manifestを用いたWeb実装。承認前のゲーム本体への統合は禁止。

## 情報共有先
- `AGENTS.md`、`docs/3d/TOOLING_AUTO_SHARE_POLICY.md`、`docs/3d/SHARED_TOOLING_CATALOG.md`、`docs/3d/VFX_TOOL_CATALOG.md`
- 今後の更新は「調査→取得→ライセンス→実描画→承認」を別々に記録する。
