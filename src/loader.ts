export function initLoader() {
  const loader = document.getElementById('loading-overlay') as HTMLElement;
  const loadPct = document.getElementById('load-pct') as HTMLElement;
  let pct = 0;
  const loadInterval = setInterval(() => {
    pct += Math.floor(Math.random() * 9) + 4;
    if (pct >= 100) {
      pct = 100;
      clearInterval(loadInterval);
      loadPct.textContent = '100%';
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 1800);
      }, 300);
    } else {
      loadPct.textContent = pct + '%';
    }
  }, 45);
}