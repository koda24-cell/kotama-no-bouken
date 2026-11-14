# 共通VFX・遠景・煙ツールカタログ（GPT / Claude）

最終整理: 2026-11-14。**情報のみをdevelopmentに統合する文書**。PR #354 の未完成ゲームコード・外部素材・レンダリング結果は含めない。

## ツール・技法・素材

| ツール／資料 | 出典 | 用途 | ライセンス／検証 |
|---|---|---|---|
| Kenney Particle Pack (Smoke) | https://kenney.nl/assets/particle-pack / https://github.com/Calinou/kenney-particle-pack | 煙PNGを複数枚重ね、半透明の瘴気・霧・魔法エフェクトを作る | CC0版のLICENSE.txtを同梱。B5瘴気V6のBlenderレビューで実使用 |
| Godot Shaders 2D Fog Overlay | https://godotshaders.com/shader/2d-fog-overlay/ | ノイズを時間変化させる2D霧の参考技法 | **個別の配布条件を要再確認**。コードをそのままコピーしない。Three.jsへの直接移植は未検証 |
| Godot Volumetric Fog / Fog Shader | https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/fog_shader.html | 密度・距離減衰・立体霧の設計参考 | 本物の体積霧は未導入。軽量な2Dノイズ霧を先に採用 |
| Three.js ShaderMaterial | https://threejs.org/docs/#api/en/materials/ShaderMaterial | 低負荷の多層霧、時間・色・明滅を制御 | PR #354でChromiumによる初期版の実描画テスト成功 |
| Playwright + Chromium | https://playwright.dev/ | WebGLの画面撮影、異なる時刻の画像比較、JSエラー検知 | PR #354のrun #43602384355 成功。Ubuntu 26.04互換問題をDocker版Playwrightで回避 |
| ambientCG 建築用ファサード／Emission | https://ambientcg.com/view?id=Facade020C / https://ambientcg.com/view?id=Facade010 / https://ambientcg.com/view?id=Facade009 | 建物の輪郭を描かず、実際の発光マップから窓の明かりだけを抽出 | ambientCG CC0。**写真ではなく建築用テクスチャ**。実データの取得・抽出成功はrunログと出力ファイルで確認する |
| Blender Geometry Nodes / Bump / Displacement | https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/geometry/operations/set_position.html / https://docs.blender.org/manual/en/latest/render/shader_nodes/vector/bump.html | 岩・膜・瘴気表面の実形状と微細な凹凸を分けて調整 | 技法資料。各アドオン導入・モデル適用は未検証 |

## 第5階層の遠景制作で共有する仕様

- **窓**：ビルの輪郭や外壁は見せない。暗闇に不規則な小さな窓の明かりだけを浮かべる。建築Emissionテクスチャの明部をマスクとして抽出し、黒背景で表示。窓単位のランダムな明滅と、色・明度差を付ける。
- **霧**：黒紫・赤紫の多層ノイズを異なる速度で流し、形状を揺らがせる。時折ランダムに短い紫の閃光を発生させる。点滅を一斉同期させない。
- **ゲーム側**：4マス程度先から遠景へ移る案。マップの壁遮蔽・視界判定を優先し、壁越しに透過させない。カメラ回転に対応する背景表現を検討。
- **負荷**：実際のボリューム霧より、ShaderMaterial + PNGスプライトを優先。GPU性能とモバイルのフレームレートを確認。
- **実装分離**：背景試作は `field/b5-distant-fog-background.js`、プレビューは `preview/b5-distant-fog-background.html`（PR #354）。ゲーム本体へは未統合。
- **検証**：PR #354 の初期レンダリング成功 https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43602384355 。後続の実素材取得や明滅V2は別runの結果を必ず確認し、成功した部分だけを記録する。

## 制作・引き継ぎの原則

1. 新しい制作前に `AGENTS.md`、`docs/3d/BLENDER_DOCKER_HANDOFF.md`、`docs/3d/ASSET_PROMOTION_POLICY.md` を確認。
2. ClaudeはBlenderを操作できない。GPT/BlenderワークフローはGLB＋正面・側面・斜め上PNG＋manifest（ハッシュ、元コミット、run ID、承認状態）を用意。ClaudeはPNG・GLBを確認してThree.jsへ統合。
3. アドオン／素材の**調査済み**、**取得済み**、**動作確認済み**、**完成承認済み**を混同しない。
4. 外部素材は原本、ライセンス、出典、SHA-256を残す。GitHub Actions Artifactは一時保存で、正式採用後はGitHubの素材フォルダへコミット。
5. 他階層（氷の霧、樹海の靄、溶岩の熱気、魔法エフェクト）でも色・濃度・動きの差し替えを検討するが、不要な機能は使わない。
6. 未承認のPR #354のコードやPNGを、この文書のマージに巻き込まない。

