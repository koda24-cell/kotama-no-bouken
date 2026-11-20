# 3dnchu 原資料との再現性監査 — 2026-11-20

## R01 Stylized Materials
出典: https://3dnchu.com/archives/how-i-make-stylized-materials-b3d-lassyla/

3dnchu本文を再確認。紹介される技術はEeveeプロシージャルシェーダーで、Noise Texture・Voronoi Texture・Fresnelを組み合わせ、手描きテクスチャ不要とする。

現行試作 `tools/tech-research/tech01_stylized_materials.py` はNoise→ColorRamp→Base Color、別Noise→Bump→Normalであり、VoronoiとFresnelを欠く。Cyclesを使用。**再現性: 部分一致**。現行ノード値はコタマ独自設定であり原作者の値ではない。動画本編と配布ノードデータは未照合。

実行: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44667189999 （Blender 5.3、変更前後各4方向PNG計8枚、Blend、ClamAV成功）。GLBベイクとThree.js未検証。美術未承認。

次: A=現行Noise、B=Noise+Voronoi、C=Noise+Voronoi+Fresnelの独立比較。EeveeとCycles差、およびglTFでの再現可否を分離して検証する。

## R02 Don't use height maps
出典: https://3dnchu.com/archives/dont-use-height-maps-default-cube/

3dnchu本文を再確認。Z方向のみの変位と法線方向の変位を比較するGeometry Nodes手法。**再現性: 未実装**。まず同じメッシュ・同じ高さ場・同じ変位量で方向だけを比較。複合ノイズ・破断造形はコタマ独自応用として別評価する。元動画のノード値は未照合。

## 判定ルール
元記事確認 / 元動画・配布データ確認 / 記事手法再現 / 独自改善 / Blender 5.3実レンダー / GLB・Three.js / 美術承認を別ステータスに記録する。未承認の本番素材は変更しない。

## R01 — 作者の意図と完成例の照合（追加）

**作者の目的**: 3Dシーンを手描きのイラストに見せる、手描きテクスチャ不要のプロシージャルEeveeシェーダー。ローポリ形状に対し色彩とノイズによる絵画調の情報量を付加する。リアルな岩の再現や形状改善は記事の主目的ではない。

**一次資料**:
- 作者の解説動画: https://www.youtube.com/watch?v=mNlL77U0IL8
- 作者のシェーダー・デモシーン配布: https://ko-fi.com/s/7429f18949
- 3dnchu紹介: https://3dnchu.com/archives/how-i-make-stylized-materials-b3d-lassyla/
- 補助説明: https://80.lv/articles/tutorial-procedural-blender-shader-with-hand-painted-look
- 補助説明: https://www.creativebloq.com/3d/see-how-this-3d-artist-uses-blender-to-make-scenes-that-look-hand-painted

**原本入手状況**: 配布ページの存在とBlender File形式は確認。実際の配布Blendファイルは未取得、内部ノード・デモシーンの照合は未実施。作者の設定値や見た目の完全再現を主張しない。

**前回のA/B/C試験**: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44671999168 でBlender 5.3・12枚PNG・Blend・ClamAV検査成功。Noise単独 / Noise+Voronoi / Noise+Voronoi+Fresnelの**独自ノード試験**であり、作者のノードグラフの再現ではない。岩のリアルさで評価した以前の美術判定は、この資料の目的とずれていた。

**次の制作の判定軸**:
1. 原本Blend取得後、デモシーン・ノードのスクリーンショットとシェーダー入出力を記録する（未取得なら「原本未照合」）。
2. 作者デモと同じ被写体・画角・照明・Eeveeで、色面のまとまり、手描き風の陰影、輪郭、ノイズの粒度を比較する。見た目の数値評価は原本画像の比較が可能になってから。
3. 原本再現とコタマ向け応用（岩、樹木、建築）を別のレンダーとして保存する。
4. GLB/Three.jsではEevee独自シェーダーがそのまま移植できるとは限らないため、ベイクまたはThree.jsカスタムシェーダーを別途検証する。
5. 作者の配布条件・再配布可否を確認するまでは、配布Blendや作者の素材をGitHubにコミットしない。制作物はNOT_APPROVEDを維持。

## ユーザー提供の原本Blend静的検査（2026-11-20）

ユーザーがチャットに添付した原本をローカルで読み取り専用検査。**原本はGitHubへアップロードしない**。

