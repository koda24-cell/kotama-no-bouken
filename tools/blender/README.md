# Blender スプライト生成（GitHub Actions）

GitHub Actions 上で Blender をヘッドレス（画面なし）で動かし、3Dモデルやプリミティブから
ゲーム用の **背景透過PNGスプライト** を書き出す仕組みです。共同開発AI（ChatGPT・Claude・Gemini）は、
ジョブJSONを書く／モデルを置くだけで素材を生成できます。

## 流れ

1. `tools/blender/jobs/` にジョブJSONを追加する（3Dモデルを使うなら `tools/blender/models/` に `.glb` などを置く）
2. PRを作る、または Actions タブの **Blender sprite render** から「Run workflow」で実行する
3. 実行ページ下部の Artifacts「sprites」からPNGをダウンロードする
   - 手動実行で `commit_output` にチェックを入れると、そのブランチの `assets/generated/` にコミットされる（mainへは直接コミットしない）
4. 採用する画像だけを `assets/characters/` や `assets/monsters/` へ既存の命名規則で配置する

## ジョブJSON

```json
{
  "name": "sample_slime",
  "output_dir": "assets/generated/sample_slime",
  "source": { "type": "primitives", "objects": [ ... ] },
  "views": [ { "name": "front", "yaw": 0, "pitch": 12 } ],
  "resolution": 512,
  "pixel_size": 4,
  "samples": 24,
  "outline": { "enabled": true, "thickness": 2.0 }
}
```

| 項目 | 内容 |
|---|---|
| `source.type` | `"primitives"`（JSONで形を組む）または `"model"`（`path` に `.glb/.gltf/.fbx/.obj/.blend`） |
| `source.objects[]` | `type`: cube / sphere / cylinder / cone / torus、`size` `height` `location` `rotation_deg` `scale` `color`(RGBA 0〜1) `roughness` `metallic` `emission` |
| `views[]` | 書き出す向き。`yaw`（0=正面、+で右回り）、`pitch`（見下ろし角度） |
| `resolution` | 出力画像の一辺（px） |
| `pixel_size` | 1=通常、2以上で低解像度レンダー→拡大してドット調にする |
| `outline` | 輪郭線（Freestyle）。`thickness` `color` `crease` |
| `lights` | `key` `fill` `ambient` の強さ（省略可） |
| `margin` | 画面内の余白倍率（既定 1.15） |
| `save_blend` | `true` で `.blend` も保存 |

カメラは正投影で、対象全体が収まるよう自動で中央に合わせます。

## 注意

- GPUのないランナーなので Cycles(CPU) でレンダーします。`samples` と `resolution` を上げるほど時間がかかります。
- 参考画像（docs/battle-visual-reference）の既存作品キャラクターを再現するモデルは作らず、オリジナルのデザインにしてください。
- 生成物は `assets/generated/` に出力されます。ゲーム本体（index.html / script.js）はこの仕組みに依存しません。
