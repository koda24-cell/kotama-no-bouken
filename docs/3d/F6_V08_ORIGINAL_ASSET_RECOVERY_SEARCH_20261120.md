# F6 788葉束V08 原本捜索ログ — 2026-11-20

## 結論
**目的のV08/V09実GLBは未回収。代わりに、その構造上の祖先であるV27原本を実回収できた。** V1/V14または別系列V29〜V31をV08と取り違えないこと。

## V08系列の確定来歴
- V27: GitHub Actions run [44447197961](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44447197961)、artifact ID `14494297032` (`f6-v19-v27-bark-leaf-refinement-comparison-NOT-APPROVED`) は存在し失効していない。実ダウンロード成功。中身には `nature/tree_mature_photo_v27/tree_mature_photo_v20.glb` (29,946,288 bytes), `tree_mature_photo_v20.blend`、4方向PNG、CC0 Bark015 source。
- V02: V27の幹枝248メッシュと6画像葉束788カードを利用。6葉群メッシュを合わせ254メッシュ。文書 `docs/3d/F6_PAINTED_SPRITE_TEXTURE_RESEARCH_20261119.md`、`docs/3d/F6_PAINTED_LEAF_BUNCH_V01_HANDOFF.md` に記録。V02 GLB SHA256 `62d505967f2322e91b2cab51f70aa7ad49940e38d72bf08665890862dd89c513`。
- V05: V02へ19個の幹枝メッシュを追加、273メッシュ。`F6_painted_bunch_trunk_v05_NOT_APPROVED.glb`、独立ZIP `f6_tree_v05_actual_GLBRenders_NOT_APPROVED.zip` を以前のチャットで生成。GitHubへのバイナリ保存なし。
- V06: V05実GLBのライトだけ変更、実4方向VTK/EGL（front/side/angle/leaf_detail）。`f6_tree_v06_real_render_3views_detail_NOT_APPROVED.zip`（チャット内）。
- V08: 788葉束中164削除、204縮小、624保持。GLB SHA256 `6316513dc73ccb5b3dbaaa9d227049a5f9aa66a2139b4e0980f09473569e6099`。PR [#651](https://github.com/koda24-cell/kotama-no-bouken/pull/651) には **文書だけ**。
- V09: 141枝関連ノードを除外した試作。PR [#656](https://github.com/koda24-cell/kotama-no-bouken/pull/656) には **文書だけ**。

## 他に実回収できた別系統（同一だと偽らない）
- PR [#599](https://github.com/koda24-cell/kotama-no-bouken/pull/599) のV29〜V31は同じV27祖先から6種類の異なるプロシージャル葉束素材を作成する別試作。
- V31の Actions run [44467608814](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467608814) artifact ID `14503062593` は実ダウンロード成功。GLB、Blend、6透過PNG、正面/側面/斜め/接写の実Blender画像あり。manifestに **葉束685カード・元幹枝248メッシュ** と記載。このため624カードのV08とは異なる。
- V29 run #44465447418 artifact 14501927111 とV30 run #44466702780 artifact 14503050494も有効。

## 探索済み
- 5作業ブランチ（V05/V06/V08/V09/V24）のGit tree全ファイルを検査、目的GLB・PNG ZIP・Python本体なし。
- PR #651/#656の変更ファイルとコメント、Actionsブランチrun一覧を検査。対象GLBバイナリなし。
- 過去の会話記録から `f6_tree_v08_actual_GLBRenders_NOT_APPROVED.zip` と `f6_tree_painted_real_3d_V02_NOT_APPROVED.zip` の生成事実を確認。ただし当該チャットの `sandbox:/mnt/data/` ファイルを本セッションで参照できない。現行セッションファイル/Libraryのファイル名検索でも該当ZIPなし。
- `koda24-cell/3d-asset-studio` mainのツリーにも関連名なし。

## 復元の最短経路
1. 古いチャットの添付ZIPへアクセスできれば、SHAでV02/V08を検証してそのまま継続。
2. 別経路では、**真正のV27 GLB+Blend、GitHub PR #631にある `tools/floor6/painted_leaf_bunch_review.py`、V31にある6種別葉束PNGと生成Python** を利用して構造を再現する。ただし、元の6枚の生成画像およびV02→V08のローカルPythonの完全な数値配置は未保存のため、**V08のバイト同一復元はできない**。
3. 復元候補はV08と別名で管理し、実Blender5.3レンダリングで比較してからユーザーに提示する。美術未承認、ゲームに統合しない。
