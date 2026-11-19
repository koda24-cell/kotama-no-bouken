# 第6層 成木 — 画像生成した葉束PNG / 樹皮候補の試作記録（2026-11-19）

## 意図と基準
V25でユーザーが採用した「樹冠が左右に広がる形」は保持。今の葉の粒状感・鋭い輪郭・幹の不自然な露出を減らすため、**一枚葉の3D多量複製から枝付きのまとまった葉束画像を透明カードに貼る方式**を独立試験する。ブレワイの非公開内部実装と断言せず、絵画的な樹冠表現として検証する。

## 制作済み画像
- 画像生成による**6種類の枝付き葉束透過PNG**（元アトラス1199×1312、6切出し）。各画像が内部に大小の葉を含む。
- 透明部分のRGBを最近傍の葉色で補完した。Alpha値は維持している（黒縁軽減のための制作データ処理）。
- ambientCG Bark015 **CC0** PBRの color / normal / roughness を既存の実検査済みV27 Artifactから再利用し、幹の明度・彩度・模様の強さを抑えた stylized diffuse（1024²）を別候補として制作。樹皮のNormal/Roughnessは元のCC0データを維持。
- ローカルの配布セットには各PNG、元アトラス、manifest、SHA256、検査済みV27 GLB、実行手順書を同梱。

## 保存・実装
- 研究／スクリプトは独立 **Draft PR [#631](https://github.com/koda24-cell/kotama-no-bouken/pull/631)**、`tools/floor6/painted_leaf_bunch_review.py` と `docs/3d/F6_PAINTED_LEAF_BUNCH_V01_HANDOFF.md`。Pythonスクリプトは元の葉メッシュをBlenderシーンに残し試験の描画時のみ非表示にし、画像カードを分布させる。元幹枝は残す。
- GitHub Actions [#44524342517](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44524342517) **success**: 既存V27 GLBの真正SHAと幹・葉メッシュ存在、試作Pythonの構文を検証。
- **検証未完了:** 現時点でGitHubに画像PNGの実バイナリは保存されておらず、PR内の画像貼付は実行していない。したがってBlender四方向PNG、GLB・Three.js表示、美術品質は**未検証／NOT_APPROVED**。画像バイナリは会話内の配布キットに保持。次にキットのテクスチャ入力を安全にGithub Actionsへ搬入してレンダリングする必要がある。
- 合格判定には、葉束カードが平面的・浮遊して見えないこと、幹と枝から葉束がつながること、外周がV25の広がりを損ねないこと、透明の縁、法線約45%+内側AO、GLB/Three.js実画像の比較が必要。

## 安全・ライセンス
- 葉束の画像はユーザー案件向けの新規生成。樹皮の元写真はambientCG Bark015（CC0）。元GLBは検証済み既存Artifactのみ使用。
- 生成イメージボードはあくまで絵づくり参考で、Blenderでの成功・Three.jsへの統合を証明しない。
- GitHub Actions Artifactは一時保存。完成したGLB/PNGの正式保存は**ユーザーの美術承認後**に限る。

## 引き継ぎ
- 先行研究：`F6_FOLIAGE_LIGHTING_FOLLOWUP_RESEARCH_20261119.md`（法線の比較・裏面処理のGLB互換性・葉群の6塊法線とAO）
- V25採用済み樹冠の外形は維持しながら、次の試験で実際の葉束画像を添付したBlender四方向レンダリングを評価する。
