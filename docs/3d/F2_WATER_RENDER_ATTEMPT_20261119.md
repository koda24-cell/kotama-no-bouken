# 第2層 水V2取得・レンダリング試行ログ（2026-11-19）

## 結果
- 公式素材候補：Poly Haven River Small Rocks / Damp Sand、ambientCG Foam001、Kenney Particle Pack。各公式ページのライセンス分類は Poly Haven / ambientCG / Kenney CC0 を確認。
- 素材本体ダウンロード：**失敗**。本チャットのコンテナから外部DNSが名前解決不可。別のダウンロードツールも未成功。取得・検査済みとは扱わない。
- WAVY Blenderアドオン：既存の静的解析メモはあるが、本チャットでの実ファイルダウンロード・ウイルススキャン・Blender実行は未完了。
- Blender本体：現在のコンテナにインストールされていないためBlenderレンダリングは未実行。
- ローカルのCPU Python + OpenCV + Pillowで水のプロシージャル描画3枚（clear/still/stream、1100x700）を生成。実素材とThree.js/WebGLを使わない**技術試作**であり、WAVYやBlenderの実レンダリングと混同しない。
- 出力検査：PNG形式を検査し、SHA256を記録。特に砂利の形状は平板な点状に見え、反射や水深、フォグも品質不十分。**NOT_APPROVED**。

## 次の正規実行に必要なもの
1. GitHub Actionsの分離環境で公式CC0のPBR diffuse/normal/roughnessを安全に取得し、SHA256/画像デコード/アンチウイルスとZIPパス検査を行う。
2. Blender入りランナーで実地形・砂利メッシュ・水面のノードを構築。使用する実シェーダーを明示。
3. 正面・斜め・側面に加え、斜め上と水際接写を出力。4方向以上のPNGとmanifest/hashを保存。
4. 先に透過（水底の視認性）、濡れ石の法線・roughness、局所ハイライト、密度の薄い霧、紫外線っぽくない青緑を検証。
5. 未承認の候補は本番統合しない。生成物の証拠とArtifactsのrun IDを記録する。

## 公式URL
- https://polyhaven.com/a/river_small_rocks
- https://polyhaven.com/a/damp_sand
- https://ambientcg.com/view?id=Foam001
- https://kenney.nl/assets/particle-pack
- https://github.com/Nicetink/WAVY
