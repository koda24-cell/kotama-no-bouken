/* 5層 V6：アセット（部品・炎・火の粉・灯り）を世界へ置く共通処理 */
import * as THREE from 'three';

// ctx = { bucket, flames: FlameSystem, embers: EmberSystem, addLight(x,y,z,color,intensity,range), shadows?: [] }
export function placeAsset(ctx, asset, matrix) {
  const v = new THREE.Vector3();
  for (const [geo, mat, wx] of asset.parts) ctx.bucket.add(geo, mat, { matrix, wx: wx === false ? false : { seed: 1, ...(wx || {}) } });
  for (const [x, y, z, size, pal] of asset.flames || []) { v.set(x, y, z).applyMatrix4(matrix); ctx.flames?.add(v.x, v.y, v.z, size, pal ?? 0, Math.random()); }
  for (const [x, y, z, c, s, h, pal] of asset.embers || []) { v.set(x, y, z).applyMatrix4(matrix); ctx.embers?.add(v.x, v.y, v.z, c, s, h, pal); }
  for (const [x, y, z, color, intensity, range] of asset.lights || []) { v.set(x, y, z).applyMatrix4(matrix); ctx.addLight?.(v.x, v.y, v.z, color, intensity, range); }
  if (asset.mist) for (const [x, z, d] of asset.mist) { v.set(x, 0, z).applyMatrix4(matrix); ctx.mist?.add(v.x, v.z, d); }
  return asset;
}

export function trs(x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));
  return m;
}