| 原本 | SHA-256（圧縮ファイル） | 圧縮サイズ | 展開サイズ | Blenderヘッダー |
|---|---|---:|---:|---|
| Lassyla_Material.blend | `ecda84d13cf48e98e571d434cba4dc49d30f01aeaabc93e118fa7fed1ec4d2c0` | 約223KiB | 約1.2MiB | `BLENDER17-01v050` |
| Palm_Tree_Demo.blend | `da01d11a6ad24032bcc63e48cc2f0e8c9dc068f4e7a56bd7176aaebf1de7d44e` | 約361KiB | 約2.9MiB | `BLENDER17-01v050` |

Zstandardを解凍してBlendヘッダーを確認。両方のファイルのバイナリ中に `ShaderNodeShaderToRGB` / `ShaderNodeTexNoise` / `ShaderNodeTexVoronoi` / `ShaderNodeFresnel` が存在。これはノード定義名の存在を示す**静的な証拠**であり、接続状態・各マテリアルでの使用・設定値・見た目の忠実性を証明しない。

**未実施**: Blender 5.3でのファイル読み込み、ドライバー/スクリプト検査、ClamAV実スキャン、Eevee実レンダー、ノードリンクの抽出、著者デモとの視覚比較。今回のチャット実行環境にはBlender/ClamAV実行コマンドがなく、原本をGitHubへ転載しない方針のためActions側へ原本を渡していない。

**次の安全な検査手順**: Blender 5.3環境で外部原本を隔離し、ClamAV検査→`blender -b --disable-autoexec <原本> --python <read-only inspector>` でノードリンク・マテリアル・レンダー設定をJSON化→Eeveeで原本の複数視点PNGをレンダリング。元ファイルのスクリプトは自動実行しない。レンダー結果だけ研究用の証拠として共有し、著作権・再配布条件が未確認の原本Blendはコミットしない。

## 2026-11-20 追加静的安全確認と実行準備

添付原本をGitHubへ転載せず、手元でZstandard展開しバイト列を検査。両方ともヘッダーは `BLENDER17-01v0502`（Blender 5.0.2相当）で、展開成功。原本SHA-256は上表と一致。

- `Lassyla_Material.blend`: 圧縮228,069 bytes、展開1,213,013 bytes。ノード型マーカーの出現回数: Shader to RGB 3 / Noise 5 / Voronoi 1 / Fresnel 3。
- `Palm_Tree_Demo.blend`: 圧縮369,426 bytes、展開3,010,111 bytes。同マーカー: Shader to RGB 10 / Noise 15 / Voronoi 2 / Fresnel 10。
- 文字列パターン `bpy.`, `os.system`, `subprocess.Popen`, `__import__`, `exec(`, `eval(`, `http://`, `https://` は両ファイルで出現0。ただし**文字列検索はウイルス検査ではなく、安全の保証ではない**。ノード型名の出現回数は実ノード個数とは限らない。
- 現在の実行コンテナに `blender` と `clamscan` がなく、apt取得もタイムアウトしたため、ClamAV・Blender 5.3での実際のファイル読み込み・レンダリングは未実施。
- 研究用の読み取り専用インスペクター `tools/tech-research/inspect_original_blend.py` を追加。**Python構文チェック済み**。実行時は `blender -b --disable-autoexec <source.blend> --python tools/tech-research/inspect_original_blend.py`、原本は隔離し再配布しない。検査出力JSONに作者由来の外部ファイルパスが含まれる可能性があるため公開前に精査する。
- **次のゲート**: ClamAV実検査→Blender 5.3原本読込→ノードリンクと外部依存の検査→Eeveeレンダー→原本と比較。未実施の段階を成功と扱わない。

## 2026-11-20 Blender 5.2 新形式のブロック完全性検査（重要訂正）

公式Blenderのファイル形式仕様では5.0以降、17バイトヘッダー `BLENDER17-01v0502` と32バイトのLargeBHead8を使用する。旧12バイトヘッダーで異常とした一時判定は**誤り・撤回**。出典: https://github.com/blender/blender/blob/main/source/blender/blenloader_core/BLO_core_blend_header.hh

ローカルのZstandard展開済み原本を新形式に合わせて全ブロック走査し、次を確認。
- `Lassyla_Material.blend`: **2,739ブロック**、OB 5、ME 3、MA 3、NT 1、IM 2、DNA1 1、ENDB 1。
- `Palm_Tree_Demo.blend`: **7,599ブロック**、OB 34、ME 26、MA 10、NT 7、IM 2、DNA1 1、ENDB 1。
- 両方ともブロック長はファイル範囲内、ENDBまで完全走査、**余剰バイト0・構造パースエラー0**。
- これはファイル構造の整合性であり、Blenderで開けること、シェーダーが正常に機能すること、ウイルスがないことは保証しない。ClamAV実スキャン・Blender 5.3読み込み・レンダリングは未実施。前回の「5.0.2」表記も誤りで、ヘッダーは**5.2形式**。
