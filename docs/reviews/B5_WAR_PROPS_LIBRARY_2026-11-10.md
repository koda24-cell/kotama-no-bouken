# 第5階層・先史文明戦争跡地：3D装飾セット v1

基準：`docs/B5_ART_DIRECTION.md`（PR #195）。鉱石中心ではなく、戦争の残骸と巨大な破壊造形を優先。

## 追加ファイル
`field/assets/b5-war-props.js`

## 8種類
- `swordField`：刺さった剣21本、岩片11個
- `spearBarricade`：槍17本、岩塊6個
- `brokenWarMachine`：装甲・車輪・砲身状の破断部・散乱瓦礫
- `shatteredObelisk`：折れた巨大石碑と周辺破片
- `brokenBridge`：欠損した橋梁・欄干・落下破片
- `debrisHeap`：大小の瓦礫45個、鉄骨7本
- `battleStandard`：長い軍旗と支柱
- `barrelCache`：樽13個と瓦礫

## 利用方法
```js
import { createB5WarProp, B5_WAR_PROP_KINDS } from './assets/b5-war-props.js';
const prop = createB5WarProp(THREE, 'spearBarricade', { seed: 555, scale: 1.5 });
g.world.add(prop.group);
// エリア移動・シーン破棄時
prop.dispose();
```

配置座標は呼び出し側が設定する。生成物は**装飾専用**で通行判定・FOE・イベント・セーブには一切干渉しない。通路の視界を遮らない場所への配置を前提とする。

## Claudeへの引継ぎ
- マテリアル・質感・ライティング・ゲーム内配置は別途調整。
- 本モジュールは基本図形の組合せによる**形状のたたき台**。本格的な破断メッシュ・非対称の輪郭加工・大型LOD・細部造形は今後の品質向上対象。
- `docs/B5_ART_DIRECTION.md` は現時点でPR #195、development未マージ。統合時に確認。
- 描画・パフォーマンス・ブラウザ実機テストは未実施。多重生成時のGPUリソース共有・マテリアル解放は呼び出し側で管理すること。
