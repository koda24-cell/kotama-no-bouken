# 第2層水車・羽根板V07 Blenderチェックポイント復元／実レンダリング評価

更新: 2026-11-18 JST。**NOT_APPROVED / game integration未実施 / assets正式保存未実施**。

## 実行・原本
- 継承元: V06のBlender5.3編集用`b2_bucket_paddle_blender_v06.blend`。SHA256 `632fcb47afdf5fecb6f44f88e61a24911bc845d8b0a329c042375c95d548b199`。
- 継承元Actions: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44131102651 、artifact 14349903645。
- **V07ジョブ間再開の実成功**: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/44132575418 、artifact **14351406313**。Actionsの`download-artifact@v4`でV06原本を取得、Blend/GLBのSHA256を一致検証、Blender5.3 `bpy.ops.wm.open_mainfile` で復元したうえで色調・PBRのみ変更し、実際の4方向PNGをレンダリング。ジョブ・QA・manifest・Artifactアップロードすべてsuccess。
- 出力は`b2_bucket_paddle_blender_v07.blend` / `b2_bucket_paddle_blender_v07.glb` / `front,side,angle,back` PNG / `manifest.json` / `progress.json`。GLB 2,340,092 bytes、Blend 2,118,986 bytes、GLB mesh31。原ジオメトリを再生成・消去せず、V06 Blender sceneを編集用チェックポイントとして再利用。
- V07全6ファイルのmanifest SHA256をダウンロードしたArtifact ZIP内から実照合、検証結果はGitHub Actionsでpass。

## 写真PBRの出典と検証
- Wood Planks: https://polyhaven.com/a/wood_planks 公式CC0（作者 Amal Kumar）。V06から埋込済1K Diffuseを継承。
- 新規: 同一素材の1K `nor_gl`、`rough` JPEGをActionsで実取得、BlenderでNon-Colorとして読み込み、OpenGL Normal Map接続とRoughnessに接続。manifestの`photo_nor_gl_applied=true`,`photo_rough_applied=true`を確認。
- 実GLB内部の画像3点を抽出検証: Diffuse 1024×1024, Normal 1024×1024 RGB平均(127,127,252)程度で正しい平面基準、glTFのMetallicRoughness packed画像R≈255 G≈220 B≈255はRoughnessがG channelで正しく保持されていることを示す。過去V03の破損NormalやRoughnessとは異なる。
- 写真素材はCC0。同じURLのページ本文を出典記録し、Pinterest第三者画像を直接転載していない。

## 実画像での美観判断
- V07はV05の波状縞が解消し、木材の色むら・刻み・ひび・鋼帯・部分凍結が識別可能。側面では板の実厚/曲がりが成立する。
- **未解決**: 写真色の茶・黄味がまだ第2層の青い凍結遺跡には暖かく、木材割れの並びも直線的、氷柱の形と積雪の面積が不自然。金具の接合とボルト穴は現時点では外見重視で実メッシュ穴ではない。品質基準（近景で世界水準）には未到達、**最終完成承認を求める段階ではない**。
- 次の1パーツ単位改善は、輪全体へ広げず羽根板の欠損（形状）、端面の木繊維割れ、鉄帯締結、雪付着の自然化、ゲーム内同系青照明との明度差調整。そのあとユーザー美術承認。
- 既存の第2層水車`field/assets/b2-frozen-waterwheel-scene.js`やClaude担当の配置は未変更。元GLB・Blendと全履歴を保全する。Actions Artifactは14日間の一時保存であり、ユーザー承認前に`assets/`や`development`へ正式マージしない。
