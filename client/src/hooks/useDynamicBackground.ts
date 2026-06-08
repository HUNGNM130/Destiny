import { useEffect } from 'react';

const gradients: Record<string, string> = {
  dawn:      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 30%, #ff9a9e 60%, #a18cd1 100%)',
  morning:   'linear-gradient(135deg, #fdfbfb 0%, #ebedee 40%, #d4e8f5 70%, #b8d4ea 100%)',
  noon:      'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 40%, #80deea 70%, #c8e6c9 100%)',
  afternoon: 'linear-gradient(135deg, #fff9c4 0%, #ffe082 40%, #ffcc02 60%, #f9a825 100%)',
  sunset:    'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 30%, #ffb347 60%, #ff6e7f 100%)',
  evening:   'linear-gradient(135deg, #2c3e50 0%, #3a1c71 40%, #d76d77 70%, #ffaf7b 100%)',
  night:     'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  midnight:  'linear-gradient(135deg, #0a0a1a 0%, #1a0533 50%, #0d0d2b 100%)',
};

const timeLabels: Record<string, string> = {
  dawn: '🌅 Bình minh', morning: '☀️ Buổi sáng', noon: '🌞 Buổi trưa',
  afternoon: '🌤 Buổi chiều', sunset: '🌇 Hoàng hôn', evening: '🌆 Buổi tối',
  night: '🌙 Đêm', midnight: '⭐ Nửa đêm',
};

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 7)  return 'dawn';
  if (h >= 7  && h < 11) return 'morning';
  if (h >= 11 && h < 13) return 'noon';
  if (h >= 13 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19) return 'sunset';
  if (h >= 19 && h < 22) return 'evening';
  if (h >= 22 || h < 2)  return 'night';
  return 'midnight';
}

export function useDynamicBackground() {
  useEffect(() => {
    const applyBackground = () => {
      const tod = getTimeOfDay();
      document.body.style.transition = 'background 3s ease';
      document.body.style.background = gradients[tod];

      // Stars for night
      const existing = document.getElementById('dynamicStars');
      if (existing) existing.remove();
      if (tod === 'night' || tod === 'midnight') {
        const wrap = document.createElement('div');
        wrap.id = 'dynamicStars';
        wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden;';
        for (let i = 0; i < 60; i++) {
          const s = document.createElement('div');
          const size = 1 + Math.random() * 2;
          s.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:white;border-radius:50%;
            left:${Math.random()*100}%;top:${Math.random()*70}%;
            animation:starTwinkle ${2+Math.random()*3}s ease-in-out infinite;
            animation-delay:${Math.random()*4}s;opacity:${0.4+Math.random()*0.6};`;
          wrap.appendChild(s);
        }
        document.body.insertBefore(wrap, document.body.firstChild);
      }

      // Time indicator
      let indicator = document.getElementById('timeIndicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'timeIndicator';
        indicator.style.cssText = `position:fixed;top:12px;right:12px;z-index:9999;
          background:rgba(255,255,255,0.25);backdrop-filter:blur(10px);
          border-radius:20px;padding:4px 12px;font-size:13px;color:#fff;
          text-shadow:0 1px 3px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.3);
          font-family:'Caveat',cursive;cursor:pointer;`;
        const timeOrder = ['dawn','morning','noon','afternoon','sunset','evening','night','midnight'];
        let manualIdx = -1;
        indicator.onclick = () => {
          manualIdx = (manualIdx + 1) % timeOrder.length;
          const t = timeOrder[manualIdx];
          document.body.style.transition = 'background 1.5s ease';
          document.body.style.background = gradients[t];
          indicator!.textContent = timeLabels[t];
        };
        document.body.appendChild(indicator);
      }
      indicator.textContent = timeLabels[tod];
    };

    applyBackground();
    const interval = setInterval(applyBackground, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      document.getElementById('dynamicStars')?.remove();
      document.getElementById('timeIndicator')?.remove();
    };
  }, []);
}