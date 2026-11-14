import * as THREE from 'three';

THREE.ColorManagement.enabled = false;

interface GalaxyOptions {
  particleCount?: number;
  radius?: number;
  arms?: number;
  spin?: number;
  randomness?: number;
  power?: number;
  insideColor?: number;
  outsideColor?: number;
  dustColor?: number;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
}

export function initCosmicScene(container: HTMLElement) {
  const U = 2.4;
  const wormLocal = sphericalPos(7000, 100, -35);
  const BH_CLEAR = 3200;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0001);

  const universe = new THREE.Group();
  universe.scale.setScalar(U);
  scene.add(universe);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 40000);
  camera.position.set(0, 0, 0.1);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  function createGlowTexture(size = 128, r = 1, g = 1, b = 1) {
    const cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 1.0)`);
    grad.addColorStop(0.18, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.8)`);
    grad.addColorStop(0.5, `rgba(${r * 200}, ${g * 180}, ${b * 255}, 0.25)`);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cvs);
  }

  
function createDarkMolecularCloud(count: number, radius: number) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: darkTextures[i % darkTextures.length],
      color: 0x050508,
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.55, 0.92),
      depthWrite: false,
      depthTest: false
    });
    mat.rotation = Math.random() * Math.PI * 2;
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      gauss() * radius * 0.7,
      gauss() * radius * 0.35,
      gauss() * radius * 0.7
    );
    const s = THREE.MathUtils.randFloat(radius * 0.35, radius * 0.9);
    sprite.scale.set(s, s * (0.6 + Math.random() * 0.5), 1);
    sprite.renderOrder = 4;
    group.add(sprite);
  }
  return group;
}

function createEmissionNebula(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cHot = new THREE.Color(0xff4a6e);
  const cPink = new THREE.Color(0xff8ab8);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.6);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.55;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(cHot).lerp(cPink, Math.random());
    c.multiplyScalar(0.7 + Math.random() * 1.1);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 5.5);
  addCore(points, radius * 0.7, 1.0, 0.35, 0.55, 0.45);
  return points;
}

function createReflectionNebula(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cBlue = new THREE.Color(0x6eb8ff);
  const cCyan = new THREE.Color(0xa0e0ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.8);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.5;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(cBlue).lerp(cCyan, Math.random());
    c.multiplyScalar(0.6 + Math.random() * 0.9);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 5.0);
  addCore(points, radius * 0.55, 0.7, 0.85, 1.0, 0.55);
  return points;
}

function createOpenCluster(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cBlue = new THREE.Color(0xa0d4ff);
  const cWhite = new THREE.Color(0xffffff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.7);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.7;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(cBlue).lerp(cWhite, Math.random() * 0.7);
    c.multiplyScalar(0.9 + Math.random() * 1.4);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  return buildPoints(pos, col, 3.8);
}

function createEdgeOnGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe2aa);
  const cOut = new THREE.Color(0x4a8cff);
  const cDust = new THREE.Color(0x1a0a08);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2.1) * radius;
    const angle = Math.random() * Math.PI * 2;

    pos[i3] = Math.cos(angle) * r;
    pos[i3 + 1] = gauss() * radius * 0.045;           // muy aplastada
    pos[i3 + 2] = Math.sin(angle) * r;

    // Banda de polvo central
    if (Math.abs(pos[i3 + 1]) < radius * 0.018 && Math.random() > 0.4) {
      c.copy(cDust).multiplyScalar(0.3 + Math.random() * 0.4);
    } else {
      c.copy(cIn).lerp(cOut, r / radius);
      c.multiplyScalar(0.7 + Math.max(0, 1 - r / (radius * 0.3)) * 1.6);
    }

    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.2);
  addCore(points, radius * 0.28, 1.0, 0.9, 0.7, 0.85);
  return points;
}

function createInterstellarFilament(length: number, count: number) {
  const group = new THREE.Group();
  const a = new THREE.Color(0x7a9fff);
  const b = new THREE.Color(0xd0a0ff);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: a.clone().lerp(b, t),
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.12, 0.28),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      (t - 0.5) * length + gauss() * 25,
      gauss() * 18,
      gauss() * 25
    );
    const s = THREE.MathUtils.randFloat(60, 160);
    sprite.scale.set(s, s * 0.6, 1);
    group.add(sprite);
  }
  return group;
}

function createStarFormingRegion(count: number, radius: number) {
  const group = new THREE.Group();

  // Estrellas jóvenes brillantes
  const starPos = new Float32Array(count * 3);
  const starCol = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.9);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    starPos[i3] = r * s * Math.cos(t);
    starPos[i3 + 1] = r * u * 0.6;
    starPos[i3 + 2] = r * s * Math.sin(t);

    c.setRGB(0.7 + Math.random() * 0.3, 0.85 + Math.random() * 0.15, 1.0);
    c.multiplyScalar(1.2 + Math.random() * 1.8);
    starCol[i3] = c.r; starCol[i3 + 1] = c.g; starCol[i3 + 2] = c.b;
  }

  group.add(buildPoints(starPos, starCol, 4.0));

  // Nebulosidad asociada
  const neb = createEmissionNebula(Math.floor(count * 0.6), radius * 1.1);
  group.add(neb);

  return group;
}

// ====================== MÁS TIPOS DE GALAXIAS ======================

function createBarredSpiralGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe9b8);
  const cOut = new THREE.Color(0x5fa8ff);
  const cDust = new THREE.Color(0xff4fa3);
  const c = new THREE.Color();
  const barLen = radius * 0.32;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    if (i < count * 0.28) {
      // Barra central
      pos[i3] = (Math.random() * 2 - 1) * barLen;
      pos[i3 + 1] = gauss() * radius * 0.018;
      pos[i3 + 2] = gauss() * radius * 0.05;
      c.copy(cIn).multiplyScalar(1.3 + (1 - Math.abs(pos[i3]) / barLen) * 0.8);
    } else {
      // Brazos espirales desde la barra
      const arm = i % 2;
      const r = barLen + Math.pow(Math.random(), 1.45) * (radius - barLen);
      const angle = arm * Math.PI + (r - barLen) * 0.013;
      pos[i3] = Math.cos(angle) * r + gauss() * r * 0.045;
      pos[i3 + 1] = gauss() * radius * 0.02;
      pos[i3 + 2] = Math.sin(angle) * r + gauss() * r * 0.045;

      c.copy(cIn).lerp(cOut, (r - barLen) / (radius - barLen));
      if (Math.random() > 0.68) c.lerp(cDust, Math.random() * 0.65);
    }

    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 5.0);
  addCore(points, radius * 0.42, 1.0, 0.92, 0.75);
  return points;
}

function createLenticularGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe2a8);
  const cOut = new THREE.Color(0xd4b48a);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2.4) * radius;
    const ang = Math.random() * Math.PI * 2;

    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.07; // disco delgado
    pos[i3 + 2] = Math.sin(ang) * r;

    c.copy(cIn).lerp(cOut, r / radius);
    c.multiplyScalar(0.7 + Math.max(0, 1 - r / (radius * 0.35)) * 1.5);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.3);
  addCore(points, radius * 0.48, 1.0, 0.88, 0.65, 0.9);
  return points;
}

function createFlocculentSpiral(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe6b0);
  const cOut = new THREE.Color(0x6eb0ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2.0) * radius;
    const ang = Math.random() * Math.PI * 2 + r * 0.008 * (Math.random() > 0.5 ? 1 : -1);

    // Fragmentos de brazos (floculento)
    const patch = Math.floor(Math.random() * 7);
    const patchAng = ang + patch * 0.9;

    pos[i3] = Math.cos(patchAng) * r + gauss() * r * 0.08;
    pos[i3 + 1] = gauss() * radius * 0.03;
    pos[i3 + 2] = Math.sin(patchAng) * r + gauss() * r * 0.08;

    c.copy(cIn).lerp(cOut, r / radius);
    c.multiplyScalar(0.65 + Math.random() * 0.9);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.6);
  addCore(points, radius * 0.38, 1.0, 0.9, 0.7);
  return points;
}

function createDwarfSpheroidal(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color(0xffd9a0);
  const white = new THREE.Color(0xffffff);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.9);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);

    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.85;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(c).lerp(white, Math.random() * 0.4).multiplyScalar(0.6 + Math.random() * 0.7);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  return buildPoints(pos, col, 3.6);
}

function createSeyfertGalaxy(count: number, radius: number) {
  const group = new THREE.Group();

  // Disco espiral normal
  const disk = createSpiralGalaxy({
    particleCount: Math.floor(count * 0.85),
    radius,
    arms: 3,
    spin: 1.15,
    randomness: 0.28,
    insideColor: 0xffe9b0,
    outsideColor: 0x4a9fff,
    dustColor: 0xc43bff
  }).container;
  group.add(disk);

  // Núcleo extremadamente brillante (característica Seyfert)
  const core = glowSprite(radius * 0.55, 1.0, 0.95, 0.85, 1.0);
  group.add(core);
  group.add(glowSprite(radius * 1.3, 0.7, 0.6, 1.0, 0.35));

  return group;
}

function createPeculiarGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c1 = new THREE.Color(0xffb07a);
  const c2 = new THREE.Color(0x7ab0ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.random();
    const ang = t * Math.PI * 6 + Math.random() * 2;

    // Forma distorsionada / colisional
    const r = radius * (0.3 + Math.pow(Math.random(), 1.6) * 0.9);
    pos[i3] = Math.cos(ang) * r * (1 + Math.sin(t * 8) * 0.25);
    pos[i3 + 1] = gauss() * radius * 0.12 + Math.sin(t * 5) * radius * 0.15;
    pos[i3 + 2] = Math.sin(ang) * r * (1 + Math.cos(t * 7) * 0.25);

    c.copy(c1).lerp(c2, Math.random());
    c.multiplyScalar(0.7 + Math.random() * 1.0);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.5);
  addCore(points, radius * 0.4, 1.0, 0.85, 0.6);
  return points;
}

function createClassicRingGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cCore = new THREE.Color(0xffe0b0);
  const cRing = new THREE.Color(0x4de1ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.random() * Math.PI * 2;

    if (i < count * 0.22) {
      // Núcleo
      const r = Math.pow(Math.random(), 2.3) * radius * 0.2;
      pos[i3] = Math.cos(t) * r;
      pos[i3 + 1] = gauss() * radius * 0.025;
      pos[i3 + 2] = Math.sin(t) * r;
      c.copy(cCore).multiplyScalar(1.2 + Math.random() * 0.8);
    } else {
      // Anillo
      const r = radius * (0.72 + gauss() * 0.06);
      pos[i3] = Math.cos(t) * r;
      pos[i3 + 1] = gauss() * radius * 0.02;
      pos[i3 + 2] = Math.sin(t) * r;
      c.copy(cRing).multiplyScalar(0.75 + Math.random() * 0.9);
    }

    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.6);
  addCore(points, radius * 0.32, 1.0, 0.9, 0.7);
  return points;
}

