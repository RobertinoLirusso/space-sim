import * as THREE from 'three';

export interface BackgroundStarfield {
  group: THREE.Group;
  update: (
    elapsedTime: number,
    worldCamPos: THREE.Vector3,
    camPos: THREE.Vector3,
    velocity: THREE.Vector3,
    pixelRatio: number,
    voidFactor?: number
  ) => void;
  dispose: () => void;
}

interface LayerSpec {
  count: number;
  halfBox: number;
  parallax: number;
  baseSize: number;
  brightness: number;
  nearFadeStart: number;
  nearFadeEnd: number;
}

const STAR_PALETTE = [
  new THREE.Color(0xffffff), // White
  new THREE.Color(0xc8e4ff), // Blue-white
  new THREE.Color(0x9ec2ff), // Hot O/B blue
  new THREE.Color(0xfff1c9), // Warm yellow-white
  new THREE.Color(0xffd29c), // Amber giant
  new THREE.Color(0xb8f3ff), // Cyan-white
];

function hash3(ix: number, iy: number, iz: number): number {
  let n = (ix * 374761393 + iy * 668265263 + iz * 2147483647) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;

  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbm3D(x: number, y: number, z: number, octaves: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise3D(x * freq, y * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return value;
}

function createProceduralNebulaTexture(width = 512, height = 256): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    // Map row to polar angle phi in [0, PI]
    const v = (y + 0.5) / height;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      // Map column to azimuth theta in [0, 2*PI] so u=0 and u=1 meet seamlessly on the sphere
      const u = x / width;
      const theta = u * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      // Domain-warped 3D spherical FBM for organic, seamless deep-space filaments
      const wx = fbm3D(nx * 2.1 + 4.3, ny * 2.1 - 1.7, nz * 2.1 + 2.9, 3) - 0.5;
      const wy = fbm3D(nx * 2.1 - 3.1, ny * 2.1 + 5.2, nz * 2.1 - 1.4, 3) - 0.5;
      const wz = fbm3D(nx * 2.1 + 1.8, ny * 2.1 + 2.4, nz * 2.1 - 4.6, 3) - 0.5;

      const px = nx * 2.6 + wx * 1.45;
      const py = ny * 2.6 + wy * 1.45;
      const pz = nz * 2.6 + wz * 1.45;

      // Primary broad nebula veil and finer wispy filament structure
      const cloudBase = fbm3D(px, py, pz, 5);
      const filamentRaw = fbm3D(px * 2.15 + 7.1, py * 2.15 - 3.8, pz * 2.15 + 5.5, 4);
      const ridge = 1.0 - Math.abs(filamentRaw * 2.0 - 1.0);
      const filament = ridge * ridge;

      // Dark cosmic dust lanes carve contrast between clouds so deep voids remain black
      const dustNoise = fbm3D(nx * 3.8 - 6.2, ny * 3.8 + 1.9, nz * 3.8 + 8.4, 3);
      const dustCarve = Math.max(0, Math.min(1, (dustNoise - 0.34) / 0.38));

      // Regional color temperature variation across the sky sphere
      const hueRegion = fbm3D(nx * 1.45 + 9.1, ny * 1.45 - 4.7, nz * 1.45 + 3.2, 3);
      const warmPocket = Math.max(0, (hueRegion - 0.52) / 0.48);
      const tealPocket = Math.max(0, (0.50 - hueRegion) / 0.50);

      // Thresholded density keeps the backdrop faint and non-uniform
      const veil = Math.max(0, (cloudBase - 0.43) / 0.57);
      const density = (veil * 0.72 + veil * filament * 0.68) * (0.28 + 0.72 * dustCarve);

      // Faint deep-space color palette (linear RGB, low peak intensity for subtle depth)
      const r =
        density * (0.045 + warmPocket * 0.115 + filament * 0.032) +
        veil * filament * 0.014;
      const g =
        density * (0.042 + tealPocket * 0.075 + warmPocket * 0.028) +
        veil * filament * 0.018;
      const b =
        density * (0.105 + tealPocket * 0.095 + warmPocket * 0.045) +
        veil * filament * 0.036;

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.round(r * 255));
      data[idx + 1] = Math.min(255, Math.round(g * 255));
      data[idx + 2] = Math.min(255, Math.round(b * 255));
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

function createProceduralNebulaBackdrop(sharedUniforms: {
  uTime: { value: number };
  uVoidDim: { value: number };
}) {
  const texture = createProceduralNebulaTexture(512, 256);
  const geometry = new THREE.SphereGeometry(22000, 48, 32);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uNebulaMap: { value: texture },
      uTime: sharedUniforms.uTime,
      uVoidDim: sharedUniforms.uVoidDim,
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uNebulaMap;
      uniform float uTime;
      uniform float uVoidDim;

      varying vec2 vUv;

      void main() {
        vec3 tex = texture2D(uNebulaMap, vUv).rgb;
        float subtlePulse = 0.94 + 0.06 * sin(uTime * 0.08 + vUv.x * 6.28318);
        vec3 col = tex * subtlePulse * 1.35 * uVoidDim;
        float lum = max(col.r, max(col.g, col.b));
        if (lum <= 0.001) discard;
        gl_FragColor = vec4(col, lum);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'background-nebula-dome';
  mesh.frustumCulled = false;
  mesh.renderOrder = -110;

  return { mesh, geometry, material, texture };
}

function createNebulaCloudBillboardsTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = size * 0.5;

  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5 - half) / half;
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - half) / half;
      const r = Math.hypot(nx, ny);
      const radialFalloff = Math.max(0, 1 - r);
      const smoothEdge = radialFalloff * radialFalloff * (3 - 2 * radialFalloff);

      const warpX = fbm3D(nx * 2.2 + 3.1, ny * 2.2 - 2.4, 1.7, 3) - 0.5;
      const warpY = fbm3D(nx * 2.2 - 4.5, ny * 2.2 + 1.9, 5.3, 3) - 0.5;
      const n1 = fbm3D((nx + warpX * 0.65) * 2.4 + 8.2, (ny + warpY * 0.65) * 2.4 - 3.7, 2.5, 4);
      const ridge = 1.0 - Math.abs(fbm3D((nx + warpX * 0.4) * 4.4 - 1.3, (ny + warpY * 0.4) * 4.4 + 6.1, 4.2, 3) * 2.0 - 1.0);
      const cloudMask = Math.max(0, (n1 - 0.28) / 0.72);
      const density = smoothEdge * (cloudMask * 0.78 + cloudMask * ridge * ridge * 0.55);

      const val = Math.min(255, Math.round(density * 255));
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = val;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createDistantNebulaClouds(sharedUniforms: {
  uTime: { value: number };
  uVoidDim: { value: number };
}) {
  const cloudCount = 156;
  const halfBox = 8600;
  const boxSize = halfBox * 2;
  const parallax = 0.12;
  const layerOffset = new THREE.Vector3();

  const texture = createNebulaCloudBillboardsTexture(256);
  const baseGeo = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = baseGeo.index;
  geometry.attributes.position = baseGeo.attributes.position;
  geometry.attributes.uv = baseGeo.attributes.uv;
  baseGeo.dispose();

  const offsets = new Float32Array(cloudCount * 3);
  const colors = new Float32Array(cloudCount * 3);
  const params = new Float32Array(cloudCount * 4); // x: size, y: opacity, z: angle, w: phase

  // Distinct real-inspired cosmic cloud palettes (Carina amber-rose, Veil cyan-blue, Orion violet-magenta, Lagoon teal)
  const cloudPalettes = [
    [new THREE.Color(0x3a7cff), new THREE.Color(0x9e58ff)],
    [new THREE.Color(0x28c4d8), new THREE.Color(0x4b74ff)],
    [new THREE.Color(0xff7e5f), new THREE.Color(0xd14c8e)],
    [new THREE.Color(0xffb46e), new THREE.Color(0x4d92ff)],
    [new THREE.Color(0x6c4cff), new THREE.Color(0x38d8c0)],
  ];

  // Cluster puffs into ~26 large multi-puff nebula landmarks spread across the distant volume
  const clusterCount = 26;
  const clusterCenters: { x: number; y: number; z: number; palIdx: number }[] = [];
  for (let c = 0; c < clusterCount; c++) {
    clusterCenters.push({
      x: (Math.random() - 0.5) * boxSize,
      y: (Math.random() - 0.5) * boxSize,
      z: (Math.random() - 0.5) * boxSize,
      palIdx: c % cloudPalettes.length,
    });
  }

  const tmpCol = new THREE.Color();
  for (let i = 0; i < cloudCount; i++) {
    const i3 = i * 3;
    const i4 = i * 4;
    const cluster = clusterCenters[i % clusterCount];
    const pal = cloudPalettes[cluster.palIdx];

    offsets[i3] = cluster.x + (Math.random() - 0.5) * 1850;
    offsets[i3 + 1] = cluster.y + (Math.random() - 0.5) * 1400;
    offsets[i3 + 2] = cluster.z + (Math.random() - 0.5) * 1850;

    tmpCol.copy(pal[0]).lerp(pal[1], Math.random());
    colors[i3] = tmpCol.r;
    colors[i3 + 1] = tmpCol.g;
    colors[i3 + 2] = tmpCol.b;

    params[i4] = 1750 + Math.random() * 2100;       // huge landmark scale
    params[i4 + 1] = 0.042 + Math.random() * 0.055; // low-opacity subtle glow
    params[i4 + 2] = Math.random() * Math.PI * 2;
    params[i4 + 3] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geometry.instanceCount = cloudCount;

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCloudMap: { value: texture },
      uTime: sharedUniforms.uTime,
      uVoidDim: sharedUniforms.uVoidDim,
      uLayerOffset: { value: layerOffset },
      uHalfBox: { value: halfBox },
      uBoxSize: { value: boxSize },
    },
    vertexShader: `
      attribute vec3 aOffset;
      attribute vec3 aColor;
      attribute vec4 aParams;

      uniform float uTime;
      uniform float uVoidDim;
      uniform vec3 uLayerOffset;
      uniform float uHalfBox;
      uniform float uBoxSize;

      varying vec2 vUv;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 shifted = aOffset - uLayerOffset;
        vec3 rel = mod(shifted + uHalfBox, uBoxSize) - uHalfBox;

        float dist = length(rel);
        float edgeFade = 1.0 - smoothstep(uHalfBox * 0.62, uHalfBox * 0.96, dist);
        float nearFade = smoothstep(550.0, 1750.0, dist);
        float driftPulse = 0.88 + 0.12 * sin(uTime * 0.14 + aParams.w);

        float rot = aParams.z + uTime * 0.006 * (mod(aParams.w, 2.0) > 1.0 ? 1.0 : -1.0);
        float cs = cos(rot);
        float sn = sin(rot);
        vec2 quad = position.xy * aParams.x;
        vec2 rotated = vec2(quad.x * cs - quad.y * sn, quad.x * sn + quad.y * cs);

        vec4 mvCenter = modelViewMatrix * vec4(rel, 1.0);
        mvCenter.xy += rotated;
        gl_Position = projectionMatrix * mvCenter;

        vUv = uv;
        vColor = aColor;
        vAlpha = aParams.y * edgeFade * nearFade * driftPulse * mix(0.22, 1.0, uVoidDim);
      }
    `,
    fragmentShader: `
      uniform sampler2D uCloudMap;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        if (vAlpha <= 0.001) discard;
        float tex = texture2D(uCloudMap, vUv).r;
        float alpha = tex * vAlpha;
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(vColor * alpha, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'distant-nebula-clouds';
  mesh.frustumCulled = false;
  mesh.renderOrder = -105;

  return { mesh, geometry, material, texture, layerOffset, parallax, boxSize };
}

function positiveMod(value: number, period: number): number {
  const m = value % period;
  return m < 0 ? m + period : m;
}

function createLayerPoints(spec: LayerSpec, sharedUniforms: {
  uTime: { value: number };
  uVelocity: { value: THREE.Vector3 };
  uPixelRatio: { value: number };
  uVoidDim: { value: number };
}) {
  const { count, halfBox, parallax, baseSize, brightness, nearFadeStart, nearFadeEnd } = spec;
  const boxSize = halfBox * 2;
  const layerOffset = new THREE.Vector3();

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 2); // x: size/twinkle phase, y: twinkle speed

  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const i2 = i * 2;

    positions[i3] = (Math.random() - 0.5) * boxSize;
    positions[i3 + 1] = (Math.random() - 0.5) * boxSize;
    positions[i3 + 2] = (Math.random() - 0.5) * boxSize;

    const baseCol = STAR_PALETTE[Math.floor(Math.random() * STAR_PALETTE.length)];
    const lum = (0.35 + Math.pow(Math.random(), 1.6) * 0.85) * brightness;
    tmpColor.copy(baseCol).multiplyScalar(lum);

    colors[i3] = tmpColor.r;
    colors[i3 + 1] = tmpColor.g;
    colors[i3 + 2] = tmpColor.b;

    seeds[i2] = Math.random();
    seeds[i2 + 1] = 0.6 + Math.random() * 2.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: sharedUniforms.uTime,
      uLayerOffset: { value: layerOffset },
      uVelocity: sharedUniforms.uVelocity,
      uPixelRatio: sharedUniforms.uPixelRatio,
      uVoidDim: sharedUniforms.uVoidDim,
      uHalfBox: { value: halfBox },
      uBoxSize: { value: boxSize },
      uParallax: { value: parallax },
      uBaseSize: { value: baseSize },
      uNearFadeStart: { value: nearFadeStart },
      uNearFadeEnd: { value: nearFadeEnd },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute vec2 aSeed;

      uniform float uTime;
      uniform vec3 uLayerOffset;
      uniform vec3 uVelocity;
      uniform float uPixelRatio;
      uniform float uVoidDim;
      uniform float uHalfBox;
      uniform float uBoxSize;
      uniform float uParallax;
      uniform float uBaseSize;
      uniform float uNearFadeStart;
      uniform float uNearFadeEnd;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 shifted = position - uLayerOffset;
        vec3 rel = mod(shifted + uHalfBox, uBoxSize) - uHalfBox;

        // Subtle bounded camera-velocity parallax lag scaled by tier and star brightness
        float speed = length(uVelocity);
        vec3 velDir = speed > 0.001 ? uVelocity / speed : vec3(0.0);
        float lagAmount = clamp(speed * 0.012, 0.0, 42.0) * uParallax * (0.65 + 0.7 * aSeed.x);
        rel -= velDir * lagAmount;

        float dist = length(rel);
        float edgeFade = 1.0 - smoothstep(uHalfBox * 0.62, uHalfBox * 0.98, dist);
        float nearFade = smoothstep(uNearFadeStart, uNearFadeEnd, dist);

        float twinkle = 0.72 + 0.28 * sin(uTime * aSeed.y + aSeed.x * 62.8318);
        float voidVisibility = mix(0.14, 1.0, uVoidDim);
        vAlpha = edgeFade * nearFade * twinkle * voidVisibility;
        vColor = aColor;

        vec4 mvPosition = modelViewMatrix * vec4(rel, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float mag = 0.65 + 0.95 * pow(aSeed.x, 2.0);
        float perspectiveScale = (900.0 / max(-mvPosition.z, 120.0));
        gl_PointSize = clamp(uBaseSize * mag * perspectiveScale * uPixelRatio, 1.0, 9.0 * uPixelRatio);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        if (vAlpha <= 0.002) discard;

        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        if (d > 1.0) discard;

        float core = exp(-d * d * 12.0);
        float halo = exp(-d * d * 3.5) * 0.42;
        float intensity = (core + halo) * vAlpha;

        gl_FragColor = vec4(vColor * intensity, intensity);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -100;

  return { points, geometry, material, layerOffset, parallax, boxSize };
}

function createSpeedStreakLayer(
  count: number,
  halfBox: number,
  parallax: number,
  sharedUniforms: {
    uTime: { value: number };
    uVelocity: { value: THREE.Vector3 };
  }
) {
  const boxSize = halfBox * 2;
  const layerOffset = new THREE.Vector3();
  const positions = new Float32Array(count * 2 * 3);
  const colors = new Float32Array(count * 2 * 3);
  const ends = new Float32Array(count * 2);
  const seeds = new Float32Array(count * 2);

  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * boxSize;
    const y = (Math.random() - 0.5) * boxSize;
    const z = (Math.random() - 0.5) * boxSize;

    const baseCol = STAR_PALETTE[Math.floor(Math.random() * STAR_PALETTE.length)];
    const lum = 0.45 + Math.random() * 0.7;
    tmpColor.copy(baseCol).multiplyScalar(lum);

    const seed = Math.random();

    for (let k = 0; k < 2; k++) {
      const idx = i * 2 + k;
      const idx3 = idx * 3;
      positions[idx3] = x;
      positions[idx3 + 1] = y;
      positions[idx3 + 2] = z;

      colors[idx3] = tmpColor.r;
      colors[idx3 + 1] = tmpColor.g;
      colors[idx3 + 2] = tmpColor.b;

      ends[idx] = k;
      seeds[idx] = seed;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: sharedUniforms.uTime,
      uLayerOffset: { value: layerOffset },
      uVelocity: sharedUniforms.uVelocity,
      uHalfBox: { value: halfBox },
      uBoxSize: { value: boxSize },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aEnd;
      attribute float aSeed;

      uniform float uTime;
      uniform vec3 uLayerOffset;
      uniform vec3 uVelocity;
      uniform float uHalfBox;
      uniform float uBoxSize;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 shifted = position - uLayerOffset;
        vec3 rel = mod(shifted + uHalfBox, uBoxSize) - uHalfBox;

        float dist = length(rel);
        float edgeFade = 1.0 - smoothstep(uHalfBox * 0.60, uHalfBox * 0.96, dist);
        float nearFade = smoothstep(55.0, 180.0, dist);

        float speed = length(uVelocity);
        float speedVis = smoothstep(24.0, 420.0, speed);

        // Stretch trailing end opposite camera velocity to heighten speed sensation
        vec3 velDir = speed > 0.001 ? uVelocity / speed : vec3(0.0, 0.0, -1.0);
        float streakLen = clamp(speed * 0.055, 0.0, 150.0) * (0.45 + 0.85 * aSeed);
        rel -= velDir * (aEnd * streakLen);

        float tailFade = mix(1.0, 0.08, aEnd);
        vAlpha = edgeFade * nearFade * speedVis * tailFade * 0.72;
        vColor = aColor;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(rel, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        if (vAlpha <= 0.002) discard;
        gl_FragColor = vec4(vColor * vAlpha, vAlpha);
      }
    `,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = -99;

  return { lines, geometry, material, layerOffset, parallax, boxSize };
}

