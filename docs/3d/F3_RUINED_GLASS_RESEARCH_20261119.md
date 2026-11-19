# 第3層 遺跡都市 — 廃墟ガラス資料調査／制作方針（2026-11-19）

## 状況
- ユーザーの依頼は**まず資料アサリ**。モデルの変更・完成宣言はせず、既存ガラスPR #565および壁/窓枠/鉄筋/接合金具を保持。
- Pinterest公開候補6件（検索結果ベース）、実物の廃墟写真5件、ガラス破損/汚れの技術資料5件、無料商用可の素材候補5件を照合。
- 共通資料: https://github.com/koda24-cell/pinterest-reference-library/blob/main/references/f3-ruined-broken-window-glass-20261119.md
- GPT/Claude引き継ぎ: https://github.com/koda24-cell/pinterest-reference-library/blob/main/handoff/f3-ruined-broken-window-glass-20261119.md
- **Pinterest Pinサムネイルの直接取得にDNS制限があり、Pin画像の高精細目視は未完了。候補を保存したと報告しない。** 実物廃墟画像は別のウェブ画像検索結果で視認した。

## 研究で確定した設計上の区別
### 1. 普通板ガラス (annealed)
- 残存大破片、衝撃孔、長い鋭い放射/枝分かれ亀裂。特に窓枠に囲まれた四辺と下端に割れ残りが生じる構図を複数用意。
- 参考: https://www.ngci.co.jp/en/tech/tech_kn6/ ; https://www.structuremag.org/article/crack-patterns-tell-the-story-of-glass-breakage/
### 2. 網入りガラス (wired)
- 中に埋め込まれた金属網が細片を保持するので、ガラス破損部とワイヤーを分離して表現。窓ガラスが全面脱落した普通板と見分けられるようにする。
- 参考: https://www.ngci.co.jp/en/tech/tech_kn6/
### 3. 強化ガラス／合わせガラス
- 強化: 細粒化しやすい。合わせ: 破断片が中間膜に接着し残る。普通板の巨大鋭利片をそのまま全方式に適用しない。
- 参考: https://www.ngci.co.jp/en/tech/tech_kn6/
### 4. 風化と汚れ
- 汚れや水分に関係する変化は枠周辺、下端、垂れ道などへ局所的に配置。全体を同じ白色の曇りにしない。
- 参考: https://boppardconservationproject.wordpress.com/2014/03/03/looking-at-dirt-corrosion-and-paint/ ; https://manual.museum.wa.gov.au/conservation-and-care-collections-2017/glass/deterioration/index.html

## 実装への推奨分割
- **まず普通板ガラス3亜種**：A大穴/周辺残存、B角欠損/長い分岐亀裂、C下端に大きな鋭い破片が残る。
- **網入りガラス1亜種**：薄い金属網・各網目に残存破片。さらに部分欠損の差分。
- 必要な3D形状はガラス外形・実厚・欠けの断面・残存シャードに限定。汚れ・小傷・短いひび・透過率/粗さはPBRテクスチャ/マスクを活用。
- 実GLBの透過検証にはKhronosサンプル `GlassBrokenWindow` を参照: https://asset-explorer.needle.tools/GlassBrokenWindow 。`KHR_materials_transmission` + `alphaMode:'MASK'` とし、破断穴と透過領域を分離する。**そのままThree.jsで正しく動作したと主張しない**。
- ガラス本体を白く塗るのでなく、縁で細い反射や屈折の見え方を調整。明るい外景と暗い室内の両方でレンダリングし、輪郭が不自然にギザギザしていないか確認する。
- 著作権/ライセンスに注意し、Pinterestの画像やGetty写真は実画像テクスチャとして無断流用しない。

## 実利用できる候補
1. [Khronos Broken Glass Window glTF](https://asset-explorer.needle.tools/GlassBrokenWindow) — **CC BY 4.0** / 作者表示を含む条件確認が必要 / glTFサンプル・約1.03MB / ページ確認済み、GLB実取得未確認。
2. [ambientCG Fingerprints001](https://ambientcg.com/view?id=Fingerprints001) — **CC0** / ガラスの局所汚れ / 素材未取得。
3. [ambientCG Scratches005](https://ambientcg.com/view?id=Scratches005) — **CC0** / 細傷マスク / 素材未取得。
4. [ambientCG SurfaceImperfections001](https://ambientcg.com/view?id=SurfaceImperfections001) — **CC0** / 局所Roughness / 素材未取得。
5. [Poly Haven Abandoned Tiled Room HDRI](https://polyhaven.com/a/abandoned_tiled_room) — **CC0** / 廃工場環境での反射・透過テスト / 素材未取得。

ライセンス元: https://polyhaven.com/license ; https://ambientcg.com/view?id=Fingerprints001 ; https://asset-explorer.needle.tools/GlassBrokenWindow 。

## 品質・保存ゲート
- PR #565のV1～V3は旧画像では全体が白く、ひびが見えない。V4 Actions run #44456704485は作業開始時点で成功run情報を確認したが、**改善後の実PNG目視と透過問題の再評価はこの調査とは別工程**。
- 無料素材は取得後にClamAV実スキャンとSHA256、利用規約、GLB/PNG形式検証を行う。調査しただけではゲーム用素材に採用できない。
- 未承認GLB/PNGはGit正式素材フォルダへ昇格せず、承認待ちにする。
