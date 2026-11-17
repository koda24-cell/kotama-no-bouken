# 実ゲーム試遊ページの保存分離検証

`node tools/f1-sacred-forest/verify-playtest-page.cjs` をChromium/Three r180/SwiftShaderで実行しpass。実index.htmlを使うiframeは一層3Fで起動し、固定7対象・水11・全source hashを確認。親localStorageのsentinelを試遊側から読めず、試遊内の書換え後も親の値は不変。page errors 0。

actual-game-playtest.pngは実ゲーム画面。実機FPSと美術承認の証拠ではない。
