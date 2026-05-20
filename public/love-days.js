// ============================================================
//  Love Days — Morphing Cursor effect on "Our Love Diary" title
//  Hiện số ngày yêu nhau khi hover vào chữ h1
//  Inspired by Joly UI MagneticText / Morphing Cursor
// ============================================================
(function () {
  'use strict';

  // ── Ngày bắt đầu yêu nhau ────────────────────────────────
  // Đổi thành ngày thật của hai đứa nhé ♥
  const LOVE_START_DATE = new Date('2025-09-20');

  function getDaysInLove() {
    const now  = new Date();
    const diff = now - LOVE_START_DATE;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function initMorphingCursor() {
    const h1 = document.querySelector('header h1');
    if (!h1) return;

    const originalText = h1.textContent.trim();
    const days         = getDaysInLove();
    const hoverText    = `${days} ngày ♥`;

    // Make h1 a positioned container
    h1.style.position   = 'relative';
    h1.style.display    = 'inline-block';
    h1.style.cursor     = 'none';
    h1.style.userSelect = 'none';

    // Circle overlay (the morphing blob)
    const circle = document.createElement('div');
    circle.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      border-radius: 50%;
      background: var(--wine);
      pointer-events: none;
      overflow: hidden;
      width: 0; height: 0;
      will-change: transform, width, height;
      transition: width 0.5s cubic-bezier(0.33,1,0.68,1),
                  height 0.5s cubic-bezier(0.33,1,0.68,1);
      z-index: 2;
      display: flex; align-items: center; justify-content: center;
    `;

    // Inner text (counter-moves with the circle)
    const inner = document.createElement('div');
    inner.style.cssText = `
      position: absolute;
      white-space: nowrap;
      font-family: 'Caveat', cursive;
      font-size: clamp(1.1rem, 3.5vw, 2rem);
      font-weight: 700;
      color: #fff;
      will-change: transform;
      display: flex; align-items: center; justify-content: center;
    `;
    inner.textContent = hoverText;
    circle.appendChild(inner);
    h1.appendChild(circle);

    // State
    const mousePos   = { x: 0, y: 0 };
    const currentPos = { x: 0, y: 0 };
    let isHovered    = false;
    let rafId        = null;
    let containerW   = 0;
    let containerH   = 0;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
      currentPos.x = lerp(currentPos.x, mousePos.x, 0.15);
      currentPos.y = lerp(currentPos.y, mousePos.y, 0.15);

      circle.style.transform =
        `translate(${currentPos.x}px, ${currentPos.y}px) translate(-50%, -50%)`;

      inner.style.width  = containerW + 'px';
      inner.style.height = containerH + 'px';
      inner.style.top    = '50%';
      inner.style.left   = '50%';
      inner.style.transform =
        `translate(-50%,-50%) translate(${-currentPos.x}px, ${-currentPos.y}px)`;

      rafId = requestAnimationFrame(animate);
    }

    function updateSize() {
      containerW = h1.offsetWidth;
      containerH = h1.offsetHeight;
    }

    function onMouseEnter(e) {
      updateSize();
      const rect = h1.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mousePos.x   = x;
      mousePos.y   = y;
      currentPos.x = x;
      currentPos.y = y;
      isHovered = true;

      // Refresh day count in case page stayed open a long time
      inner.textContent = `${getDaysInLove()} ngày ♥`;

      circle.style.width  = '160px';
      circle.style.height = '160px';

      if (!rafId) rafId = requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      if (!isHovered) return;
      const rect = h1.getBoundingClientRect();
      mousePos.x = e.clientX - rect.left;
      mousePos.y = e.clientY - rect.top;
    }

    function onMouseLeave() {
      isHovered = false;
      circle.style.width  = '0';
      circle.style.height = '0';
    }

    h1.addEventListener('mouseenter', onMouseEnter);
    h1.addEventListener('mousemove',  onMouseMove);
    h1.addEventListener('mouseleave', onMouseLeave);

    window.addEventListener('resize', updateSize);
    updateSize();

    // Start animation loop always (for smooth lerp even before hover)
    rafId = requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMorphingCursor);
  } else {
    initMorphingCursor();
  }
})();