function createGalaxyGroup(seed: number) {
  const group = new THREE.Group();
  const num = 3 + Math.floor(seededRandom(seed) * 4); // 3 a 6 galaxias

  for (let i = 0; i < num; i++) {
    const localSeed = seed + i * 31;
    const size = 180 + seededRandom(localSeed) * 220;
    const type = seededRandom(localSeed + 1);

    let gal: THREE.Object3D;
    if (type < 0.5) {
      gal = createSpiralGalaxy({
        particleCount: Math.floor(9000 + seededRandom(localSeed + 2) * 14000),
        radius: size,
        arms: 2 + Math.floor(seededRandom(localSeed + 3) * 2),
        spin: 1.0 + seededRandom(localSeed + 4) * 0.8,
        randomness: 0.25,
        insideColor: 0xffe9b0,
        outsideColor: 0x4a9fff,
        dustColor: 0xc43bff
      }).container;
    } else {
      gal = createEllipticalGalaxy(
        Math.floor(8000 + seededRandom(localSeed + 2) * 10000),
        size * 0.85,
        0.6,
        0xffd9a0,
        0xff8a5a
      );
    }

    gal.position.set(
      (seededRandom(localSeed + 5) - 0.5) * 420,
      (seededRandom(localSeed + 6) - 0.5) * 180,
      (seededRandom(localSeed + 7) - 0.5) * 420
    );
    group.add(gal);
  }
  return group;
}

  function createNebulaCloudTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 256;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, 'rgba(180, 120, 255, 0.45)');
    grad.addColorStop(0.7, 'rgba(40, 90, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cvs);
  }

  const starTexture = createGlowTexture(64, 1, 1, 1);
  const nebulaTexture = createNebulaCloudTexture();

  // Vacío de Boötes
  const voidLon = 290;
  const voidLat = 55;
  const voidAngle = THREE.MathUtils.degToRad(32);
  const vPhi = THREE.MathUtils.degToRad(90 - voidLat);
  const vTheta = THREE.MathUtils.degToRad(voidLon);
  const voidDir = new THREE.Vector3(
    Math.sin(vPhi) * Math.cos(vTheta),
    Math.cos(vPhi),
    Math.sin(vPhi) * Math.sin(vTheta)
  );

  function isInVoid(x: number, y: number, z: number) {
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 0.001) return false;
    const cos = (x * voidDir.x + y * voidDir.y + z * voidDir.z) / len;
    const k = Math.acos(THREE.MathUtils.clamp(cos, -1, 1)) / voidAngle;
    if (k >= 1) return false;
    if (k < 0.6) return true;
    const t = (k - 0.6) / 0.4;
    return Math.random() > 0.02 + 0.98 * t * t * t;
  }

  function createAbyssTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 512;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.97)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.94)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(cvs);
  }

  const abyssDist = 300;
  const abyssSize = 2 * abyssDist * Math.tan(voidAngle);
  const abyss = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createAbyssTexture(),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fog: false
  }));
  abyss.position.copy(voidDir).multiplyScalar(abyssDist);
  abyss.scale.set(abyssSize, abyssSize, 1);
  abyss.renderOrder = 10;
  universe.add(abyss);

  // ====================== CAMPO ESTELAR INFINITO AVANZADO ======================
  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xbfe3ff),
    new THREE.Color(0x99bbff),
    new THREE.Color(0xffe6a3),
    new THREE.Color(0xffaacc),
    new THREE.Color(0x7df9ff)
  ];

  const STAR_LAYERS = [
    { count: 22000, minR: 400,  maxR: 1800, size: 4.8, brightness: 0.9 },
    { count: 14000, minR: 1600, maxR: 3200, size: 6.2, brightness: 0.7 },
    { count: 9000,  minR: 2800, maxR: 5200, size: 8.5, brightness: 0.55 }
  ];

  const starFields: THREE.Points[] = [];
  const starGeometries: THREE.BufferGeometry[] = [];
  const starMaxDists: number[] = [];

  STAR_LAYERS.forEach((layer) => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(layer.count * 3);
    const colors = new Float32Array(layer.count * 3);

    for (let i = 0; i < layer.count; i++) {
      let x = 0, y = 0, z = 0;
      do {
        const radius = THREE.MathUtils.randFloat(layer.minR, layer.maxR);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);
      } while (isInVoid(x, y, z));

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const color = palette[Math.floor(Math.random() * palette.length)].clone();
      color.multiplyScalar((0.35 + Math.random() * 0.9) * layer.brightness);
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: layer.size * U,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    universe.add(points);

    starFields.push(points);
    starGeometries.push(geo);
    starMaxDists.push(layer.maxR * 1.15);
  });

  function wrapStarLayer(geo: THREE.BufferGeometry, maxDist: number, camPos: THREE.Vector3) {
    const positions = geo.attributes.position.array as Float32Array;
    const count = positions.length / 3;
    const limit = maxDist;
    const limit2 = limit * 2;
    let needsUpdate = false;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let x = positions[i3]     - camPos.x;
      let y = positions[i3 + 1] - camPos.y;
      let z = positions[i3 + 2] - camPos.z;

      if (x >  limit) { positions[i3]     -= limit2; needsUpdate = true; }
      if (x < -limit) { positions[i3]     += limit2; needsUpdate = true; }
      if (y >  limit) { positions[i3 + 1] -= limit2; needsUpdate = true; }
      if (y < -limit) { positions[i3 + 1] += limit2; needsUpdate = true; }
      if (z >  limit) { positions[i3 + 2] -= limit2; needsUpdate = true; }
      if (z < -limit) { positions[i3 + 2] += limit2; needsUpdate = true; }
    }

    if (needsUpdate) {
      geo.attributes.position.needsUpdate = true;
    }
  }

  // 2. Galaxias espirales
  const galaxiesGroup = new THREE.Group();
  universe.add(galaxiesGroup);

  function createSpiralGalaxy({
    particleCount = 28000,
    radius = 480,
    arms = 4,
    spin = 1.35,
    randomness = 0.28,
    power = 3.8,
    insideColor = 0xffe2aa,
    outsideColor = 0x3d7aff,
    dustColor = 0xd440ff,
    position = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0)
  }: GalaxyOptions) {
    const galaxyGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    const colorIn = new THREE.Color(insideColor);
    const colorOut = new THREE.Color(outsideColor);
    const colorDust = new THREE.Color(dustColor);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), power) * radius;
      const armAngle = (i % arms) * ((2 * Math.PI) / arms);
      const spinAngle = r * (spin / 100);

      const randomX = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
      const randomY = Math.pow(Math.random(), 2.8) * (Math.random() < 0.5 ? 1 : -1) * (randomness * 0.42) * r;
      const randomZ = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;

      pos[i3] = Math.cos(armAngle + spinAngle) * r + randomX;
      pos[i3 + 1] = randomY;
      pos[i3 + 2] = Math.sin(armAngle + spinAngle) * r + randomZ;

      const mixedColor = colorIn.clone();
      mixedColor.lerp(colorOut, r / radius);

      if (Math.random() > 0.68) {
        mixedColor.lerp(colorDust, Math.random() * 0.7);
      }

      const coreBrightness = 1.0 + Math.max(0, 1.0 - r / (radius * 0.25)) * 2.2;
      mixedColor.multiplyScalar(coreBrightness);

      col[i3] = mixedColor.r;
      col[i3 + 1] = mixedColor.g;
      col[i3 + 2] = mixedColor.b;
    }

    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    galaxyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const galaxyMat = new THREE.PointsMaterial({
      size: 5.0 * U,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const galaxyMesh = new THREE.Points(galaxyGeo, galaxyMat);

    const coreLightTexture = createGlowTexture(256, 1.0, 0.92, 0.78);
    const coreMat = new THREE.SpriteMaterial({
      map: coreLightTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95
    });
    const coreSprite = new THREE.Sprite(coreMat);
    coreSprite.scale.set(radius * 0.45, radius * 0.45, 1);
    galaxyMesh.add(coreSprite);

    const galaxyContainer = new THREE.Group();
    galaxyContainer.position.copy(position);
    galaxyContainer.rotation.copy(rotation);
    galaxyContainer.add(galaxyMesh);

    return { container: galaxyContainer, mesh: galaxyMesh };
  }

  const galaxyA = createSpiralGalaxy({
    particleCount: 42000,
    radius: 650,
    arms: 3,
    spin: 1.4,
    randomness: 0.32,
    insideColor: 0xfff0c9,
    outsideColor: 0x3aa7ff,
    dustColor: 0xc43bff,
    position: new THREE.Vector3(-450, 160, -850),
    rotation: new THREE.Euler(0.65, 0.45, -0.3)
  });
  galaxiesGroup.add(galaxyA.container);

  const galaxyB = createSpiralGalaxy({
    particleCount: 36000,
    radius: 540,
    arms: 4,
    spin: 1.1,
    randomness: 0.26,
    insideColor: 0xffe496,
    outsideColor: 0x00f0ff,
    dustColor: 0xff3b7c,
    position: new THREE.Vector3(680, -220, 720),
    rotation: new THREE.Euler(-0.8, 0.7, 0.5)
  });
  galaxiesGroup.add(galaxyB.container);

  const galaxyC = createSpiralGalaxy({
    particleCount: 22000,
    radius: 400,
    arms: 2,
    spin: 1.8,
    randomness: 0.35,
    insideColor: 0xffffff,
    outsideColor: 0x8a2be2,
    dustColor: 0x00ffc8,
    position: new THREE.Vector3(-380, -420, 620),
    rotation: new THREE.Euler(1.1, -0.3, 0.8)
  });
  galaxiesGroup.add(galaxyC.container);

  // 3. Nebulosas
  const nebulaGroup = new THREE.Group();
  universe.add(nebulaGroup);

  const nebulaColors = [
    new THREE.Color(0x381985),
    new THREE.Color(0x0e479c),
    new THREE.Color(0x8f1967),
    new THREE.Color(0x0b6863),
    new THREE.Color(0xaa336a)
  ];

  const clouds: { sprite: THREE.Sprite; baseOpacity: number; pulseSpeed: number; phase: number }[] = [];

  // ====================== NEBULOSAS INFINITAS (CHUNKS) ======================
  const NEBULA_CHUNK_SIZE = 1800;
  const NEBULA_ACTIVE_RADIUS = 2;
  const activeNebulaChunks = new Map<string, THREE.Group>();

  function getChunkKey(cx: number, cy: number, cz: number) {
    return `${cx},${cy},${cz}`;
  }

  function createNebulaChunk(cx: number, cy: number, cz: number): THREE.Group {
    const group = new THREE.Group();
    const basePos = new THREE.Vector3(
      cx * NEBULA_CHUNK_SIZE,
      cy * NEBULA_CHUNK_SIZE,
      cz * NEBULA_CHUNK_SIZE
    );

    const count = 18 + Math.floor(Math.random() * 22);

    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.72) continue;

      const col = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: col,
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.10, 0.28),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        basePos.x + gauss() * NEBULA_CHUNK_SIZE * 0.42,
        basePos.y + gauss() * NEBULA_CHUNK_SIZE * 0.28,
        basePos.z + gauss() * NEBULA_CHUNK_SIZE * 0.42
      );

      if (isInVoid(sprite.position.x, sprite.position.y, sprite.position.z)) continue;

      if (sprite.position.distanceTo(wormLocal) < BH_CLEAR * 1.1) continue;

      const scale = THREE.MathUtils.randFloat(220, 680);
      sprite.scale.set(scale, scale, 1);
      group.add(sprite);

      clouds.push({
        sprite,
        baseOpacity: mat.opacity,
        pulseSpeed: THREE.MathUtils.randFloat(0.25, 0.85),
        phase: Math.random() * Math.PI * 2
      });
    }

    return group;
  }

  function updateNebulaChunks(camPos: THREE.Vector3) {
    const cx = Math.floor(camPos.x / NEBULA_CHUNK_SIZE);
    const cy = Math.floor(camPos.y / NEBULA_CHUNK_SIZE);
    const cz = Math.floor(camPos.z / NEBULA_CHUNK_SIZE);

    const needed = new Set<string>();

    for (let x = -NEBULA_ACTIVE_RADIUS; x <= NEBULA_ACTIVE_RADIUS; x++) {
      for (let y = -NEBULA_ACTIVE_RADIUS; y <= NEBULA_ACTIVE_RADIUS; y++) {
        for (let z = -NEBULA_ACTIVE_RADIUS; z <= NEBULA_ACTIVE_RADIUS; z++) {
          const key = getChunkKey(cx + x, cy + y, cz + z);
          needed.add(key);

          if (!activeNebulaChunks.has(key)) {
            const chunk = createNebulaChunk(cx + x, cy + y, cz + z);
            nebulaGroup.add(chunk);
            activeNebulaChunks.set(key, chunk);
          }
        }
      }
    }

    for (const [key, chunk] of activeNebulaChunks) {
      if (!needed.has(key)) {
        nebulaGroup.remove(chunk);
        chunk.traverse(obj => {
          if (obj instanceof THREE.Sprite) {
            const idx = clouds.findIndex(c => c.sprite === obj);
            if (idx !== -1) clouds.splice(idx, 1);
          }
        });
        activeNebulaChunks.delete(key);
      }
    }
  }

  // Inicializar chunks alrededor del origen
  updateNebulaChunks(new THREE.Vector3(0, 0, 0));


  // ====================== OBJETOS CÓSMICOS PROCEDURALES INFINITOS ======================
