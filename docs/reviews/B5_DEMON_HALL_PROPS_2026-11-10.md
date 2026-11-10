# 第5階層：魔王の間専用・神殿装飾モデル8種類

参照する固定方針：`docs/B5_ART_DIRECTION.md`（PR #195、未統合の場合は同PRを参照）。
参考画像1に基づく荘厳な大聖堂・神殿。通常迷宮の奈落／先史文明戦争跡地とは混同しない。

## モデル一覧
`field/assets/b5-demon-hall-props.js`
- `grandChandelier`：三層の巨大シャンデリア、24本の垂下装飾、16灯のろうそく
- `tornBanners`：5本の長大な破れた旗
- `fracturedAltar`：割れた祭壇、傾いた石材、24個の破片
- `ruinedPillars`：6本の高さの異なる柱、崩落した石材
- `candleProcession`：38本の大小のろうそく
- `fallenRoseWindow`：崩れた円形窓、放射状の骨組み、破損ガラス
- `brokenPews`：8組の壊れた長椅子
- `throneCanopy`：柱と天蓋を備えた巨大な玉座・祭壇構造

## 呼び出し例
```js
import { createB5HallProp } from './assets/b5-demon-hall-props.js';
const prop = createB5HallProp(THREE, 'grandChandelier', {seed: 1105, scale: 1});
scene.add(prop.group);
// シーンを破棄するとき
prop.dispose();
```

形状優先の初期モデルであり、実際のGLB素材ではなくThree.jsメッシュ生成コード。質感・テクスチャ・ライティング・配置はClaude側で調整予定。
動的ライトは生成せず、通行判定・FOE・イベント・セーブを変更しない。魔王の間だけに配置すること。
未実施：ゲーム本体への統合、ブラウザ実表示、モバイル負荷測定、実機テスト。
