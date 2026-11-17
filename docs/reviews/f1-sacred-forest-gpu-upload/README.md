# 既存FOE SVGのWebGL upload診断

修正commit a08c8f0。before-after-summary.jsonに同じ実ゲーム8段階（1F→3F→祠→水→2F→3F→戦闘→3F）の比較を保存。修正前はdragon.svg HTMLImageElement150pxのuploadでGLerror1281とGPU警告2件、修正後はHTMLCanvasElement512pxで820 uploads / GLerror0 / GPU警告0。元SVGと候補GLBは変更なし。

minimal-svg.cjsは別contextで直接SVG・canvas化・明示DataTexture mipを比較。直接SVGだけ失敗、他2ケースは成功。actual-index-diagnostic.cjsとinstrument.jsは実ゲームの診断用スクリプト。再現にはROOTと出力先を手元のcheckoutへ合わせ、Playwright/ThreeとChromiumを用意する。ソフトウェアGPUでの検証であり全GPUや実機FPS保証ではない。
