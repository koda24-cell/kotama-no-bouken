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