## 関連
- `docs/3d/B5_GLOOM_TOOLS_AND_LESSONS.md`
- `docs/3d/floor5-gloom/CLAUDE_HANDOFF.md`（PR #331）
- https://github.com/koda24-cell/kotama-no-bouken/pull/354

## 2026-11-15 共通無料VFX素材

[CC0 VFX素材ライブラリ](VFX_CC0_ASSET_LIBRARY_20261115.md) を参照。Kenney Particle/Smoke、Brackeys Bundle、旧OpenGameArt、第三者GitHub索引を出典・ライセンス・導入状況別に整理。**新規のPNG本体取得・ゲーム導入は未検証**。

## 2026-11-15 ユーザー選定の瘴気・煙参考画像と全階層共通化

ユーザーが第5層V13岩盤の次工程として、**流れる暗紫色の霧**と**連続フレームの煙**を有望と判断。次の2画像を**ビジュアル参考資料**として共有する（素材本体の取得・ライセンス確認・ゲーム採用を意味しない）。

1. **暗い霧・闇の雰囲気** — [Easy-Peasy.AI掲載の画像（ユーザー提供）](https://images.openai.com/static-rsc-4/A49FY9kfqCgjh5aRalCt8phnrMsyxsIt-Nez2JuYuQ9lXyaY37kWkZv56D_V-1NGnhNEXv7t0QlNriMa5_md_9XD9ZJ6N4vziUxhTzB5fCLdB42dW3cGTjl87aGw1nh4oGhwUd9P5PsLdJKuA-DKXt1Nnd4N1Mv-t-tzU3AZNNc?purpose=inline)。参考ポイント：低彩度、濃淡の大きな塊、暗部を残す奥行き。**画像の再利用権限は未確認**。制作では独自ノイズのThree.js ShaderMaterialを用い、画像そのものをテクスチャに流用しない。
2. **煙のフレームアニメーション** — [PNGkey掲載 Smoke30frames / Poof Smoke Spritesheet（ユーザー提供）](https://images.openai.com/static-rsc-4/JndogMtZnDgh3evLpZyizAozwXR2WI5K34XvRlQ6RedIyBwTrLoZQmP5MHCr7eS44OKR2drVvWVXJPbmR3PZO845df8C4AVDMF68XoLkS5IX6BCj0jQ-d69O-Zws293db8lYrDVMMBM5dwWEbhxbFb9uO0VsOTHiV4bhPU6ZC18?purpose=inline)。参考ポイント：コマ送りの煙の膨張・拡散・フェード。**PNGkeyの画像はCC0と確認できていない**ためゲームに取り込まない。実用には公式CC0のKenney Smoke / Brackeys VFX Bundleから適切な素材を選ぶ。

### 共通VFXプリセットの設計案（未実装）

| プリセット | 主な用途 | 方式 |
| --- | --- | --- |
| `dark-miasma` | 5F瘴気・敵の毒霧 | ノイズを2〜3層流すShaderMaterial＋低密度の煙スプライト、紫発光を非同期に明滅 |
| `cold-mist` | 2F水源・氷岸 | 同じシェーダーの青白色版、流速を遅くし地面に低く漂わせる |
| `forest-haze` | 1F樹海・6F花園 | 薄い白緑の霧、遮蔽が少ない箇所だけ表示 |
| `volcanic-steam` | 4F溶岩洞 | 灰色の噴気と少量の発光粒子、上昇速度を速める |
| `impact-smoke` | 戦闘・魔法・破壊演出 | ライセンス確認済みの煙flipbook、短時間で消滅 |

### 制作・実装分離
- 岩の**V13 GLBは変更せず**、瘴気は独立したThree.js VFXコンポーネントとして重ねる。
- プリセット化するのは `color` / `opacity` / `speed` / `scale` / `seed` / `flashRate` / `particleBudget`。他階層では設定だけ差し替える。
- 迷宮の1マス単位で位置・遮蔽を管理し、視界外は更新停止。モバイルでは煙の枚数を減らす。
- 検証順序は、**資料共有 → CC0原本・LICENSE・SHA確認 → 独立プレビューで動作・FPS確認 → 承認 → ゲーム統合**。現時点で参考画像2点のローカル保存・素材採用・V13との合成レンダリングは未実施。
- GPT/Claude共通入口: `AGENTS.md`、本書、`VFX_CC0_ASSET_LIBRARY_20261115.md`。既存PR #354の試作コードを優先的に調査し、同機能を重複実装しない。
