# B5 瘴気侵食岩 — 生成補助・PBR素材候補

## 現在のV3実装
- Blender Pythonで約3,360四角面の有機的な侵食膜を生成。外周は多重波形で不規則化し、広域・中域・細域の起伏を頂点位置に追加。
- Blender Noise Texture → Bump を黒い侵食マテリアルに追加。UVなしで表面の微細凹凸を表現。
- 45個の不規則な表面破片を追加。V2の石材や侵食層は削除せず保持。
- 3方向レンダリングとGLB出力は `.github/workflows/b5-gloom-render.yml`。
- 未承認。ゲームへの統合は禁止。レンダリング画像とGLBを評価してから正式昇格。

## 追加導入候補
1. **Blender Voxel Remesh / Sculpt**: 交差した岩・侵食層を連続した有機面へ変換。既存の形状を残した複製上で使用し、元メッシュは保持。公式: https://docs.blender.org/manual/en/latest/sculpt_paint/sculpting/tool_settings/remesh.html
2. **Blender Noise/Voronoi + Bump/Displacement**: 微細凹凸、石肌、瘴気の結晶化。現V3ではNoise Bumpのみ実装。変位は高密度メッシュへの適用時に実寸・破綻を検証する。
3. **Poly Haven Rock Ground**: https://polyhaven.com/a/rock_ground (CC0; normal, roughness, displacement)
4. **Poly Haven Rocks Ground 02**: https://polyhaven.com/a/rocks_ground_02 (CC0; normal, roughness, displacement)
5. **Poly Haven Rock 07**: https://polyhaven.com/a/rock_07 (CC0スキャン岩の候補。再配布と実ファイル入手は別途確認)
6. **ambientCG**: https://ambientcg.com (CC0 PBR材、岩肌や石材候補)

## 重要な制約
- 上記3–6は**調査済み候補**であり、今回ダウンロード・Git追加・実モデルへの適用が済んだことを意味しない。
- 高密度メッシュはレビュー用。実ゲーム用には必要に応じてLOD/ベイク済みノーマルで最適化。
- GLBにBlender固有のNoiseノードがそのまま持ち出せるとは限らない。Three.js側の見た目は別途検証。
- ライセンス・配布元・ハッシュを確認してから外部ファイルを正式保存。
