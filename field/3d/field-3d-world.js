/**
 * field-3d-world.js
 * Lightweight Three.js geometry builder for a field-3d-grid-adapter snapshot.
 * Geometry is instanced by category; gameplay and collision remain elsewhere.
 */

function addFaceShading(THREE, geometry, { top = 1.16, side = 0.82, underside = 0.68 } = {}) {
  const normals = geometry.getAttribute("normal");
  const colors = new Float32Array(normals.count * 3);
  for (let i = 0; i < normals.count; i += 1) {
    const ny = normals.getY(i);
    const factor = ny > 0.5 ? top : ny < -0.5 ? underside : side;
    colors[i * 3] = factor;
    colors[i * 3 + 1] = factor;
    colors[i * 3 + 2] = factor;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export function buildField3DWorld(THREE, snapshot, options = {}) {
  if (!THREE?.Group || !THREE?.InstancedMesh || !snapshot?.cells) {
    throw new TypeError("buildField3DWorld: Three.js and a valid grid snapshot are required.");
  }

  const scale = snapshot.scale;
  const wallHeight = snapshot.wallHeight;
  const floorY = options.floorY ?? -0.12;
  const group = new THREE.Group();
  group.name = "kotama-field-3d-world";

  const palette = {
    floor: 0x59665a,
    path: 0x756c52,
    grass: 0x405d3d,
    safe: 0x777b62,
    wall: 0x39483f,
    hazard: 0x274d59,
    object: 0x665c4c,
    unknown: 0x4b5149
  };
  Object.assign(palette, options.palette || {});

  const textures = options.proceduralTextures?.maps || options.proceduralTextures || {};
  const stoneMaps = textures.stone || {};
  const dirtMaps = textures.dirt || {};
  const findAssetMesh = asset => {
    let found = null;
    asset?.scene?.traverse?.(node => {
      if (!found && node.isMesh && node.geometry && node.material && !Array.isArray(node.material)) found = node;
    });
    return found;
  };
  const environmentAssets = options.environmentAssets || {};
  const wallAssetMesh = findAssetMesh(environmentAssets.stoneWallA);
  const stoneFloorAssetMesh = findAssetMesh(environmentAssets.stoneFloorA);
  const dirtFloorAssetMesh = findAssetMesh(environmentAssets.dirtFloorA);

  const floorGeometry = stoneFloorAssetMesh ? stoneFloorAssetMesh.geometry.clone() : new THREE.PlaneGeometry(scale, scale);
  if (!stoneFloorAssetMesh) floorGeometry.rotateX(-Math.PI / 2);
  const dirtGeometry = dirtFloorAssetMesh ? dirtFloorAssetMesh.geometry.clone() : floorGeometry.clone();
  const wallGeometry = wallAssetMesh ? wallAssetMesh.geometry.clone() : new THREE.BoxGeometry(scale, wallHeight, scale);
  if (!wallAssetMesh) {
    // Vertex colors tint the six box faces by orientation without creating six
    // materials per wall. Instanced color still provides stable cell variation.
    addFaceShading(THREE, wallGeometry, options.wallFaceShading);
  }

  const makeAssetMaterial = (mesh, fallback, maps, roughness) => {
    const material = mesh?.material?.clone?.() || fallback();
    material.color?.set?.(0xffffff);
    material.vertexColors = true;

    // Authored GLB materials take the same procedural PBR maps as the fallback
    // geometry. Apply only when UVs exist; otherwise preserve the authored color.
    if (mesh?.geometry?.getAttribute?.("uv") && maps) {
      if (maps.map) material.map = maps.map;
      if (maps.normalMap) {
        material.normalMap = maps.normalMap;
        material.normalScale?.set?.(0.42, 0.42);
      }
      if (maps.ormMap) {
        material.roughnessMap = maps.ormMap;
        material.metalnessMap = maps.ormMap;
        // AO uses the red channel and requires a second UV set.
        if (mesh.geometry.getAttribute("uv2")) material.aoMap = maps.ormMap;
      } else if (maps.roughnessMap) {
        material.roughnessMap = maps.roughnessMap;
      }
      if ("roughness" in material) material.roughness = roughness;
      if ("metalness" in material) material.metalness = 0.025;
    }
    material.needsUpdate = true;
    return material;
  };
  const floorMaterial = makeAssetMaterial(stoneFloorAssetMesh, () => new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: options.floorRoughness ?? 0.96, vertexColors: true,
    map: stoneMaps.map || null, normalMap: stoneMaps.normalMap || null,
    roughnessMap: stoneMaps.ormMap || stoneMaps.roughnessMap || null,
    metalnessMap: stoneMaps.ormMap || null
  }), stoneMaps, options.floorRoughness ?? 0.96);
  const dirtFloorMaterial = makeAssetMaterial(dirtFloorAssetMesh, () => new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: options.floorRoughness ?? 0.96, vertexColors: true,
    map: dirtMaps.map || null, normalMap: dirtMaps.normalMap || null,
    roughnessMap: dirtMaps.ormMap || dirtMaps.roughnessMap || null,
    metalnessMap: dirtMaps.ormMap || null
  }), dirtMaps, options.floorRoughness ?? 0.98);
  const wallMaterial = makeAssetMaterial(wallAssetMesh, () => new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: options.wallRoughness ?? 0.88, vertexColors: true,
    map: stoneMaps.map || null, normalMap: stoneMaps.normalMap || null,
    roughnessMap: stoneMaps.roughnessMap || null
  }), stoneMaps, options.wallRoughness ?? 0.92);

  // A continuous stone canopy closes the first-person corridor and gives the
  // camera a readable ceiling plane. It is presentation-only and follows the
  // same explored-cell mask as the floor.
  const ceilingGeometry = new THREE.BoxGeometry(scale, 0.18, scale);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: options.ceilingRoughness ?? 0.96,
    map: stoneMaps.map || null,
    normalMap: stoneMaps.normalMap || null,
    roughnessMap: stoneMaps.ormMap || stoneMaps.roughnessMap || null,
    metalnessMap: stoneMaps.ormMap || null,
    side: THREE.DoubleSide
  });
  const ceilingMesh = floorCells.length
    ? new THREE.InstancedMesh(ceilingGeometry, ceilingMaterial, floorCells.length)
    : null;
  const isExplored = cell => !snapshot.explored || !!snapshot.explored[cell.ty * snapshot.area.width + cell.tx];
  // Never render cells the player has not mapped yet. This keeps the first-person
  // view consistent with the existing labyrinth fog-of-war.
  const floorCells = snapshot.cells.filter(cell => cell.floorVisible && isExplored(cell));
  const wallCells = snapshot.cells.filter(cell => cell.solid && isExplored(cell));
  const dirtCells = floorCells.filter(cell => cell.terrain === "grass" || cell.terrain === "floor");
  const stoneCells = floorCells.filter(cell => cell.terrain !== "grass" && cell.terrain !== "floor");
  const floorMesh = stoneCells.length
    ? new THREE.InstancedMesh(floorGeometry, floorMaterial, stoneCells.length)
    : null;
  const dirtFloorMesh = dirtCells.length
    ? new THREE.InstancedMesh(dirtGeometry, dirtFloorMaterial, dirtCells.length)
    : null;
  const wallMesh = wallCells.length
    ? new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCells.length)
    : null;

  const dummy = new THREE.Object3D();
  function placeInstances(mesh, cells, kind) {
    if (!mesh) return;
    cells.forEach((cell, index) => {
      dummy.position.set(
        cell.world.x,
        kind === "wall" ? (wallAssetMesh ? 0 : wallHeight / 2 - 0.12) :
          (kind === "floor" && stoneFloorAssetMesh) || (kind === "dirt" && dirtFloorAssetMesh) ? 0 : floorY,
        cell.world.z
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const colorKey = kind === "wall" ? "wall" : (palette[cell.terrain] != null ? cell.terrain : "floor");
      // Stable coordinate hash avoids flickering or nondeterministic map colors.
      const hash = Math.abs(Math.sin((cell.tx + 17) * 127.1 + (cell.ty + 31) * 311.7));
      const variation = kind === "wall" ? 0.88 + hash * 0.18 : 0.94 + hash * 0.10;
      const usesAuthoredAsset = kind === "wall" ? !!wallAssetMesh :
        kind === "dirt" ? !!dirtFloorAssetMesh : !!stoneFloorAssetMesh;
      const instanceColor = usesAuthoredAsset
        ? new THREE.Color(0xffffff)
        : new THREE.Color(palette[colorKey] ?? palette.floor);
      instanceColor.multiplyScalar(usesAuthoredAsset ? 0.96 + hash * 0.08 : variation);
      mesh.setColorAt(index, instanceColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = kind === "wall";
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  placeInstances(floorMesh, stoneCells, "floor");
  placeInstances(dirtFloorMesh, dirtCells, "dirt");
  placeInstances(wallMesh, wallCells, "wall");

  if (ceilingMesh) {
    floorCells.forEach((cell, index) => {
      dummy.position.set(cell.world.x, wallHeight - 0.09, cell.world.z);
      dummy.updateMatrix();
      ceilingMesh.setMatrixAt(index, dummy.matrix);
      const hash = Math.abs(Math.sin((cell.tx + 47) * 91.7 + (cell.ty + 13) * 217.3));
      ceilingMesh.setColorAt(index, new THREE.Color(0.82 + hash * 0.12));
    });
    ceilingMesh.instanceMatrix.needsUpdate = true;
    if (ceilingMesh.instanceColor) ceilingMesh.instanceColor.needsUpdate = true;
    ceilingMesh.castShadow = false;
    ceilingMesh.receiveShadow = true;
    group.add(ceilingMesh);
  }

  const baseGeometry = new THREE.BoxGeometry(snapshot.area.worldWidth, 0.2, snapshot.area.worldDepth);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: options.baseColor ?? 0x1b211b, roughness: 1
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.set(snapshot.area.worldWidth / 2, -0.28, snapshot.area.worldDepth / 2);
  base.receiveShadow = true;
  group.add(base);

  group.userData.kotama3d = {
    floorMesh, dirtFloorMesh, wallMesh, ceilingMesh, floorGeometry, dirtGeometry, wallGeometry, ceilingGeometry,
    floorMaterial, dirtFloorMaterial, wallMaterial, ceilingMaterial, base
  };

  function dispose() {
    group.traverse(object => {
      if (!object.isMesh) return;
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.());
      else object.material?.dispose?.();
    });
  }

  return Object.freeze({
    group, dispose,
    floorCount: floorCells.length,
    wallCount: wallCells.length
  });
}
