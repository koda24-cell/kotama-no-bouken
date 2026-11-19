# 第2層 水V3 Blender試験 — 未承認

目的：前回の格子状の水面、単調な川底、反射、砂利、霧の不足を改善する。

## 実装
- tools/f2-water/safe_acquire.py：Poly Haven River Small Rocks 1K diffuseを隔離ダウンロードし、SHA-256記録・ClamAV検査完了後のみ画像をデコード。
- tools/f2-water/render_water.py：Cyclesで川底の実写テクスチャ、砂利メッシュ、透明な青緑の水面、不規則な小波、岸際の泡、薄いボリューム霧を描画する試験コード。WAVYアドオンは使用しない。
- .github/workflows/f2-safe-water-render.yml：ClamAV定義更新、ファイル検査、Blenderで正面・側面・斜めPNG、blendと検査manifestをArtifactに保存。失敗時は停止。

## 現時点で未完了
- Actionsの成功run、ClamAV実スキャンログ、公式素材取得、PNGの実レンダリング、Blenderファイルの読み込み検証は未確認。
- 法線/roughnessの実写PBR、リアルタイムGPU caustics、フローマップ、局所の粒状きらめきは未実装。水面と泡は第一段階の試験コード。
- 外部素材はコミットしない。承認までGLB・PNGをゲームの正式素材にはしない。現状 NOT_APPROVED。

## 次の確認
1. GitHub Actionsの実run番号と失敗/成功ジョブを確認。
2. scan_manifestのSHA、ClamAVバージョン、終了コード、一次検査ログを確認。
3. front/side/angle PNGの現物とblendを確認し、品質不合格点を洗い出す。
4. 鮮やかさ、水底の石、自然な水面、きらめき、靄を段階的に調整し、再レンダリング。

実行入口：https://github.com/koda24-cell/kotama-no-bouken/actions/workflows/f2-safe-water-render.yml

## 実行結果の証拠と反映方法（2026-11-19追記）
- 本PRは `tools/f2-water/report_run.py` により **Actionsの成功・失敗どちらでも** `execution_report.json` とGitHub Job Summaryを生成する設計。run ID/URL・スキャン判定・exit code・取得元SHA・レンダー画像報告数・エラーを記録。隔離中の未スキャンファイルはArtifactsアップロード対象から除外。
- 正式な結果判定は、Actions run と実Artifact/PNGを人が確認して初めて行う。レポート生成コードを保存しただけで検査済み・レンダー済みとはしない。
- **本追記時点で照会できたPR起因のワークフローrunは0件。** この照会はpush起因の実行を網羅しない。run IDが得られるまでは「スキャン未検証／レンダー未検証」を維持する。
- 次の担当はActionsからrunを開き、成功/失敗・実際のClamAVログ・manifest・front/side/angle PNGを確認し、結果と証拠URLを本書または実行結果台帳に更新する。失敗時もエラー原因と再実行結果を追記する。自動レポートをGitHubの文書へ書き戻す権限・仕組みは現時点で未実装。


## run IDを手動で探さないための実行結果投稿（2026-11-19）
- ワークフローに独立した `publish-run-link` ジョブを追加。描画・スキャンが成功しても失敗しても `always()` で起動し、run URL・run ID・検査と描画の結果を、対象のオープンPRへ GitHub APIで自動投稿または更新する設計。
- 同一PRで複数runの結果が混ざらないよう、識別マーカー `f2-water-run-status` の既存ボットコメントを更新する。投稿には `issues:write` と `pull-requests:read`、結果Artifactの取得には `actions:read` をジョブ単位で使用。スキャン・レンダリング本体は `contents:read` のまま。
- Artifactが無い・スキャンが失敗した場合も、失敗を隠さず `UNVERIFIED` とrun URLを表示する。安全確認の合格は実manifestに依存し、レンダ品質承認とは別。
- **2026-11-19の実際の観測**：ワークフローコードのGitHub保存は確認。コミットから照会できるPR起因runは0件であり、push起因の全runの列挙はこのコネクタでは不可。PRコメントの自動作成、run ID取得、ClamAVスキャン、Blender PNGの実動作は**未検証**。コメントまたはActionsの実行URLが判明した時点で、ログ・成果物・失敗原因を確認して本書を追記する。
- この仕組みは水V3ワークフローにまず試験導入したもので、**他階層・全ワークフローに実装済みではない**。安定動作確認後に共有テンプレートとして移植する。PRの投稿権限が制限される環境では投稿が失敗しうるため、Job SummaryとArtifactは引き続き利用する。