const OBJECT_CHUNK_SIZE = 2800;
const OBJECT_ACTIVE_RADIUS = 2;          // chunks alrededor de la cámara
const activeObjectChunks = new Map<string, THREE.Group>();

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function createObjectChunk(cx: number, cy: number, cz: number): THREE.Group {
  const group = new THREE.Group();
  const baseX = cx * OBJECT_CHUNK_SIZE;
  const baseY = cy * OBJECT_CHUNK_SIZE;
  const baseZ = cz * OBJECT_CHUNK_SIZE;

  // Semilla única por chunk
  const seed = cx * 73856093 ^ cy * 19349663 ^ cz * 83492791;

  // Probabilidad de que el chunk tenga algo interesante
  if (seededRandom(seed) < 0.38) return group; // muchos chunks vacíos = más realista

  const objectCount = 1 + Math.floor(seededRandom(seed + 1) * 3); // 1 a 3 objetos por chunk

  for (let i = 0; i < objectCount; i++) {
    const localSeed = seed + i * 17;

    const lx = (seededRandom(localSeed) - 0.5) * OBJECT_CHUNK_SIZE * 0.85;
    const ly = (seededRandom(localSeed + 1) - 0.5) * OBJECT_CHUNK_SIZE * 0.55;
    const lz = (seededRandom(localSeed + 2) - 0.5) * OBJECT_CHUNK_SIZE * 0.85;

    const worldX = baseX + lx;
    const worldY = baseY + ly;
    const worldZ = baseZ + lz;

    // Respetar el Vacío de Boötes
    if (isInVoid(worldX, worldY, worldZ)) continue;

        if (Math.hypot(worldX - wormLocal.x, worldY - wormLocal.y, worldZ - wormLocal.z) < BH_CLEAR) continue;

const typeRoll = seededRandom(localSeed + 5);
let obj: THREE.Object3D;

if (typeRoll < 0.11) {
  // Espiral normal
  const size = 280 + seededRandom(localSeed + 6) * 400;
  obj = createSpiralGalaxy({
    particleCount: Math.floor(14000 + seededRandom(localSeed + 7) * 26000),
    radius: size,
    arms: 2 + Math.floor(seededRandom(localSeed + 8) * 3),
    spin: 0.9 + seededRandom(localSeed + 9) * 1.0,
    randomness: 0.24 + seededRandom(localSeed + 10) * 0.16,
    insideColor: 0xffe9b0,
    outsideColor: [0x3aa7ff, 0x00f0ff, 0x8a2be2, 0xff6a8a][Math.floor(seededRandom(localSeed + 11) * 4)],
    dustColor: 0xc43bff,
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(
      seededRandom(localSeed + 12) * Math.PI,
      seededRandom(localSeed + 13) * Math.PI,
      seededRandom(localSeed + 14) * Math.PI
    )
  }).container;
}
else if (typeRoll < 0.19) {
  // Espiral barrada
  obj = createBarredSpiralGalaxy(
    Math.floor(16000 + seededRandom(localSeed + 6) * 20000),
    300 + seededRandom(localSeed + 7) * 320
  );
}
else if (typeRoll < 0.26) {
  // Espiral floculenta
  obj = createFlocculentSpiral(
    Math.floor(15000 + seededRandom(localSeed + 6) * 18000),
    290 + seededRandom(localSeed + 7) * 300
  );
}
else if (typeRoll < 0.33) {
  // Elíptica
  obj = createEllipticalGalaxy(
    Math.floor(14000 + seededRandom(localSeed + 6) * 15000),
    250 + seededRandom(localSeed + 7) * 260,
    0.55 + seededRandom(localSeed + 8) * 0.3,
    0xffd9a0,
    0xff7a3d
  );
}
else if (typeRoll < 0.39) {
  // Lenticular (S0)
  obj = createLenticularGalaxy(
    Math.floor(13000 + seededRandom(localSeed + 6) * 14000),
    260 + seededRandom(localSeed + 7) * 240
  );
}
else if (typeRoll < 0.45) {
  // Edge-on
  obj = createEdgeOnGalaxy(
    Math.floor(15000 + seededRandom(localSeed + 6) * 16000),
    300 + seededRandom(localSeed + 7) * 260
  );
}
else if (typeRoll < 0.50) {
  // Anillo clásico
  obj = createClassicRingGalaxy(
    Math.floor(14000 + seededRandom(localSeed + 6) * 14000),
    280 + seededRandom(localSeed + 7) * 240
  );
}
else if (typeRoll < 0.55) {
  // Polar ring
  obj = createPolarRingGalaxy(
    Math.floor(16000 + seededRandom(localSeed + 6) * 12000),
    320 + seededRandom(localSeed + 7) * 220
  );
}
else if (typeRoll < 0.60) {
  // Seyfert (núcleo activo)
  obj = createSeyfertGalaxy(
    Math.floor(16000 + seededRandom(localSeed + 6) * 18000),
    310 + seededRandom(localSeed + 7) * 280
  );
}
else if (typeRoll < 0.65) {
  // Peculiar / distorsionada
  obj = createPeculiarGalaxy(
    Math.floor(14000 + seededRandom(localSeed + 6) * 15000),
    290 + seededRandom(localSeed + 7) * 250
  );
}
else if (typeRoll < 0.70) {
  // Enana esferoidal
  obj = createDwarfSpheroidal(
    Math.floor(6000 + seededRandom(localSeed + 6) * 7000),
    90 + seededRandom(localSeed + 7) * 80
  );
}
else if (typeRoll < 0.75) {
  // Grupo de galaxias
  obj = createGalaxyGroup(localSeed);
}
else if (typeRoll < 0.80) {
  // Interactuando
  obj = createInteractingGalaxies(380 + seededRandom(localSeed + 6) * 280);
}
else if (typeRoll < 0.47) {
  obj = createGlobularCluster(Math.floor(5500 + seededRandom(localSeed + 6) * 6500), 60 + seededRandom(localSeed + 7) * 75);
}
else if (typeRoll < 0.52) {
  obj = createOpenCluster(Math.floor(4500 + seededRandom(localSeed + 6) * 5500), 75 + seededRandom(localSeed + 7) * 85);
}
else if (typeRoll < 0.57) {
  obj = createWolfRayetCluster(Math.floor(7000 + seededRandom(localSeed + 6) * 8000), 150 + seededRandom(localSeed + 7) * 160);
}
else if (typeRoll < 0.62) {
  obj = createStarFormingRegion(Math.floor(7500 + seededRandom(localSeed + 6) * 8500), 170 + seededRandom(localSeed + 7) * 170);
}
else if (typeRoll < 0.67) {
  obj = createEmissionNebula(Math.floor(8500 + seededRandom(localSeed + 6) * 9000), 190 + seededRandom(localSeed + 7) * 180);
}
else if (typeRoll < 0.71) {
  obj = createReflectionNebula(Math.floor(7500 + seededRandom(localSeed + 6) * 8000), 170 + seededRandom(localSeed + 7) * 160);
}
else if (typeRoll < 0.75) {
  obj = createPlanetaryNebula(Math.floor(6500 + seededRandom(localSeed + 6) * 4500), 95 + seededRandom(localSeed + 7) * 85, 0x35e6ff, 0xff3b6e);
}
else if (typeRoll < 0.79) {
  obj = createSupernovaRemnant(120 + seededRandom(localSeed + 6) * 90);
}
else if (typeRoll < 0.82) {
  obj = createDarkMolecularCloud(9 + Math.floor(seededRandom(localSeed + 6) * 9), 240 + seededRandom(localSeed + 7) * 260);
}
else if (typeRoll < 0.85) {
  obj = createInterstellarFilament(400 + seededRandom(localSeed + 6) * 400, 45 + Math.floor(seededRandom(localSeed + 7) * 45));
}
// ——— Objetos raros e imponentes (baja probabilidad) ———
else if (typeRoll < 0.88) {
  obj = createMagnetar(180 + seededRandom(localSeed + 6) * 120);
}
else if (typeRoll < 0.91) {
  obj = createPowerfulBlazar(420 + seededRandom(localSeed + 6) * 380);
}
else if (typeRoll < 0.935) {
  obj = createLuminousBlueVariable(220 + seededRandom(localSeed + 6) * 180);
}
else if (typeRoll < 0.955) {
  obj = createTidalDisruptionEvent(160 + seededRandom(localSeed + 6) * 130);
}
else if (typeRoll < 0.97) {
  obj = createGiantRadioGalaxy(380 + seededRandom(localSeed + 6) * 320);
}
else if (typeRoll < 0.985) {
  obj = createHerbigHaroJets(260 + seededRandom(localSeed + 6) * 200);
}
else {
  obj = createIntermediateBlackHole(140 + seededRandom(localSeed + 6) * 120);
}
    obj.position.set(worldX, worldY, worldZ);
    group.add(obj);

    // Rotación lenta aleatoria
    const speed = (seededRandom(localSeed + 20) - 0.5) * 0.04;
    extraObjects.push({ obj, speed });
  }

  return group;
}

