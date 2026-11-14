# 草原・3D素材の色調整ガイド

## 設定ファイル
`tools/floor6/meadow_color_preset.json` をBlender生成時に読み込みます。ブラウザ調整画面は `preview/f6-meadow-color-editor.html` です。JSONを編集してGitHubへ保存すると、次のActionsレンダリングに反映されます。プレビューは2D色見本でありBlender実レンダリングではありません。

## 推奨機能
- **頂点カラー / Color Attribute**：根元・中間・葉先を3点で制御。GLBへ持ち出しやすい。
- **Color Ramp**：Blenderのノード編集時にグラデーションの境界・幅を調整。
- **Principled BSDF / Roughness**：光沢を抑えてアニメ調のマットな草にする。
- **Emission**：弱い自己発光で暗部を補助。ただし光源の代用にはしない。
- **Shadow Floor**：拡散反射と色のままのEmissionを混合し、黒潰れを軽減。影の完全な数値クランプではない。
- **Ambient Occlusion**：接地感には有効だが、過剰に使うと草の根元が黒くなる。抑えめ推奨。

## 推奨値と調整手順
根元 `#729A39`、中間 `#648F32`、葉先 `#A4C94A`、地面 `#607F31`、shadowFloor `0.38`、emission `0.25`。色が派手なら根元と葉先の彩度を下げ、暗部が黒いならshadowFloorを上げます。葉の重なりの立体感が消えたらshadowFloorを下げます。

## 再利用
同じJSON形式の色プリセットを階層・素材ごとに保存可能。生成コード側は`root`/`middle`/`tip`/`ground`/`shadowFloor`/`emission`/`roughness`を参照。ゲーム統合・正式素材保存は承認後に実施します。
