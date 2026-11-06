# 世界樹の迷宮シリーズ 研究資料リンク・引き継ぎメモ

**目的：** 『コタマのぼうけん』のゲームシステム改善に向けて、世界樹の迷宮シリーズの設計を調査・比較する。  
**対象：** 世界樹の迷宮I・II・III（HD REMASTERを中心に確認）。  
**状態：** 研究準備中。セーブデータの内容分析・ゲーム仕様の検証は、資料が揃ってから実施する。

## 1. 研究資料の本拠地

- **研究専用リポジトリ：** https://github.com/koda24-cell/etrian-odyssey-research
- **研究リポジトリのトップ（最初に確認）：** https://github.com/koda24-cell/etrian-odyssey-research
- **ゲームプレイ研究：** https://github.com/koda24-cell/etrian-odyssey-research/tree/main/gameplay_research
- **セーブデータ関連メモ：** https://github.com/koda24-cell/etrian-odyssey-research/tree/main/save_data
- **出典・調査メモ：** https://github.com/koda24-cell/etrian-odyssey-research/tree/main/sources_and_notes
- **コタマへの応用案：** https://github.com/koda24-cell/etrian-odyssey-research/tree/main/kotama_application

> 研究リポジトリは非公開設定。Claude等の共同開発AIが閲覧するには、GitHub上で当該アカウントに閲覧権限を付与する必要がある。リンクを知っているだけでは閲覧できない。

## 2. 対象作品と資料の扱い

| 作品 | 位置づけ | 状態 |
|---|---|---|
| 世界樹の迷宮I HD REMASTER | シリーズ初期設計との比較 | データ受領・確認待ち |
| 世界樹の迷宮II HD REMASTER | Iからの変更点の比較 | データ受領・確認待ち |
| 世界樹の迷宮III HD REMASTER | 今回の主な調査対象 | データ受領済みとの申告あり。内容の検証は未実施 |

※アップロードされたファイルが各作品のセーブデータであること、ファイル形式、読み取れる項目は、実ファイルを確認してから確定する。セーブデータだけでゲーム全体の仕様を断定しない。

## 3. 調査する項目

1. 職業・役割・パーティ編成・前衛／後衛
2. スキルツリー・スキルポイント・育成の選択肢
3. 戦闘の行動順・攻撃属性・弱点／耐性・状態異常・防御・回復
4. 迷宮探索・マッピング・FOE・採集・ショートカット
5. 雑魚敵・ボスの行動パターン・難易度設計
6. アイテム・装備・素材・ショップ・経済
7. UI・情報表示・操作導線・戦闘演出
8. 上記から『コタマのぼうけん』に応用できる独自案

## 4. Claude・GPT向け作業ルール

- まずこのメモと研究リポジトリのREADMEを確認する。
- 調査段階では、ゲーム本体のコード・データを変更しない。
- 「確認できた事実」「推測」「未確認」を明確に分ける。
- 作品ごとの差異を混同しない。I・II・IIIのどの作品の仕様かを必ず記録する。
- 参考作品の文章・画像・音声・データをそのままゲームへ転用しない。仕組みを分析し、コタマ用の独自仕様として再設計する。
- セーブデータの原本は変更しない。解析時はコピーを使い、個人のプレイ情報を含む可能性があるため、原本や生データを公開リポジトリへ追加しない。
- 実際にプレイ・検証していない事項を「確認済み」と扱わない。
- 実装提案を出す場合は、目的・現状との違い・メリット・デメリット・既存セーブや既存機能への影響・検証方法を添える。
- ユーザーの承認なしに『コタマのぼうけん』の仕様やコードを変更しない。

## 5. 調査結果の記録形式

各項目は次の形式で記録する。

- **作品／バージョン：**
- **調査項目：**
- **確認できた事実：**
- **根拠：** ゲーム内確認、公式資料、説明書、映像、セーブデータ等
- **推測・考察：**
- **未確認事項：**
- **コタマへの応用案：**
- **既存仕様への影響・注意点：**
- **確認日：**

## 5-2. 研究の進捗（2026-11-06 時点・Claude）

研究リポジトリ（非公開）に、次の成果が追加済み。**GPT は `sources_and_notes/HANDOFF_CLAUDE_TO_GPT.md` から読むこと。**

| 成果 | 研究リポジトリ内の場所 |
|---|---|
| EO3 HD セーブの復号・構造解析（GPT照合用チェックリスト付き） | `sources_and_notes/CLAUDE_EO3HD_SAVE_ANALYSIS_REPORT.md` |
| キャラクター解析（職業・サブクラス・ステータス・スキル配列） | `gameplay_research/classes_and_party/EO3HD_CHARACTER_ANALYSIS.md` |
| アイテム・装備・所持金 | `gameplay_research/items_equipment_economy/EO3HD_ITEM_ANALYSIS.md` |
| 画面レイアウト・UI研究（スクショ17枚で検証） | `gameplay_research/ui_and_presentation/EO3HD_UI_RESEARCH.md` |
| **コタマへのUI改善提案（優先度付き・未採用）** | `kotama_application/UI_PROPOSALS_FROM_EO3HD.md` |
| GPTへの照合・検討依頼 | `sources_and_notes/HANDOFF_CLAUDE_TO_GPT.md` |

コタマのコード・仕様は**未変更**。提案の採用はユーザーの判断待ち。採用が決まったら、`docs/` に分担表を作ってから実装する。

## 6. 参照リンク

- 研究リポジトリ： https://github.com/koda24-cell/etrian-odyssey-research
- コタマ側の参考資料一覧： https://github.com/koda24-cell/kotama-no-bouken/tree/development/references
- この引き継ぎメモ： https://github.com/koda24-cell/kotama-no-bouken/blob/development/references/etrian_odyssey/README.md

**このメモは研究の入口であり、ゲーム仕様の確定資料ではない。** 調査で得た結果は研究リポジトリに記録し、コタマへ採用する内容だけを別途提案・承認後に実装する。
