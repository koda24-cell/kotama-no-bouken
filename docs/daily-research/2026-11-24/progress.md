# コタマ制作定点観測 — 2026-11-24

取得日時 2026-11-24T08:26:00+09:00。対象development b8391aa。期間11/23 08:00〜11/24 08:00 JST。

| 指標 | 前回 | 今回 | 前日集計との差 |
| --- | ---: | ---: | ---: |
| development到達可能コミット（期間、merge込み） | 11 | 45 | +34 |
| repo全baseのPR作成（期間） | 15 | 18 | +3 |
| repo全baseのPRマージ（期間） | 6 | 16 | +10 |
| repo全体open PR（取得時点） | 345 | 347 | +2 |
| 3D共有INDEX行 | 726 | 726 | 0 |

日次件数差と累積head差を混同しない。前回head fb8a776→今回b8391aaの比較はahead45/behind0。openは各取得時点の値、過去期間末の歴史値ではない。全体の承認/描画/正式保存/実装階層/反復総数は未集計。INDEXはtextures461/models227/packs26/hdris12で分類誤り候補を今回勝手に移動しない。

## 開始日の検証改善
固定headのcommits APIをper_page1で倍増・二分探索し、到達可能な履歴は1521件。最終ページのrootはparent0、[ゲームファイルを追加](https://github.com/koda24-cell/kotama-no-bouken/commit/bd9edb22d43bab9555bb867b37208dd3453fa1e9)、**2026-11-05 21:17:24 JST**。index.html/script.js/style.cssとassets追加を確認。履歴の起点から約18.46日。これはGitHubでゲームファイルが追加された最初の確認日であり、構想・ローカル制作開始や本格開発への移行日を推測で同日としない。後者は未確定。

## 進捗と節目
- [PR728](https://github.com/koda24-cell/kotama-no-bouken/pull/728) V4が統合済み。狭い閉鎖通路・両面アーチ・反射水・段階石材。106セル/11分岐の記録。
- [PR733](https://github.com/koda24-cell/kotama-no-bouken/pull/733) V5が統合済み。191セル/31分岐、木漏れ日/群配置/低い壁の裏当て。数値は保存PR記録を読んだもので今回のゲーム再実行ではない。
- [PR736](https://github.com/koda24-cell/kotama-no-bouken/pull/736) V6は未マージ。3草/3岩/3移行壁の逐次制作と草カード、横移動中の視界修正、行き止まりの会話配置。文書PR744の統合と本体統合を混同しない。12GLB/60方向PNGは文書記録、15ゲームPNGと草比較PNGはAPIで存在確認。画素未取得・未目視。
- [PR742](https://github.com/koda24-cell/kotama-no-bouken/pull/742) 第1/5層BGM参照更新が統合済み。既存アップロード2MP3を保持して整理。ブラウザ試聴/音源権利/安全を今回再確認したとはしない。
- V4→V5→V6は品質改善の節目候補として残すが、最終美術承認/全端末FPS/長期完走/公開完成とは数えない。本日は火曜日なので週報を重複生成しない。

## Actionsを実ログで確認
[run45267597594](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/45267597594) はV6 featureのsecurity/performance/archive-proof3job success。security job138018530065の実ログでClamAV1.5.4、定義daily28192/main63/bytecode339更新、296files/Infected0/SCAN_PASSを確認。常用scan_gate.shのpipefailで非0を伝播する実装と成功ログを照合し0終了を確認した。保存されたfinal-candidates.log/DEFINITIONS_UPDATEDも読了。Artifact14863567655/14862928099は未失効。今回新規素材をスキャンした結果ではなく、既存V6の実行証拠の再確認。
最新developmentの一般Auto Review45153419891はstartup_failureのまま。構造性能監査45153419874のsuccessと分離し、自動LOD成功としない。

## 画像と発信
3試作の原PNG不足を優先。画像状態はimage-register.json、5候補と短編下書き/X2案はeditorial.md。新規画像取得・加工・生成・保存0、実画像の今回目視確認0。安全取得scriptはゲーム/共有3D/音声developmentに存在せず、直接ダウンロードで迂回しない。
素材調査の正本は[3D PR43](https://github.com/koda24-cell/3d-asset-studio/pull/43) と[音声PR14](https://github.com/koda24-cell/music-ai-studio/pull/14)の11/24 report。note/X/公式サイトへ投稿しない。本人の公開承認待ちを維持。
