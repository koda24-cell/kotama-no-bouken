# 第4層・粘性溶岩の実装試作 (2026-11-18)

状態: **コード追加済み / 実レンダリング未検証 / NOT_APPROVED / ゲーム未統合**。

## 目的と既存資産の保護
- ゼルダ風の黒い冷却皮膜・不規則な発光亀裂・遅い粘性移流を、Three.jsで再現する独立試作。
- 既存の第4層溶岩、岩壁、マップ、衝突判定、保存形式は一切変更しない。
- 本試作は `tools/floor4/lava/b4-lava-material-prototype.js` のみ。既存素材を置き換えない。

## 実装内容
- UVを流路方向（+V）へ時間移流。既定速度 0.035 UV/s。
- 4オクターブの value noise による domain warp。水の細かい波は生成しない。
- Voronoiセル境界を亀裂として抽出。黒い冷却皮膜と発光した内部を合成。
- 高温色は赤→橙→限定的な黄色。端部は減光し、周囲の岩に接する印象を補助。
- `ShaderMaterial` を作成する純粋なファクトリ関数。毎フレーム `uTime` 更新が必要。
- これはスタイライズド試作であり、物理ベースの粘性流体シミュレーションではない。

## 使用例（専用プレビューのみ）
```js
import { createB4LavaMaterial } from './b4-lava-material-prototype.js';
const material = createB4LavaMaterial(THREE, {
  flowSpeed: 0.025,
  crustScale: 7,
  crustCoverage: 0.68,
  emission: 1.8
});
const mesh = new THREE.Mesh(uvMappedRiverGeometry, material);
scene.add(mesh);
// render loop
material.uniforms.uTime.value = clock.getElapsedTime();
```

## 形状と質感の制作仕様
1. 川の中心線は直線でなく折れ曲がる経路。岩の隙間に沿った幅の不均一なメッシュを作る。
2. 断面は水面のような薄い板を避け、中央の盛り上がり・縁の厚み・局所的な岩への接触を表現する。
3. UVのV軸を実際の流路方向に揃える。曲がり角はUV展開で流れを追従させる。
4. 静的な黒い玄武岩メッシュと動的な溶岩面を分離し、深度競合を避ける。
5. Flow Map（RG速度場）は**未実装**。曲がりくねる流れは現状UV展開で対応する。
6. Normal Map・熱歪み・粒子・岩への照り返しも**未実装**。後続の独立段階で追加。
7. 本コードはGPUフラグメントごとに3×3 Voronoi近傍を探索するため、描画負荷を実測し、必要ならノイズテクスチャへベイクする。

## 検証・品質ゲート
- Node構文検査とThree.js実描画、WebGL1/2互換性、色空間/トーンマッピングを確認。
- 静止画: 正面・側面・斜め、同じ露出で元モデルと候補を比較。
- 動画: 10秒以上。UV継ぎ目、繰り返し、速度、フリッカー、水っぽさを検査。
- 既存岩との接地、1マス接続、視点移動時の見え方を確認。
- GPU時間、draw calls、画面占有率を測定。透明マグマに一般的な剛体LOD/decimationを無条件適用しない。
- GLB/PNG/manifestにSHA256と元コミット、run ID、NOT_APPROVEDを記録。承認前の本番統合禁止。

## 参考・技術根拠
- Three.js公式 lava shader: https://threejs.org/examples/webgl_shader_lava.html （アニメーション構成の参考、コードは複製していない）
- Daniel Ilett stylised lava: https://github.com/daniel-ilett/shaders-stylised-lava （Voronoi着想、コードは複製していない。ライセンス詳細は導入前に再確認）
- Blender/Three.js標準ノイズとVoronoiアルゴリズムに基づく独立コード。
- 任天堂の内部シェーダーを入手・再現したものではない。

## 次の反復
1. 既存第4層の最新作業ブランチと溶岩モデルを特定して差分比較。
2. 試作専用のWebGLプレビュー・スクリーンショットを実行して技術不具合を修正。
3. UVに沿う曲線メッシュと岩接触部分の形状を追加。
4. 正面/側面/斜めPNG＋動画、QAと負荷監査を経てユーザーの美術承認待ち。
