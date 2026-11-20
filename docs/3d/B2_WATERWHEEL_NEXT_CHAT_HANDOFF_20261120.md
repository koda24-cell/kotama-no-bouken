# 第2層・氷洞窟の水車 — 次チャット引継ぎメモ（2026-11-20）

**作業状態：水車の木製架台を1部品ずつBlender 5.3で制作中。次は4部品の実GLB仮組み。** 作品：『コタマのぼうけん』 `koda24-cell/kotama-no-bouken`。

## 0. 新チャット最初の必須行動
1. GitHubの最新 `development` と `AGENTS.md`、`docs/3d/BLENDER_DOCKER_HANDOFF.md`、`docs/3d/ASSET_PROMOTION_POLICY.md`、`docs/3d/BLENDER_SHARED_EXECUTION_ENTRYPOINT.md` を読む。外部ツール収集を伴うときは `docs/3d/TOOLING_AUTO_SHARE_POLICY.md` / `docs/3d/SHARED_TOOLING_CATALOG.md` も読む。
2. 下記のDraft PRと担当ブランチ、最新のレンダリングrun/Artifactをチェック（日時とPR番号だけで最新と決めつけない）。
3. 実GLBをGitHub Actionsから再取得し、元データのSHAを残し、ClamAVスキャン後にBlender 5.3で開く。元形状は編集・破壊しない。
4. **次工程は4部品の仮組み**。寸法を測って配置、干渉/接合を検証し、4方向以上のPNGと接合部接写を実レンダリング。接合不良があれば数値と画像で明示し、改善を繰り返す。
5. 美術承認前の正式素材保存・`development`へのモデルマージ・`main`への変更は禁止。成功ログなしの「レンダリングした」「保存した」は禁止。

## 1. 制作した部品と証拠

