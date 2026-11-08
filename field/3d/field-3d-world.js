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

  const floorGeometry = new THREE.PlaneGeometry(scale, scale);
  floorGeometry.rotateX(-Math.PI / 2);
  const wallGeometry = new THREE.BoxGeometry(scale, wallHeight, scale);
  // Vertex colors tint the six box faces by orientation without creating six
  // materials per wall. Instanced color still provides stable cell variation.
  addFaceShading(THREE, wallGeometry, options.wallFaceShading);
  const textures = options.proceduralTextures?.maps || options.proceduralTextures || {};
  const stoneMaps = textures.stone || {};
  const dirtMaps = textures.dirt || {};
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: options.floorRoughness ?? 0.96, vertexColors: true,
    map: stoneMaps.map || null, normalMap: stoneMaps.normalMap || null,
    roughnessMap: stoneMaps.roughnessMap || null
  });
  const dirtFloorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: options.floorRoughness ?? 0.96, vertexColors: true,
    map: dirtMaps.map || null, normalMap: dirtMaps.normalMap || null,
    roughnessMap: dirtMaps.roughnessMap || null
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: options.wallRoughness ?? 0.88, vertexColors: true,
    map: stoneMaps.map || null, normalMap: stoneMaps.normalMap || null,
    roughnessMap: stoneMaps.roughnessMap || null
  });

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
    ? new THREE.InstancedMesh(floorGeometry, dirtFloorMaterial, dirtCells.length)
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
        kind === "wall" ? wallHeight / 2 - 0.12 : floorY,
        cell.world.z
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const colorKey = kind === "wall" ? "wall" : (palette[cell.terrain] != null ? cell.terrain : "floor");
      // Stable coordinate hash avoids flickering or nondeterministic map colors.
      const hash = Math.abs(Math.sin((cell.tx + 17) * 127.1 + (cell.ty + 31) * 311.7));
      const variation = kind === "wall" ? 0.88 + hash * 0.18 : 0.94 + hash * 0.10;
      const instanceColor = new THREE.Color(palette[colorKey] ?? palette.floor);
      instanceColor.multiplyScalar(variation);
      mesh.setColorAt(index, instanceColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = kind === "wall";
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  placeInstances(floorMesh, stoneCells, "floor");
  placeInstances(dirtFloorMesh, dirtCells, "floor");
  placeInstances(wallMesh, wallCells, "wall");

  const baseGeometry = new THREE.BoxGeometry(snapshot.area.worldWidth, 0.2, snapshot.area.worldDepth);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: options.baseColor ?? 0x1b211b, roughness: 1
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.set(snapshot.area.worldWidth / 2, -0.28, snapshot.area.worldDepth / 2);
  base.receiveShadow = true;
  group.add(base);

  group.userData.kotama3d = {
    floorMesh, dirtFloorMesh, wallMesh, floorGeometry, wallGeometry,
    floorMaterial, dirtFloorMaterial, wallMaterial, base
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
