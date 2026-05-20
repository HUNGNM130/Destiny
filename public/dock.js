// ============================================================
//  Dock Navigation — macOS-style magnification
//  Vanilla JS port of Joly UI's Dock component
//  Spring physics: mass=0.1, stiffness=150, damping=12
// ============================================================
(function () {
  'use strict';

  const ICON_BASE   = 48;   // base px size of each dock icon
  const ICON_MAX    = 80;   // max px when directly hovered
  const DISTANCE    = 130;  // px distance that magnification reaches
  const SPRING_MASS = 0.1;
  const SPRING_K    = 150;
  const SPRING_D    = 12;

  // Per-item spring state
  function makeSpring(initial) {
    return { pos: initial, vel: 0, target: initial };
  }

  function stepSpring(s, dt) {
    const acc = (-SPRING_K * (s.pos - s.target) - SPRING_D * s.vel) / SPRING_MASS;
    s.vel += acc * dt;
    s.pos += s.vel * dt;
    return s.pos;
  }

  const dock      = document.getElementById('mainDock');
  if (!dock) return;

  const items     = Array.from(dock.querySelectorAll('.dock-item'));
  const springs   = items.map(() => makeSpring(ICON_BASE));
  let   mouseX    = Infinity;
  let   rafId     = null;

  // ── Set size of item ──────────────────────────────────────
  function applySize(item, size) {
    item.style.width  = size + 'px';
    item.style.height = size + 'px';
    const box = item.querySelector('.dock-icon-box');
    if (box) {
      box.style.fontSize = (size * 0.42) + 'px';
      box.style.borderRadius = Math.max(10, size * 0.28) + 'px';
    }
  }

  // ── Target size based on mouse distance ──────────────────
  function targetForItem(item) {
    const rect   = item.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const dist   = Math.abs(mouseX - center);
    if (dist >= DISTANCE) return ICON_BASE;
    const t = 1 - dist / DISTANCE;  // 0..1
    return ICON_BASE + (ICON_MAX - ICON_BASE) * t;
  }

  // ── Animation loop ────────────────────────────────────────
  let lastTime = null;
  function tick(ts) {
    const dt = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0.016;
    lastTime = ts;

    items.forEach((item, i) => {
      springs[i].target = targetForItem(item);
      const size = stepSpring(springs[i], dt);
      applySize(item, Math.max(ICON_BASE, size));
    });

    rafId = requestAnimationFrame(tick);
  }

  // ── Mouse events ──────────────────────────────────────────
  dock.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
  });

  dock.addEventListener('mouseleave', () => {
    mouseX = Infinity;
  });

  // ── Click → switchTab ─────────────────────────────────────
  items.forEach((item) => {
    applySize(item, ICON_BASE);   // set initial size

    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab) window.switchTab(tab);
    });
  });

  // ── Sync active state with switchTab ─────────────────────
  // Patch switchTab to also update dock active class
  const _origSwitch = window.switchTab;
  window.switchTab = function (tab) {
    items.forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });
    _origSwitch(tab);
  };

  // Start loop
  rafId = requestAnimationFrame(tick);
})();