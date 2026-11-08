/**
 * field-3d-procedural-textures.js
 * Small seamless procedural PBR texture set for the B1F blockout.
 * Generated locally with Canvas; no remote image dependency or gameplay state.
 */

function hash(x, y, seed) {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function periodicNoise(x, y, period, seed) {
  const px = (x / period) * Math.PI * 2;
  const py = (y / period) * Math.PI * 2;
  const a = Math.sin(px + seed * 0.13) * Math.cos(py + seed * 0.17);
  const b = Math.sin(px * 2 + py * 3 + seed) * 0.25;
  const c = Math.cos(px * 5 - py * 4 + seed * 0.7) * 0.12;
  return (a + b + c) / 1.37;
}

function makeCanvas(size) {
  if (typeof document === "undefined") throw new Error("Procedural textures require a browser canvas.");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  return canvas;
}

function makeSurface(kind, size, seed) {
  const canvas = makeCanvas(size);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const image = context.createImageData(size, size);
  const heights = new Float32Array(size * size);
  const stone = kind === "stone";
  const base = stone ? [76, 88, 78] : [73, 66, 45];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const n = periodicNoise(x, y, size, seed);
      const fine = Math.sin((x / size) * Math.PI * 34 + seed) * Math.cos((y / size) * Math.PI * 38 + seed * 0.7) * 0.5;
      const broad = periodicNoise(x, y, size / 4, seed + 11);
      let height = 0.5 + n * 0.16 + broad * 0.12 + fine * 0.06;

      if (stone) {
        const cell = Math.floor(size / 4);
        const gx = x % cell, gy = y % cell;
        const joint = gx < 3 || gx >= cell - 3 || gy < 3 || gy >= cell - 3 ? 1 : 0;
        const chipped = periodicNoise(x, y, size / 8, seed + 5) > 0.94 ? 0.10 : 0;
        height -= joint * 0.16 + chipped;
      } else {
        const pebble = periodicNoise(x, y, size / 8, seed + 19) > 0.78 ? 0.08 : 0;
        height += pebble;
      }
      heights[i] = Math.max(0, Math.min(1, height));
      const variation = (heights[i] - 0.5) * (stone ? 58 : 46) + fine * 12;
      const index = i * 4;
      image.data[index] = Math.max(0, Math.min(255, base[0] + variation));
      image.data[index + 1] = Math.max(0, Math.min(255, base[1] + variation));
      image.data[index + 2] = Math.max(0, Math.min(255, base[2] + variation));
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const normalCanvas = makeCanvas(size);
  const normalContext = normalCanvas.getContext("2d");
  const normalImage = normalContext.createImageData(size, size);
  const roughCanvas = makeCanvas(size);
  const roughContext = roughCanvas.getContext("2d");
  const roughImage = roughContext.createImageData(size, size);
  const ormCanvas = makeCanvas(size);
  const ormContext = ormCanvas.getContext("2d");
  const ormImage = ormContext.createImageData(size, size);
  const strength = stone ? 3.2 : 2.4;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const left = heights[y * size + ((x - 1 + size) % size)];
      const right = heights[y * size + ((x + 1) % size)];
      const up = heights[((y - 1 + size) % size) * size + x];
      const down = heights[((y + 1) % size) * size + x];
      const nx = (left - right) * strength;
      const ny = (up - down) * strength;
      const length = Math.hypot(nx, ny, 1) || 1;
      const ni = i * 4;
      normalImage.data[ni] = (nx / length * 0.5 + 0.5) * 255;
      normalImage.data[ni + 1] = (ny / length * 0.5 + 0.5) * 255;
      normalImage.data[ni + 2] = (1 / length * 0.5 + 0.5) * 255;
      normalImage.data[ni + 3] = 255;
      const roughNoise = periodicNoise(x, y, size / 6, seed + 31);
      const rough = stone ? 205 + roughNoise * 16 : 232 + roughNoise * 11;
      roughImage.data[ni] = roughImage.data[ni + 1] = roughImage.data[ni + 2] = rough;
      roughImage.data[ni + 3] = 255;
      // glTF-style ORM packing: R=occlusion, G=roughness, B=metalness.
      ormImage.data[ni] = 255;
      ormImage.data[ni + 1] = rough;
      ormImage.data[ni + 2] = 0;
      ormImage.data[ni + 3] = 255;
    }
  }
  normalContext.putImageData(normalImage, 0, 0);
  roughContext.putImageData(roughImage, 0, 0);
  ormContext.putImageData(ormImage, 0, 0);
  return { color: canvas, normal: normalCanvas, roughness: roughCanvas, orm: ormCanvas };
}

function texture(THREE, canvas, color = false) {
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

export function createField3DProceduralTextures(THREE, {
  resolution = 256,
  seed = 1701,
  anisotropy = 4
} = {}) {
  if (!THREE?.CanvasTexture || !THREE?.RepeatWrapping) {
    throw new TypeError("createField3DProceduralTextures: Three.js is required.");
  }
  const size = Math.max(64, Math.min(512, 2 ** Math.round(Math.log2(resolution))));
  const stone = makeSurface("stone", size, seed);
  const dirt = makeSurface("dirt", size, seed + 101);
  const stoneOrm = texture(THREE, stone.orm);
  const dirtOrm = texture(THREE, dirt.orm);
  const maps = {
    stone: {
      map: texture(THREE, stone.color, true),
      normalMap: texture(THREE, stone.normal),
      roughnessMap: stoneOrm,
      metalnessMap: stoneOrm,
      ormMap: stoneOrm
    },
    dirt: {
      map: texture(THREE, dirt.color, true),
      normalMap: texture(THREE, dirt.normal),
      roughnessMap: dirtOrm,
      metalnessMap: dirtOrm,
      ormMap: dirtOrm
    }
  };
  for (const set of Object.values(maps)) {
    for (const map of Object.values(set)) map.anisotropy = Math.max(1, Math.min(8, anisotropy));
  }
  return Object.freeze({
    maps: Object.freeze({
      stone: Object.freeze(maps.stone),
      dirt: Object.freeze(maps.dirt)
    }),
    dispose() {
      const ownedTextures = new Set();
      for (const set of Object.values(maps)) {
        for (const map of Object.values(set)) ownedTextures.add(map);
      }
      ownedTextures.forEach(map => map.dispose());
    }
  });
}