function updateObjectChunks(camPos: THREE.Vector3) {
  const cx = Math.floor(camPos.x / OBJECT_CHUNK_SIZE);
  const cy = Math.floor(camPos.y / OBJECT_CHUNK_SIZE);
  const cz = Math.floor(camPos.z / OBJECT_CHUNK_SIZE);

  const needed = new Set<string>();

  for (let x = -OBJECT_ACTIVE_RADIUS; x <= OBJECT_ACTIVE_RADIUS; x++) {
    for (let y = -OBJECT_ACTIVE_RADIUS; y <= OBJECT_ACTIVE_RADIUS; y++) {
      for (let z = -OBJECT_ACTIVE_RADIUS; z <= OBJECT_ACTIVE_RADIUS; z++) {
        const key = getChunkKey(cx + x, cy + y, cz + z);
        needed.add(key);

        if (!activeObjectChunks.has(key)) {
          const chunk = createObjectChunk(cx + x, cy + y, cz + z);
          galaxiesGroup.add(chunk);
          activeObjectChunks.set(key, chunk);
        }
      }
    }
  }

  // Eliminar chunks lejanos
  for (const [key, chunk] of activeObjectChunks) {
    if (!needed.has(key)) {
      // Limpiar de extraObjects
      chunk.traverse(obj => {
        const idx = extraObjects.findIndex(e => e.obj === obj || e.obj.parent === obj);
        if (idx !== -1) extraObjects.splice(idx, 1);
      });
      galaxiesGroup.remove(chunk);
      activeObjectChunks.delete(key);
    }
  }
}

  // 3b. Tipos de galaxias y nubes cósmicas
  const extraObjects: { obj: THREE.Object3D; speed: number }[] = [];

  function gauss() {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function sphericalPos(dist: number, lonDeg: number, latDeg: number) {
    const phi = THREE.MathUtils.degToRad(90 - latDeg);
    const theta = THREE.MathUtils.degToRad(lonDeg);
    return new THREE.Vector3(
      dist * Math.sin(phi) * Math.cos(theta),
      dist * Math.cos(phi),
      dist * Math.sin(phi) * Math.sin(theta)
    );
  }

  function buildPoints(pos: Float32Array, col: Float32Array, size: number, scaled = true) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: scaled ? size * U : size,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
  }

  function addCore(parent: THREE.Object3D, scale: number, r: number, g: number, b: number, opacity = 0.9) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(256, r, g, b),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity,
      depthWrite: false
    }));
    sprite.scale.set(scale, scale, 1);
    parent.add(sprite);
  }

  function placeObject(obj: THREE.Object3D, dist: number, lonDeg: number, latDeg: number, rotation: THREE.Euler, speed: number) {
    const group = new THREE.Group();
    group.position.copy(sphericalPos(dist, lonDeg, latDeg));
    group.rotation.copy(rotation);
    group.add(obj);
    galaxiesGroup.add(group);
    extraObjects.push({ obj, speed });
  }

  

  function createEllipticalGalaxy(count: number, radius: number, flatten: number, inside: number, outside: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cIn = new THREE.Color(inside);
    const cOut = new THREE.Color(outside);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 2.2) * radius;
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i3] = r * s * Math.cos(t);
      pos[i3 + 1] = r * u * flatten;
      pos[i3 + 2] = r * s * Math.sin(t);
      c.copy(cIn).lerp(cOut, r / radius);
      c.multiplyScalar(0.6 + Math.max(0, 1 - r / (radius * 0.3)) * 1.8);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 4.5);
    addCore(points, radius * 0.5, 1, 0.85, 0.6);
    return points;
  }

  function createBarredGalaxy(count: number, radius: number, inside: number, outside: number, dust: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cIn = new THREE.Color(inside);
    const cOut = new THREE.Color(outside);
    const cDust = new THREE.Color(dust);
    const c = new THREE.Color();
    const barLen = radius * 0.3;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      if (i < count * 0.3) {
        pos[i3] = (Math.random() * 2 - 1) * barLen;
        pos[i3 + 1] = gauss() * radius * 0.015;
        pos[i3 + 2] = gauss() * radius * 0.04;
        c.copy(cIn).multiplyScalar(1.2 + (1 - Math.abs(pos[i3]) / barLen));
      } else {
        const arm = i % 2;
        const r = barLen + Math.pow(Math.random(), 1.5) * (radius - barLen);
        const angle = arm * Math.PI + (r - barLen) * 0.012;
        pos[i3] = Math.cos(angle) * r + gauss() * r * 0.04;
        pos[i3 + 1] = gauss() * radius * 0.015;
        pos[i3 + 2] = Math.sin(angle) * r + gauss() * r * 0.04;
        c.copy(cIn).lerp(cOut, (r - barLen) / (radius - barLen));
        if (Math.random() > 0.7) c.lerp(cDust, Math.random() * 0.7);
      }
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 5.0);
    addCore(points, radius * 0.4, 1, 0.92, 0.75);
    return points;
  }

  function createRingGalaxy(count: number, radius: number, coreColor: number, ringColor: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cCore = new THREE.Color(coreColor);
    const cRing = new THREE.Color(ringColor);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = Math.random() * Math.PI * 2;
      if (i < count * 0.65) {
        const r = radius * (0.78 + gauss() * 0.05);
        pos[i3] = Math.cos(t) * r;
        pos[i3 + 1] = gauss() * radius * 0.012;
        pos[i3 + 2] = Math.sin(t) * r;
        c.copy(cRing).multiplyScalar(0.8 + Math.random() * 0.8);
      } else {
        const r = Math.pow(Math.random(), 2.5) * radius * 0.22;
        pos[i3] = Math.cos(t) * r;
        pos[i3 + 1] = gauss() * radius * 0.02;
        pos[i3 + 2] = Math.sin(t) * r;
        c.copy(cCore).multiplyScalar(1 + (1 - r / (radius * 0.22)) * 1.5);
      }
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 4.5);
    addCore(points, radius * 0.35, 1, 0.9, 0.7);
    return points;
  }

  function createIrregularGalaxy(count: number, radius: number, colors: number[]) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = colors.map(h => new THREE.Color(h));
    const white = new THREE.Color(0xffffff);
    const c = new THREE.Color();
    const centers = Array.from({ length: 6 }, () =>
      new THREE.Vector3(gauss() * radius * 0.35, gauss() * radius * 0.1, gauss() * radius * 0.35)
    );
    const spread = radius * 0.16;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const k = i % centers.length;
      pos[i3] = centers[k].x + gauss() * spread;
      pos[i3 + 1] = centers[k].y + gauss() * spread * 0.5;
      pos[i3 + 2] = centers[k].z + gauss() * spread;
      c.copy(palette[k % palette.length]).lerp(white, Math.random() * 0.5).multiplyScalar(0.7 + Math.random() * 0.9);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 4.5);
    addCore(points, radius * 0.6, 0.7, 0.8, 1.0, 0.35);
    return points;
  }

  function createGlobularCluster(count: number, radius: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const warm = new THREE.Color(0xffd9a0);
    const white = new THREE.Color(0xffffff);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = radius * Math.pow(Math.random(), 2.2);
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i3] = r * s * Math.cos(t);
      pos[i3 + 1] = r * u;
      pos[i3 + 2] = r * s * Math.sin(t);
      c.copy(warm).lerp(white, Math.random() * 0.6).multiplyScalar(1 + (1 - r / radius) * 1.5);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 3.5);
    addCore(points, radius * 1.4, 1, 0.9, 0.7, 0.6);
    return points;
  }

  function createPlanetaryNebula(count: number, radius: number, innerColor: number, outerColor: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cIn = new THREE.Color(innerColor);
    const cOut = new THREE.Color(outerColor);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = radius * (0.75 + gauss() * 0.07);
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i3] = r * s * Math.cos(t);
      pos[i3 + 1] = r * u * 0.8;
      pos[i3 + 2] = r * s * Math.sin(t);
      const k = THREE.MathUtils.clamp((r / radius - 0.6) / 0.4, 0, 1);
      c.copy(cIn).lerp(cOut, k).multiplyScalar(0.8 + Math.random() * 0.6);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 6.5);
    addCore(points, radius * 0.35, 0.8, 0.95, 1.0, 0.9);
    addCore(points, radius * 2.2, 0.2, 0.8, 0.9, 0.25);
    return points;
  }

  function createCloudCluster(center: THREE.Vector3, count: number, spread: number, c1: number, c2: number, minScale: number, maxScale: number) {
    const a = new THREE.Color(c1);
    const b = new THREE.Color(c2);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: a.clone().lerp(b, Math.random()),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.1, 0.26),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        center.x + gauss() * spread,
        center.y + gauss() * spread * 0.6,
        center.z + gauss() * spread
      );
      const s = THREE.MathUtils.randFloat(minScale, maxScale);
      sprite.scale.set(s, s, 1);
      nebulaGroup.add(sprite);
      clouds.push({
        sprite,
        baseOpacity: mat.opacity,
        pulseSpeed: THREE.MathUtils.randFloat(0.3, 0.9),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function createFilamentNebula(center: THREE.Vector3, radius: number, arc: number, count: number, c1: number, c2: number, tilt: THREE.Euler) {
    const a = new THREE.Color(c1);
    const b = new THREE.Color(c2);
    const q = new THREE.Quaternion().setFromEuler(tilt);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * arc;
      const r = radius * (1 + gauss() * 0.04);
      const p = new THREE.Vector3(
        Math.cos(t) * r + gauss() * radius * 0.03,
        gauss() * radius * 0.03,
        Math.sin(t) * r + gauss() * radius * 0.03
      ).applyQuaternion(q).add(center);
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: a.clone().lerp(b, i / count),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.14, 0.3),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(p);
      const s = THREE.MathUtils.randFloat(50, 140);
      sprite.scale.set(s, s, 1);
      nebulaGroup.add(sprite);
      clouds.push({
        sprite,
        baseOpacity: mat.opacity,
        pulseSpeed: THREE.MathUtils.randFloat(0.3, 0.9),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  placeObject(createEllipticalGalaxy(26000, 380, 0.65, 0xffd9a0, 0xff7a3d), 1100, 5, 10, new THREE.Euler(0.4, 0.2, 0.3), 0.02);
  placeObject(createBarredGalaxy(30000, 520, 0xffe9b8, 0x5fa8ff, 0xff4fa3), 1000, 170, -15, new THREE.Euler(0.9, 0.3, -0.4), 0.05);
  placeObject(createRingGalaxy(26000, 420, 0xffe0b0, 0x4de1ff), 1250, -50, 22, new THREE.Euler(1.0, 0.5, 0.2), 0.04);
  placeObject(createIrregularGalaxy(20000, 330, [0x6ea8ff, 0xff7ad9, 0xffd27a, 0x7affc8]), 950, 85, -30, new THREE.Euler(0.3, 0.8, 0.1), 0.015);
  placeObject(createGlobularCluster(8000, 90), 650, -160, 35, new THREE.Euler(0, 0, 0), 0.01);
  placeObject(createGlobularCluster(8000, 70), 700, 100, 45, new THREE.Euler(0, 0, 0), -0.012);
  placeObject(createPlanetaryNebula(9000, 120, 0x35e6ff, 0xff3b6e), 800, 30, -35, new THREE.Euler(0.6, 0.3, 0), 0.02);

  createCloudCluster(sphericalPos(1300, 140, 20), 40, 220, 0xff3b6e, 0xff9a3d, 220, 520);
  createCloudCluster(sphericalPos(1200, -20, -10), 40, 200, 0x2a6bff, 0x35e6ff, 200, 480);
  createCloudCluster(sphericalPos(1400, 230, -25), 40, 240, 0x7a2bff, 0xff3bd0, 240, 560);
  createFilamentNebula(sphericalPos(1000, -90, 5), 260, Math.PI * 1.3, 70, 0xff4f9a, 0x4f8cff, new THREE.Euler(0.8, 0.4, 0));

  // Galaxias colosales
  const giantA = createSpiralGalaxy({
    particleCount: 90000,
    radius: 1500,
    arms: 4,
    spin: 1.2,
    randomness: 0.3,
    insideColor: 0xffe9c0,
    outsideColor: 0x4a8cff,
    dustColor: 0xb04bff,
    position: new THREE.Vector3(-2800, 900, -2600),
    rotation: new THREE.Euler(1.2, 0.3, 0.5)
  });
  galaxiesGroup.add(giantA.container);
  extraObjects.push({ obj: giantA.mesh, speed: 0.012 });

  const giantB = createSpiralGalaxy({
    particleCount: 80000,
    radius: 1300,
    arms: 3,
    spin: 1.5,
    randomness: 0.28,
    insideColor: 0xffd9a0,
    outsideColor: 0xff6a8a,
    dustColor: 0x4de1ff,
    position: new THREE.Vector3(3100, -600, 2200),
    rotation: new THREE.Euler(-0.9, 0.6, 0.2)
  });
  galaxiesGroup.add(giantB.container);
  extraObjects.push({ obj: giantB.mesh, speed: -0.01 });

  // 3c. Elementos cósmicos adicionales
  const animators: Array<(t: number) => void> = [];
  const tmpV = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const viewDir = new THREE.Vector3();
  const viewRight = new THREE.Vector3();
  const viewUp = new THREE.Vector3();


  // ====================== OBJETOS CRUZANDO (INTERSTELARES) ======================
type CrossingObject = {
  group: THREE.Group;
  velocity: THREE.Vector3;
  life: number;
  age: number;
  maxLife: number;
  type: string;
};

const crossingObjects: CrossingObject[] = [];
const maxCrossing = 14;

function createCrossingComet() {
  const group = new THREE.Group();
  const length = THREE.MathUtils.randFloat(180, 420);

  // Núcleo
  const head = glowSprite(22, 0.95, 0.98, 1.0, 1.0);
  group.add(head);
  group.add(glowSprite(70, 0.6, 0.85, 1.0, 0.3));

  // Cola de polvo
  const dustCount = 1800;
  const dustPos = new Float32Array(dustCount * 3);
  const dustCol = new Float32Array(dustCount * 3);
  const c = new THREE.Color();

  for (let i = 0; i < dustCount; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 0.75);
    dustPos[i3] = -t * length;
    dustPos[i3 + 1] = gauss() * (4 + t * 18);
    dustPos[i3 + 2] = gauss() * (4 + t * 18);
    c.setRGB(1.0, 0.88 - t * 0.3, 0.7 - t * 0.25).multiplyScalar(Math.pow(1 - t, 1.4) * (0.6 + Math.random()));
    dustCol[i3] = c.r; dustCol[i3 + 1] = c.g; dustCol[i3 + 2] = c.b;
  }
  group.add(buildPoints(dustPos, dustCol, 3.8, false));

  return group;
}

function createCrossingAsteroidStream() {
  const group = new THREE.Group();
  const count = 40 + Math.floor(Math.random() * 50);

  for (let i = 0; i < count; i++) {
    const size = THREE.MathUtils.randFloat(3.5, 11);
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.15, 0.25 + Math.random() * 0.2),
        roughness: 0.9,
        flatShading: true
      })
    );
    mesh.position.set(
      gauss() * 90,
      gauss() * 50,
      -i * 18 + gauss() * 30
    );
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    group.add(mesh);
  }
  return group;
}

function createCrossingInterstellarObject() {
  // Objeto interestelar tipo 'Oumuamua / Borisov
  const group = new THREE.Group();

  const core = glowSprite(18, 0.85, 0.9, 1.0, 0.9);
  group.add(core);

  // Estela muy tenue
  const count = 900;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color(0xa0d4ff);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 0.8);
    pos[i3] = -t * 280;
    pos[i3 + 1] = gauss() * (3 + t * 10);
    pos[i3 + 2] = gauss() * (3 + t * 10);
    c.multiplyScalar(Math.pow(1 - t, 1.6) * (0.4 + Math.random() * 0.6));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.2, false));

  return group;
}

function createCrossingGasCloud() {
  const group = new THREE.Group();
  const count = 12 + Math.floor(Math.random() * 10);

  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 0.6, 0.55),
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.08, 0.22),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      gauss() * 140,
      gauss() * 80,
      gauss() * 160
    );
    const s = THREE.MathUtils.randFloat(90, 260);
    sprite.scale.set(s, s * 0.7, 1);
    group.add(sprite);
  }
  return group;
}

