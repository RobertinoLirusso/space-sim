import './style.css'
import { initLoader } from './loader';
import { initBlackHole } from './blackhole';
import { initCosmicScene } from './cosmos';

const wrapper = document.getElementById('threejs-wrapper') as HTMLElement;
const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;

initLoader();
initBlackHole(canvas, wrapper);
initCosmicScene(wrapper);

const hint = document.getElementById('controls-hint') as HTMLElement;
setTimeout(() => hint.classList.add('visible'), 2600);
setTimeout(() => {
  hint.classList.remove('visible');
  setTimeout(() => hint.remove(), 1200);
}, 9000);