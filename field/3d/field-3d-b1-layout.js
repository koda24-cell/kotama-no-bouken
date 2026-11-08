/**
 * field-3d-b1-layout.js
 * Visual-only floor profiles for the three B1F maps of "はじまりの樹海".
 * This config does not alter map cells, events, collisions, or exploration state.
 */

const FLOOR_PROFILES = Object.freeze({
  1: Object.freeze({
    id: "b1f-1",
    mood: "入口の樹海・木漏れ日",
    fogDensity: 0.038,
    fogColor: 0x1d3025,
    landmarkSeed: 101,
    landmarkLimit: 14,
    landmarkOptions: Object.freeze({
      includeWallRoots: true,
      includeBrokenColumns: true,
      includeArches: false
    }),
    decoration: Object.freeze({
      density: 0.9,
      rootDensity: 0.10,
      maxPerKind: 220
    }),
    palette: Object.freeze({
      moss: 0x536f49,
      fern: 0x3c7548,
      glowPlant: 0x70c9a5,
      root: 0x594531
    })
  }),
  2: Object.freeze({
    id: "b1f-2",
    mood: "深部の樹海・湿った薄霧",
    fogDensity: 0.049,
    fogColor: 0x17291f,
    landmarkSeed: 202,
    landmarkLimit: 18,
    landmarkOptions: Object.freeze({
      includeWallRoots: true,
      includeBrokenColumns: true,
      includeArches: true
    }),
    decoration: Object.freeze({
      density: 1,
      rootDensity: 0.14,
      maxPerKind: 260
    }),
    palette: Object.freeze({
      moss: 0x4d6845,
      fern: 0x356843,
      glowPlant: 0x65c7ad,
      root: 0x4c3c2b
    })
  }),
  3: Object.freeze({
    id: "b1f-3",
    mood: "古代遺跡・深い霧と発光植物",
    fogDensity: 0.058,
    fogColor: 0x101f1d,
    landmarkSeed: 303,
    landmarkLimit: 20,
    landmarkOptions: Object.freeze({
      includeWallRoots: true,
      includeBrokenColumns: true,
      includeArches: true
    }),
    decoration: Object.freeze({
      density: 0.78,
      rootDensity: 0.18,
      maxPerKind: 180
    }),
    palette: Object.freeze({
      moss: 0x465b45,
      fern: 0x315c43,
      glowPlant: 0x73d6c0,
      root: 0x40372c
    })
  })
});

export function getB1F3DLayout(floorNumber) {
  const floor = Math.max(1, Math.min(3, Math.floor(Number(floorNumber) || 1)));
  return FLOOR_PROFILES[floor];
}

export function getB1F3DLayoutFromSnapshot(snapshot) {
  if (!snapshot?.area || Number(snapshot.area.n) !== 1) return null;
  return getB1F3DLayout(snapshot.area.f);
}