| 部品 | バージョン | PR | 実レンダリングActions run | 状態 |
|---|---|---|---|---|
| 初期水車・ハブ/金具/軸受け/軸ほか | 個別 | [#629](https://github.com/koda24-cell/kotama-no-bouken/pull/629) | PR/Actionsを再確認 | 制作履歴あり、正式採用とは別 |
| 鍛鉄製軸受け帯 | V05 | [#630](https://github.com/koda24-cell/kotama-no-bouken/pull/630) | [#44651407566](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44651407566) | 実画像確認済、未承認 |
| 木製支柱 | V03 | [#646](https://github.com/koda24-cell/kotama-no-bouken/pull/646) | [#44654581027](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44654581027) | 未承認。ひび・欠けの追加余地 |
| 石製基礎台座 | V07 | [#650](https://github.com/koda24-cell/kotama-no-bouken/pull/650) | [#44672607240](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44672607240) | 未承認。左角が階段状・石の表情に課題。V06からPoly Haven CC0 Rock Surfaceを実テクスチャとして利用 |
| 斜め筋交い | V02 | [#674](https://github.com/koda24-cell/kotama-no-bouken/pull/674) | [#44673742682](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44673742682) | 未承認。側面の黒帯、木口の均一さ |
| 木製込み栓 | V02 | [#675](https://github.com/koda24-cell/kotama-no-bouken/pull/675) | [#44675019205](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44675019205) | 未承認。小さな削り傷不足、未挿入 |
| 3部品仮組み | V02 | [#680](https://github.com/koda24-cell/kotama-no-bouken/pull/680) | [#44681382553](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44681382553) | 実GLB3個を読んで5方向撮影、接合不合格 |
| **下部横梁** | **V01（直近）** | **[#683](https://github.com/koda24-cell/kotama-no-bouken/pull/683)** | **[#44682786351](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44682786351)** | 独立素材の実レンダリング成功、未承認、**まだ仮組みしていない** |

作業ブランチ：
- 下部横梁 `feature/gpt-b2-waterwheel-lower-crossbeam-v01-20261120`
- 既存3部品仮組み `feature/gpt-b2-waterwheel-frame-assembly-fit-v01-20261120`
- 木製支柱 `feature/gpt-b2-waterwheel-single-timber-support-post-v01-20261120`
- 筋交い `feature/gpt-b2-waterwheel-diagonal-oak-brace-v01-20261120`
- 込み栓 `feature/gpt-b2-waterwheel-oak-drawbore-peg-v01-20261120`
- 石基礎 `feature/gpt-b2-waterwheel-single-stone-footing-v01-20261120`

## 2. 直近の4部品仮組みに必要な情報

現在の3部品仮組みV02は、GitHub Actions run #44681382553 で **GLB3個を実際にインポート**し、正面・側面・斜め・上面・接合部拡大の5方向をレンダリング済。接合不合格：①筋交い下端が宙に浮く、②筋交い上端が柱側面に食い込み、③込み栓が接合位置からずれて突き出す。AABBによる重なりは粗い指標であり、正確なBVH衝突検証や差し込み穴は未実装。

元GLBの取得元（GitHub Actions Artifact ID）：
- 木製支柱V03：`14591853832` / `b2_single_timber_support_post_v03.glb`
- 筋交いV02：`14600384453` / `b2_single_diagonal_oak_brace_v02.glb`
- 込み栓V02：`14601168044` / `b2_single_oak_drawbore_peg_v02.glb`
- 下部横梁V01：`14604858565` / `b2_single_lower_oak_crossbeam_v01.glb`（最終ファイル名はArtifact ZIPで再検証）

**次回の推奨実装**：
1. 既存 [仮組みV02コード](https://github.com/koda24-cell/kotama-no-bouken/blob/feature/gpt-b2-waterwheel-frame-assembly-fit-v01-20261120/tools/b2-waterwheel-frame-assembly/build_v02.py) を参考に、**新しい独立ブランチ**を `development` から作る（既存PRを潰さない）。
2. 上記Artifact4個をダウンロード（認証済GitHub REST API／`curl -L`）、ZIPとGLBにウイルス検査。期限切れのときは元ワークフローで再生成。
3. Blender 5.3で4つとも**GLB実物**を同一シーンへインポートし、元GLBのSHAと読込メッシュ数を manifest に記録。
4. 横梁は単体GLBで**ローカルZ方向**に1.16m。水平にするには**Blender上で約90度回転**が必要。既存支柱の高さ約1.70m、筋交い長さ約1.15m、込み栓長さ約0.205m。横梁断面およそ0.22×0.18m。接合点の世界座標を最初に測ること。
5. 筋交いの下端を横梁上面に合わせ、支柱に対する梁の高さ・接触面積・隙間・食い込み量を数値記録。BVHや最短表面距離を使えるなら導入（ただし結果未検証なら明示）。込み栓は位置指標のままにして実穴を勝手に作らない。
6. 4方向＋筋交い上端／下端それぞれの接写を撮影、GLB、Blend、PNG、SHA manifest、ClamAV、共有GLB監査。実画像をチャットで見せて評価・修正を繰り返す。

## 3. 下部横梁 V01 の直近評価
- [QA文書](B2_LOWER_CROSSBEAM_V01_REAL_RENDER_QA_20261120.md) ／ [設計](B2_LOWER_CROSSBEAM_V01_DESIGN.md) ／ [制作スクリプト](../../tools/b2-waterwheel-lower-crossbeam/build_v01.py) ／ [Actions](../../.github/workflows/b2-waterwheel-lower-crossbeam-v01.yml)
- 1.16×0.22×0.18mの風化オーク横梁。Blender5.3の正面・側面・斜め・上面PNG、GLB、Blend、ClamAV入出力、SHAとGLB構造監査すべて成功。
- 外見課題：木目が縦縞に寄り、欠け方が規則的。撮影用床が明るく見える。取り付け加工（ホゾ・孔）未着手。Art QA=未承認。
- 直近の確認範囲は**単体モデルのみ**で、4部品仮組み済みと誤報告しないこと。

## 4. 開発/安全/レンダリング運用
- `development` が統合先、`main` は承認済候補のみ。ユーザーが完成を承認するまで水車部品のゲーム内投入は禁止。
- Blender 5.3+ClamAV共通固定Docker：
  `ghcr.io/koda24-cell/kotama-blender53-clamav@sha256:5ce601f79b1ab09405b3ebc36b1a596be76cb8b105b1524fcbafcb186ebf7e99`
- GitHub Actionsで3～5方向の**実際のモデル**をレンダリングして評価し、失敗・問題の改善もQA文書に記録。Artifactsは14日間の一時保管であり恒久保存ではない。
- `python3 tools/3d-performance/audit_glb.py 'render-output/.../*.glb' --output ...` など共有監査を使用。実ゲームFPSは別途検証必要。
- Pinterestで新規参考資料を探すなら先に `koda24-cell/pinterest-reference-library/AGENTS.md` と引継ぎ手順を読み、依頼・参考ポイント・保存先を記録。素材ダウンロード時はライセンス確認＋取得直後のClamAV。
- ユーザー要望：大きな部品を一気に作らず**1パーツずつ**。毎回実レンダリングで細部の品質を高める。既存形状を保持し必要ならテクスチャ画像を実際に貼る。単なる説明や画像生成だけで3Dモデル完成としない。
