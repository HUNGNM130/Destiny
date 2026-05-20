// ============================================================
//  Love Days — Morphing Cursor effect on "Our Love Diary" title
//  Hiện số ngày yêu nhau khi hover vào chữ h1
// ============================================================
(function () {
  'use strict';

  // ── Ngày bắt đầu yêu nhau ────────────────────────────────
  const LOVE_START_DATE = new Date('2025-09-20');

  function getDaysInLove() {
    const now  = new Date();
    const diff = now - LOVE_START_DATE;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function initMorphingCursor() {
    const h1 = document.querySelector('header h1');
    if (!h1) return;

    const days     = getDaysInLove();
    const hoverText = `${days} ngày ♥`;

    h1.style.position   = 'relative';
    h1.style.display    = 'inline-block';
    h1.style.cursor     = 'default';
    h1.style.userSelect = 'none';
    h1.style.overflow   = 'hidden';

    // Overlay that covers the full h1 on hover
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: var(--wine);
      pointer-events: none;
      overflow: hidden;
      opacity: 0;
      transform: scale(0.92);
      transition: opacity 0.42s cubic-bezier(0.33,1,0.68,1),
                  transform 0.42s cubic-bezier(0.33,1,0.68,1);
      z-index: 2;
      display: flex; align-items: center; justify-content: center;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
      font-family: 'Playfair Display', serif;
      font-size: inherit;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.02em;
      text-align: center;
      padding: 0 12px;
    `;
    inner.textContent = hoverText;
    overlay.appendChild(inner);
    h1.appendChild(overlay);

    h1.addEventListener('mouseenter', () => {
      inner.textContent = `${getDaysInLove()} ngày ♥`;
      overlay.style.opacity   = '1';
      overlay.style.transform = 'scale(1)';
    });

    h1.addEventListener('mouseleave', () => {
      overlay.style.opacity   = '0';
      overlay.style.transform = 'scale(0.92)';
    });

    // Touch support for mobile
    h1.addEventListener('touchstart', () => {
      inner.textContent = `${getDaysInLove()} ngày ♥`;
      overlay.style.opacity   = '1';
      overlay.style.transform = 'scale(1)';
    }, { passive: true });

    h1.addEventListener('touchend', () => {
      setTimeout(() => {
        overlay.style.opacity   = '0';
        overlay.style.transform = 'scale(0.92)';
      }, 1200);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMorphingCursor);
  } else {
    initMorphingCursor();
  }
})();
