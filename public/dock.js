// ============================================================
//  Vercel Tabs Navigation — inspired by Joly UI's Vercel Tabs
//  Smooth sliding active indicator + hover ghost effect
//  Vanilla JS, zero dependencies
// ============================================================
(function () {
  'use strict';

  const dock = document.getElementById('mainDock');
  if (!dock) return;

  const items = Array.from(dock.querySelectorAll('.dock-item'));

  // ── Create the sliding indicator ─────────────────────────
  const indicator = document.createElement('div');
  indicator.className = 'vercel-indicator';
  dock.appendChild(indicator);

  // ── Create hover ghost highlight ─────────────────────────
  const hoverGhost = document.createElement('div');
  hoverGhost.className = 'vercel-hover-ghost';
  dock.appendChild(hoverGhost);

  // ── Move indicator to a given item ───────────────────────
  function moveIndicator(item, animate) {
    const dockRect = dock.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const left = itemRect.left - dockRect.left;
    const width = itemRect.width;

    if (!animate) {
      indicator.style.transition = 'none';
    } else {
      indicator.style.transition = 'left 0.3s cubic-bezier(0.65,0,0.35,1), width 0.3s cubic-bezier(0.65,0,0.35,1)';
    }

    indicator.style.left  = left + 'px';
    indicator.style.width = width + 'px';
  }

  // ── Show/hide hover ghost ─────────────────────────────────
  function showGhost(item) {
    const dockRect = dock.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const left = itemRect.left - dockRect.left;
    const width = itemRect.width;

    hoverGhost.style.opacity = '1';
    hoverGhost.style.left  = left + 'px';
    hoverGhost.style.width = width + 'px';
  }

  function hideGhost() {
    hoverGhost.style.opacity = '0';
  }

  // ── Find initially active item & set indicator ───────────
  const initialActive = dock.querySelector('.dock-item.active') || items[0];
  if (initialActive) {
    requestAnimationFrame(() => {
      moveIndicator(initialActive, false);
      indicator.getBoundingClientRect(); // force reflow
    });
  }

  // ── Bind events on each item ──────────────────────────────
  items.forEach((item) => {
    item.addEventListener('mouseenter', () => showGhost(item));
    item.addEventListener('mouseleave', () => hideGhost());
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab) window.switchTab(tab);
    });
  });

  // ── Patch switchTab to move indicator ────────────────────
  const _origSwitch = window.switchTab;
  window.switchTab = function (tab) {
    items.forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });
    const activeItem = dock.querySelector('.dock-item.active');
    if (activeItem) moveIndicator(activeItem, true);
    if (_origSwitch) _origSwitch(tab);
  };

  // ── Reposition on resize ──────────────────────────────────
  window.addEventListener('resize', () => {
    const active = dock.querySelector('.dock-item.active');
    if (active) moveIndicator(active, false);
    hideGhost();
  });

})();
