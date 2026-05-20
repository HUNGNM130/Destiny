// ============================================================
//  love-days.js
//  1. Hiện số ngày yêu nhau khi hover chữ "Our Love Diary"
//     (morphing cursor style – Joly UI inspired)
//  2. Morphing cursor theo chuột trên toàn trang
// ============================================================
(function () {
  'use strict';

  // ── CẤU HÌNH: đổi ngày bắt đầu yêu ở đây ────────────────
  const LOVE_START = new Date('2023-02-14'); // ← thay ngày thật của hai đứa

  // ── Tính số ngày ──────────────────────────────────────────
  function getDaysCount() {
    const now  = new Date();
    const diff = now - LOVE_START;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // ============================================================
  //  MORPHING CURSOR
  // ============================================================
  const CURSOR_TEXTS = ['♥', '✦', '♥', '✿', '♥'];
  let cursorIdx = 0;

  const cursorEl = document.createElement('div');
  cursorEl.id = 'loveCursor';
  cursorEl.className = 'love-cursor';
  cursorEl.textContent = CURSOR_TEXTS[0];
  document.body.appendChild(cursorEl);

  let cursorX = -999, cursorY = -999;
  let rafCursor = null;

  function moveCursor(x, y) {
    cursorX = x; cursorY = y;
    if (!rafCursor) rafCursor = requestAnimationFrame(applyCursor);
  }
  function applyCursor() {
    rafCursor = null;
    cursorEl.style.transform = 'translate(' + cursorX + 'px, ' + cursorY + 'px) translate(-50%,-50%)';
  }

  document.addEventListener('mousemove', function(e) {
    moveCursor(e.clientX, e.clientY);
    cursorEl.style.opacity = '1';
  });
  document.addEventListener('mouseleave', function() { cursorEl.style.opacity = '0'; });

  // Morph every 1.6 s
  setInterval(function() {
    cursorEl.classList.add('morphing');
    setTimeout(function() {
      cursorIdx = (cursorIdx + 1) % CURSOR_TEXTS.length;
      cursorEl.textContent = CURSOR_TEXTS[cursorIdx];
      cursorEl.classList.remove('morphing');
    }, 200);
  }, 1600);

  // Hide default cursor on desktop only
  if (window.matchMedia('(pointer:fine)').matches) {
    document.documentElement.style.cursor = 'none';
    document.addEventListener('mouseover', function(e) {
      var tag = e.target.tagName;
      if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) {
        document.documentElement.style.cursor = 'auto';
        cursorEl.style.opacity = '0.3';
      } else {
        document.documentElement.style.cursor = 'none';
        cursorEl.style.opacity = '1';
      }
    });
  }

  // ============================================================
  //  DAYS COUNTER — hover on h1
  // ============================================================
  var h1 = document.querySelector('header h1');
  if (!h1) return;

  var bubble = document.createElement('div');
  bubble.id = 'loveDaysBubble';
  bubble.className = 'love-days-bubble';
  document.body.appendChild(bubble);

  var bubbleVisible = false;

  function updateBubble() {
    var days = getDaysCount();
    bubble.innerHTML =
      '<span class="ldb-heart">♥</span>' +
      '<span class="ldb-num">' + days.toLocaleString('vi-VN') + '</span>' +
      '<span class="ldb-label">ngày bên nhau</span>';
  }

  function showBubble(x, y) {
    if (!bubbleVisible) {
      updateBubble();
      bubble.classList.add('open');
      bubbleVisible = true;
    }
    var bw = bubble.offsetWidth  || 160;
    var bh = bubble.offsetHeight || 70;
    var vw = window.innerWidth;
    var lx = x + 18;
    var ly = y - bh / 2;
    if (lx + bw > vw - 12) lx = x - bw - 18;
    if (ly < 8) ly = 8;
    bubble.style.left = lx + 'px';
    bubble.style.top  = ly + 'px';
  }

  function hideBubble() {
    bubble.classList.remove('open');
    bubbleVisible = false;
  }

  h1.style.cursor = 'default';
  h1.addEventListener('mouseenter', function(e) {
    showBubble(e.clientX, e.clientY);
    h1.classList.add('h1-hovered');
  });
  h1.addEventListener('mousemove', function(e) {
    if (bubbleVisible) showBubble(e.clientX, e.clientY);
  });
  h1.addEventListener('mouseleave', function() {
    hideBubble();
    h1.classList.remove('h1-hovered');
  });

  // Touch support
  h1.addEventListener('touchstart', function(e) {
    updateBubble();
    bubble.style.left = '50%';
    bubble.style.top  = (h1.getBoundingClientRect().bottom + window.scrollY + 14) + 'px';
    bubble.style.transform = 'translateX(-50%) scale(1)';
    bubble.classList.add('open');
    bubbleVisible = true;
    h1.classList.add('h1-hovered');
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchstart', function(e) {
    if (!h1.contains(e.target) && bubbleVisible) {
      hideBubble();
      h1.classList.remove('h1-hovered');
      bubble.style.transform = '';
    }
  });

})();