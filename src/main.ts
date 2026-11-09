import './style.css'
import { initLoader } from './loader';
import { initBlackHole } from './blackhole';
import { initCosmicScene } from './cosmos';

const wrapper = document.getElementById('threejs-wrapper') as HTMLElement;
const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;

initLoader();
initBlackHole(canvas, wrapper);
initCosmicScene(wrapper);