function spawnCrossingObject() {
  if (crossingObjects.length >= maxCrossing) return;

  const roll = Math.random();
  let group: THREE.Group;
  let type: string;
  let speed: number;

  if (roll < 0.38) {
    group = createCrossingComet();
    type = 'comet';
    speed = THREE.MathUtils.randFloat(95, 180);
  } else if (roll < 0.62) {
    group = createCrossingAsteroidStream();
    type = 'asteroids';
    speed = THREE.MathUtils.randFloat(60, 110);
  } else if (roll < 0.82) {
    group = createCrossingInterstellarObject();
    type = 'interstellar';
    speed = THREE.MathUtils.randFloat(140, 260);
  } else {
    group = createCrossingGasCloud();
    type = 'cloud';
    speed = THREE.MathUtils.randFloat(35, 75);
  }

  // Posición de aparición: delante y un poco al costado
  const spawnDist = THREE.MathUtils.randFloat(900, 1600);
  const side = (Math.random() - 0.5) * 1.4;
  const up = (Math.random() - 0.5) * 0.9;

  camera.getWorldDirection(viewDir);
  viewRight.crossVectors(viewDir, worldUp).normalize();
  viewUp.crossVectors(viewRight, viewDir).normalize();

  const startPos = camera.position.clone()
    .addScaledVector(viewDir, spawnDist * 0.35)
    .addScaledVector(viewRight, side * spawnDist * 0.6)
    .addScaledVector(viewUp, up * spawnDist * 0.45);

  // Dirección de cruce (pasa por el campo de visión)
  const target = camera.position.clone()
    .addScaledVector(viewDir, spawnDist * 0.1)
    .addScaledVector(viewRight, -side * 180)
    .addScaledVector(viewUp, -up * 120);

  const velocity = target.sub(startPos).normalize().multiplyScalar(speed);

  group.position.copy(startPos);
  group.lookAt(startPos.clone().add(velocity));
  scene.add(group);

  crossingObjects.push({
    group,
    velocity,
    life: 0,
    age: 0,
    maxLife: THREE.MathUtils.randFloat(9, 18),
    type
  });
}

// Llamar esto de vez en cuando
let nextCrossing = 2.5;

animators.push((t) => {
  // Spawn
  if (t > nextCrossing && mode === 'explore') {
    spawnCrossingObject();
    nextCrossing = t + THREE.MathUtils.randFloat(1.8, 5.5);
  }

  // Actualizar objetos existentes
  for (let i = crossingObjects.length - 1; i >= 0; i--) {
    const obj = crossingObjects[i];
    obj.age += 0.016; // aproximadamente dt
    obj.group.position.addScaledVector(obj.velocity, 0.016);

    // Fade in / out
    const fade = Math.min(1, obj.age * 1.8, (obj.maxLife - obj.age) * 1.5);
    
    obj.group.traverse(child => {
      if (child instanceof THREE.Sprite) {
        const mat = child.material as THREE.SpriteMaterial;
        if (mat.userData.baseOpacity === undefined) {
          mat.userData.baseOpacity = mat.opacity;
        }
        mat.opacity = mat.userData.baseOpacity * fade;
      }
      if (child instanceof THREE.Points) {
        const mat = child.material as THREE.PointsMaterial;
        if (mat.userData.baseOpacity === undefined) {
          mat.userData.baseOpacity = mat.opacity || 1;
        }
        mat.opacity = mat.userData.baseOpacity * fade;
      }
    });

    if (obj.age > obj.maxLife) {
      scene.remove(obj.group);
      crossingObjects.splice(i, 1);
    }
  }
});

  function glowSprite(scale: number, r: number, g: number, b: number, opacity = 0.9) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(256, r, g, b),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity,
      depthWrite: false
    }));
    s.scale.set(scale, scale, 1);
    return s;
  }

  function placeStatic(obj: THREE.Object3D, dist: number, lonDeg: number, latDeg: number, rotation: THREE.Euler) {
    obj.position.copy(sphericalPos(dist, lonDeg, latDeg));
    obj.rotation.copy(rotation);
    universe.add(obj);
  }

  // Cometas con estela
  function createComet(length: number) {
    const group = new THREE.Group();

    const dustCount = 2600;
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    const c = new THREE.Color();
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const t = Math.pow(Math.random(), 0.8);
      const spread = 2 + t * length * 0.12;
      dustPos[i3] = -t * length;
      dustPos[i3 + 1] = gauss() * spread + t * t * length * 0.12;
      dustPos[i3 + 2] = gauss() * spread;
      c.setRGB(1.0, 0.85 - 0.25 * t, 0.6 - 0.1 * t).multiplyScalar(Math.pow(1 - t, 1.5) * (0.5 + Math.random() * 0.9));
      dustCol[i3] = c.r; dustCol[i3 + 1] = c.g; dustCol[i3 + 2] = c.b;
    }
    const dust = buildPoints(dustPos, dustCol, 4.0, false);
    group.add(dust);

    const ionCount = 1400;
    const ionPos = new Float32Array(ionCount * 3);
    const ionCol = new Float32Array(ionCount * 3);
    for (let i = 0; i < ionCount; i++) {
      const i3 = i * 3;
      const t = Math.pow(Math.random(), 0.8);
      const spread = 1 + t * length * 0.015;
      ionPos[i3] = -t * length * 1.3;
      ionPos[i3 + 1] = gauss() * spread;
      ionPos[i3 + 2] = gauss() * spread;
      c.setRGB(0.45, 0.8, 1.0).multiplyScalar(Math.pow(1 - t, 1.2) * (0.6 + Math.random() * 1.0));
      ionCol[i3] = c.r; ionCol[i3 + 1] = c.g; ionCol[i3 + 2] = c.b;
    }
    const ion = buildPoints(ionPos, ionCol, 3.5, false);
    ion.rotation.z = -0.12;
    group.add(ion);

    const coma = glowSprite(90, 0.6, 0.85, 1.0, 0.35);
    const head = glowSprite(26, 0.95, 1.0, 1.0, 1.0);
    group.add(coma, head);

    return {
      group,
      parts: [
        { mat: dust.material as THREE.PointsMaterial, base: 1 },
        { mat: ion.material as THREE.PointsMaterial, base: 1 },
        { mat: coma.material, base: 0.35 },
        { mat: head.material, base: 1 }
      ]
    };
  }

  const xAxis = new THREE.Vector3(1, 0, 0);
  const comets = Array.from({ length: 2 }, (_, i) => {
    const comet = createComet(380);
    comet.group.visible = false;
    scene.add(comet.group);
    return {
      ...comet,
      t0: -1,
      next: 4 + i * 14,
      life: 32,
      speed: 55,
      start: new THREE.Vector3(),
      dir: new THREE.Vector3()
    };
  });

  animators.push(t => {
    for (const k of comets) {
      if (k.t0 < 0 && t > k.next) {
        const center = pointInView(1200, 0.35);
        if (isInVoid(center.x, center.y, center.z)) {
          k.next = t + 1;
          continue;
        }
        const ang = Math.random() * Math.PI * 2;
        k.dir.set(0, 0, 0)
          .addScaledVector(viewRight, Math.cos(ang))
          .addScaledVector(viewUp, Math.sin(ang) * 0.5);
        const n = tmpV.copy(center).normalize();
        k.dir.addScaledVector(n, -k.dir.dot(n)).normalize();
        k.speed = THREE.MathUtils.randFloat(45, 70);
        k.start.copy(center).addScaledVector(k.dir, -k.speed * k.life * 0.5);
        k.group.quaternion.setFromUnitVectors(xAxis, k.dir);
        k.t0 = t;
        k.group.visible = true;
      }
      if (k.t0 >= 0) {
        const age = t - k.t0;
        if (age > k.life) {
          k.group.visible = false;
          k.t0 = -1;
          k.next = t + THREE.MathUtils.randFloat(10, 25);
        } else {
          k.group.position.copy(k.start).addScaledVector(k.dir, k.speed * age);
          const fade = Math.min(1, age / 3, (k.life - age) / 3);
          const flicker = 0.9 + 0.1 * Math.sin(t * 7.0 + k.speed);
          for (const p of k.parts) p.mat.opacity = p.base * fade * flicker;
        }
      }
    }
  });

  function pointInView(dist: number, spread: number) {
    camera.getWorldDirection(viewDir);
    viewRight.crossVectors(viewDir, worldUp);
    if (viewRight.lengthSq() < 1e-6) viewRight.set(1, 0, 0);
    viewRight.normalize();
    viewUp.crossVectors(viewRight, viewDir).normalize();
    return viewDir.clone()
      .addScaledVector(viewRight, (Math.random() * 2 - 1) * spread)
      .addScaledVector(viewUp, (Math.random() * 2 - 1) * spread)
      .normalize()
      .multiplyScalar(dist)
      .add(camera.position);
  }

  // Nebulosas oscuras
  function createDarkCloudTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 256;
    const ctx = cvs.getContext('2d')!;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * 70;
      const x = 128 + Math.cos(a) * d;
      const y = 128 + Math.sin(a) * d * 0.7;
      const r = 30 + Math.random() * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0, 0, 0, ${0.5 + Math.random() * 0.4})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    ctx.globalCompositeOperation = 'destination-in';
    const mask = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    mask.addColorStop(0, 'rgba(255, 255, 255, 1)');
    mask.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cvs);
  }

  const darkTextures = [createDarkCloudTexture(), createDarkCloudTexture(), createDarkCloudTexture()];

  function createDarkNebula(center: THREE.Vector3, count: number, spread: number, minS: number, maxS: number) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: darkTextures[i % darkTextures.length],
        color: 0x000000,
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.55, 0.9),
        depthTest: false,
        depthWrite: false,
        fog: false
      });
      mat.rotation = Math.random() * Math.PI * 2;
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        center.x + gauss() * spread,
        center.y + gauss() * spread * 0.6,
        center.z + gauss() * spread
      );
      const s = THREE.MathUtils.randFloat(minS, maxS);
      sprite.scale.set(s, s, 1);
      sprite.renderOrder = 5;
      nebulaGroup.add(sprite);
    }
  }

  // Quásar
  function createQuasar(length: number) {
    const group = new THREE.Group();
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cNear = new THREE.Color(0xdff4ff);
    const cFar = new THREE.Color(0x7a5cff);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const side = i % 2 === 0 ? 1 : -1;
      const t = Math.pow(Math.random(), 0.8);
      const spread = 2 + t * length * 0.05;
      pos[i3] = gauss() * spread;
      pos[i3 + 1] = side * t * length;
      pos[i3 + 2] = gauss() * spread;
      c.copy(cNear).lerp(cFar, t).multiplyScalar((1.5 - t) * (0.7 + Math.random() * 0.8));
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    group.add(buildPoints(pos, col, 4.0));

    const core = glowSprite(length * 0.28, 0.9, 0.95, 1.0, 1.0);
    group.add(core);
    group.add(glowSprite(length * 0.9, 0.5, 0.6, 1.0, 0.3));
    for (const side of [1, -1]) {
      const lobe = glowSprite(length * 0.55, 0.6, 0.4, 1.0, 0.28);
      lobe.position.set(0, side * length, 0);
      group.add(lobe);
    }

    animators.push(t => {
      core.material.opacity = 0.8 + 0.2 * Math.sin(t * 5.3) * Math.sin(t * 1.7);
    });
    return group;
  }

  // Púlsar
  function createPulsar(beamLength: number) {
    const group = new THREE.Group();
    const spin = new THREE.Group();
    const beams = new THREE.Group();
    beams.rotation.z = 0.5;
    spin.add(beams);
    group.add(spin);

    const count = 1400;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const side = i % 2 === 0 ? 1 : -1;
      const t = Math.pow(Math.random(), 0.7);
      const sp = 1 + t * beamLength * 0.035;
      pos[i3] = gauss() * sp;
      pos[i3 + 1] = side * t * beamLength;
      pos[i3 + 2] = gauss() * sp;
      const f = (1 - t) * (0.6 + Math.random() * 1.2);
      col[i3] = 0.55 * f; col[i3 + 1] = 0.9 * f; col[i3 + 2] = 1.0 * f;
    }
    beams.add(buildPoints(pos, col, 4.5));

    const core = glowSprite(beamLength * 0.35, 0.8, 0.95, 1.0, 1);
    group.add(core);
    group.add(glowSprite(beamLength * 0.9, 0.3, 0.7, 1.0, 0.18));

    animators.push(t => {
      spin.rotation.y = t * 2.4;
      core.material.opacity = 0.45 + 0.55 * Math.pow(Math.abs(Math.sin(t * 2.4)), 10);
    });
    return group;
  }

  // ====================== OBJETOS RAROS Y ESPECTACULARES ======================

