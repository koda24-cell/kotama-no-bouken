# 第3層 二段折り返し階段 V7–V8 実Blender/PBR品質評価
記録日: 2026-11-17 / PR #469 / 状態 NOT_APPROVED

## 変更・技術結果
- V6を保持し、V7では柱の下部／接合部に重力方向の雨垂れを、踏み板の端と鉄製ベースプレート付近に写真由来の汚れを追加。
- V8では主コンクリートの写真を暗く調整し、踏み板の正面（蹴込み）にも不規則な雨染みを追加。旧版は保持。
- 使用写真: Poly Haven CC0 chipped_concrete + concrete_moss。元写真Diff/Normal/Roughnessは両版のArtifacts pbr_sources/ に記録。
- 各素材はBlender .blend にpack()、GLBの画像バッファへ埋込。V8実GLBのgltf.images 7点全てがbufferView参照（外部URIなし）。NormalTextureを持つ材質3種類。

## 実行証拠
| 版 | 正式run | 成功 | Artifact ID（内容注意） |
|---|---|---|---|
| V7 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44028724015 | Blender/GLB/Blend/PNG3方向/QA全成功 | 14303858828（ラベルはv6-reviewだが実中身とmanifestはV7） |
| V8 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44029271337 | Blender/GLB/Blend/PNG3方向/QA全成功 | 14303344836（ラベルはv6-reviewだが実中身とmanifestはV8） |

- ダウンロードZIPでglTF画像の内包、NormalTexture参照、manifestに記録されたGLB・Blend・PNG3方向のSHA256およびファイルサイズを実検査済み。
- Artifactsは期限付きであり、正式フォルダへは未保存。最新版もユーザー承認前なので本PRはDraft維持。

## 実画像の比較（GPT目視）
- V7: 柱に局所的な汚れを追加できたが、遠目の正面/側面/斜めでは大きな改善に見えない。
- V8: 踏み板の正面の黒ずみが少し増加。全体のコンクリートはまだ比較的明るく均一に見える。
- 主な課題: 写真由来PBRは埋まっているが、スケール感やUV配置の影響で遠景に質感が読み取りにくい。塊状の破断面、面の奥行、雨染みの濃淡、湿った下部と乾燥した上部の差が足りない。
- 元参考写真の完成品としては**未合格**。ゲーム内の実撮影・GLTFLoader表示も未検証。

## 次回の優先順位
1. 参考写真と同じ画角・撮影倍率で大型の接合部、柱の雨染み、手すりのフランジを比較する接写レンダーを追加する。
2. UVのスケールとテクスチャの表示密度を調整し、PBRの細部が近距離/中距離に残るよう確認する。
3. 塗装した汚れパーツのような境界をなくし、ジオメトリの深い欠け・崩壊と雨染みを因果関係でつなげる。
4. 色だけでなくコンクリートのNormal/Roughnessと汚れた部位の変化を中立照明で見直す。
5. ユーザーの完成承認までdevelopment/mainへの3D正式素材昇格とゲーム実装をしない。