## 確認済みの実行結果（2026-11-19、GitHub Actionsの実ログに基づく）
- [Run #44429500884](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44429500884)／scan-renderジョブ #135242924970。GitHub APIからジョブステップとログの実体を取得して確認。
- ClamAV導入：成功。freshclamで daily.cvd (28187)、main.cvd (63)、bytecode.cvd (339) を更新。スキャナ `ClamAV 1.5.4/28187`。
- Poly Havenの `river_small_rocks_diff_1k.jpg` （1,028,735 bytes）の取得成功。SHA-256 `adbcaae1f1445d5b49797c71ea2c3f43ccaf7b109f933a427f0d0993d1dbbc51`。
- `clamscan --no-summary out/f2-water/quarantine/river_small_rocks_diff_1k.jpg`：**終了コード0、ログ `river_small_rocks_diff_1k.jpg: OK`。このファイルのウイルス検査は確認OK**。形式検査後のverified移動が記録されている。マルウェアの不存在を絶対保証するものではない。
- 同runのレンダリング：**失敗**。Blenderは取得済み画像をロードしてCycles描画開始まで到達したが、`RuntimeError: Error: Build without OpenImageDenoiser` で停止。検査処理の失敗ではない。front/side/angle実PNGの成功は未確認。
- 修正：`tools/f2-water/render_water.py` のdenoisingをFalseに変更し、互換性問題を回避する候補をコミット。修正後の再実行成否は別runの結果確認が必要。
- その他のrunの結果を推測で成功扱いしない。確認済み証拠は上記runに限定。


## V3 実レンダリング成功記録（2026-11-19）
- [Actions Run #44434710785](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44434710785) の `scan-render` ジョブ #135260550981 は **success**。ClamAV更新、隔離ダウンロード・スキャン、Blender Cycles front/side/angle レンダリング、出力形式・サイズ確認、レポート生成、Artifactアップロードの全ステップ成功をGitHub APIジョブ結果で確認。
- 成果物 `f2-water-scan-render-candidate` Artifact ID **14489801084**（4,851,569 bytes、未失効）がGitHub APIで確認済み。PNGの描画内容の目視評価はまだ未実施であり、美観は **NOT_APPROVED**。
- ワークフロー全体が failure なのは独立した `publish-run-link` ジョブ #135272472384 が GitHub REST `issues/517/comments` で **403 Resource not accessible by integration** を受けたため。レンダリング失敗ではない。
- 投稿失敗をワークフロー全体の失敗扱いにしないよう、403を捕捉しJob Summaryにrun URLと安全判定を残す修正コミットを追加。**この修正後の実行確認は未完了**。PRコメントを本当に投稿するにはrepository GitHub Actionsのworkflow tokenにIssue/PRへの書込権限が必要となる場合がある。権限を独断変更せず、Artifact/Job Summaryを優先する。


## V3実画像の目視検査・V4改善（2026-11-19、GPT検証）
- Artifact ID 14489801084 のZIPを実取得し、PNG 3枚を展開、render_manifest記載のSHA-256とサイズが一致することを確認した。front/side/angleを実際に画像表示して目視確認。
- **V3見た目は不合格**：水面が濃い青緑で不透明、細かなザラザラしたノイズが水全域に出ている。岸の大岩は白灰色で単調な丸い低ポリ、岸の泡は白い点の列、端に直線的な板状境界が見える。川底の石の立体感が水越しに分かりにくい。大きな白い照明反射も不自然。V3は安全検査合格・技術レンダ成功であり、芸術品質合格ではない。
- **V4試験変更**：水面に透過Mix Shaderと細かなNoise→Bumpを組み合わせる。暗い水色を薄い青緑へ、水面の材質透過重みを下げ川底を見せる。石の材質を4色化して大岩の数とサイズを減らす。泡の数・サイズを小さく。照明の強度を下げ拡散する。薄い霧と川底の既存形状を保持。Blendファイルを `f2-water-v4.blend` へ分離。
- [V4 Actions Run #44439733411](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44439733411) は新コードpushにより起動確認。**本記載時点でin_progress**、結果・実PNGは未確認。ClamAV fail-closedを維持。
- ワークフロー全体の正常終了は旧コード修正run [#44438855211](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44438855211) でsuccess確認。PRコメントの権限403はジョブSummaryへ代替し、失敗としてカウントしない設計。V4実レンダ品質は別途確認すること。

 
## V5 水面画像を貼りつつ透過を保つ試験（2026-11-19）
- ユーザー指定順：①水の色を薄くする、②水面テクスチャ追加、③Bump、④Roughness/反射ムラ、⑤Fresnel、⑥3方向実レンダ確認。中間承認を求めない。
- Blenderスクリプト内で画像 `f2-water-surface-v5.png`（256²・タイル可能な独自の複合周期波高マスク）を**外部ダウンロードせず生成**。これを水面テクスチャ画像として使用し、法線・ラフネスを変える。色画像のベタ貼りはせず、ほぼ無色の透過BSDFに画像駆動の微弱なGlossyとFresnelを加える。濃いゼラチン風の着色Principled透過材質は水面から外す。河床CC0のClamAVゲート・ハッシュ一致確認は継続。水のメッシュと岩は保持。
- 実行対象：`tools/f2-water/render_water.py`、 `.github/workflows/f2-safe-water-render.yml`。GLBゲーム統合・正式素材保存は未実施。V5 `.blend` は画像をパックして単体レビュー可能にする。
- [V5確認対象Run #44442337728](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44442337728)（ワークフローも更新済み版）、[先行V5 Run #44442319272](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44442319272)。この記録時点で両方とも成功・実PNGは未確認。実行後ログ・Artifactsを検証すること。


## V6 水面の視認性改善（2026-11-19）
- V5実レンダリングは成功したが、水面がほぼ見えず川底がむき出しに見えるとの指摘。透明度を下げて濃い水色にするのではなく、水面法線/画像駆動の反射に重点を置く。
- V6: 既存の生成画像を波のNormal（Bump強度0.29、Distance0.026）、反射向けGlossy、Fresnel依存反射（基本0.15+角度依存最大0.40）、局所の淡い発光ハイライト（画像マスク依存）として利用。微細な分断反射筋92本を水面上に独立薄膜で追加。川底は透明BSDFから透視可能。外部画像を追加取得せず、新たな未検査素材を使わない。
- V6候補ファイル: `f2-water-surface-v6.png`, `f2-water-v6.blend`, 3方向PNG、scan/render/execution manifest。
- [V6 Run #44444579533](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444579533) はpushによる実起動を確認。**実行開始時点で in_progress**。ClamAV実スキャン・レンダリング・画像品質はこのV6 runのログとArtifactを確認するまでは未検証。既存成果物の正式保存とマージは引き続き保留。


## V6実行結果・実PNG目視判定（2026-11-19）
- 実レンダ成功：[Run #44444562592](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44444562592)。scan-render と publish-run-link ジョブともに success。
- Artifact ID **14493275750** を実取得してZIP展開。front / side / angle 3方向PNGを画像表示し、render_manifestの各SHA-256・ファイルサイズが実ファイルと一致することを確認。
- ClamAV 1.5.4、検査exit code 0、`river_small_rocks_diff_1k.jpg: OK`。検査素材 SHA-256 `adbcaae1f1445d5b49797c71ea2c3f43ccaf7b109f933a427f0d0993d1dbbc51`、report `safety_check=CONFIRMED_OK`、`approval=NOT_APPROVED`。
- **美観判定：不合格**。濡れた地面に小さな白い線が散ったように見え、連続した水面の量感・透明な浅瀬の輪郭が弱い。手前側の白い反射パッチが大きく不自然。岩は低ポリの明るい灰色で、自然な岸とのなじみも不足。今後は水面の実在感を、単純な線の追加ではなく、屈折・微細法線の方向性、なだらかなフレネル反射、浅瀬の色変化、細い泡マスクで改善する。
- 注意：この成功runはワークフローのBlend/画像Artifact名更新より**前**のコミットで起動されたため、保存されたZIPには3方向PNGと3種類のmanifest、scan-version.txtの7点のみ。V6のBlend・surface textureはこのArtifactには含まれない。更新後run #44444579533 はcancelled。Blend/texture保存は未検証。
