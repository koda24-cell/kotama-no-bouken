# 非公開移行と旧URLの廃止

ゲームの確認は認証付き Cloudflare 固定URLを使う。GitHubの公開設定変更は、公開版・公式リンク・制作進捗サイト・制作環境の切替前検証を済ませ、ユーザー承認を得てから行う。[移行条件](PRIVATE_GAME_AND_PUBLIC_TOOLING_MIGRATION.md)

## 旧URLの台帳

`python3 tools/cloudflare-preview/inventory_legacy_urls.py <UTF-8の資料またはPR・コメント書き出し>` で、実際に記載されたゲーム本体へのリンクと記載箇所をJSONに抽出する。接続や削除操作は行わない。ブランチ名にスラッシュが入ることがあるので、固定SHA以外は ref とファイルの境界をAPIなどで照合する。実リンク一覧は切替担当者の保護領域で扱う。

2026-11-28 JST時点で、development の AGENTS・README・docs・Actions内の該当参照、直近100 PR・100 issueコメント・取得されたレビューコメントを調査。重複を除き raw.githack 10件（固定SHA 9、development 1）、GitHub Raw 10件（JS 6、PNG 4）、GitHub Pages 1件を確認。この範囲では rawcdn.githack の実URLは0件。追加の共有先、進捗サイトの動的生成URL、HTMLから読み込まれるCSS・画像・GLB・音源、古いPRやコメント、外部ミラーの棚卸しは継続する。

移行前の HEAD 試験では GitHub Raw 10件と Pages 1件が200。raw.githack 10件は検査経路上で403。403だけでは元データ失効やCDNキャッシュ削除を証明できない。GitHub forks の匿名APIで公開フォークは0件。外部コピーと検索結果は未確認。

## 非公開化後の確認

1. 匿名の別セッションで GitHub の元ファイルと旧Pagesを検証する。
2. 既知の raw.githack／rawcdn の正確なURLを確認し、公式 purge をURLごとに実施する。CDN版は正確なURL単位で永続キャッシュする仕様のため、クエリ付きも台帳に残す。GitHubの元ファイルがまだ公開中なら先にそちらを解決する。
3. URLごとに日時、出典、対象版、purge結果、匿名GETのステータスと本文の確認結果を記録する。HTML・JS・CSS・PNG・WebP・GLB・音源を対象にし、タイムアウトやゲートウェイ拒否で成功判定しない。
4. 確認できないURL・削除不可URLを残課題として記録する。第三者保存、未把握URL、外部ミラー、全CDN配信点からの回収は保証できない。

[raw.githack 公式キャッシュ仕様とpurge](https://raw.githack.com/)  
[GitHubの公開範囲を変えた場合の影響](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
