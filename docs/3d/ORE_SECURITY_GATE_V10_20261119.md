# 結晶素材 V10 取得前後の安全ゲート

## 状態: 実装済み / Actionsでの実行検証待ち（安全検査の自動確認OKではない）

- 対象: PR #519 / `.github/workflows/ore-cc0-download.yml`
- 外部素材の取得後、SHA-256・形式検証、ClamAVの最新定義取得と再帰スキャンを実施する。
- 外部 .blend は `blender -b --disable-autoexec --python tools/ore/check_blend_python_safety.py -- ore-cc0-review` で検査。埋め込みTextデータブロック、スクリプト付きドライバーを拒否する。
- すべてのゲートを通過した場合だけ、ダウンロード素材のArtifactを公開する。下流レンダリングジョブはこのArtifactに依存する。
- 下流のBlender起動にも `--disable-autoexec` を指定する。
- **合格の定義**: 実際のActions runでClamAVとPython安全検査が成功し、SHA-256検査も成功し、ログを確認できた場合のみ「安全検査の自動確認OK」と記録する。
- **限界**: ウイルススキャンと自動実行抑止だけでは、Blender自体の脆弱性や未知のマルウェア、外部ライブラリ経由のコード実行を完全に排除できない。信頼できないファイルは隔離環境で扱う。
- **重要**: このガードは現在V10の試験ブランチ専用。他の素材収集・制作ワークフローへの全体適用は未実施。
