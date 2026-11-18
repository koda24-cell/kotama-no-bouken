# 外部素材のClamAVセキュリティ検査（試験導入）

- ツール: ClamAV — https://www.clamav.net/ / https://github.com/Cisco-Talos/clamav
- 費用: オープンソース・無料（GitHub Actionsの利用枠や実行環境の費用とは別）
- 用途: Blenderアドオン、ZIP、BLEND、GLB、テクスチャ等の取得後検査
- 状態（2026-11-19）: ワークフロー追加のPR候補。**Actions成功・検出精度・各素材の安全性は未検証**。
- 導入場所: `.github/workflows/asset-clamav-scan.yml`
- 実行: `development` へ統合後、対象ファイルを変更するPR時に自動実行。既定ブランチに登録済みの場合はActions画面から手動実行も可能。
- 処理: リポジトリ内のGit追跡ファイルを対象にClamAV定義更新→検査。感染・スキャンエラー・定義更新失敗でジョブ失敗。GitHubが追跡しないダウンロードやActions Artifactは**自動的には検査されない**。
- 重要: 実際の外部素材取得工程では、隔離領域に保存後、**解凍やBlenderのPython自動実行より前**に同じClamAVで元ZIPなどを検査し、解凍後の内容も再検査する。未検査・判定不能の素材を実行・正式保存しない。
- 制限: 100MB超の個別ファイルや500MB超の内部検査サイズは警告検出扱い。ClamAVの陰性判定は無害の証明ではない。特に`.blend`の起動時Pythonとアドオンのコードは別途静的レビューが必要。
- 次の検証: 安全なテストファイルで成功、EICARテスト文字列で失敗、定義更新エラーで失敗することをGitHub Actionsのrunで確かめる（EICARは本番素材にコミットしない）。
- 承認: 検査成功と3D素材の品質承認は別。既存素材とゲームロジックを変更しない。

## 取得直後の強制チェック用ツール（2026-11-19 追加）

- 実装: `tools/security/safe_asset_download.py`。標準ライブラリでHTTPS取得し一時隔離、**ClamAVが正常終了した場合のみ**指定先に移動する。
- ZIP取得時は `--unpack-zip` を指定すると**ZIP本体の検査→安全なパス・サイズ検査→解凍→展開ファイルの再検査→移動**の順に処理する。感染・検査エラー・定義欠落・危険なアーカイブは遮断する。
- 例: `python3 tools/security/safe_asset_download.py 'https://example.org/asset.zip' quarantine-accepted/asset --unpack-zip`
- 実行前に `clamscan` および更新済み定義が存在する必要がある。GitHub Actionsのセットアップ手順はワークフロー参照。
- `tools/security/test_safe_asset_download.py` はモックを用いたオフライン単体試験。**単体試験合格だけでClamAV本物の検出性能は証明できない**。
- 現状の接続範囲: **新規の安全ダウンローダーを採用した取得処理のみ**をゲート化。既存の各階層・音声・定期収集のすべての取得コードを置換したわけではない。既存の直接curl/wget/requests処理には別途組み込みが必要。
- 取得先のドメイン、ライセンス、Blender内Python、アドオン自体の挙動については別の検査が必要。ウイルススキャンが成功してもアドオンを自動実行しない。
- 定義更新が正常に動くGitHub Actionsで、実際のクリーンファイルとEICARの遮断結果を確認するまで運用未検証とする。
