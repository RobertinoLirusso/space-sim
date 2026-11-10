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
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020108, 0.00035);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 8000);
  camera.position.set(0, 0, 0.1);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
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
  scene.add(abyss);

  // 1. Campo estelar
  const starCount = 38000;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xbfe3ff),
    new THREE.Color(0x99bbff),
    new THREE.Color(0xffe6a3),
    new THREE.Color(0xffaacc),
    new THREE.Color(0x7df9ff)
  ];

  for (let i = 0; i < starCount; i++) {
    let x = 0, y = 0, z = 0;
    do {
      const radius = 600 + Math.random() * 2600;
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      x = radius * Math.sin(phi) * Math.cos(theta);
      y = radius * Math.sin(phi) * Math.sin(theta);
      z = radius * Math.cos(phi);
    } while (isInVoid(x, y, z));

    starPositions[i * 3] = x;
    starPositions[i * 3 + 1] = y;
    starPositions[i * 3 + 2] = z;

    const color = palette[Math.floor(Math.random() * palette.length)].clone();
    color.multiplyScalar(0.7 + Math.random() * 0.9);
    starColors[i * 3] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 5.5,
    map: starTexture,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const starField = new THREE.Points(starGeo, starMaterial);
  scene.add(starField);

  // 2. Galaxias espirales
  const galaxiesGroup = new THREE.Group();
  scene.add(galaxiesGroup);

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
      size: 5.0,
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
  scene.add(nebulaGroup);

  const nebulaColors = [
    new THREE.Color(0x381985),
    new THREE.Color(0x0e479c),
    new THREE.Color(0x8f1967),
    new THREE.Color(0x0b6863),
    new THREE.Color(0xaa336a)
  ];

  const clouds: { sprite: THREE.Sprite; baseOpacity: number; pulseSpeed: number; phase: number }[] = [];
  const cloudCount = 120;
  for (let i = 0; i < cloudCount; i++) {
    const col = nebulaColors[i % nebulaColors.length];
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: col,
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.12, 0.32),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    const dist = THREE.MathUtils.randFloat(400, 1600);
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(THREE.MathUtils.randFloatSpread(1.8));

    sprite.position.set(
      dist * Math.sin(ph) * Math.cos(th),
      dist * Math.sin(ph) * Math.sin(th) * 0.65,
      dist * Math.cos(ph)
    );

    if (isInVoid(sprite.position.x, sprite.position.y, sprite.position.z)) continue;

    const scale = THREE.MathUtils.randFloat(280, 720);
    sprite.scale.set(scale, scale, 1);
    nebulaGroup.add(sprite);

    clouds.push({
      sprite,
      baseOpacity: mat.opacity,
      pulseSpeed: THREE.MathUtils.randFloat(0.3, 0.9),
      phase: Math.random() * Math.PI * 2
    });
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

  function buildPoints(pos: Float32Array, col: Float32Array, size: number) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size,
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

  // 3c. Elementos cósmicos adicionales
  const animators: Array<(t: number) => void> = [];
  const tmpV = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const viewDir = new THREE.Vector3();
  const viewRight = new THREE.Vector3();
  const viewUp = new THREE.Vector3();

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
    scene.add(obj);
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
    const dust = buildPoints(dustPos, dustCol, 4.0);
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
    const ion = buildPoints(ionPos, ionCol, 3.5);
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

  // Nebulosas oscuras (nubes de polvo que tapan lo que hay detrás)
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
        opacity: THREE.MathUtils.randFloat(0.35, 0.7),
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

  // Quásar con jets
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

  // Remanente de supernova (tipo Cangrejo) con púlsar central
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

  // Lente gravitacional (arcos de un anillo de Einstein)
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

  // Sistema binario con transferencia de masa
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

  // Telaraña cósmica (nodos y filamentos de galaxias lejanas)
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

  // Supernova ocasional (destello que aparece dentro del campo de visión)
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

  scene.add(createCosmicWeb());
  createDarkNebula(sphericalPos(900, 40, -5), 9, 170, 220, 420);
  createDarkNebula(sphericalPos(1000, 180, 25), 8, 150, 200, 380);
  createDarkNebula(sphericalPos(950, 330, -25), 9, 180, 220, 440);

  placeStatic(createQuasar(220), 1500, 60, 40, new THREE.Euler(0.3, 0, 0.6));
  placeStatic(createPulsar(160), 600, 250, -40, new THREE.Euler(0.2, 0, 0.3));
  placeStatic(createSupernovaRemnant(140), 700, 110, 5, new THREE.Euler(0.4, 0.2, 0));
  placeStatic(createGravitationalLens(120), 1400, 150, 55, new THREE.Euler(0, 0, 0));
  scene.children[scene.children.length - 1].lookAt(0, 0, 0);
  placeStatic(createBinarySystem(40), 450, 195, 15, new THREE.Euler(0.45, 0, 0.2));

  // 3d. Agujero de gusano
  const wormPos = sphericalPos(600, 320, 18);
  const wormRadius = 110;

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
        for (int i = 0; i < 5; i++) {
          v += a * vnoise(p);
          p = p * 2.03 + vec2(11.3, 7.1);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);

        float rot = a + 3.2 / (r + 0.2) - uTime * 0.45;
        vec2 q = vec2(rot * 0.9, log(r + 0.04) * 3.0 - uTime * 0.25);
        float cloud = fbm(q * vec2(1.4, 2.2) + vec2(0.0, uTime * 0.05));
        float cloud2 = fbm(q * vec2(3.0, 4.5) - vec2(uTime * 0.1, 0.0) + 7.0);
        float arms = pow(0.5 + 0.5 * sin(rot * 4.0 - log(r + 0.05) * 6.0), 1.5);
        float dens = clamp(cloud * 1.2 + cloud2 * 0.4 - 0.25, 0.0, 1.0) * (0.35 + 0.9 * arms);
        float cover = smoothstep(0.05, 0.5, dens);

        float outerFade = 1.0 - smoothstep(0.62, 0.97, r);
        float eyeOpen = smoothstep(0.22, 0.36, r);

        float wallN = fbm(vec2(a * 3.0 + uTime * 0.4, r * 10.0));
        float wall = exp(-pow((r - 0.31) * 14.0, 2.0)) * (0.6 + 0.9 * wallN);
        float wallGlow = exp(-pow((r - 0.31) * 5.0, 2.0)) * 0.25;

        vec3 abyss = vec3(0.015, 0.03, 0.07);
        vec3 slate = vec3(0.30, 0.38, 0.48);
        vec3 steel = vec3(0.50, 0.60, 0.72);
        vec3 ice = vec3(0.78, 0.90, 1.0);

        vec3 body = mix(abyss, slate, dens);
        body = mix(body, steel, dens * dens * arms);
        body += ice * pow(dens, 3.0) * arms * 0.5;

        float k = floor(uTime * 2.5);
        float la = hash21(vec2(k, 3.1)) * 6.2831 - 3.1416;
        float lr = 0.4 + 0.4 * hash21(vec2(k, 8.7));
        float lflash = exp(-fract(uTime * 2.5) * 7.0) * step(0.55, hash21(vec2(k, 1.3)));
        float angD = abs(mod(a - la + 3.1416, 6.2831) - 3.1416);
        float lightning = lflash * exp(-pow(angD * 3.0, 2.0)) * exp(-pow((r - lr) * 5.0, 2.0)) * dens;

        vec3 e = body * cover * outerFade * eyeOpen
               + ice * wall * 1.7
               + steel * wallGlow
               + vec3(0.85, 0.93, 1.0) * wall * wall * 0.9
               + ice * lightning * 1.6;

        float eyeMask = 1.0 - smoothstep(0.18, 0.3, r);
        float darkDisk = (1.0 - smoothstep(0.5, 0.95, r)) * 0.55;
        float edge = 1.0 - smoothstep(0.93, 1.0, r);
        float alpha = edge * clamp(eyeMask + cover * outerFade * eyeOpen * 0.95 + wall + wallGlow + darkDisk, 0.0, 1.0);
        gl_FragColor = vec4(e, alpha);
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
    grad.addColorStop(0.0, 'rgba(150, 180, 220, 0.0)');
    grad.addColorStop(0.2, 'rgba(150, 180, 220, 0.25)');
    grad.addColorStop(0.38, 'rgba(160, 190, 230, 0.55)');
    grad.addColorStop(0.5, 'rgba(110, 140, 185, 0.3)');
    grad.addColorStop(0.7, 'rgba(70, 92, 135, 0.12)');
    grad.addColorStop(0.85, 'rgba(45, 62, 95, 0.04)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(cvs);
  }

  const wormHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createWormHaloTexture(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    depthTest: false,
    fog: false
  }));
  wormHalo.scale.set(wormRadius * 5, wormRadius * 5, 1);
  wormHalo.position.copy(wormPos);
  wormHalo.renderOrder = 7;
  scene.add(wormHalo);


  // 3e. Túnel del agujero de gusano
  const tunnelLength = 1600;
  const transitGroup = new THREE.Group();
  transitGroup.visible = false;
  scene.add(transitGroup);

  const tunnelGeo = new THREE.CylinderGeometry(10, 10, tunnelLength, 48, 80, true);
  tunnelGeo.rotateX(Math.PI / 2);
  tunnelGeo.translate(0, 0, tunnelLength / 2);

  const tunnelMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uFade: { value: 0 },
      uCamZ: { value: 0 }
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFlash;
      uniform float uFade;
      uniform float uCamZ;
      varying vec3 vPos;
      void main() {
        float ang = atan(vPos.y, vPos.x);
        float z = vPos.z;
        float turb = 0.5
          + 0.25 * sin(ang * 3.0 + z * 0.03 + uTime * 1.3)
          + 0.15 * sin(ang * 7.0 - z * 0.05 - uTime * 2.1 + sin(z * 0.02 + uTime) * 2.0)
          + 0.10 * sin(ang * 13.0 + z * 0.11 + uTime * 3.0);
        float bands = pow(0.5 + 0.5 * sin(ang * 5.0 + z * 0.05 + turb * 6.0 - uTime * 2.0), 4.0);
        float cloud = 0.5 + 0.5 * sin(ang * 2.0 + z * 0.02 + turb * 3.0);
        float thin = pow(0.5 + 0.5 * sin(ang * 16.0 + turb * 9.0 + z * 0.03), 10.0);

        vec3 navy = vec3(0.008, 0.016, 0.04);
        vec3 steel = vec3(0.30, 0.38, 0.50);
        vec3 ice = vec3(0.55, 0.72, 1.0);

        vec3 col = navy + steel * cloud * turb * 0.10 + steel * bands * 0.09 + ice * thin * 0.06;
        col *= exp(-max(z - uCamZ, 0.0) * 0.0045);
        col += vec3(1.0) * uFlash;
        gl_FragColor = vec4(col * (1.0 - uFade), 1.0);
      }
    `
  });

  const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
  transitGroup.add(tunnel);

  const transitAmbient = new THREE.AmbientLight(0x1b2433, 0.8);
  const transitLight = new THREE.PointLight(0xa9c2ea, 1.6, 70, 1.5);
  transitGroup.add(transitAmbient, transitLight);

  // Fragmentos de meteoritos
  const rockCount = 220;
  const rockRange = 700;
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x6f7a8a, roughness: 0.95, metalness: 0.1, flatShading: true }),
    rockCount
  );
  rocks.frustumCulled = false;
  transitGroup.add(rocks);

  const rockData = Array.from({ length: rockCount }, () => {
    const a = Math.random() * Math.PI * 2;
    const rad = THREE.MathUtils.randFloat(2.5, 8.5);
    return {
      x: Math.cos(a) * rad,
      y: Math.sin(a) * rad,
      z: Math.random() * rockRange,
      s: new THREE.Vector3(
        THREE.MathUtils.randFloat(0.5, 1.4),
        THREE.MathUtils.randFloat(0.4, 1.0),
        THREE.MathUtils.randFloat(0.5, 1.2)
      ).multiplyScalar(THREE.MathUtils.randFloat(0.12, 0.55)),
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      vx: THREE.MathUtils.randFloat(-2, 2),
      vy: THREE.MathUtils.randFloat(-2, 2)
    };
  });
  const rockDummy = new THREE.Object3D();

  function updateRocks(t: number, camZ: number) {
    for (let i = 0; i < rockCount; i++) {
      const r = rockData[i];
      let dz = r.z - camZ + 30;
      dz = ((dz % rockRange) + rockRange) % rockRange;
      const z = camZ - 30 + dz;
      rockDummy.position.set(r.x, r.y, z);
      rockDummy.rotation.set(r.rx + t * r.vx, r.ry + t * r.vy, 0);
      if (z > tunnelLength - 20) rockDummy.scale.set(0, 0, 0);
      else rockDummy.scale.copy(r.s);
      rockDummy.updateMatrix();
      rocks.setMatrixAt(i, rockDummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
  }

  // Destellos de luz estirados por la velocidad
  const streakCount = 480;
  const streakPos = new Float32Array(streakCount * 2 * 3);
  const streakEnd = new Float32Array(streakCount * 2);
  const streakPhase = new Float32Array(streakCount * 2);
  for (let i = 0; i < streakCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = THREE.MathUtils.randFloat(0.8, 9.4);
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const z = Math.random() * 700;
    const ph = Math.random() * 100;
    for (let k = 0; k < 2; k++) {
      const idx = i * 2 + k;
      streakPos[idx * 3] = x;
      streakPos[idx * 3 + 1] = y;
      streakPos[idx * 3 + 2] = z;
      streakEnd[idx] = k;
      streakPhase[idx] = ph;
    }
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  streakGeo.setAttribute('aEnd', new THREE.BufferAttribute(streakEnd, 1));
  streakGeo.setAttribute('aPhase', new THREE.BufferAttribute(streakPhase, 1));

  const streakMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCamZ: { value: 0 },
      uLen: { value: 4 },
      uTime: { value: 0 },
      uFade: { value: 0 },
      uEnd: { value: tunnelLength - 20 }
    },
    vertexShader: `
      attribute float aEnd;
      attribute float aPhase;
      uniform float uCamZ;
      uniform float uLen;
      uniform float uTime;
      uniform float uEnd;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float range = 700.0;
        p.z = uCamZ - 30.0 + mod(position.z - uCamZ + 30.0, range);
        float ahead = (p.z - uCamZ + 30.0) / range;
        float flick = 0.25 + 0.75 * pow(abs(sin(uTime * (2.0 + fract(aPhase) * 5.0) + aPhase)), 6.0);
        p.z += aEnd * uLen * (0.6 + fract(aPhase * 7.3));
        vAlpha = (1.0 - aEnd * 0.85) * flick * (1.0 - ahead) * step(p.z, uEnd);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      uniform float uFade;
      void main() {
        gl_FragColor = vec4(vec3(0.6, 0.78, 1.0) * vAlpha * (1.0 - uFade), 1.0);
      }
    `
  });
  const meteorStreaks = new THREE.LineSegments(streakGeo, streakMat);
  meteorStreaks.frustumCulled = false;
  transitGroup.add(meteorStreaks);

  function updateTransitFx(time: number, camZ: number, speed: number, fade: number) {
    streakMat.uniforms.uCamZ.value = camZ;
    streakMat.uniforms.uTime.value = time;
    streakMat.uniforms.uLen.value = 2 + speed * 0.07;
    streakMat.uniforms.uFade.value = fade;
    transitLight.position.copy(camera.position);
    transitLight.intensity = 1.6 * (1 - fade);
    transitAmbient.intensity = 0.8 * (1 - fade);
    updateRocks(time, camZ);
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
  const maxSpeed = 140;
  const pullRadius = 260;
  const turbRadius = 380;
  const throatRadius = wormRadius * 0.45;
  const transitDuration = 9;
  const lookDir = new THREE.Vector3();
  const toWorm = new THREE.Vector3();
  let camVel = 0;
  let lastT = 0;
  let transitStart = 0;

  function startTransit() {
    mode = 'transit';
    transitStart = clock.getElapsedTime();
    scene.fog = null;
    scene.children.forEach(c => { c.visible = c === transitGroup; });
    bhCanvas.style.visibility = 'hidden';
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
      const z = tunnelLength * 0.85 * Math.pow(t, 1.5);
      const k = elapsedTime;
      const shock = Math.pow(Math.max(0, Math.sin(k * 1.7) * Math.sin(k * 2.9)), 6);
      const x = Math.sin(k * 3.1) * 2.2 + Math.sin(k * 8.3) * 0.9 + shock * 1.5;
      const y = Math.cos(k * 2.7) * 2.2 + Math.sin(k * 9.1) * 0.9 - shock * 1.5;

      camera.position.set(x, y, z);
      camera.lookAt(x * 0.3, y * 0.3, z + 100);
      camera.rotateZ(Math.sin(k * 2.3) * 0.14 + Math.sin(k * 5.9) * 0.07 + shock * 0.25);
      camera.rotateX(Math.sin(k * 17.1) * 0.02);
      camera.rotateY(Math.sin(k * 13.3) * 0.02);
      camera.fov = 85 + 20 * t + Math.sin(k * 9.0) * 4 + shock * 14;
      camera.updateProjectionMatrix();

      tunnelMat.uniforms.uTime.value = k;
      tunnelMat.uniforms.uCamZ.value = z;
      tunnelMat.uniforms.uFlash.value = Math.pow(Math.max(0, 1 - age / 0.9), 2) * 0.9;
      tunnelMat.uniforms.uFade.value = THREE.MathUtils.smoothstep(t, 0.82, 1.0);
      const speed = tunnelLength * 0.85 * 1.5 * Math.sqrt(t) / transitDuration;
      updateTransitFx(k, z, speed, THREE.MathUtils.smoothstep(t, 0.82, 1.0));

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
      navKeys.Left = false;
      navKeys.Right = false;
      navKeys.Up = false;
      navKeys.Down = false;
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
    toWorm.divideScalar(d);
    const pull = active ? THREE.MathUtils.clamp(1 - d / pullRadius, 0, 1) : 0;
    lookDir.lerp(toWorm, pull * pull * 0.7).normalize();

    const targetVel = active ? (navKeys.Up ? maxSpeed : 0) - (navKeys.Down ? maxSpeed * 0.6 : 0) : 0;
    camVel += (targetVel - camVel) * (1 - Math.pow(0.02, dt));
    camera.position.addScaledVector(lookDir, camVel * dt);
    camera.position.addScaledVector(toWorm, 160 * pull * pull * dt);
    if (camera.position.length() > 1400) camera.position.setLength(1400);

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
        c.baseOpacity * (0.82 + 0.28 * Math.sin(elapsedTime * c.pulseSpeed + c.phase));
    }

    renderer.render(scene, camera);
  }

  animateCosmos();
}