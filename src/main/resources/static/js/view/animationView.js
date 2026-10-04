// animationView.js - DEV 3
// Hiệu ứng bắn bằng sprite sheet: đạn bay -> (nổ -> lửa lặp) hoặc (nước bắn).
// Không biết gì về luật game. status từ Java: "HIT" | "MISS" | "SUNK" | "INVALID"

const url = (p) => new URL(`../../assets/images/fx/${p}`, import.meta.url).href;

// Số khung và FPS lấy theo ghi chú thiết kế (note.txt)
const SPRITES = {
  fire:      { src: url('fire.png'),      frames: 6, fps: 12 },
  explosion: { src: url('explosion.png'), frames: 9, fps: 15 },
  splash:    { src: url('splash.png'),    frames: 4, fps: 10 },
  missile:   { src: url('missile.png'),   frames: 4, fps: 15 },
};
Object.values(SPRITES).forEach((s) => { new Image().src = s.src; }); // nạp trước, tránh nháy

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const running = new WeakMap(); // ô -> các animation đang chạy (để dọn khi reset)

/** Chạy 1 sprite sheet ngang trong `el`. Trả về { stop(), done: Promise } */
function playSprite(el, name, { loop = false } = {}) {
  const sp = SPRITES[name];
  el.style.backgroundImage = `url("${sp.src}")`;
  el.style.backgroundSize = `${sp.frames * 100}% 100%`;
  const setFrame = (i) => { el.style.backgroundPositionX = `${(i / (sp.frames - 1)) * 100}%`; };
  setFrame(0);

  let raf = 0, stopped = false, resolve;
  const done = new Promise((r) => (resolve = r));
  const t0 = performance.now();
  const tick = (now) => {
    if (stopped) return;
    const f = Math.floor(((now - t0) / 1000) * sp.fps);
    if (!loop && f >= sp.frames) { stopped = true; return resolve(); }
    setFrame(f % sp.frames);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return { done, stop() { stopped = true; cancelAnimationFrame(raf); resolve(); } };
}

function track(cellEl, anim) {
  if (!running.has(cellEl)) running.set(cellEl, new Set());
  running.get(cellEl).add(anim);
  anim.done.then(() => running.get(cellEl)?.delete(anim));
}

function spawn(cellEl, kind, opts) {
  const fxLayer = cellEl.querySelector('.fx') ?? cellEl.appendChild(Object.assign(document.createElement('div'), { className: 'fx' }));
  const el = document.createElement('div');
  el.className = `fx-sprite fx-${kind}`;
  fxLayer.appendChild(el);
  const anim = playSprite(el, kind, opts);
  track(cellEl, anim);
  return { el, anim };
}

/* ---------- Kết quả tại ô (không có đạn bay) ---------- */
export function showShot(cellEl, status) {
  if (!cellEl || status === 'INVALID') return Promise.resolve();
  clearShot(cellEl);

  // Âm thanh (Dev 4): lắng nghe sự kiện 'shot' ở document, detail.status
  cellEl.dispatchEvent(new CustomEvent('shot', { bubbles: true, detail: { status } }));

  if (status === 'MISS') {
    cellEl.classList.add('miss');
    const { el, anim } = spawn(cellEl, 'splash'); // phát 1 lần rồi biến mất
    return anim.done.then(() => el.remove());
  }

  // HIT / SUNK: nổ 1 lần, xong chuyển sang lửa lặp mãi
  cellEl.classList.add(status === 'SUNK' ? 'sunk' : 'hit');
  const boom = spawn(cellEl, 'explosion');
  return boom.anim.done.then(() => {
    boom.el.remove();
    if (!cellEl.classList.contains('hit') && !cellEl.classList.contains('sunk')) return; // đã bị reset
    spawn(cellEl, 'fire', { loop: true });
  });
}

/* ---------- Đạn bay từ `fromEl` (hoặc ngoài màn hình) tới ô đích, rồi nổ/nước ---------- */
export function animateShot(cellEl, status, fromEl = null) {
  if (!cellEl || status === 'INVALID') return Promise.resolve();
  const to = cellEl.getBoundingClientRect();
  if (reduceMotion() || (!to.width && !to.height)) return showShot(cellEl, status);

  const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
  let sx, sy;
  if (fromEl && fromEl.getBoundingClientRect().width) {
    const r = fromEl.getBoundingClientRect();
    sx = r.left + r.width / 2; sy = ty > r.top + r.height / 2 ? r.bottom : r.top;
  } else { sx = -80; sy = window.innerHeight + 80; }

  const dx = tx - sx, dy = ty - sy, dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const duration = Math.min(900, Math.max(450, dist * 0.9));

  const m = document.createElement('div');
  m.className = 'fx-missile';
  document.body.appendChild(m);
  const sprite = playSprite(m, 'missile', { loop: true });
  const w = m.offsetWidth, h = m.offsetHeight;
  document.dispatchEvent(new CustomEvent('missile-launch')); // Dev 4: tiếng phóng

  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min((now - t0) / duration, 1), e = t * t * (3 - 2 * t) * 0.35 + t * 0.65; // tăng tốc nhẹ
      const x = sx + dx * e - w / 2, y = sy + dy * e - h / 2;
      m.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
      if (t < 1) return requestAnimationFrame(step);
      sprite.stop(); m.remove(); resolve();
    };
    requestAnimationFrame(step);
  }).then(() => showShot(cellEl, status));
}

/* ---------- Dọn dẹp ---------- */
export function clearShot(cellEl) {
  running.get(cellEl)?.forEach((a) => a.stop());
  running.delete(cellEl);
  cellEl.classList.remove('miss', 'hit', 'sunk');
  cellEl.querySelector('.fx')?.replaceChildren();
}

export function clearAllShots(gridEl) {
  gridEl.querySelectorAll('.cell').forEach(clearShot);
}

export function shakeCell(cellEl) {
  if (!cellEl) return;
  cellEl.classList.remove('shake');
  void cellEl.offsetWidth; // ép trình duyệt chạy lại animation
  cellEl.classList.add('shake');
}