function createMagnetar(beamLength: number) {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);

  // Núcleo extremadamente brillante
  const core = glowSprite(beamLength * 0.55, 0.9, 0.95, 1.0, 1.0);
  group.add(core);
  group.add(glowSprite(beamLength * 1.4, 0.4, 0.6, 1.0, 0.25));

  // Haces de partículas (más intensos que un púlsar normal)
  const count = 2200;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const side = i % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.65);
    const sp = 1.5 + t * beamLength * 0.04;
    pos[i3] = gauss() * sp;
    pos[i3 + 1] = side * t * beamLength;
    pos[i3 + 2] = gauss() * sp;

    const f = (1 - t) * (1.1 + Math.random() * 1.6);
    col[i3] = 0.6 * f;
    col[i3 + 1] = 0.85 * f;
    col[i3 + 2] = 1.0 * f;
  }
  spin.add(buildPoints(pos, col, 5.2));

  // Destellos violentos (starquakes)
  animators.push(t => {
    spin.rotation.y = t * 3.8;
    const pulse = Math.pow(Math.abs(Math.sin(t * 4.2)), 14);
    core.material.opacity = 0.5 + 0.5 * pulse;
    core.scale.setScalar(beamLength * 0.55 * (1 + pulse * 0.7));
  });

  return group;
}

function createPowerfulBlazar(jetLength: number) {
  const group = new THREE.Group();

  // Núcleo del quasar
  const core = glowSprite(jetLength * 0.38, 1.0, 0.95, 0.9, 1.0);
  group.add(core);
  group.add(glowSprite(jetLength * 1.1, 0.6, 0.5, 1.0, 0.35));

  // Jets relativistas largos
  const count = 9000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cNear = new THREE.Color(0xffffff);
  const cFar = new THREE.Color(0x7a5cff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const side = i % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.75);
    const spread = 3 + t * jetLength * 0.06;

    pos[i3] = gauss() * spread;
    pos[i3 + 1] = side * t * jetLength;
    pos[i3 + 2] = gauss() * spread;

    c.copy(cNear).lerp(cFar, t);
    c.multiplyScalar((1.8 - t) * (0.8 + Math.random() * 1.1));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.8));

  // Lóbulos terminales
  for (const side of [1, -1]) {
    const lobe = glowSprite(jetLength * 0.7, 0.55, 0.4, 1.0, 0.32);
    lobe.position.set(0, side * jetLength * 0.95, 0);
    group.add(lobe);
  }

  animators.push(t => {
    core.material.opacity = 0.75 + 0.25 * Math.sin(t * 6.2) * Math.sin(t * 2.1);
  });

  return group;
}

function createLuminousBlueVariable(radius: number) {
  const group = new THREE.Group();

  // Estrella central extremadamente luminosa
  const core = glowSprite(radius * 0.5, 0.7, 0.85, 1.0, 1.0);
  group.add(core);
  group.add(glowSprite(radius * 1.3, 0.5, 0.7, 1.0, 0.3));

  // Nebulosa bipolar (como Homunculus de Eta Carinae)
  const count = 14000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c1 = new THREE.Color(0xff6a3d);
  const c2 = new THREE.Color(0xffd27a);
  const c3 = new THREE.Color(0x8ab4ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const lobe = i < count / 2 ? 1 : -1;
    const t = Math.pow(Math.random(), 1.3);
    const ang = Math.random() * Math.PI * 2;
    const r = radius * (0.25 + t * 0.85);
    const spread = radius * 0.22 * (1 - t * 0.7);

    pos[i3] = Math.cos(ang) * spread * (0.6 + t);
    pos[i3 + 1] = lobe * r;
    pos[i3 + 2] = Math.sin(ang) * spread * (0.6 + t);

    c.copy(c1).lerp(c2, t).lerp(c3, Math.random() * 0.3);
    c.multiplyScalar(0.7 + Math.random() * 1.0);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 5.0));
  return group;
}

function createPolarRingGalaxy(count: number, radius: number) {
  const group = new THREE.Group();

  // Disco principal
  const disk = createEllipticalGalaxy(Math.floor(count * 0.55), radius * 0.85, 0.35, 0xffe0b0, 0xff8a5a);
  group.add(disk);

  // Anillo polar
  const ringPos = new Float32Array(Math.floor(count * 0.45) * 3);
  const ringCol = new Float32Array(Math.floor(count * 0.45) * 3);
  const cRing = new THREE.Color(0x6ec8ff);
  const c = new THREE.Color();

  for (let i = 0; i < Math.floor(count * 0.45); i++) {
    const i3 = i * 3;
    const ang = Math.random() * Math.PI * 2;
    const r = radius * (0.75 + gauss() * 0.08);

    ringPos[i3] = Math.cos(ang) * r;
    ringPos[i3 + 1] = Math.sin(ang) * r;          // anillo vertical
    ringPos[i3 + 2] = gauss() * radius * 0.04;

    c.copy(cRing).multiplyScalar(0.7 + Math.random() * 0.9);
    ringCol[i3] = c.r; ringCol[i3 + 1] = c.g; ringCol[i3 + 2] = c.b;
  }

  group.add(buildPoints(ringPos, ringCol, 4.3));
  return group;
}

function createTidalDisruptionEvent(radius: number) {
  const group = new THREE.Group();

  // Agujero negro central
  const core = glowSprite(radius * 0.35, 1.0, 0.9, 0.7, 1.0);
  group.add(core);
  group.add(glowSprite(radius * 1.1, 1.0, 0.5, 0.2, 0.35));

  // Corriente de escombros (stream)
  const count = 7500;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 0.7);

    // Trayectoria en espiral que cae
    const ang = t * 9.0;
    const r = radius * (0.15 + t * 0.9);

    pos[i3] = Math.cos(ang) * r * (1 - t * 0.4);
    pos[i3 + 1] = gauss() * radius * 0.06;
    pos[i3 + 2] = Math.sin(ang) * r * (1 - t * 0.4);

    c.setRGB(1.0, 0.55 - t * 0.3, 0.25);
    c.multiplyScalar((1.3 - t) * (0.8 + Math.random()));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.5));

  animators.push(t => {
    core.material.opacity = 0.7 + 0.3 * Math.sin(t * 5.5);
  });

  return group;
}

function createGiantRadioGalaxy(lobeSize: number) {
  const group = new THREE.Group();

  // Núcleo
  const core = glowSprite(lobeSize * 0.25, 0.9, 0.85, 1.0, 0.9);
  group.add(core);

  // Dos lóbulos enormes
  for (const side of [-1, 1]) {
    const count = 5500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color(0x7a9fff);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = Math.random();
      const spread = lobeSize * (0.3 + t * 0.5);

      pos[i3] = gauss() * spread * 0.7;
      pos[i3 + 1] = side * (lobeSize * 0.6 + t * lobeSize * 0.7);
      pos[i3 + 2] = gauss() * spread * 0.7;

      c.multiplyScalar(0.5 + Math.random() * 0.8);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    group.add(buildPoints(pos, col, 5.5));
  }

  return group;
}

function createHerbigHaroJets(length: number) {
  const group = new THREE.Group();

  // Protoestrella central
  const core = glowSprite(length * 0.18, 1.0, 0.85, 0.6, 1.0);
  group.add(core);

  // Jets bipolares
  const count = 4800;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const side = i % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.8);
    const spread = 2 + t * length * 0.04;

    pos[i3] = gauss() * spread;
    pos[i3 + 1] = side * t * length;
    pos[i3 + 2] = gauss() * spread;

    c.setRGB(0.4 + t * 0.3, 0.7, 1.0);
    c.multiplyScalar((1.2 - t) * (0.7 + Math.random()));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.2));
  return group;
}

function createWolfRayetCluster(count: number, radius: number) {
  const group = new THREE.Group();

  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.9);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);

    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.65;
    pos[i3 + 2] = r * s * Math.sin(t);

    // Estrellas muy calientes y luminosas
    c.setRGB(0.6 + Math.random() * 0.4, 0.8, 1.0);
    c.multiplyScalar(1.4 + Math.random() * 2.2);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.5));

  // Vientos estelares (nebulosidad)
  const wind = createEmissionNebula(Math.floor(count * 0.5), radius * 1.3);
  group.add(wind);

  return group;
}

function createIntermediateBlackHole(radius: number) {
  const group = new THREE.Group();

  // Disco de acreción
  const count = 9000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const ang = Math.random() * Math.PI * 2;
    const r = radius * (0.2 + Math.pow(Math.random(), 1.4) * 0.8);

    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.03;
    pos[i3 + 2] = Math.sin(ang) * r;

    const heat = 1.0 - (r / radius);
    c.setRGB(1.0, 0.55 + heat * 0.35, 0.25 + heat * 0.4);
    c.multiplyScalar(0.8 + heat * 1.6);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.0));

  // Jets débiles
  const jet = createHerbigHaroJets(radius * 1.8);
  jet.scale.setScalar(0.6);
  group.add(jet);

  const core = glowSprite(radius * 0.35, 1.0, 0.9, 0.7, 1.0);
  group.add(core);

  return group;
}

