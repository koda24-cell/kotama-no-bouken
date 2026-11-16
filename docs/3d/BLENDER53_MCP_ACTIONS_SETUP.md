# Blender 5.3 + Blender Lab公式MCP — GitHub Actions検証

- 作業ブランチ: `feature/blender53-mcp-actions-smoke-20261116`
- 公式資料: https://www.blender.org/lab/mcp-server/
- 公式ソース: https://projects.blender.org/lab/blender_mcp
- 対象: GitHub Actionsの使い捨てLinuxランナー。PC側のBlender操作不要。
- このPRは**接続準備・依存関係のスモークテストのみ**。LLMクライアントからMCPツールを呼ぶ実通信は未実装・未検証。

## 検証段階
1. Blender 5.3.0公式Linuxアーカイブを取得し、`bpy.app.version` が5.3であることを確認。URLが存在しない場合はジョブ失敗として記録し、勝手に旧バージョンへフォールバックしない。
2. Blender Lab公式MCPソースを取得しコミットSHAを記録。
3. MCPサーバーのPythonパッケージを仮想環境に導入してimportを検証。
4. Blender 5.3のバックグラウンド実行で公式アドオンの登録・解除を検証。
5. 次段階: MCPクライアント（stdio）⇄MCPサーバー⇄アドオン（localhost TCP）の実際のツール呼び出しをテストする。**GitHub Actions外からのリアルタイム接続はこのジョブでは提供しない。**

## セキュリティ
公式MCPはBlender内で任意のPythonコードを実行可能。外部公開ポートを開かず、Actionsの隔離ランナー内だけで検証する。認証情報・Secretsをモデル実行環境へ渡さない。既存ゲームや承認済みGLBを変更しない。

## 玉座V2への引継ぎ
玉座V1はPR #383で未承認。V1のレンダ成功run #43727373990 と既存 `assets/3d/dungeons/b5_abyssal_star_realm/models/floor5_abyss_throne_refined_v2.glb` を比較する。MCP通信が検証できた後に追加造形・3方向レンダへ進む。
