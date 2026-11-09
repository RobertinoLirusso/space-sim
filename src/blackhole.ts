import fsSource from './shaders/blackhole.frag?raw';

const vsSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function initBlackHole(canvas: HTMLCanvasElement, threeWrapper: HTMLElement) {
  function syncSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  window.addEventListener('resize', syncSize);
  syncSize();

  const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl) return;

  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const prg = gl.createProgram()!;
  gl.attachShader(prg, vs);
  gl.attachShader(prg, fs);
  gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prg));
    return;
  }
  gl.useProgram(prg);

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prg, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTimeLoc = gl.getUniformLocation(prg, 'u_time');
  const uResLoc = gl.getUniformLocation(prg, 'u_resolution');
  const uOffsetLoc = gl.getUniformLocation(prg, 'u_offset');
  const uZoomLoc = gl.getUniformLocation(prg, 'u_zoom');

  const keys: Record<string, boolean> = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  };

  let currentZoom = 0.0;
  let targetZoom = 0.0;
  let currentOffsetX = 0.0;
  let currentOffsetY = 0.0;
  let targetOffsetX = 0.0;
  let targetOffsetY = 0.0;
  let mouseTargetX = 0.0;
  let mouseTargetY = 0.0;

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key in keys) {
      keys[e.key] = true;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.key in keys) {
      keys[e.key] = false;
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    mouseTargetX = ((e.clientX - window.innerWidth * 0.5) / minDim) * 0.5;
    mouseTargetY = -((e.clientY - window.innerHeight * 0.5) / minDim) * 0.5;
  });

  window.addEventListener('mouseleave', () => {
    mouseTargetX = 0;
    mouseTargetY = 0;
  });

  window.addEventListener('wheel', (e: WheelEvent) => {
    targetZoom = Math.max(0.0, Math.min(1.0, targetZoom + e.deltaY * 0.0012));
  }, { passive: true });

  let lastTime = performance.now();

  function renderLoop(now: number) {
    const dt = Math.min((now - lastTime) * 0.001, 0.1);
    lastTime = now;

    const zoomSpeed = 0.65;
    if (keys.ArrowUp) targetZoom = Math.min(1.0, targetZoom + zoomSpeed * dt);
    if (keys.ArrowDown) targetZoom = Math.max(0.0, targetZoom - zoomSpeed * dt);

    const steerSpeed = 0.95;
    let keySteerX = 0;
    if (keys.ArrowLeft) keySteerX -= 0.5;
    if (keys.ArrowRight) keySteerX += 0.5;

    if (keySteerX !== 0) {
      targetOffsetX = Math.max(-0.55, Math.min(0.55, targetOffsetX + keySteerX * steerSpeed * dt * 2.5));
    } else {
      targetOffsetX = mouseTargetX;
    }

    let keyTiltY = 0;
    if (keys.ArrowUp) keyTiltY += 0.08;
    if (keys.ArrowDown) keyTiltY -= 0.08;

    if (keys.ArrowUp || keys.ArrowDown) {
      targetOffsetY = (targetZoom - 0.5) * 0.2 + keyTiltY;
    } else {
      targetOffsetY = mouseTargetY;
    }

    currentZoom += (targetZoom - currentZoom) * (1.0 - Math.pow(0.001, dt));
    currentOffsetX += (targetOffsetX - currentOffsetX) * (1.0 - Math.pow(0.005, dt));
    currentOffsetY += (targetOffsetY - currentOffsetY) * (1.0 - Math.pow(0.005, dt));

    if (currentZoom >= 0.88) {
      const fadeProgress = (currentZoom - 0.88) / 0.12;
      threeWrapper.style.opacity = Math.min(1.0, Math.max(0.0, fadeProgress)).toString();
      threeWrapper.style.pointerEvents = currentZoom >= 0.96 ? 'auto' : 'none';
    } else {
      threeWrapper.style.opacity = '0';
      threeWrapper.style.pointerEvents = 'none';
    }

    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.uniform1f(uTimeLoc, now * 0.001);
    gl!.uniform2f(uResLoc, canvas.width, canvas.height);
    gl!.uniform2f(uOffsetLoc, currentOffsetX, currentOffsetY);
    gl!.uniform1f(uZoomLoc, currentZoom);

    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
}