function createInteractingGalaxies(radius: number) {
  const group = new THREE.Group();

  // Dos galaxias
  const g1 = createSpiralGalaxy({
    particleCount: 18000,
    radius: radius * 0.7,
    arms: 3,
    spin: 1.2,
    randomness: 0.3,
    insideColor: 0xffe9b0,
    outsideColor: 0x4a9fff,
    dustColor: 0xc43bff
  }).container;
  g1.position.set(-radius * 0.45, 0, 0);
  group.add(g1);

  const g2 = createEllipticalGalaxy(14000, radius * 0.55, 0.6, 0xffd9a0, 0xff7a3d);
  g2.position.set(radius * 0.5, radius * 0.15, 0);
  group.add(g2);

  // Colas de marea
  const tailCount = 6500;
  const pos = new Float32Array(tailCount * 3);
  const col = new Float32Array(tailCount * 3);
  const c = new THREE.Color(0xa0c8ff);

  for (let i = 0; i < tailCount; i++) {
    const i3 = i * 3;
    const t = Math.random();
    const side = i < tailCount / 2 ? -1 : 1;

    pos[i3] = side * radius * (0.6 + t * 1.4) + gauss() * 40;
    pos[i3 + 1] = Math.sin(t * 3.5) * radius * 0.35 + gauss() * 25;
    pos[i3 + 2] = gauss() * 35;

    c.multiplyScalar(0.5 + Math.random() * 0.8);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.0));
  return group;
}

  // Remanente de supernova
  function createSupernovaRemnant(radius: number) {
    const group = new THREE.Group();
    const filaments = 46;
    const steps = 34;
    const pos = new Float32Array(filaments * steps * 3);
    const col = new Float32Array(filaments * steps * 3);
    const remnantColors = [0xff5a3d, 0xff9a3d, 0x35e6ff, 0xc43bff, 0xff4fa3].map(h => new THREE.Color(h));
    const c = new THREE.Color();
    const p = new THREE.Vector3();
    const vel = new THREE.Vector3();
    const jit = new THREE.Vector3();
    let idx = 0;
    for (let f = 0; f < filaments; f++) {
      const rr = radius * (0.8 + Math.random() * 0.3);
      p.set(gauss(), gauss(), gauss()).setLength(rr);
      vel.set(gauss(), gauss(), gauss()).normalize();
      for (let s = 0; s < steps; s++) {
        p.addScaledVector(vel, radius * 0.045);
        vel.add(jit.set(gauss(), gauss(), gauss()).multiplyScalar(0.35)).normalize();
        p.setLength(rr * (1 + gauss() * 0.02));
        pos[idx * 3] = p.x + gauss() * radius * 0.006;
        pos[idx * 3 + 1] = p.y + gauss() * radius * 0.006;
        pos[idx * 3 + 2] = p.z + gauss() * radius * 0.006;
        c.copy(remnantColors[f % remnantColors.length]).multiplyScalar(0.6 + Math.random() * 0.9);
        col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
        idx++;
      }
    }
    group.add(buildPoints(pos, col, 4.5));
    addCore(group, radius * 0.25, 0.6, 0.9, 1.0, 1.0);
    addCore(group, radius * 2.4, 1.0, 0.5, 0.4, 0.18);

    animators.push(t => {
      const s = 1 + 0.03 * Math.sin(t * 0.4);
      group.scale.set(s, s, s);
      group.rotation.y = t * 0.01;
    });
    return group;
  }

  // Lente gravitacional
  function createGravitationalLens(ringRadius: number) {
    const group = new THREE.Group();
    addCore(group, ringRadius * 0.9, 1, 0.82, 0.55, 0.9);

    const count = 3600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const arcs = [
      { start: 0.2, len: 1.5 },
      { start: 2.5, len: 0.9 },
      { start: 4.0, len: 1.1 },
      { start: 5.4, len: 0.5 }
    ];
    const cArc = new THREE.Color(0x7fb0ff);
    const cArc2 = new THREE.Color(0xffb0e0);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const arc = arcs[i % arcs.length];
      const ang = arc.start + Math.random() * arc.len;
      const r = ringRadius * (1 + gauss() * 0.025);
      pos[i3] = Math.cos(ang) * r;
      pos[i3 + 1] = Math.sin(ang) * r;
      pos[i3 + 2] = gauss() * 2;
      const taper = Math.sin(Math.PI * (ang - arc.start) / arc.len);
      c.copy(cArc).lerp(cArc2, Math.random() * 0.6).multiplyScalar(0.5 + 1.8 * taper);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    group.add(buildPoints(pos, col, 4.5));
    return group;
  }

  // Sistema binario
  function createBinarySystem(sep: number) {
    const group = new THREE.Group();
    const rot = new THREE.Group();
    group.add(rot);
    group.rotation.set(0.45, 0, 0.2);

    const a = new THREE.Vector3(-sep * 0.35, 0, 0);
    const b = new THREE.Vector3(sep * 0.65, 0, 0);

    const starA = glowSprite(sep * 1.1, 0.75, 0.88, 1.0, 1);
    starA.position.copy(a);
    const starB = glowSprite(sep * 0.8, 1.0, 0.6, 0.3, 0.95);
    starB.position.copy(b);
    rot.add(starA, starB);

    const streamCount = 700;
    const diskCount = 900;
    const pos = new Float32Array((streamCount + diskCount) * 3);
    const col = new Float32Array((streamCount + diskCount) * 3);
    const c = new THREE.Color();
    for (let i = 0; i < streamCount; i++) {
      const t = Math.random();
      const i3 = i * 3;
      pos[i3] = THREE.MathUtils.lerp(b.x, a.x, t) + gauss() * sep * 0.012;
      pos[i3 + 1] = Math.sin(t * Math.PI) * sep * 0.28 + gauss() * sep * 0.012;
      pos[i3 + 2] = Math.sin(t * Math.PI * 2) * sep * 0.1 + gauss() * sep * 0.012;
      c.setRGB(1.0, 0.7 - 0.2 * t, 0.4 + 0.5 * t).multiplyScalar(0.8 + Math.random() * 0.8);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    for (let i = 0; i < diskCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = sep * (0.12 + Math.random() * 0.18);
      const i3 = (streamCount + i) * 3;
      pos[i3] = a.x + Math.cos(ang) * r;
      pos[i3 + 1] = gauss() * sep * 0.01;
      pos[i3 + 2] = a.z + Math.sin(ang) * r;
      c.setRGB(1.0, 0.85, 0.65).multiplyScalar(0.6 + Math.random() * 1.0);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    rot.add(buildPoints(pos, col, 3.5));

    animators.push(t => {
      rot.rotation.y = t * 0.35;
    });
    return group;
  }

  // Telaraña cósmica
  function createCosmicWeb() {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      nodes.push(sphericalPos(
        THREE.MathUtils.randFloat(1700, 2600),
        Math.random() * 360,
        THREE.MathUtils.randFloat(-70, 70)
      ));
    }
    const positions: number[] = [];
    const colors: number[] = [];
    const cA = new THREE.Color(0xbcd4ff);
    const cB = new THREE.Color(0xffe2b0);
    const c = new THREE.Color();
    const p = new THREE.Vector3();

    const push = (v: THREE.Vector3, bright: number) => {
      if (isInVoid(v.x, v.y, v.z)) return;
      positions.push(v.x, v.y, v.z);
      c.copy(cA).lerp(cB, Math.random()).multiplyScalar(bright);
      colors.push(c.r, c.g, c.b);
    };

    for (const n of nodes) {
      for (let i = 0; i < 650; i++) {
        p.set(n.x + gauss() * 70, n.y + gauss() * 70, n.z + gauss() * 70);
        push(p, 0.7 + Math.random() * 1.3);
      }
    }
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        if (nodes[a].distanceTo(nodes[b]) > 2400) continue;
        for (let i = 0; i < 420; i++) {
          p.lerpVectors(nodes[a], nodes[b], Math.random());
          p.x += gauss() * 22;
          p.y += gauss() * 22;
          p.z += gauss() * 22;
          push(p, 0.5 + Math.random() * 0.9);
        }
      }
    }
    return buildPoints(new Float32Array(positions), new Float32Array(colors), 4.0);
  }

  // Supernova ocasional
  const flash = glowSprite(10, 0.85, 0.92, 1.0, 0);
  scene.add(flash);
  let flashStart = -1;
  let nextFlash = 6;
  animators.push(t => {
    if (flashStart < 0 && t > nextFlash) {
      for (let k = 0; k < 12; k++) {
        const p = pointInView(THREE.MathUtils.randFloat(900, 1800), 0.55);
        if (!isInVoid(p.x, p.y, p.z)) {
          flash.position.copy(p);
          break;
        }
      }
      flashStart = t;
    }
    if (flashStart >= 0) {
      const k = (t - flashStart) / 6;
      if (k >= 1) {
        flash.material.opacity = 0;
        flashStart = -1;
        nextFlash = t + THREE.MathUtils.randFloat(8, 18);
      } else {
        const rise = Math.min(k / 0.08, 1);
        flash.material.opacity = rise * Math.pow(1 - k, 2.2);
        const s = 20 + 260 * Math.sqrt(k);
        flash.scale.set(s, s, 1);
      }
    }
  });

  // Estrellas fugaces
  const trailLen = 28;
  const streaks = Array.from({ length: 4 }, () => {
    const pos = new Float32Array(trailLen * 3);
    const col = new Float32Array(trailLen * 3);
    for (let j = 0; j < trailLen; j++) {
      const f = Math.pow(1 - j / trailLen, 2);
      col[j * 3] = f; col[j * 3 + 1] = f * 0.95; col[j * 3 + 2] = f;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 4,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return {
      pts,
      mat,
      pos,
      start: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      t0: -1,
      next: 2 + Math.random() * 6
    };
  });

  animators.push(t => {
    const speed = 700;
    const spacing = 5;
    const life = 0.9;
    for (const s of streaks) {
      if (s.t0 < 0 && t > s.next) {
        s.start.copy(pointInView(800, 0.5));
        s.dir.set(0, 0, 0)
          .addScaledVector(viewRight, Math.random() * 2 - 1)
          .addScaledVector(viewUp, (Math.random() * 2 - 1) * 0.6);
        const n = tmpV.copy(s.start).normalize();
        s.dir.addScaledVector(n, -s.dir.dot(n)).normalize();
        s.t0 = t;
      }
      if (s.t0 >= 0) {
        const age = t - s.t0;
        if (age > life) {
          s.mat.opacity = 0;
          s.t0 = -1;
          s.next = t + THREE.MathUtils.randFloat(2, 7);
        } else {
          const d = speed * age;
          for (let j = 0; j < trailLen; j++) {
            const k = d - j * spacing;
            s.pos[j * 3] = s.start.x + s.dir.x * k;
            s.pos[j * 3 + 1] = s.start.y + s.dir.y * k;
            s.pos[j * 3 + 2] = s.start.z + s.dir.z * k;
          }
          (s.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          s.mat.opacity = Math.sin(Math.PI * age / life);
        }
      }
    }
  });

  universe.add(createCosmicWeb());
  createDarkNebula(sphericalPos(900, 40, -5), 9, 170, 220, 420);
  createDarkNebula(sphericalPos(1000, 180, 25), 8, 150, 200, 380);
  createDarkNebula(sphericalPos(950, 330, -25), 9, 180, 220, 440);

  placeStatic(createQuasar(220), 1500, 60, 40, new THREE.Euler(0.3, 0, 0.6));
  placeStatic(createPulsar(160), 600, 250, -40, new THREE.Euler(0.2, 0, 0.3));
  placeStatic(createSupernovaRemnant(140), 700, 110, 5, new THREE.Euler(0.4, 0.2, 0));
  placeStatic(createGravitationalLens(120), 1400, 150, 55, new THREE.Euler(0, 0, 0));
  universe.children[universe.children.length - 1].lookAt(0, 0, 0);
  placeStatic(createBinarySystem(40), 450, 195, 15, new THREE.Euler(0.45, 0, 0.2));

  // 3d. Agujero negro
  const wormPos = sphericalPos(1300 * U, 190, 65);
  const wormRadius = 1600;

  const wormMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                   mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * vnoise(p);
          p = p * 2.03 + vec2(11.3, 7.1);
          a *= 0.5;
        }
        return v;
      }

      vec3 heat(float x) {
        x = clamp(x, 0.0, 1.0);
        vec3 c = mix(vec3(0.0), vec3(0.28, 0.03, 0.0), smoothstep(0.0, 0.18, x));
        c = mix(c, vec3(0.75, 0.13, 0.0), smoothstep(0.15, 0.42, x));
        c = mix(c, vec3(1.0, 0.46, 0.04), smoothstep(0.38, 0.66, x));
        c = mix(c, vec3(1.0, 0.80, 0.28), smoothstep(0.62, 0.86, x));
        c = mix(c, vec3(1.0, 0.97, 0.75), smoothstep(0.84, 1.0, x));
        return c;
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float t = uTime;

        vec2 pc = p - vec2(0.0, 0.03);
        float r = length(pc);
        float a = atan(pc.y, pc.x);

        float peak = -1.25 + 0.12 * sin(t * 0.11);
        float beam = pow(0.5 + 0.5 * cos(a - peak), 1.7);
        float beam2 = pow(0.5 + 0.5 * cos(a - (peak - 1.7)), 3.0);
        float doppler = 0.16 + 0.85 * beam + 0.35 * beam2;

        float n = fbm(vec2(a * 1.3 + t * 0.04, r * 4.0 - t * 0.03));
        float ringR = 0.205 + 0.015 * (n - 0.5);
        float width = 0.075 + 0.03 * n;
        float dr = (r - ringR) / width;
        float ring = exp(-dr * dr);
        float hz = max(r - 0.12, 0.0) * 3.4;
        float haze = exp(-hz * hz) * 0.12 * (0.5 + 0.7 * n);
        float outer = exp(-r * 4.5) * 0.10 * (0.4 + doppler);

        float I = ring * doppler * (0.75 + 0.5 * n) + haze * (0.4 + doppler * 0.6) + outer;

        float rs = length(p - vec2(0.0, 0.07));
        float shadow = 1.0 - smoothstep(0.085, 0.175, rs);
        I = I * (1.0 - 0.92 * shadow) + shadow * 0.07;

        float edge = 1.0 - smoothstep(0.78, 1.0, length(p));
        float alpha = edge * clamp(smoothstep(0.0, 0.30, I) + shadow * 0.9, 0.0, 1.0);
        gl_FragColor = vec4(heat(I * 1.15), alpha);
      }
    `
  });

  const wormMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wormMat);
  wormMesh.scale.set(wormRadius * 2, wormRadius * 2, 1);
  wormMesh.position.copy(wormPos);
  wormMesh.renderOrder = 9;
  scene.add(wormMesh);

  function createWormHaloTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 512;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0.0, 'rgba(255, 140, 40, 0.0)');
    grad.addColorStop(0.2, 'rgba(255, 120, 30, 0.18)');
    grad.addColorStop(0.38, 'rgba(220, 80, 20, 0.22)');
    grad.addColorStop(0.55, 'rgba(140, 40, 10, 0.12)');
    grad.addColorStop(0.8, 'rgba(60, 15, 5, 0.04)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(cvs);
  }

  const wormHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createWormHaloTexture(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    depthTest: false,
    fog: false
  }));
  wormHalo.scale.set(wormRadius * 3, wormRadius * 3, 1);
  wormHalo.position.copy(wormPos);
  wormHalo.renderOrder = 7;
  scene.add(wormHalo);

  // 3e. Caída en el agujero negro
  const tunnelLength = 1800;
  const transitGroup = new THREE.Group();
  transitGroup.visible = false;
  scene.add(transitGroup);

  const grainCount = 7000;
  const grainRange = 900;
  const grainPos = new Float32Array(grainCount * 2 * 3);
  const grainEnd = new Float32Array(grainCount * 2);
  const grainSeed = new Float32Array(grainCount * 2);
  for (let i = 0; i < grainCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = 1.5 + 70 * Math.pow(Math.random(), 0.6);
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const z = Math.random() * grainRange;
    const s = Math.random();
    for (let k = 0; k < 2; k++) {
      const idx = i * 2 + k;
      grainPos[idx * 3] = x;
      grainPos[idx * 3 + 1] = y;
      grainPos[idx * 3 + 2] = z;
      grainEnd[idx] = k;
      grainSeed[idx] = s;
    }
  }
  const grainGeo = new THREE.BufferGeometry();
  grainGeo.setAttribute('position', new THREE.BufferAttribute(grainPos, 3));
  grainGeo.setAttribute('aEnd', new THREE.BufferAttribute(grainEnd, 1));
  grainGeo.setAttribute('aSeed', new THREE.BufferAttribute(grainSeed, 1));

   const grainWarm = new THREE.Color(1.0, 1.0, 1.0);
  const grainDeep = new THREE.Color(0.72, 0.82, 1.0);

  const grainUniforms = {
    uTime: { value: 0 },
    uCamZ: { value: 0 },
    uLen: { value: 1.2 },
    uLight: { value: 0 },
    uFade: { value: 0 },
    uScale: { value: 540 },
    uTint: { value: new THREE.Color(1.0, 1.0, 1.0) }
  };

  function makeGrainMaterial(asPoints: boolean) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      defines: asPoints ? { IS_POINTS: '' } : {},
      uniforms: grainUniforms,
      vertexShader: `
        attribute float aEnd;
        attribute float aSeed;
        uniform float uTime;
        uniform float uCamZ;
        uniform float uLen;
        uniform float uLight;
        uniform float uFade;
        uniform float uScale;
        uniform vec3 uTint;
        varying vec3 vCol;
        void main() {
          vec3 p = position;
          float range = 900.0;
          p.z = uCamZ - 40.0 + mod(position.z - uCamZ + 40.0, range);
          float ahead = (p.z - uCamZ + 40.0) / range;
          float glint = 0.6 + 0.4 * sin(uTime * (0.5 + aSeed * 2.5) + aSeed * 60.0);
          p.z += aEnd * uLen * (0.4 + 1.2 * aSeed);
          float bright = (0.2 + 0.8 * aSeed * aSeed) * pow(1.0 - ahead, 1.6) * glint;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
        #ifdef IS_POINTS
          gl_PointSize = min(60.0, (0.9 + 2.2 * aSeed * aSeed) * uScale / max(-mv.z, 1.0));
          vCol = uTint * bright * uLight * (1.0 - step(0.5, aEnd)) * (1.0 - uFade) * 1.4;
        #else
          vCol = uTint * bright * uLight * (1.0 - aEnd * 0.9) * (1.0 - uFade) * 2.2;
        #endif
        }
      `,
      fragmentShader: `
        varying vec3 vCol;
        void main() {
        #ifdef IS_POINTS
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c) * 2.0;
          gl_FragColor = vec4(vCol * exp(-d * d * 5.0), 1.0);
        #else
          gl_FragColor = vec4(vCol, 1.0);
        #endif
        }
      `
    });
  }

  const grains = new THREE.LineSegments(grainGeo, makeGrainMaterial(false));
  grains.frustumCulled = false;
  transitGroup.add(grains);

  const grainGlow = new THREE.Points(grainGeo, makeGrainMaterial(true));
  grainGlow.frustumCulled = false;
  transitGroup.add(grainGlow);

  
  function updateTransitFx(time: number, camZ: number, speed: number, t: number, fade: number) {
    grainUniforms.uTime.value = time;
    grainUniforms.uCamZ.value = camZ;
    grainUniforms.uLen.value = 1.2 + speed * 0.05;
    grainUniforms.uLight.value = (0.4 + 0.9 * Math.exp(-t * 3.0)) * Math.min(1, t * 25);
    grainUniforms.uFade.value = fade;
    grainUniforms.uScale.value = renderer.domElement.height / 2;
    grainUniforms.uTint.value.lerpColors(grainWarm, grainDeep, Math.min(1, t * 1.3));
  }

  // 4. Navegación 360°
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let lon = 0;
  let lat = 0;
  let targetLon = 0;
  let targetLat = 0;

  const navKeys = { Left: false, Right: false, Up: false, Down: false };
  const keyMap: Record<string, 'Left' | 'Right' | 'Up' | 'Down'> = {
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    ArrowDown: 'Down'
  };

  let mode: 'explore' | 'transit' | 'abyss' = 'explore';
  const isActive360 = () => container.style.pointerEvents === 'auto';

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (mode !== 'explore') {
      e.stopImmediatePropagation();
      return;
    }
    const k = keyMap[e.key];
    if (k && isActive360()) {
      navKeys[k] = true;
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, { capture: true });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    const k = keyMap[e.key];
    if (k) navKeys[k] = false;
  }, { capture: true });

  window.addEventListener('wheel', (e: WheelEvent) => {
    if (mode !== 'explore') e.stopImmediatePropagation();
  }, { capture: true });

  window.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMousePos.x;
    const deltaY = e.clientY - prevMousePos.y;
    prevMousePos = { x: e.clientX, y: e.clientY };

    targetLon -= deltaX * 0.12;
    targetLat += deltaY * 0.12;
    targetLat = Math.max(-85, Math.min(85, targetLat));
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  window.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePos.x;
    const deltaY = e.touches[0].clientY - prevMousePos.y;
    prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    targetLon -= deltaX * 0.15;
    targetLat += deltaY * 0.15;
    targetLat = Math.max(-85, Math.min(85, targetLat));
  }, { passive: true });

  window.addEventListener('touchend', () => { isDragging = false; });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 5. Bucle de animación
  const clock = new THREE.Clock();
  const bhCanvas = document.getElementById('sim-canvas') as HTMLElement;
  const pullRadius = 1500;
  const turbRadius = 2200;
  const throatRadius = wormRadius * 0.16;
  const transitDuration = 11;
  const lookDir = new THREE.Vector3();
  const toWorm = new THREE.Vector3();
  let camVel = 0;
  let lastT = 0;
  let transitStart = 0;
  let returning = false;
  let hiddenSince = -1;

  function startTransit() {
    mode = 'transit';
    transitStart = clock.getElapsedTime();
    scene.fog = null;
    scene.children.forEach(c => { c.visible = c === transitGroup; });
    if (bhCanvas) bhCanvas.style.visibility = 'hidden';
    camera.position.set(0, 0, 0);
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(key => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    });
  }

  function animateCosmos() {
    requestAnimationFrame(animateCosmos);
    if (mode === 'abyss') return;

    const elapsedTime = clock.getElapsedTime();
    const dt = Math.min(elapsedTime - lastT, 0.1);
    lastT = elapsedTime;

        if (mode === 'transit') {
      const age = elapsedTime - transitStart;
      const t = Math.min(age / transitDuration, 1);
      const z = tunnelLength * 0.85 * t * t;
      const speed = (tunnelLength * 0.85 * 2 * t) / transitDuration;
      const k = elapsedTime;

      camera.position.set(Math.sin(k * 0.7) * 0.4, Math.cos(k * 0.5) * 0.4, z);
      camera.lookAt(0, 0, z + 100);
      camera.rotateZ(t * t * 0.9 + 0.1 * t);
      camera.rotateX(Math.sin(k * 29.0) * 0.003 * t * t);
      camera.rotateY(Math.sin(k * 23.0) * 0.003 * t * t);
      camera.fov = 75 + 25 * t * t;
      camera.updateProjectionMatrix();

      updateTransitFx(k, z, speed, t, THREE.MathUtils.smoothstep(t, 0.82, 1.0));

      if (t >= 1) {
        mode = 'abyss';
        renderer.domElement.style.display = 'none';
        return;
      }
      renderer.render(scene, camera);
      return;
    }

    const active = isActive360();
    if (!active) {
      returning = false;
      navKeys.Left = false;
      navKeys.Right = false;
      navKeys.Up = false;
      navKeys.Down = false;
      if (parseFloat(container.style.opacity || '0') === 0) {
        if (hiddenSince < 0) hiddenSince = elapsedTime;
        else if (elapsedTime - hiddenSince > 1.6) {
          camera.position.set(0, 0, 0.1);
          camVel = 0;
        }
      } else {
        hiddenSince = -1;
      }
    } else {
      hiddenSince = -1;
    }

    if (navKeys.Left) targetLon -= 1.1;
    if (navKeys.Right) targetLon += 1.1;

    const moving = navKeys.Up || navKeys.Down || Math.abs(camVel) > 5;
    if (!isDragging && !navKeys.Left && !navKeys.Right && !moving) {
      targetLon += 0.024;
    }

    lon += (targetLon - lon) * 0.055;
    lat += (targetLat - lat) * 0.055;

    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);

    lookDir.set(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );

   toWorm.copy(wormPos).sub(camera.position);
const d = toWorm.length();
toWorm.divideScalar(d || 1);
const pull = active ? THREE.MathUtils.clamp(1 - d / pullRadius, 0, 1) : 0;
lookDir.lerp(toWorm, pull * pull * 0.7).normalize();

// ====================== MOVIMIENTO (VELOCIDAD ORIGINAL + INERCIA LIGERA) ======================
const maxSpeed = 380;

if (active) {
  const targetVel = navKeys.Up ? maxSpeed : 0;

  // Aceleración rápida y responsive (como la original)
  camVel += (targetVel - camVel) * (1 - Math.pow(0.018, dt));

  // Movimiento
  camera.position.addScaledVector(lookDir, camVel * dt);

  // Atracción del agujero negro
  if (d < pullRadius) {
    camera.position.addScaledVector(toWorm, 400 * pull * pull * dt);
  }
} else {
  camVel *= 0.92;
}

// Tecla abajo para regresar
if (active && navKeys.Down && !returning) {
  const homeDist = camera.position.length();
  if (homeDist < 4) {
    returning = true;
    camVel = 0;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -1000 }));
  } else {
    camVel *= 0.88;
    const homeSpeed = THREE.MathUtils.clamp(homeDist * 1.2, 60, 450);
    camera.position.multiplyScalar(1 - Math.min(1, (homeSpeed * dt) / homeDist));
  }
}
   

    // === ESPACIO INFINITO ===
    const camPos = camera.position.clone();

    // Wrapping de estrellas
    for (let i = 0; i < starGeometries.length; i++) {
      wrapStarLayer(starGeometries[i], starMaxDists[i], camPos);
    }

    // Regenerar nebulosas
    updateNebulaChunks(camPos);
    updateObjectChunks(camPos);


    // Soft limit para evitar problemas de precisión de floating point
    const softLimit = 12000 * U;
    if (camPos.length() > softLimit) {
      const offset = camPos.clone();
      universe.position.sub(offset);
      camera.position.set(0, 0, 0.1);
      wormPos.sub(offset);
      wormMesh.position.copy(wormPos);
      wormHalo.position.copy(wormPos);
    }

    if (active && d < throatRadius) {
      startTransit();
      return;
    }

    camera.lookAt(
      camera.position.x + lookDir.x * 500,
      camera.position.y + lookDir.y * 500,
      camera.position.z + lookDir.z * 500
    );
    camera.updateMatrixWorld();

    wormMat.uniforms.uTime.value = elapsedTime;
    wormMesh.quaternion.copy(camera.quaternion);

    const prox = THREE.MathUtils.clamp(1 - d / turbRadius, 0, 1);
    const turb = prox * prox + (Math.abs(camVel) / maxSpeed) * 0.1;
    camera.rotateX((Math.sin(elapsedTime * 23.1) + 0.6 * Math.sin(elapsedTime * 37.7 + 1.2)) * 0.012 * turb);
    camera.rotateY((Math.sin(elapsedTime * 19.4 + 0.7) + 0.6 * Math.sin(elapsedTime * 31.3)) * 0.012 * turb);
    camera.rotateZ((Math.sin(elapsedTime * 11.7) + 0.5 * Math.sin(elapsedTime * 27.9 + 2.1)) * 0.03 * turb);
    camera.fov = 65 + prox * 12 + Math.sin(elapsedTime * 14) * 3 * turb;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    galaxyA.mesh.rotation.y = elapsedTime * 0.045;
    galaxyB.mesh.rotation.y = -elapsedTime * 0.035;
    galaxyC.mesh.rotation.y = elapsedTime * 0.06;

    for (const e of extraObjects) {
      e.obj.rotation.y = elapsedTime * e.speed;
    }

    for (const fn of animators) fn(elapsedTime);

    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      (c.sprite.material as THREE.SpriteMaterial).opacity =
        c.baseOpacity * 0.5 * (0.82 + 0.28 * Math.sin(elapsedTime * c.pulseSpeed + c.phase));
    }

    renderer.render(scene, camera);
  }

  animateCosmos();
}