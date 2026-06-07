/* ════════════════════════════════════════════
   MUSIC.JS — Nhạc nền
   Expose startBgMusic() / stopBgMusic() toàn cục
════════════════════════════════════════════ */
(function () {
  'use strict';

  var cfg = window.APP_CONFIG || {};
  var src = cfg.bgMusic || 'assets/music/bgmusic.mp3';
  var vol = typeof cfg.bgVolume === 'number' ? cfg.bgVolume : 0.55;

  var audio = new Audio(src);
  audio.loop    = true;
  audio.volume  = vol;
  audio.preload = 'auto';

  window.startBgMusic = function () {
    try {
      audio.currentTime = 0;
      audio.volume = vol;
      var p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          console.warn('Không phát được nhạc:', err);
        });
      }
    } catch (e) {
      console.warn('startBgMusic error:', e);
    }
  };

  window.stopBgMusic = function () {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      console.warn('stopBgMusic error:', e);
    }
  };
})();
