/* B3-only weathering and foliage. Generated locally; no external texture assets. */
export function createCitySurfaces(THREE, high) {
  const textures = [], materials = [], geometries = [];
  const clamp = x => Math.max(0, Math.min(1, x));
  const rand = (x, y, s = 0) => { let n = Math.imul(x + s * 73, 374761393) ^ Math.imul(y + s, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  function noise(x, y, period, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const r = (a, b) => rand((a + period) % period, (b + period) % period, seed);
    return (r(ix, iy) * (1 - u) + r(ix + 1, iy) * u) * (1 - v) + (r(ix, iy + 1) * (1 - u) + r(ix + 1, iy + 1) * u) * v;
  }
  function texture(kind, seed) {
    const size = 256, c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'), data = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const broad = noise(u * 8, v * 8, 8, seed), grain = noise(u * 64, v * 64, 64, seed + 1), fine = rand(x, y, seed + 2);
      let col;
      if (kind === 'rust') {
        const rust = clamp((broad - 0.38) * 3.5), scratch = Math.pow(Math.abs(Math.sin(u * Math.PI * 24 + broad)), 26);
        col = [62 + rust * 78 + grain * 24, 67 + rust * 12 + grain * 14, 65 - rust * 30 + grain * 13].map(a => a * (0.76 + fine * 0.28) + scratch * 15);
      } else if (kind === 'bark') {
        const ridge = Math.abs(Math.sin(u * Math.PI * 18 + noise(u * 8, v * 4, 8, seed) * 4));
        col = [77, 66, 46].map(a => a * (0.5 + ridge * 0.6 + grain * 0.3) + fine * 10);
      } else if (kind === 'leaf') {
        const vein = Math.exp(-Math.abs(u - 0.5) * 65) + Math.pow(Math.max(0, Math.cos((v * 8 + Math.abs(u - 0.5) * 3) * Math.PI * 2)), 14) * 0.22;
        col = [39 + grain * 24 + vein * 26, 68 + broad * 43 + grain * 24 + vein * 20, 29 + grain * 17 + vein * 8];
      } else if (kind === 'soil') {
        col = [61, 63, 45].map(a => a * (0.6 + broad * 0.55 + grain * 0.35) + fine * 9);
      } else {
        const crack = Math.pow(Math.max(0, 1 - Math.abs(noise(u * 8, v * 8, 8, seed + 6) - 0.5) * 90), 2);
        const pit = fine > 0.92 ? (fine - 0.92) * 4 : 0;
        const streak = noise(u * 16, v * 4, 16, seed + 3), moss = clamp((broad + grain * 0.28 - 0.77) * 4);
        const base = kind === 'stone' ? [135, 139, 127] : [157, 151, 132];
        col = base.map((a, i) => a * (0.55 + broad * 0.38 + grain * 0.2 - streak * 0.12 - crack * 0.48 - pit) * (1 - moss * 0.55) + [35, 59, 24][i] * moss * 0.55 + fine * 12);
      }
      const p = (y * size + x) * 4;
      data.data[p] = col[0]; data.data[p + 1] = col[1]; data.data[p + 2] = col[2]; data.data[p + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = high ? 4 : 2; textures.push(t); return t;
  }
  const maps = { concrete: texture('concrete', 11), stone: texture('stone', 21), rust: texture('rust', 31), bark: texture('bark', 41), leaf: texture('leaf', 51), soil: texture('soil', 61) };
  function surface(kind, tint = 0xffffff, { world = true, scale = 0.72 } = {}) {
    const props = { color: tint, map: maps[kind], side: kind === 'leaf' ? THREE.DoubleSide : THREE.FrontSide };
    // Diffuse stone/foliage needs no metallic BRDF. Reserve PBR for exposed steel.
    const m = high && kind === 'rust'
      ? new THREE.MeshStandardMaterial({ ...props, roughness: 0.78, metalness: 0.3 })
      : new THREE.MeshLambertMaterial(props);
    if (high && world) { m.bumpMap = maps[kind]; m.bumpScale = kind === 'rust' ? 0.035 : 0.1; }
    if (world) {
      m.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vB3World;\nvarying vec3 vB3Face;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vec4 b3p = vec4(transformed, 1.0); vec3 b3n = normal;
          #ifdef USE_INSTANCING
            b3p = instanceMatrix * b3p; b3n = mat3(instanceMatrix) * b3n;
          #endif
          vB3World = (modelMatrix * b3p).xyz;
          vB3Face = normalize(mat3(modelMatrix) * b3n);`);
        shader.fragmentShader = 'varying vec3 vB3World;\nvarying vec3 vB3Face;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          vec3 b3w = abs(vB3Face);
          vec3 b3uv = vB3World * ${scale.toFixed(3)};
          vec2 b3coords = b3w.y > max(b3w.x, b3w.z) ? b3uv.xz : b3w.x > b3w.z ? b3uv.zy : b3uv.xy;
          vec4 b3tex = texture2D(map, b3coords);
          diffuseColor *= b3tex;
          float b3ground = smoothstep(-0.1, 2.0, vB3World.y);
          diffuseColor.rgb *= mix(vec3(0.72, 0.76, 0.69), vec3(1.0), b3ground);
        `);
      };
      const weather = m.onBeforeCompile;
      if (high) m.onBeforeCompile = shader => {
        weather(shader);
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
          #ifdef USE_BUMPMAP
            float b3height = dot(b3tex.rgb, vec3(0.299, 0.587, 0.114));
            normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(b3height), dFdy(b3height)) * bumpScale, faceDirection);
          #endif
        `);
      };
      m.customProgramCacheKey = () => `b3-weathered-${scale}`;
    }
    materials.push(m); return m;
  }
  const palette = {
    concrete: surface('concrete'), stone: surface('stone'), rust: surface('rust'), bark: surface('bark'),
    leaf: surface('leaf', 0xffffff, { world: false }), soil: surface('soil'),
    dark: surface('rust', 0x65716b), gold: surface('rust', 0xbba777),
    paving: [surface('stone', 0xb6b4a3), surface('stone', 0x9ca798), surface('stone', 0xc1b8a5)]
  };
  const geo = x => (geometries.push(x), x);
  // Curled, folded leaf blades: geometry, not a transparent upright billboard.
  function leafSpray(fern = false, amount = 0) {
    const positions = [], uvs = [];
    function leaf(a, angle, length, width, lift) {
      const local = [[0, 0, 0], [-width, length * 0.38, lift * 0.7], [0, length * 0.48, lift + width * 0.25], [width, length * 0.38, lift * 0.7], [0, length, lift * 0.6]];
      const points = local.map(([x, y, z]) => [a[0] + x * Math.cos(angle) + z * Math.sin(angle), a[1] + y, a[2] - x * Math.sin(angle) + z * Math.cos(angle)]);
      const uv = [[0.5, 0], [0, 0.4], [0.5, 0.5], [1, 0.4], [0.5, 1]];
      for (const tri of [[0, 1, 2], [0, 2, 3], [1, 4, 2], [2, 4, 3]]) for (const i of tri) { positions.push(...points[i]); uvs.push(...uv[i]); }
    }
    const count = amount || (fern ? 14 : 18);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399, r = (0.1 + (i % 4) * 0.1), y = fern ? 0 : (i % 3) * 0.12 - 0.2;
      leaf([Math.sin(a) * r, y, Math.cos(a) * r], a, fern ? 0.35 + i % 3 * 0.08 : 0.4 + i % 4 * 0.08, fern ? 0.055 : 0.14, 0.23);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals(); return geo(g);
  }
  const canopy = leafSpray(), fern = leafSpray(true), vineLeaf = leafSpray(false, 6);
  const vineStem = geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 0, 0), new THREE.Vector3(0.05, 0.8, 0.08),
    new THREE.Vector3(-0.04, 1.65, 0), new THREE.Vector3(0.12, 2.6, 0.04)
  ]), 10, 0.025, 4, false));
  // Chipped top edges and bevel ring, shared across all street tiles.
  function slab(seed) {
    const points = [[-0.42,-0.5],[0.36,-0.5],[0.5,-0.34],[0.5,0.37],[0.34,0.5],[-0.38,0.5],[-0.5,0.32],[-0.5,-0.36]];
    const pos = [], uv = [];
    const ring = points.map(([x,z],i) => [x + (rand(i, 1, seed) - 0.5) * 0.035, 0.5, z + (rand(i, 2, seed) - 0.5) * 0.035]);
    function tri(a,b,c) { for (const v of [a,b,c]) { pos.push(...v); uv.push(v[0] + 0.5, v[2] + 0.5); } }
    for (let i = 0; i < 8; i++) {
      const a = ring[i], b = ring[(i+1)%8], aa = [a[0]*1.035,-0.5,a[2]*1.035], bb = [b[0]*1.035,-0.5,b[2]*1.035];
      tri([0,0.5,0], b, a); tri(a,b,bb); tri(a,bb,aa);
    }
    const g = new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return geo(g);
  }
  const slabs = [slab(1), slab(2), slab(3)];
  const distantSlab = geo(new THREE.BoxGeometry(1, 1, 1)), distantLeaves = leafSpray(false, 4), distantFern = leafSpray(true, 4);
  const lodGeometries = new Map([[canopy, distantLeaves], [fern, distantFern], [vineLeaf, distantLeaves], [vineStem, null], ...slabs.map(g => [g, distantSlab])]);
  function dress(model, key) {
    if (key.startsWith('vines') || key === 'wallRoots') {
      const vines = new THREE.Group(); vines.name = 'b3:leafy-climbing-vines';
      for (let i = 0; i < 3; i++) {
        const stem = new THREE.Mesh(vineStem, palette.bark); stem.position.x = (i - 1) * 0.4; vines.add(stem);
        for (let j = 0; j < 5; j++) {
          const leaves = new THREE.Mesh(vineLeaf, palette.leaf);
          leaves.position.set((i - 1) * 0.4 + Math.sin(j * 1.6) * 0.1, j * 0.48 + i * 0.08, 0.03);
          leaves.scale.setScalar(0.23 + (j % 2) * 0.05); leaves.rotation.y = j * 2.399; vines.add(leaves);
        }
      }
      return vines;
    }
    model.traverse(m => {
      if (!m.isMesh) return;
      const hex = m.material.color?.getHex(), tree = key.startsWith('invasiveTree');
      if (hex === 0x486144 || hex === 0x445b43) {
        if (m.geometry.type === 'BoxGeometry' && (tree || key.startsWith('vines') || key === 'wallRoots')) { m.geometry = canopy; m.material = palette.leaf; }
        else m.material = palette.bark;
      } else if ([0x555a5b, 0x343b3b, 0x373b38].includes(hex)) m.material = hex === 0x555a5b ? palette.rust : palette.dark;
      else if (hex === 0x9b8053) m.material = palette.gold;
      else m.material = hex === 0x898779 ? palette.stone : palette.concrete;
    });
    if (key.startsWith('ruinedBuilding')) {
      const ledges = model.children.filter(m => m.isMesh && m.geometry.type === 'BoxGeometry' && m.scale.y < 0.35 && Math.abs(m.rotation.z) < 0.2);
      const ledge = ledges.sort((a, b) => b.position.y - a.position.y)[0];
      if (ledge) for (let i = 0; i < 3; i++) {
        const plant = new THREE.Mesh(canopy, palette.leaf);
        plant.position.set(ledge.position.x + (i - 1) * ledge.scale.x * 0.24, ledge.position.y + 0.1, ledge.position.z);
        plant.scale.setScalar(0.6 + i * 0.12); model.add(plant);
      }
    }
    return model;
  }
  function sky() {
    const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false,
      vertexShader: 'varying vec3 dir; void main(){dir=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}',
      fragmentShader: `varying vec3 dir;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
        void main(){vec3 d=normalize(dir);float t=smoothstep(-0.08,0.8,d.y);vec3 c=mix(vec3(.63,.68,.64),vec3(.22,.39,.44),t);vec2 q=d.xz/(abs(d.y)+.4)*3.;float cloud=n(q)*.6+n(q*2.1)*.28+n(q*4.3)*.12;c=mix(c,vec3(.82,.81,.70),smoothstep(.45,.7,cloud)*smoothstep(-.02,.25,d.y)*.65);gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }` });
    materials.push(material);
    const mesh = new THREE.Mesh(geo(new THREE.SphereGeometry(70, 20, 12)), material);mesh.name='b3:overcast-sky';mesh.renderOrder=-1000;mesh.frustumCulled=false;return mesh;
  }
  return { palette, fern, slabs, dress, sky, lodGeometries, textureCount: textures.length,
    dispose() { textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose()); } };
}
