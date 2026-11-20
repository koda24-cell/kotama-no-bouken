# 第2層・水車支柱V01–V03 実レンダリングレビュー
更新: 2026-11-20 / 承認状態: NOT_APPROVED

- V01 real run [#44653518275](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44653518275) success. 木製支柱のオリジナルメッシュ・側面画像PBR2件・4方向PNG、GLB、Blend生成。ClamAVとGLB監査成功。視認上の問題は単純な角材・木口が単色・側面が暗く見えること。
- V02 real run [#44654187214](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44654187214) success. 上面の年輪画像を追加し3画像マテリアルとなった。側面の木目は改善したが、右端の帯状影が強すぎた。
- V03 real run [#44654581027](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44654581027) success. 追加の横からの補助ライトで側面の黒い帯が軽減。年輪、木肌の見え方は改善。GLB+Blend、4PNG、画像PBR3件、SHA manifest、ClamAVおよび共通GLB性能監査成功。
- V03の造形は仍然として**幾何的な割れ、斧の手作業痕、ささくれ、ほぞ穴などが不足**し、ユーザーが希望するハイクオリティ段階には達していない。次は正面の不規則な縦割れを実形状/法線で追加し、木口を少し不揃いにする。現在の基礎メッシュを消して作り直すのは避ける。
- 現実の上軸受け/車軸とのフィッティング、回転時の干渉、実機FPSは未検証。単独試作として継続。正式素材の承認はユーザーの判断を待つ。main / development 本体は変更せず、Draft PR #646のみに記録。
