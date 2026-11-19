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