export function createBackgroundStarfield(): BackgroundStarfield {
  const group = new THREE.Group();
  group.name = 'background-starfield';

  const sharedUniforms = {
    uTime: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
    uVelocity: { value: new THREE.Vector3() },
    uPixelRatio: { value: 1 },
    uVoidDim: { value: 1.0 },
  };

  // Four parallax depth tiers provide vast cosmic scale and clear depth cues while traveling
  const layerSpecs: LayerSpec[] = [
    {
      // Deep backdrop: vast scale, very slow parallax drift
      count: 4200,
      halfBox: 4600,
      parallax: 0.04,
      baseSize: 1.65,
      brightness: 0.68,
      nearFadeStart: 240,
      nearFadeEnd: 540,
    },
    {
      // Far-mid field: subtle parallax against distant nebulae
      count: 3200,
      halfBox: 2700,
      parallax: 0.18,
      baseSize: 2.15,
      brightness: 0.85,
      nearFadeStart: 150,
      nearFadeEnd: 360,
    },
    {
      // Mid-near stars: clear 3D parallax against galaxies and nebulae
      count: 1800,
      halfBox: 1450,
      parallax: 0.55,
      baseSize: 2.75,
      brightness: 0.88,
      nearFadeStart: 75,
      nearFadeEnd: 220,
    },
    {
      // Close foreground stars: crisp depth-cue parallax during travel
      count: 750,
      halfBox: 880,
      parallax: 1.28,
      baseSize: 3.15,
      brightness: 0.78,
      nearFadeStart: 42,
      nearFadeEnd: 140,
    },
  ];

  const nebulaBackdrop = createProceduralNebulaBackdrop(sharedUniforms);
  group.add(nebulaBackdrop.mesh);

  const distantNebulaClouds = createDistantNebulaClouds(sharedUniforms);
  group.add(distantNebulaClouds.mesh);

  const layers = layerSpecs.map((spec) => {
    const layer = createLayerPoints(spec, sharedUniforms);
    group.add(layer.points);
    return layer;
  });

  const streaks = createSpeedStreakLayer(1100, 1250, 0.88, sharedUniforms);
  group.add(streaks.lines);

  const update: BackgroundStarfield['update'] = (
    elapsedTime,
    worldCamPos,
    camPos,
    velocity,
    pixelRatio,
    voidFactor = 0
  ) => {
    // Keep the wrapped volume centered on the camera so stars surround 360°
    group.position.copy(camPos);
    sharedUniforms.uTime.value = elapsedTime;
    sharedUniforms.uCamPos.value.copy(worldCamPos);
    sharedUniforms.uVelocity.value.copy(velocity);
    sharedUniforms.uPixelRatio.value = pixelRatio;
    sharedUniforms.uVoidDim.value = 1 - THREE.MathUtils.clamp(voidFactor, 0, 1) * 0.88;

    distantNebulaClouds.layerOffset.set(
      positiveMod(worldCamPos.x * distantNebulaClouds.parallax, distantNebulaClouds.boxSize),
      positiveMod(worldCamPos.y * distantNebulaClouds.parallax, distantNebulaClouds.boxSize),
      positiveMod(worldCamPos.z * distantNebulaClouds.parallax, distantNebulaClouds.boxSize)
    );

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      layer.layerOffset.set(
        positiveMod(worldCamPos.x * layer.parallax, layer.boxSize),
        positiveMod(worldCamPos.y * layer.parallax, layer.boxSize),
        positiveMod(worldCamPos.z * layer.parallax, layer.boxSize)
      );
    }
    streaks.layerOffset.set(
      positiveMod(worldCamPos.x * streaks.parallax, streaks.boxSize),
      positiveMod(worldCamPos.y * streaks.parallax, streaks.boxSize),
      positiveMod(worldCamPos.z * streaks.parallax, streaks.boxSize)
    );
  };

  const dispose = () => {
    nebulaBackdrop.geometry.dispose();
    nebulaBackdrop.material.dispose();
    nebulaBackdrop.texture.dispose();
    distantNebulaClouds.geometry.dispose();
    distantNebulaClouds.material.dispose();
    distantNebulaClouds.texture.dispose();
    for (const layer of layers) {
      layer.geometry.dispose();
      layer.material.dispose();
    }
    streaks.geometry.dispose();
    streaks.material.dispose();
  };

  return { group, update, dispose };
}
