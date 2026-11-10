# 第5階層：魔王の間・大聖堂造形セット

基準：`docs/B5_ART_DIRECTION.md`（PR #195、未統合）。
本セットは**魔王の間専用**。通常迷宮（奈落・機械文明戦争跡）には無条件に配置しない。

## 追加素材
`field/assets/b5-throne-props.js`
- ruinedPillar：巨大な折れ柱、崩落石片
- hangingBanner：長い裂けた旗
- grandChandelier：二重輪の大型シャンデリアと吊り鎖
- fracturedAltar：崩壊した祭壇
- gothicArch：高いゴシック風アーチと崩れた柱
- candleSanctuary：36本の燭台群
- brokenStair：断裂した階段と散乱する段石
- shatteredRoseWindow：欠けた円窓と破片

## 呼び出し例
```js
import {createB5ThroneProp} from './assets/b5-throne-props.js';
const asset=createB5ThroneProp(THREE,'grandChandelier',{seed:505,scale:1.5});
g.world.add(asset.group);
// エリア離脱時
asset.dispose();
```
本モジュールは生成して返すのみで、配置・ゲーム状態変更はしない。形状・密度・誇張を優先し、テクスチャとライティングはClaudeに委ねる。

## 検証・残課題
- 現段階はThree.jsのプリミティブ組み合わせによる形状試作であり、布の自然な垂れや柱の実際の破断断面など、造形品質の改良余地あり。
- 描画上の干渉、実機FPS、ブラウザ表示、魔王の間の配置位置は**未検証**。
- 既存通行・FOE・イベント・セーブ・他階層に触れない。
- 遠景装飾の増加に伴い、画面内のオブジェクト数・描画負荷の測定が必要。
