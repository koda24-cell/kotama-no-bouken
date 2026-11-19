# 第3層「遺跡都市」割れた窓ガラス01 — 独立パーツ制作と品質判定

更新: 2026-11-19。**未承認、ゲーム未統合**。

## 設計
- 幅約1.12m・高さ約1.80mのガラス残存部。既存窓枠横材1.40m・縦材2.25mの内側へ将来配置する想定だが、今回それらのモデルは変更しない。
- 厚み6mm（Blender Solidify）。右上・左上付近に形が異なる欠け・段差を配置。破損の立体輪郭を画像線だけで表現しない。
- V1：ガラス残存シルエットのみ。V2：ガラス欠けから伝播する枝分かれ亀裂を細いメッシュで追加。V3：亀裂数追加＋再利用可能な256pxの自作汚れマスクを使い、近距離の曇り感を調整する。
- ランダムなガラス片を大量に空中配置しない。窓枠や周辺壁、鉄筋、植物などを一括制作しない。

## 必須レビュー
1. 正面：単調なジグザグに見えず、大小の破断位置が異なっているか。
2. 側面：厚みが薄く、板ガラスとしてのシルエットが成立するか。
3. 斜め：汚れの曇り、ハイライト、透過が適切に共存するか。
4. 亀裂がガラス表面から浮いて見えないか。ハイライトで線が見えなくなっていないか。
5. Blender Cyclesから得た実PNGとGLBを必ず目視し、透明材質をThree.jsで正しく再現できるかは**別途未検証**と明記する。
6. GLBが透過比較用背景を含まないこと。生成されたPNG・Blend・GLBをSHA-256 manifestで突合する。
7. 自作ダストマスク画像のSHA・解像度・生成コード・承認状態を共有台帳へ登録。ただし一時ArtifactをGit正式保存したとは主張しない。

## 現在の起点
- Draft [PR #565](https://github.com/koda24-cell/kotama-no-bouken/pull/565) → development
- `tools/floor3/broken_glass01/build.py`
- `.github/workflows/f3-broken-glass01-render.yml`
- [Actions run #44455660695](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455660695)
- 元の壁01、鉄筋01、窓枠縦材01 V5・横材01 V4・接合金具01 V5を保持。承認前の正式GLB保存/マージなし。

## 安全
- 実際のClamAVスキャンとウイルス定義更新がジョブで行われた場合にのみ成功記録を残す。PNGヘッダーとSHAの基本検査のみではウイルススキャン済みと記載しない。
- Actions artifactは14日間の一時保存。ジョブ間の自動checkpoint復旧は本金具・ガラス専用には未検証。

## 実レンダリングによる初回判定
- [run #44455660695](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44455660695): **success**。V1/V2/V3それぞれ正面・側面・斜めPNG計9枚・GLB3個・Blend3個・自作汚れPNG1枚をArtifact #14498525631から取得。manifestの全16ファイルのSHA256一致を確認した。
- GLB実測三角形：V1 296、V2 428、V3 500。これらは描画負荷やゲーム内FPSを直接保証しない。
- 画像QA：初回3版とも白っぽく、断面とひび割れが見えにくい。上部の破断輪郭が周期的なノコギリ状。**美術不合格**。
- V4は `tools/floor3/broken_glass01/build_v4.py` で破断輪郭を調整し、より暗い背景で正面・側面・斜め・破断部拡大をレンダリングする。
- [V4 run #44456704485](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44456704485) は作成済み。V4についての成功判定と画質の評価は **実際の完了・Artifact確認まで未確定** とする。
- 256px自作マスク `F3_WINDOW_DIRT_MASK_01` SHA-256 `e1df204118e4b6c47bf191008adb4aa433edf0039378fdadb9fcb3b48fc73fc1`。共有テクスチャ台帳へdocs PR #574からdevelopmentに反映済み。ただし画像本体の正式Git保存はまだない。
