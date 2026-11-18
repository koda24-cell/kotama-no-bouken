# 第4層マグマ 2026-11-18 実装・検証記録

対象PR #505、NOT_APPROVED。既存ゲームと既存マグマ素材は変更していない。

## 実装
- `b4-lava-material-prototype.js`: 低速UV移流、domain warp、Voronoi亀裂、冷却皮膜、温度発光。
- `b4-lava-river-geometry.js`: 中心線を曲げ、川幅を変化させ、表面を盛り上げ、下面を0.22m下げ、側壁と前後キャップを追加した独立メッシュ。UVのV軸は流路の進行方向。
- `b4-lava-river-geometry.test.mjs`: 頂点数、三角形インデックス、有限値、曲がり幅、表面高低差、下面・側壁生成の確認。

## 実際の検証
- Node.js v22.16.0で同等のローカル幾何生成テストを実行しPASS。リポジトリ内テストファイルのActions実行は未確認。
- ローカルPython/Matplotlibによる**形状のみ**の斜め・上・横プレビューを生成し、流路が曲がることを目視確認。これはBlenderレンダーでもThree.jsマテリアルレンダーでもない。
- Chromium/PlaywrightでWebGL表示を試みたが、実行環境で `getContext('webgl')` がnull。localhost/file URLは `ERR_BLOCKED_BY_ADMINISTRATOR`。したがってシェーダーコンパイル・Three.js表示・アニメーション・ゲーム負荷の実検証は**失敗/未実施**。
- この時点でシェーダーの表示品質、水っぽさ、黒い皮膜のアニメーションは合格と判定しない。
- 現時点の立体形状は**岩と接触していない独立サンプル**。側壁/下面は追加したが、浮きの解消は周辺岩との実配置検証が必要。

## 次の検証ゲート
1. GitHub ActionsまたはWebGL利用可能なブラウザでシェーダーを実際にコンパイル・描画し、ログとPNGを残す。
2. Blender/Three.jsで流路と岩の接触を確認し、上/横/斜め、8秒差分と動画を保存する。
3. 亀裂のサイズ・移流速度・熱い部分の面積を画像で調整。水っぽい細波、平坦な端部、浮いた接地を重点確認。
4. WebGL1/2、GPU時間、draw calls、実画面での露出を測定する。
5. GLB/PNG/manifest/SHA256を確認し、ユーザー承認まで正式素材へ昇格しない。
