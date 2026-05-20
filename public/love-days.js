// ============================================================
//  Love Days — Morphing Cursor effect trên chữ h1
//  Vòng tròn to theo chuột, trong vòng tròn nhỏ hiện số ngày yêu
//  Inspired by Joly UI's MagneticText / Morphing Cursor
// ============================================================
(function () {
  'use strict';

  const LOVE_START_DATE = new Date('2025-09-20');

  function getDaysInLove() {
    const now  = new Date();
    const diff = now - LOVE_START_DATE;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function initMorphingCursor() {
    const h1 = document.querySelector('header h1');
    if (!h1) return;

    // ── Cursor circle elements ───────────────────────────
    // Outer ring
    const outerRing = document.createElement('div');
    outerRing.className = 'mc-outer-ring';

    // Inner circle with text
    const innerCircle = document.createElement('div');
    innerCircle.className = 'mc-inner-circle';

    const daysLabel = document.createElement('div');
    daysLabel.className = 'mc-days-label';

    const daysNum = document.createElement('div');
    daysNum.className = 'mc-days-num';

    innerCircle.appendChild(daysNum);
    innerCircle.appendChild(daysLabel);
    outerRing.appendChild(innerCircle);
    document.body.appendChild(outerRing);

    // ── State ────────────────────────────────────────────
    let isHovered   = false;
    let mouseX      = 0;
    let mouseY      = 0;
    let currentX    = 0;
    let currentY    = 0;
    let rafId       = null;

    // ── Lerp animation loop ──────────────────────────────
    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
      currentX = lerp(currentX, mouseX, 0.12);
      currentY = lerp(currentY, mouseY, 0.12);

      outerRing.style.transform =
        `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;

      // Inner circle counter-rotates slightly for feel
      innerCircle.style.transform =
        `translate(-50%, -50%) rotate(${(currentX - mouseX) * -0.08}deg)`;

      rafId = requestAnimationFrame(animate);
    }

    function startLoop() {
      if (!rafId) rafId = requestAnimationFrame(animate);
    }

    function stopLoop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // ── Mouse tracking (global, so circle follows smoothly) ─
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // ── Hover on h1 ──────────────────────────────────────
    h1.style.cursor = 'none';

    h1.addEventListener('mouseenter', () => {
      isHovered = true;
      const days = getDaysInLove();
      daysNum.textContent  = days;
      daysLabel.textContent = 'ngày ♥';

      outerRing.classList.add('mc-visible');
      startLoop();
    });

    h1.addEventListener('mouseleave', () => {
      isHovered = false;
      outerRing.classList.remove('mc-visible');
    });

    // ── Touch support ────────────────────────────────────
    h1.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      mouseX = t.clientX;
      mouseY = t.clientY;
      currentX = mouseX;
      currentY = mouseY;

      const days = getDaysInLove();
      daysNum.textContent  = days;
      daysLabel.textContent = 'ngày ♥';

      outerRing.classList.add('mc-visible', 'mc-touch');
      startLoop();
    }, { passive: true });

    h1.addEventListener('touchend', () => {
      setTimeout(() => {
        outerRing.classList.remove('mc-visible', 'mc-touch');
      }, 1400);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMorphingCursor);
  } else {
    initMorphingCursor();
  }

})();
