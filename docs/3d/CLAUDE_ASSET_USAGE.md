# Claude向け｜3D素材をBlenderなしでゲームに配置する手順

対象：『コタマのぼうけん』の第2〜第5階層。素材ライブラリは [ASSET_LIBRARY_INDEX.md](ASSET_LIBRARY_INDEX.md) から参照する。

## 結論

**ClaudeはBlenderを使わずに完成GLBをThree.jsで読み込んで配置できる。**

- GLB：メッシュ・材質などが格納された実3D素材。Three.js の `GLTFLoader` で直接読み込む。
- PNG：正面・背面・斜めなどの造形確認用。3D配置はできない。
- `.blend` や `bpy` のスクリプト：造形・再レンダリング用。Claudeの通常のゲーム実装作業には不要。
- GitHub Actions Artifacts：期限付き一時保存であり、ゲームが実行時に参照するURLにしてはならない。

## 必須チェック

1. `AGENTS.md`、`docs/3d/BLENDER_DOCKER_HANDOFF.md`、`docs/3d/ASSET_PROMOTION_POLICY.md` を読み、最新の `development` と未統合PRを確認する。
2. 階層別一覧 `docs/3d/assets/FLOOR{2,3,4,5}_ASSETS.md` で「**実際にGitへ保存済みのGLB**」を選ぶ。PRのみのものはGLB保存済みと解釈しない。
3. GLBが別ブランチにある場合、**必要ファイルのみ**を衝突しない方法で開発ブランチに導入する（既存素材・実装の一括上書きをしない）。
4. `GLTFLoader` で読み込み、`Box3` でサイズを調べて配置、床との接地を確認する。Y-upはThree.js標準。Blenderへの変換は不要。
5. 視点・遮蔽・当たり判定・描画性能を確認する。既存機能を破壊しない。
6. ゲーム実装は独立ブランチ＋`development` 向けPR。素材保存自体とゲーム配置を混同しない。

## 既存ゲームのThree.jsコードに組み込む例（概念例）

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('assets/models/floor2/b2-frozen-waterwheel-courtyard.glb');
const model = gltf.scene;
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());
const floorMinY = box.min.y;
model.position.y -= floorMinY; // 位置が未変更のモデルを床y=0に置く例
scene.add(model);
console.log('GLB bounds:', size.toArray());
```

※ このコードは概念例。実際のゲームのローダー、基準座標、パス解決、配置規約に合わせて変更する。元のステージを勝手に置換しない。

## 第2階層：氷結した古代水車（実ファイル確認済み）

保存ブランチ：`docs/asset-library-index-20261112`

- 3D本体：`assets/models/floor2/b2-frozen-waterwheel-courtyard.glb`（3,503,680バイト）
- レビュー画像：`assets/models/floor2/reviews/b2-frozen-waterwheel-courtyard/front.png`
- レビュー画像：`assets/models/floor2/reviews/b2-frozen-waterwheel-courtyard/back.png`
- レビュー画像：`assets/models/floor2/reviews/b2-frozen-waterwheel-courtyard/angle.png`
- 造形元：[PR #297](https://github.com/koda24-cell/kotama-no-bouken/pull/297)
- 実GLB＋Blender出力：[Actions #43156109788](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43156109788)
- Git保存：[Actions #43156837864](https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43156837864)

これらの実ファイルをGitHubの索引ブランチで確認済み。Claudeがゲームに配置するときは上記GLBを利用し、**PNGや一時Artifactsを代用しない**。この索引ブランチは `development` に未統合の場合があるので必ず確認する。

## 他階層・他素材の注意

第2階層の石柱・祭壇などには、**別々の承認保存PRのブランチ**にGLBがある。第3〜第5階層についても索引には制作PRのみのものがあるため、「全素材が正式GLBとして保存済み」とは限らない。利用時には各GLBの有無と出典を個別に確認する。

## 今後の保存形式

制作側（GPT/Blender）は、完成承認後に原則として
`assets/models/floorN/<asset-name>.glb` と
`assets/models/floorN/reviews/<asset-name>/{front,back,angle}.png` を保存する。
レビュー画像の方向表記が`side`の場合は既存の実ファイル名を維持する。

Claude側はGLBを直接利用できるため、通常はOBJ/FBX等への再変換は不要。特殊なエンジン互換性の問題が確認された場合のみ、別形式の追加を検討する。

## 注意

本書は素材の扱い方を示す資料であり、GLBが存在しない素材を新規生成したことや、素材をゲームへ統合したことを意味しない。
