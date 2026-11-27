# 非公開移行と旧 raw.githack URL の廃止計画

状態: 準備のみ。Cloudflare接続、実配信、GitHubの非公開化、キャッシュ削除、失効確認は未実施。公開設定は維持する。PR #856 の無害なプローブを使用する。既存のmain・development・作業ブランチを削除しない。

## 移行ゲート（順番厳守）
1. Cloudflare Pages/AccessをFreeで設定し、ダミーサイトだけを配信。production hostnameとwildcard preview hostnameを別々に認証保護する。公式手順 https://developers.cloudflare.com/pages/platform/known-issues/ 。認証なしのHTML/JS/CSS/画像取得が拒否され、許可済みメールでiPhone/PCが動作することを実測。
2. 配信用の明示許可リスト、ファイル数・サイズ・LFS・パス参照チェックを準備。制作資料・履歴・参考資料・秘密情報を出力に含めない。旧URLを参照するruntime/進捗サイトを特定し、配信先の相対パスまたは承認済み公開画像へ移行。公開サイトの画像は公開許可とライセンスを別確認。
3. 認証付き開発版の自動更新、動作・保存・復元を確認。ブラウザ保存はoriginが変わるため、セーブのエクスポート・インポートも確認。Actions無料枠と支出上限、外部制作システムへの連携を確認。
4. 既存mainから承認済み公開版の必要ファイルのみ別の公開リポジトリへコピー。Git履歴をコピーしない。管理者機能・未公開階層・内部リンクを除外し、公開版を実プレイ。旧mainは保持。
5. 共有URL台帳を作成。過去チャット、PR・issue・コメント、README/開発資料、進捗サイト、本人が共有したリンクから、実際に使用されたURLを集める。全チャットのURLが検索可能とは限らず、取得できないURLは未把握として記録。固定SHA・ブランチ・タグ、両githackホスト、HTMLとJS/CSS/GLB/画像/音源を区別。存在しないURLを共有済みと扱わない。
6. 移行前の復旧手段を確認し、本人がGitHub SettingsのDanger Zoneで既存repoをPrivateに変更。既に公開されたfork・外部コピー・キャッシュは別管理である。公開中は旧キャッシュを削除しても再取得されるため、ここまでは削除しない。
7. ログアウトした環境でGitHubの元ファイル取得が拒否されることを先に確認。その後、台帳内の対象URLのみ公式purge機能で削除。公式 https://raw.githack.com/ の DELETE /purge?url=... を使用。URLごとに結果を記録し、レート制限や失敗時は停止して確認。パス全体の一括消去が可能と仮定しない。
8. 認証なしの別ブラウザ/ネットワークで旧URLを確認。404/403等で元ファイルが取得できないこと、HTMLだけでなくJS/画像等の直接URLも確認。HTMLの注意画面やタイムアウトを失効成功としない。失敗は再確認・サービス運営者(admin@githack.com)への問い合わせ候補。CDNの全拠点、把握していないURL、第三者の保存済みコピーまで完全削除されたとは保証しない。
9. 確認結果と新URLを引き継ぎルールへ登録。非公開化後はraw.githackの新規共有を停止。必要なアクセス権のみに限定。

## 台帳形式
旧URL | 根拠/出典 | 対象版 | 種別 | purge日時・結果 | HTTP結果・確認日時 | 状態
現時点の具体的な共有URLは未収集。過去チャットの検索結果から固定SHA形式を使用していたことは確認したが、実URL全件は取得できなかった。テンプレートURLや推測したURLを削除対象にしない。

## 公式資料
- raw.githack キャッシュ削除とCDN仕様: https://raw.githack.com/
- Cloudflare プレビュー既定公開: https://developers.cloudflare.com/pages/configuration/preview-deployments/
- Cloudflare production/preview双方の認証: https://developers.cloudflare.com/pages/platform/known-issues/
