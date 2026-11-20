# F6 V08風 復元候補（2026-11-20）

**NOT_APPROVED** / V08本物ではない。

- 元木材: GitHub Actions run [44447197961](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44447197961) のV27 GLB。元の **幹枝248メッシュを保持**、旧葉メッシュ12,402から座標を取得。
- 葉画像: GitHub Actions run [44467608814](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44467608814) のV31系6枚（別系統の代用画像）。**V08の元画像 leaf_cluster_01～06ではない**。
- 実復元候補: 3Dグリッド分散で788葉束を配置、近傍密度と内側位置を重みづけして164束削除、204束を0.77倍へ縮小。6マテリアル群を使用。元V27のX/Z方向樹冠幅を維持するよう外周候補を保護。
- 元788版 GLB SHA256: `a31c3aa7cb6bd859165ec313c8eda39d9293733dc3486bdf13a54d1b896e8adc`
- 調整624版 GLB SHA256: `21577c7e9e233a8b55921c53e0b6e4bc906332c9a2ccd7125cda3e0f20ea3820`
- VTK 9.6.2 / EGL実GLBレンダリング（front、side、angle、branch_close）、同カメラのbefore/after JPGを生成。**Blender 5.3とThree.jsは未実施**。
- 美術QA: 788版は葉が均一に詰まり、624版は内部枝が急に見える。露出枝・接続部分は依然不合格。これは厳密なV08バイト同一復旧ではなく、構造・枚数の再現試作。
- 会話添付 `f6_v08_inspired_reconstruction_NOT_APPROVED.zip` に2種GLB、4方向の比較画像、Python2本、manifestを保管。バイナリはGitHubの正式素材フォルダへは未保存。ゲーム本体・main・developmentへの反映なし。

次の修正: 枝の空間重複を定量化した選択的間引き、枝の接続先を保持、葉束群を複数スケールで配置。元のV08の6枚画像を回収できたら必ず置換して同一カメラで比較。