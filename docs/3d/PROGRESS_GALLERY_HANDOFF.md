# 3D制作進捗サイト
プレビュー: preview/3d-progress.html
台帳: 3d-progress-data ブランチの index.json。ゲーム正式素材とは別。
各制作ジョブで正常レンダリング・ClamAV検査後、公開可能と確認された画像のみ登録する。公開可否と美術承認は別。未公開・第三者素材の画像を勝手に公開しない。
同じモデルには同じ id を使用し、新モデルは新しい id を使用する。日時は実際の生成時刻。古い日時は最新を上書きしない。
登録例 manifest（値は例）:
```json
{"id":"b2-waterwheel","name":"水車","floor":"第2層","version":"V01","status":"承認待ち","publication_cleared":true,"run_id":123,"source_sha":"0123456789012345678901234567890123456789","updated_at":"2026-11-24T02:00:00Z","images":[{"view":"正面","file":"front.png"}]}
```
制作側の register.py を保持し、別 checkout の 3d-progress-data を対象に python3 register.py --registry /path/to/registry --manifest /path/to/manifest.json --source /path/to/render-output を実行する。
画像と台帳を同一コミットで push する。競合時は最新台帳を再取得し登録処理を再実行する。force push 禁止。失敗時は旧画像を保持。完成承認は既存ポリシーに従う。
現状: サイトと登録スクリプトの初期実装。既存Artifact取り込み、Actions呼び出し、公開範囲確認、実画像・ブラウザ試験は未実施。
