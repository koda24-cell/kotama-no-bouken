# GuardHei / William Xie 技術ブログ調査台帳（2026-11-19）

目的: 『コタマのぼうけん』のBlender/Three.js素材制作・VFX・描画最適化に再利用する。元記事の再配布ではなく、日本語の要約・適用候補・検証課題のみを記録。ブログのフッターは CC BY-NC-SA 4.0 を掲示しているため、記事のコードや画像をゲームへ無断転載しない。

## サイトと記事一覧（サイトのトップページで確認した10件）
1. [PBR Rendering in Unity SRP](https://guardhei.github.io/2022/03/unity-srp-pbr/) — PBR/BRDF、粗さ、反射、Clear Coat、異方性、布。本文確認済み。
2. [Introduction of SRP](https://guardhei.github.io/2020/02/srp-basics/) — 15段階のSRP描画パス。本文確認済み（概要中心）。
3. [SRP项目当前进度](https://guardhei.github.io/2019/11/srp-progress-0/) — Forward+、thin G-buffer、tile-based light culling、dither transparency。本文確認済み。
4. [Several Graphic Discoveries in Breath of the Wild](https://guardhei.github.io/2019/10/breath-of-the-wild-graphics-discoveries/) — Rim Light、SSR、発光物体の反射を利用した疑似的な面光源。本文確認済み。ただし著者の観察と推論であり任天堂のソース確認ではない。記事は Left Unfinished と明記。
5. Portfolio — 著者紹介。技術採用対象外、トップページで存在確認。
6. Unity中的音效池 — 音源プール。トップページの概要のみ確認、本文未精査。
7. [Unity中時間尺度管理](https://guardhei.github.io/2018/09/time-scale-managing-in-unity/) — 複数の時間スケール要求の競合。本文取得済み、詳細の実装検証は未着手。
8. [在Unity中实现场景中动态血迹效果](https://guardhei.github.io/2018/08/implement-blood-decal-in-unity/) — 粒子衝突座標・法線へのQuadデカール配置、GPU instancing、リングバッファ。本文確認済み。
9. 48小时，一款游戏 — ゲームジャム体験。トップページ概要のみ確認。
10. [Unity优化——渲染与画面（一）](https://guardhei.github.io/2018/07/unity-optimization-one/) — GPU instancingの過信を避ける、入力属性を絞る、アンチエイリアスとBloomの比較、CPU/GPU負荷測定。本文確認済み。記事のUnity固有の速度序列をThree.jsへそのまま適用しない。

## 実装に使う候補（未実装・未検証）
| 技術 | ゲーム内候補 | 最初の比較試験 | 注意 |
|---|---|---|---|
| Rim Light | 鉱石/魔王オーラ/キャラ | off/on、輪郭白飛び比較 | 2019記事の推測を事実化しない |
| 高輝度反射・SSR | 結晶の周辺岩/水/金属 | 点光源 vs 反射表現 | Three.jsの実装/負荷を要検証 |
| PBR粗さとGGX | 結晶/金属/岩 | Roughness段階別レンダリング | GLBへのNode再現性に注意 |
| IBL/環境反射 | 6階層の共通マテリアル | HDR環境マップ有無 | 色管理・性能確認 |
| Clear Coat | 濡れた石/鉱石 | 強度別比較 | 天然鉱石で過剰な艶は避ける |
| 異方性反射 | 研磨金属/繊維 | 通常反射と比較 | 必要な素材のみ |
| Dither transparency | 草葉/半透明 | 通常alphaと比較 | パターンの穴、ちらつき注意 |
| Tile light culling | 発光鉱石が多数あるシーン | GPU時間計測後に検討 | 独自レンダラ実装は先送り |
| デカール | 岩の濡れ跡/汚れ/魔法陣 | 地形追従、z-fighting検証 | 原文は血痕の例、ゲーム用途は応用案 |
| GPU instancing | 草/石/小粒子 | draw calls・GPU時間比較 | 記事は旧Unity、Three.jsで再検証 |
| 時間スケール調停 | 戦闘演出/スローモーション | 複数要求の競合テスト | ゲーム仕様への影響を避ける |

## 結晶VFXの優先実験
1. V9の既存モデル・色6種を保持。
2. 結晶のRoughnessと環境反射を段階比較。細い発光線は使わない。
3. 点光源の岩照り返しと高輝度反射（または低負荷の代替）を比較。
4. 選択的Bloomの閾値と半径を調整し、白飛び・色潰れ・GPU時間を評価。
5. 正面・側面・斜めPNGとGLBの実物を確認し、ユーザー承認までは正式保存しない。

## 検証状況
- 公開記事の内容確認と適用候補の整理: 実施。
- 著者の全記事の全文精査・全リンク先の検証: 未完了。
- Blender/Three.jsへの技術実装・ベンチマーク: 未実施。
- 著者のGitHubコードの再利用・ライセンス確認: 未実施。
