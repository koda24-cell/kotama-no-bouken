# B2 古代氷橋 v04 — 1マス隣接パーツ＋VFX 制作仕様

## 元モデルと分担
- 元のブロック状橋: `assets/3d/dungeons/b2_water_source/models/ancient_ice_bridge/ancient_ice_bridge_v04.glb`（PR #323 のブランチに存在、development 未統合）
- 隣接3分割の既存試作: `tools/b2-render/build-bridge-adjacent.py`（PR #323）
- 再利用候補: `assets/3d/dungeons/b1_ancient_forest/props/ruin_rubble_pile.glb`, `broken_ruin_bridge.glb`, `modules/mod_floor_stone_broken_4m.glb`
- 氷岸V11は別素材として変更しない。

## 造形
1. v04 のブロック積み・高さ・幅・接続面を保持し、左右1マスの接続を目視で確認する。
2. 石橋の欠損部へ瓦礫・崩れた石床の**コピー**を付加。B1元ファイルは変更しない。
3. 瓦礫の密度は接続面を避け、通行幅と視認性を優先する。
4. 追加の氷柱・亀裂は独立オブジェクト。接続境界に大きな突出物を置かない。

## VFX（静的GLBと別レイヤー）
- 低い霧: 橋の下でゆっくり水平移動、半透明の軽量ビルボード。橋上の視認性を遮らない。
- 氷粒: まばらな小粒子、緩やかな上下運動、遠景で抑制。
- 反射: 水面と氷の縁に弱い青白い明滅。周期をずらし規則的な点滅を避ける。
- 水流: 既存B2水面表現を優先し、二重の水面を生成しない。
- 粒子上限・距離カリング・VFX ON/OFF・モバイル低負荷設定を設ける。ランダムマップではマス座標に固定seedを使い継ぎ目を避ける。
- Three.jsのランタイム演出はGLBに焼き込まない。Claudeが既存B2描画へ組み込む際は別PR。

## 検証ゲート
- Blenderで v04原本と左右隣接パーツ＋瓦礫を正面/側面/斜め/接続俯瞰から実レンダリングする。
- WebGLで動くVFXの確認は別途ブラウザ実行・性能確認が必要。Blender静止画だけで動作検証済みとはしない。
- GLB/PNG/manifestをユーザー承認後に正式保存。ClaudeはBlenderを操作せずGLTFLoaderとPNGを利用。
- この文書は制作仕様。VFX実装・レンダリング・ゲーム統合が完了した証拠ではない。
