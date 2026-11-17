# 第3層 二段折り返し階段 V9–V10 実レンダー比較・品質引き継ぎ
記録日: 2026-11-17 JST / 対象: PR #469 / 承認: **NOT_APPROVED**

## 保存した制作版・実行成功の証拠
| 版 | 成功run | Artifact ID | 内容 |
|---|---|---|---|
| V9 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44034459333 | 14306237667 | V8から大判の雨染み、柱下の土汚れ、支持梁の実Boolean欠け、4枚目の接写PNG |
| V10 | https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44035057067 | 14306454068 | 写真ベースの緑染みを灰褐色へ変更、踊り場側面の雨染みを追加、4方向レンダー |

## 納品形式と検証
- V9/V10とも、Blender Actions内のモデル生成・GLB/PBR確認・front/side/angle/detail PNG・Blendチェックポイント・Artifact保存が全ステップ成功。
- 各runのArtifact ZIPをGitHubからダウンロードし、manifestに記録されたGLB・Blend・PNG4枚（計6ファイル）のSHA-256が一致することをローカルで検証。
- **V10のGLBに画像7点すべてbufferView埋込、Normal Map参照のある材質3種類を確認済み。** 外部画像URLなしでGLB単体が読める仕組み。
- テクスチャ元画像は公式Poly Haven CC0 chipped_concrete/concrete_moss。取得した6つのPBRテクスチャとURL/SHA-256はArtifactsのpbr_sources/にあり、Blendにも写真をpack。
- 証拠画像の合成比較はChatGPT側で作成済み。Actions Artifactsは一時保存で、恒久Git正式assetsへの保存は未実施。

## モデル品質への判断
- V9: 踊り場側面に緑の染みが広がり、特に接写では**四角い塗装パッチ**に見えてしまう。
- V10: 緑を抑え暗い灰色系の汚れへ変更。前版より自然な色だが、斜めからの見た目はまだ均質。いくつかの汚れ片が貼り紙のようで、参考画像の湿った実コンクリートには未到達。
- ユーザーが評価した構造部分（柱、二段階段、手すり）は保持。完成判定なし。

## 次の優先改善
1. V7～V10のポリゴン状汚れ追加メッシュは平面的に浮くため、**貼り付けパッチではなく UVテクスチャに汚れを直接焼き込む**ことを優先。実写写真による密度を維持しつつ、雨垂れ方向/継ぎ目の局所マスクを使う。
2. 滑らかな踏み板の端に深さのある層状剥離、部分欠損の断面と露出骨材を追加する。ランダムな微細瓦礫は使わない。
3. 手すり台座の錆が下部コンクリートへ流れる表現、苔の局所性、湿った支柱下部を実画像と比較。
4. 中立光の接写でTEXEL密度/UV反復/Normal/Roughnessが読み取れるか確認。Three.js GLTFLoader実表示はまだ未検証。
5. 新版はV10を保持し、V11を別名で出力。ユーザーの完成承認前に素材昇格・本体マージ・ゲーム表示変更を行わない。
