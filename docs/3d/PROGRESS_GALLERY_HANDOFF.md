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

## 共通Actions接続
正常なレンダリング・検査・Artifact保存ジョブの後に、呼び出し元で contents: write を明示し、次の再利用ワークフローを呼ぶ。公開範囲の確認が前提。長時間制作では反復単位で呼ぶ。
```yaml
  register_preview:
    needs: render
    uses: ./.github/workflows/3d-progress-register.yml
    permissions:
      contents: write
    with:
      artifact: reviewed-render-preview
      publication_cleared: true
```
Artifactのルートに manifest.json と対象PNGを置く。run_id と source_sha は呼び出し元実行と一致させる。
既存成果物は取得・展開・ClamAV検査後、公開可能な画像だけを明示した配列 [{"directory":"artifact-folder","manifest":{...}}] を backfill.py --registry ... --batch ... --source ... に渡す。自動推測で画像を公開しない。
2026-11-24: 回帰テスト run 45312857287 成功、実Blender 5.3・ClamAV・隔離台帳登録 run 45312846758 成功。Artifact 14884710234。実モデルの公開台帳登録、ブラウザ試験、各制作ジョブへの接続は未検証。

## 部品単位の掲載要件（ユーザー指定）
大型完成品だけでなく、壁・天井・床・柱・梁・接合金具・小石・草・葉・窓・装備の各独立制作部品も対象。組立品と構成部品を別の安定IDで登録し、サイズを理由に除外しない。同一部品の改版は同一IDで最新化する。未マージ・未承認も掲載し、状態を区別する。レンダリング未取得の部品は未取得として扱い、画像を捏造しない。元テクスチャや検査用ダミーはモデルと混同しない。
