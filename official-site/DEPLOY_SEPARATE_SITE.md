# 公式サイトをゲーム本体から完全に分離する手順

## 完成時の構成
- 公式サイト専用リポジトリ: `kotama-official-site`（新規作成）
- ゲーム本体: `kotama-no-bouken`（既存・変更しない）
- 公式サイトの `ゲームを始める` ボタンは、ゲーム本体の**別URL**に移動

## 1. 公式サイト用リポジトリの作成
GitHubで新しい空リポジトリ `kotama-official-site` を作成する。ゲームのリポジトリを公開設定変更しないこと。

## 2. ファイルの移動
このフォルダの `index.html` と `site-config.js` を新リポジトリのルートへコピーする。
HTML中の画像参照を次の通り移す（画像ファイルのコピーも必要）。

| 元の参照 | 新しい配置 |
| --- | --- |
| `../assets/monsters/goburinn.png` | `assets/monsters/goburinn.png` |
| `../assets/イラスト128.1.png` | `assets/イラスト128.1.png` |
| `../assets/イラスト128.2.png` | `assets/イラスト128.2.png` |
| `../assets/イラスト128.3.png` | `assets/イラスト128.3.png` |
| `../assets/characters/kishi.png` | `assets/characters/kishi.png` |
| `../assets/characters/hi-ra-.png` | `assets/characters/hi-ra-.png` |
| `../assets/characters/sennshi.png` | `assets/characters/sennshi.png` |

コピーするのは紹介サイトで使用する画像のみ。ゲームのJS、セーブ、マップ、未公開の階層素材をコピーしない。

## 3. ゲームのリンク
`site-config.js` の `gameUrl` を、ゲーム本体の**実際に動作する公開URL**に変更する。現在のURLは候補であり、到達確認は未実施。ゲームを限定公開する場合は認証付きの公開先にする。単にURLを隠すだけではアクセス制限にならない。

## 4. 公式サイト公開
新リポジトリで Settings → Pages を開き、公開元を指定する（GitHub Pagesを使用する場合）。公開前に `index.html` の `noindex,nofollow` を見直す。

## 5. 確認項目
- 公式サイトがゲームとは別のURLで表示される
- PC・スマホでレイアウトが崩れない
- キャラ・モンスター画像が表示される
- 「ゲームを始める」からゲームサイトへ遷移する
- ゲーム本体の公開範囲が意図せず変更されていない
- 公式サイトに樹海以降のネタバレがない

**未実施:** 新リポジトリ作成、画像移設、GitHub Pages設定、ブラウザ動作確認。GitHub連携の現在の操作範囲では新リポジトリ作成ができないため、作成後に移設作業を続ける。
