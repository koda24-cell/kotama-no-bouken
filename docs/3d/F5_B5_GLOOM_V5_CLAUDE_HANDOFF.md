# Claude引継ぎ：第5層 V13床面岩盤＋V5瘴気

## 状態
- ユーザーが2026-11-15にV5の見た目を承認。**ゲーム内未統合**。
- 保存先: `assets/models/floor5/b5-gloom-v5/`。GLB・実レンダPNG3枚・SHA-256付きmanifestを参照。Gitコミット前なら保存未完了。
- VFXコード: `preview/b5-v13-miasma-vfx.html`。Three.js r160のShaderMaterial、赤い炎14枚、黒紫の霧5面、補助スプライト12枚、赤いPointLight。画像は独立プレビューの実描画でありゲーム内表示ではない。
- 元の岩GLB: Blender Actions run #43607312319 の `b5-gloom-corruption-prototype.glb`。外観承認はこのGLBとV5の組み合わせに対するもの。
- V5検証: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43721355560
- 恒久保存検証: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43722348395

## Claudeがすること
1. `AGENTS.md`、`docs/3d/ASSET_PROMOTION_POLICY.md`、`docs/3d/VFX_TOOL_CATALOG.md`を読む。
2. `manifest.json` のfilesの存在とSHA-256を照合し、reviewsの3枚を確認。GLBがGitに無ければ統合を止める。
3. **Blender不要**。Three.js GLTFLoaderでGLBを読み込み、ゲーム側の座標系に合わせて床として配置。試作ではglTF Y-upをZ-upシーンに合わせるため`gltf.scene.rotation.x=Math.PI/2`を使用。ゲーム本体がY-upなら二重回転しない。
4. `preview/b5-v13-miasma-vfx.html`からVFX部分のみモジュール化。岩盤のBox3境界に応じて煙・炎を配置。レンダー時の色空間、透過、depthWrite、renderOrderを維持。GLBは改造しない。
5. 迷宮1マス内での配置、視界外更新停止、同時VFX数、FPS、透過ソート、セーブ/戦闘への副作用を実機で検証。ゲーム統合は別PRにする。
6. 改善・再レンダが必要ならGPT/Blender側へ戻す。**ClaudeにBlenderの操作を要求しない**。

## 採用基準
- 床面として見下ろす向き。赤い炎が岩の割れ目付近にあり、紫の瘴気が岩の周辺を漂う。
- ゲーム本体への反映は別工程。採用済み素材の原形状・色・VFXを勝手に破壊しない。
