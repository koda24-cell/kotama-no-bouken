# 閉鎖遺跡V3 水面モジュールの独立WebGL検証

`node tools/f1-closed-ruins-v3/verify-water.cjs` をChromium/Three r180/SwiftShaderで実行してpass。実ゲーム統合・実機FPS承認ではない。岸の個別GLBと天井/柱を含まない、水底・藻・水面だけの技術確認画面。

- 元のmapの11水セル/16境界辺を読み、元水mesh11個とgeometryを維持。
- world座標から2層normalを動かし、時刻0秒と5秒を同じカメラで実撮影。画像差分166,344px、平均絶対channel差0.332。静止画の差だけを大きな波や写実的反射の証明にはしない。
- 11水底、55個の水中礫、11個の非均等な藻溜まり。実時刻のuniform更新のみ、フレームごとのtexture生成や反射scene再描画はなし。
- shader compile成功、console/page/WebGL errors0、warnings0。
- 冪等dispose後、元材とgeometryが復元し、renderer memoryはbaselineのgeometry1/texture0へ戻る。

最初のテストはレビューfixtureのfavicon 404をconsole errorとして拾って失敗した。faviconへ204応答を追加し、同じ検証を最初から完走した。水shaderのGLerrorではない。

自作の周期normal/色/藻PNGは `tools/f1-closed-ruins-v3/build_water_textures.py` から1つの水材用に生成。外部画像入力なし。出典・SHAはassets側の `water-texture-sources.json`。素材/水面の最終美術承認は別途、閉鎖空間と岸を含む実ゲーム画面で行う。
