# コタマ Actions ステータス — Chrome拡張 (試作 v0.1)

ChatGPTのチャット一覧の各行に、対応するGitHub Actionsの実行状態を小さなバッジで表示する独立したManifest V3拡張です。**ゲーム本体は変更しません。**

## インストール（Windows Chrome）

1. このフォルダをZIPから展開する。
2. Chromeで `chrome://extensions` を開き、右上の「デベロッパーモード」を有効にする。
3. 「パッケージ化されていない拡張機能を読み込む」から **manifest.json があるフォルダ** を選択。
4. `https://chatgpt.com/c/...` の会話を開き、ツールバーの拡張アイコンをクリック。
5. ブランチ名、PR番号、またはrun IDを入力して「このチャットに紐付ける」。複数登録可。
6. 左サイドバーの該当チャットに状態が出る。バッジをクリックすると対象のGitHub Actions実行ページが開く。

## 表示ルール

- 🟡 `queued` / `waiting` / `pending` / `in_progress` → `実行中 N`（同時進行数）
- 🔴 `failure` / `cancelled` / `timed_out` 等 → `失敗 N`（実行中がない場合）
- 🟢 `success` → `成功 N`（実行中・失敗がない場合）
- ⚪ APIエラー、未検出、対象外 → `未確認`。**未確認を成功とみなさない**。
- 1つのブランチでは同じワークフローの最新runを採用。別ワークフローの同時実行は別件として数える。run IDを指定するとそのrunを直接参照。
- 安全検査、軽量化、レンダリングはワークフロー名/パスのキーワードから推定（厳密な分類ではありません）。ポップアップの種別・キーワードで絞り込み可能。

## 更新間隔とAPI制限

- 表示は30秒ごとに更新を試行。GitHub APIは**トークンあり30秒キャッシュ／匿名60秒キャッシュ**。匿名APIは60回/時/IP制限があるため、ブランチ・チャットを多く登録すると制限に達する可能性があります。制限中は前回状態と取得時刻を確認してください。
- 30秒ごとの最新状態取得には、GitHubの**読み取り専用 Fine-grained personal access token**を推奨。対象リポジトリのみ、Actions: Read / Pull requests: Read（PR番号からブランチ解決する場合）を許可。書き込み権限は不要です。
- トークンは `chrome.storage.local` に保存し、GitHub APIのみに送信。ChatGPTページには送信しません。共有PCでの使用には注意してください。Chrome拡張を削除する際は必要に応じてGitHub側でトークンを失効させてください。
- GitHub Actions APIは最新100件/ブランチを確認。非常に活発なブランチでは古いrunが検索対象から外れます。

## 制約

- ChatGPT公式のチャット一覧APIや拡張ポイントではなく、サイドバーDOMにバッジを追加します。ChatGPTのUI変更で表示が崩れる場合があります。
- チャットとGitHubの紐付けはポップアップで**手動登録**します。チャット本文を読み取って自動推定はしません。
- ブランチ名だけを指定するとそのブランチの最新ワークフロー全般が対象になります。必要ならワークフロー名・カテゴリで絞ってください。
- GitHub Actionsの成功はレンダリング画像の美術的合格や、GLB/PNGの存在・承認を意味しません。
- 拡張が取得するのはGitHub APIの実行状態です。**30秒更新はChromeとGitHubの接続が可能な場合の目標**であり、リアルタイムpush通知ではありません。
- サイドバーに表示されていない会話は監視対象外。開いているChatGPTタブで更新します。

## 開発検証

```bash
node --check status.js
node --check background.js
node --check content.js
node --check popup.js
node --test tests/status.test.cjs
```

PRの統合先は `development`。本拡張はブラウザにユーザーが手動インストールするもので、ゲーム内には組み込みません。
