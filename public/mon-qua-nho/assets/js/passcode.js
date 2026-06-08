/* ════════════════════════════════════════════
   PASSCODE.JS — Màn hình nhập mật khẩu
   Chạy trước main.js (không dùng ES module)
════════════════════════════════════════════ */
(function () {
  'use strict';

  // Đọc config (window.APP_CONFIG phải được khai báo trong index.html trước script này)
  var cfg = window.APP_CONFIG || {};
  var PASSCODE       = cfg.passcode || '0308';
  var enablePasscode = cfg.enablePasscode !== false;

  var passcodeScreen = document.getElementById('passcodeScreen');
  var passcodeDots   = document.getElementById('passcodeDots');
  var passcodeBears  = document.getElementById('passcodeBears');
  var bearLeft       = document.getElementById('bearLeft');
  var bearRight      = document.getElementById('bearRight');

  // Áp dụng text config
  var passcodeTitle    = document.querySelector('.passcode-title');
  var passcodeSubtitle = document.querySelector('.passcode-subtitle');
  if (passcodeTitle    && cfg.passcodeTitle)    passcodeTitle.textContent    = cfg.passcodeTitle;
  if (passcodeSubtitle && cfg.passcodeSubtitle) passcodeSubtitle.textContent = cfg.passcodeSubtitle;

  // Nếu passcode tắt → ẩn màn hình, init ngay
  if (!enablePasscode) {
    if (passcodeScreen) passcodeScreen.style.display = 'none';
    // main.js sẽ tự gọi init()
    window.__passcodeCleared = true;
    return;
  }

  // Hiện màn hình passcode
  passcodeScreen.classList.add('visible');

  var passcodeInput = '';

  function updateDots() {
    var dots = passcodeDots.querySelectorAll('.passcode-dot');
    dots.forEach(function (dot, i) {
      dot.classList.remove('filled', 'error');
      if (i < passcodeInput.length) dot.classList.add('filled');
    });
  }

  function updateBearPosition() {
    var pos = passcodeInput.length;
    bearLeft.className  = 'passcode-bear left pos-' + pos;
    bearRight.className = 'passcode-bear right pos-' + pos;
  }

  function showError() {
    var dots = passcodeDots.querySelectorAll('.passcode-dot');
    dots.forEach(function (d) { d.classList.add('error'); });
    bearLeft.className  = 'passcode-bear left pos-0';
    bearRight.className = 'passcode-bear right pos-0';
    setTimeout(function () {
      passcodeInput = '';
      dots.forEach(function (d) { d.classList.remove('filled', 'error'); });
    }, 500);
  }

  function openGift() {
    passcodeBears.classList.add('show-couple');
    setTimeout(function () {
      passcodeScreen.classList.add('hiding');
      setTimeout(function () {
        passcodeScreen.classList.remove('visible', 'hiding');
        passcodeBears.classList.remove('show-couple');
        window.__passcodeCleared = true;
        // main.js lắng nghe event này để gọi init()
        document.dispatchEvent(new Event('passcodeCleared'));
      }, 500);
    }, 2200);
  }

  // Keypad click
  document.querySelectorAll('.passcode-btn[data-num]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (passcodeInput.length >= 4) return;
      passcodeInput += btn.dataset.num;
      updateDots();
      updateBearPosition();
      if (passcodeInput.length === 4) {
        if (passcodeInput === PASSCODE) {
          openGift();
        } else {
          showError();
        }
      }
    });
  });

  // Cancel (xóa hết)
  document.getElementById('passcodeCancel').addEventListener('click', function () {
    passcodeInput = '';
    updateDots();
    updateBearPosition();
  });

  // Chặn pinch zoom
  passcodeScreen.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
})();
