# 開発管理環境

## 起動
PCでホーム画面を表示し、Ctrl + Shift + D を押します。戦闘中は安全のため起動を拒否します。

## 構成
- debug.js / debug.css：独立管理UI
- debug-save.js：kotamaDebugTestSaveV1 のみを操作
- debug-assets.js：マニフェストとHTML/CSS/JSの静的参照調査
- debug-version.js：バージョン・ローカル更新記録
- assets-manifest.json：GitHub上の素材ファイル一覧

## 安全上の制限
- script.js と戦闘ロジックは変更しません。
- 通常セーブキー fantasyRpgSave とセーブスロットは読み取りのみです。
- テスト用コピーは本編に自動反映されません。
- 未参照素材は「未使用」と断定せず「要確認」にします。
- ブラウザーからGitHub上のファイルを自動更新・コミットしません。
- 戦闘テスト操作はClaude側実装完了後に接続します。

## 素材マニフェスト更新
素材の追加・削除後はGitHubのファイルツリーを再取得して assets-manifest.json を更新してください。ブラウザー単体では任意のリポジトリフォルダを走査できません。
