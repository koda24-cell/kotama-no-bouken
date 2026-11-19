# 第4層 GPT制作モデル 取り込み候補（gpt-import）

棚卸し日: 2026-11-19（Claude）。一覧と推奨は `docs/3d/B4_GPT_MODEL_INVENTORY.md` を参照。

- ここにあるのは**未マージPRブランチにしかなかったGLB**のコピー。ゲームにはまだ組み込んでいない（どのJSからも読み込んでいない）。
- development に既にあるGLB（`assets/models/floor4/*.glb`、`assets/3d/dungeons/b4_dragonfire/models/*.glb`）は二重に置かないため、ここにはコピーしていない。
- sha256 は取り出したファイルで計算した値。V33 は元の manifest（`rockwall-magma/source-manifest.json`）の値と一致することを確認済み。

## rockwall-magma/

| ファイル | 出典PR | ブランチ | コミット | 元のパス | サイズ | sha256 | 承認 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `b4-v33-magma-rockwall.glb` | #381（制作 #379） | `assets/b4-v33-approved-20261115` | `e705ed2cad3aec80cc8e0de389d680c8a8c15e8e` | `assets/models/floor4/b4-v33-magma-rockwall.glb` | 15,093,524 B | `dfa861b95f08c8f799cacb426ad389c3acb7b0c8d0bf8e9416a323505aa72e8b` | **ユーザー承認 2026-11-15** |
| `b4-v33-front-lit.png` | #381 | 同上 | 同上 | `assets/models/floor4/reviews/b4-v33-magma-rockwall/b4-v33-front-lit.png` | 880,997 B | `625536b1e5c5a24ec7800e030064910163ef5a2f5f4f85adceee387ec70ffcb7` | — |
| `b4-v33-angle-lit.png` | #381 | 同上 | 同上 | `.../b4-v33-angle-lit.png` | 827,609 B | `8e3578c463d053c781cefb5918eb812a9b1696d8c99a32a712cce54bead15206` | — |
| `source-manifest.json` | #381 | 同上 | 同上 | `.../b4-v33-magma-rockwall/manifest.json` | 1,610 B | `fc060fd3ab10875a73b9c992de449482cf722f3e28a5a484e9ea3d16ba126e20` | — |
| `lava-rockwall-v2-unapproved.glb` | #276（制作 #274） | `feature/b4-lava-rockwall-v2-archive-20261112` | `73ea874130e7e726a3d4b62f107de0bcd73aced1` | `assets/models/floor4/lava-rockwall-v2.glb` | 382,752 B | `866f1da37c18a00ec0ff7e3c993437fb70398bc1b72b0908c652a6586fb179fd` | **未承認**（GPT自己評価 4.5/10）。参考保存のみ |
| `lava-rockwall-v2-angle.png` | #276 | 同上 | 同上 | `assets/models/floor4/reviews/lava-rockwall-v2/angle.png` | 621,171 B | `233a4a1a8f11722fef17b9cd4f0dd4a493f7b4ee41c473f89df12a486dddbe38` | — |

### V33 の内容（GLBのJSONチャンクから計測）
- メッシュ99、ノード100、三角形 約400,570、マテリアル6、**埋め込み画像0**（Blenderの手続きマテリアルは書き出されていない。ゲームでは単色＋発光になる）、アニメーション0。
- 承認時から分かっている課題（引継ぎ文書より）: 下の岩塊が浮いている、背面に格子状の模様、火の粉が下に集中。
- 岩の一部は Poly Haven Rock Face 02（CC0）を参照しているため、ASSETS_CREDITS への記載が必要。
