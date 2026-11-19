# 第2層：透明な水の表現・技術候補（2026-11-19）

目的：WAVYの作風を基本に、Stylized Water Proの穏やかな泡・波、Physical Open Watersの透明感・深さ・反射を参考にして、ブラウザのThree.jsで独自に実装する。各アドオンからコード・アセットを無断転用しない。

## 参考実装（未導入・ゲーム互換性/ライセンス詳細/マルウェア未検証）
- WAVY Blender addon https://github.com/Nicetink/WAVY — Blender 4.0+, GPL-3.0。前回ソース約38KBの簡易静的検索のみ。ウイルススキャン・Blender実行は未実施。
- Mamba Stylized Water Pro https://mamba-cg.github.io/addons/stylized-water-pro/ — 波・岸際の泡・プリセット、製品配布条件の確認が必要。有料品を自動取得しない。
- Physical Open Waters https://www.physicaladdons.com/pow/documentation/ — refractive/subsurface scatter, attenuation/scattering, Eevee/Cycles、水中粒子。購入・実使用なし。
- Three Stylized Water https://github.com/xuchaozou/three-stylized-water — Three.js r185、depth color、shore fade、caustics、intersection foam、refraction、Genshin/clear/tropical presets。ライセンス依存関係、WebGLとWebGPU条件を検証する。
- WaterThreeJS https://github.com/achrefelouafi/WaterThreeJS — Fresnel、Beer-Lambert吸収、水底光、透明な浅瀬。未実行。
- Three.js interactive water https://github.com/jeantimex/threejs-water — interactive ripples/refraction/caustics。未実行。
- Three.js official water example https://threejs.org/examples/webgl_shaders_ocean — baseline。現ゲームThree.jsとの互換性未確認。
- Samet Karaş technical breakdown https://sametkaras.github.io/projects/stylized-water-shader/ — foam/refraction/caustics構造参考。

## 開発記事（仕組み参照、コード権利とは別）
- NVIDIA GPU Gems water caustics https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics
- NVIDIA GPU Gems water simulation https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models
- NVIDIA GPU Gems refraction https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-19-generic-refraction-simulation
- 80 Level shore = water/foam/caustics https://80.lv/articles/stylized-water-for-game-environments-in-ue4
- 80 Level water+pebbles https://80.lv/articles/ue5-powered-stylized-water-pebbles
- 80 Level stylized Viking water https://80.lv/articles/001agt-stylized-viking-village-modeling-workflow-materials-lighting

## CC0素材候補（公式ライセンス表示のみ確認、ファイル取得・検査・レンダなし）
- https://polyhaven.com/a/river_small_rocks — riverbed rocks; CC0
- https://polyhaven.com/a/pebbles — pebbles; CC0
- https://polyhaven.com/a/damp_sand — damp sand; CC0
- https://polyhaven.com/a/low_tide_rocks — wet coastal rocks; CC0
- https://ambientcg.com/view?id=Foam001 — foam texture; CC0
- https://ambientcg.com/view?id=Foam003 — foam texture; CC0
- https://kenney.nl/assets/particle-pack — particle FX; CC0

## 次の検証
1. 安全な独立環境へ公式配布物のみ取得。SHA-256/ファイル実デコード/アンチウイルス・Python静的解析/ライセンス・依存関係の検査。
2. 三種の水（浅瀬、静水、水路）でWAVY基準Blender画像と、Three.js独自shaderを比較。正面/側面/斜め、岸際/水底/光の動きを比較。
3. GPUの描画回数・FPSを測定し、透明描画/屈折バッファのコストを把握する。軽量化で近接品質を犠牲にしない。
4. 未承認のままゲームコード・正式素材へ統合しない。独立PRで扱う。
