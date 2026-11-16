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
      } else if (kind === 'masonry') {
        // Ashlar courses: 4 rows per tile, 2-4 blocks per row, eroded (chipped) arrises,
        // per-block tone, water streaks and moss held in the mortar joints.
        const rows = 4, rh = size / rows, row = Math.floor(y / rh), count = 2 + Math.floor(rand(row, 7, seed) * 3);
        const bw = size / count, sx = (x + Math.floor(rand(row, 9, seed) * size)) % size, col0 = Math.floor(sx / bw);
        const lx = sx - col0 * bw, ly = y - row * rh, block = rand(row, col0, seed + 4);
        const erode = 1.2 + noise(u * 24, v * 24, 24, seed + 5) * 4.2 + (block > 0.82 ? 4 : 0);
        const edge = Math.min(lx, bw - lx, ly, rh - ly), corner = Math.min(Math.hypot(Math.min(lx, bw - lx), Math.min(ly, rh - ly)), 99);
        const joint = clamp(1 - (Math.min(edge, corner * 0.8) - erode) / 1.8);
        const relief = clamp((lx < bw * 0.5 ? 1 : 0) * clamp(1 - ly / 7) * 0.5 + clamp(1 - ly / 5) * 0.4) - clamp(1 - (rh - ly) / 6) * 0.35;
        const streak = Math.pow(noise(u * 28, v * 1.5, 28, seed + 3), 3) * 0.55;
        const crack = Math.pow(Math.max(0, 1 - Math.abs(noise(u * 6, v * 6, 6, seed + 6) - 0.5) * 70), 2) * (1 - joint);
        const moss = clamp((broad + grain * 0.35 - 0.7) * 3.2 + joint * 0.45 * broad);
        const tone = 0.74 + block * 0.34, warm = rand(row, col0, seed + 8) - 0.5;
        const base = [128 + warm * 16, 130 + warm * 4, 118 - warm * 10];
        col = base.map((a, i) => {
          const stoneCol = a * tone * (0.62 + broad * 0.3 + grain * 0.22 + relief * 0.22 - streak * 0.35 - crack * 0.5) + fine * 12;
          const mortar = [84, 86, 74][i] * (0.75 + grain * 0.4);
          const c = stoneCol * (1 - joint) + mortar * joint;
          return c * (1 - moss * 0.6) + [34, 58, 22][i] * moss * 0.6 * (0.8 + grain * 0.5);
        });
      } else if (kind === 'soil') {
        col = [61, 63, 45].map(a => a * (0.6 + broad * 0.55 + grain * 0.35) + fine * 9);
      } else {
        const crack = Math.pow(Math.max(0, 1 - Math.abs(noise(u * 8, v * 8, 8, seed + 6) - 0.5) * 90), 2);
        const pit = fine > 0.92 ? (fine - 0.92) * 4 : 0;
        const streak = noise(u * 16, v * 4, 16, seed + 3), moss = clamp((broad + grain * 0.28 - 0.77) * 4);
        const base = kind === 'stone' ? [135, 139, 127] : [157, 151, 132];
        // Concrete only: cast-panel seams, tie holes, rust bleeding from rebar and spalled patches.
        let panel = 0, bleed = 0, spall = 0;
        if (kind === 'concrete') {
          const sxp = x % 128, syp = y % 85;
          panel = (Math.min(sxp, 128 - sxp) < 1.5 || Math.min(syp, 85 - syp) < 1.2) ? 0.35 : 0;
          panel += (Math.hypot((sxp - 32) % 64 - 0, syp - 42) < 2.2 || Math.hypot(sxp - 96, syp - 42) < 2.2) ? 0.4 : 0;
          bleed = clamp(Math.pow(noise(u * 20, v * 1.2, 20, seed + 9), 4) * 2.4 - 0.15);
          spall = clamp((noise(u * 10, v * 10, 10, seed + 12) - 0.72) * 9);
        }
        col = base.map((a, i) => (a * (0.55 + broad * 0.38 + grain * 0.2 - streak * 0.12 - crack * 0.48 - pit - panel - spall * (0.28 - grain * 0.2)) * (1 - moss * 0.55) + [35, 59, 24][i] * moss * 0.55 + fine * 12) * (1 - bleed * 0.25) + [40, 14, 0][i] * bleed * 0.5);
      }
      const p = (y * size + x) * 4;
      data.data[p] = col[0]; data.data[p + 1] = col[1]; data.data[p + 2] = col[2]; data.data[p + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = high ? 4 : 2; textures.push(t); return t;
  }
  const maps = { masonry: texture('masonry', 71), concrete: texture('concrete', 11), stone: texture('stone', 21), rust: texture('rust', 31), bark: texture('bark', 41), leaf: texture('leaf', 51), soil: texture('soil', 61) };
  function surface(kind, tint = 0xffffff, { world = true, scale = 0.72, moss = 0 } = {}) {
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
          ${moss > 0 ? `
          // Moss settles on upward faces and creeps up the damp foot of walls; vertical grime
          // streaks run down from ledges. Uses the bound texture as a second noise octave.
          float b3n = texture2D(map, b3uv.xz * 0.31 + vec2(0.37, 0.11)).g * 0.6 + texture2D(map, b3coords * 0.23 + 0.5).r * 0.4;
          float b3up = smoothstep(0.45, 0.85, vB3Face.y);
          float b3foot = (1.0 - smoothstep(0.0, 0.75, vB3World.y)) * (1.0 - b3up) * step(abs(vB3Face.y), 0.5);
          float b3moss = clamp(b3up * smoothstep(0.30, 0.52, b3n) + b3foot * smoothstep(0.42, 0.6, b3n), 0.0, 1.0) * ${moss.toFixed(2)};
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.21, 0.08) * (0.75 + b3n * 0.6), b3moss * 0.8);
          float b3streak = smoothstep(0.55, 0.85, texture2D(map, vec2(b3coords.x * 0.9, vB3World.y * 0.05 + 0.2)).b) * (1.0 - b3up);
          diffuseColor.rgb *= 1.0 - b3streak * 0.22 * ${moss.toFixed(2)};
          ` : ''}
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
      m.customProgramCacheKey = () => `b3-weathered-${scale}-${moss}`;
    }
    materials.push(m); return m;
  }
  const palette = {
    concrete: surface('concrete', 0xffffff, { moss: 0.7 }), masonry: surface('masonry', 0xffffff, { moss: 1, scale: 0.62 }), stone: surface('stone'), rust: surface('rust'), bark: surface('bark'),
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
      else if (hex === 0x898779) m.material = key === 'statue' || key.startsWith('rubble') ? palette.stone : palette.masonry;
      else m.material = palette.concrete;
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
  // Overcast sky in linear HDR, kept below the bloom threshold. Horizon equals the fog colour so
  // fogged streets dissolve into it; two procedural skyline bands give distant aerial perspective.
  function sky(fogHex = 0x8f9a9b, sunDir = [-0.45, 0.8, -0.35]) {
    const horizon = new THREE.Color(fogHex);
    const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: { horizon: { value: horizon }, zenith: { value: new THREE.Color(0x56636b) },
        cloudLo: { value: new THREE.Color(0x6a7273) }, cloudHi: { value: new THREE.Color(0xc2c4bd) },
        far: { value: horizon.clone().lerp(new THREE.Color(0x46545a), 0.5) }, near: { value: horizon.clone().lerp(new THREE.Color(0x27322f), 0.72) },
        sun: { value: new THREE.Vector3(...sunDir).normalize() } },
      vertexShader: 'varying vec3 dir; void main(){dir=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}',
      fragmentShader: `varying vec3 dir; uniform vec3 horizon, zenith, cloudLo, cloudHi, far, near, sun;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float h1(float p){return fract(sin(p*91.7)*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
        float fbm(vec2 p){float a=0.,w=.5;for(int i=0;i<5;i++){a+=n(p)*w;p=p*2.03+vec2(1.7,9.2);w*=.5;}return a;}
        // Ruined skyline: stepped blocks, broken tops and the odd mast, by azimuth.
        float skyline(float az, float cells, float seed, float lo, float hi){
          float x=az*cells, id=floor(x), f=fract(x), r=h1(id+seed);
          float top=mix(lo,hi,r*r)*step(.18,r);
          top-=step(.55,h1(id+seed+3.))*step(f,.45)*top*.35;               // collapsed half
          top+=step(.86,h1(id+seed+7.))*step(abs(f-.5),.035)*hi*.9;       // antenna / pylon
          top+=step(.7,r)*(1.-abs(f*2.-1.))*.012;                          // gabled ruin
          return top;}
        void main(){vec3 d=normalize(dir);float y=d.y;
          float t=smoothstep(0.,.75,y);vec3 c=mix(horizon,zenith,pow(t,.8));
          vec2 q=d.xz/(max(y,0.)+.18)*1.6;
          float cl=fbm(q+vec2(3.1,1.4)), detail=fbm(q*2.7-vec2(5.,2.));
          float cover=smoothstep(.32,.72,cl);
          vec3 cloud=mix(cloudLo,cloudHi,smoothstep(.35,.85,detail*.55+cl*.6));
          c=mix(c,cloud,cover*smoothstep(-.01,.12,y)*.85);
          c+=vec3(.10,.09,.07)*pow(max(dot(d,sun),0.),6.)*(1.-cover*.6);
          c=mix(c,horizon,1.-smoothstep(0.,.10,y));                       // haze band at the horizon
          float az=atan(d.z,d.x)/6.2831853+.5;
          float hFar=skyline(az,180.,11.,.018,.075), hNear=skyline(az,64.,37.,.035,.16);
          if(y<hFar) c=mix(far,horizon,smoothstep(-.05,hFar,y)*.35);
          if(y<hNear) c=mix(near,far,smoothstep(-.06,hNear,y)*.45);
          if(y<hNear&&y>.01&&y<hNear-.008){float wx=fract(az*420.),wy=fract(y*55.);
            c*=1.-.1*step(.6,wx)*step(.55,wy)*step(.62,h1(floor(az*420.)+floor(y*55.)*7.));}  // a few gutted windows
          // Below the horizon the distant city continues as one dark hazy mass, not an empty plain.
          if(y<0.) c=near*mix(1.,.72,smoothstep(0.,-.2,y));
          gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }` });
    materials.push(material);
    const mesh = new THREE.Mesh(geo(new THREE.SphereGeometry(70, 32, 16)), material);mesh.name='b3:overcast-sky';mesh.renderOrder=-1000;mesh.frustumCulled=false;return mesh;
  }
  return { palette, fern, slabs, dress, sky, lodGeometries, textureCount: textures.length,
    dispose() { textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose()); } };
}
