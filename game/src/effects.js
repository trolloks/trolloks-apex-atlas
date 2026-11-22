// Canvas effects: slow embers behind the title and a burst of paper confetti on a win.
// Pure decoration; the game reads nothing back from it.
export function createEffects(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let embers = [];
  let confetti = [];
  let raf = 0;
  let running = false;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnEmbers(count = 46) {
    embers = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.6 + Math.random() * 2.2,
      vy: -0.12 - Math.random() * 0.35,
      vx: (Math.random() - 0.5) * 0.16,
      alpha: 0.12 + Math.random() * 0.45,
      hue: 24 + Math.random() * 24,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    for (const ember of embers) {
      ember.x += ember.vx;
      ember.y += ember.vy;
      if (ember.y < -8) {
        ember.y = height + 8;
        ember.x = Math.random() * width;
      }
      ctx.beginPath();
      ctx.fillStyle = `hsla(${ember.hue}, 90%, 62%, ${ember.alpha})`;
      ctx.arc(ember.x, ember.y, ember.r, 0, Math.PI * 2);
      ctx.fill();
    }
    confetti = confetti.filter((piece) => piece.life > 0);
    for (const piece of confetti) {
      piece.life -= 0.008;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += 0.035;
      piece.rot += piece.spin;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, piece.life * 2));
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    spawnEmbers();
    frame();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, width, height);
  }

  function burst(count = 120) {
    const colors = ['#e08a3c', '#d9a441', '#f2e4c8', '#5fb4d9', '#c9604f'];
    confetti.push(
      ...Array.from({ length: count }, () => ({
        x: width * (0.25 + Math.random() * 0.5),
        y: height * 0.42,
        w: 4 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 7,
        vy: -3 - Math.random() * 6,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        life: 1 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      })),
    );
  }

  window.addEventListener('resize', () => {
    resize();
    spawnEmbers();
  });

  return { start, stop, burst };
}
