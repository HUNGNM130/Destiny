import { useEffect } from 'react';

const gradients: Record<string, string> = {
  dawn:      'radial-gradient(circle at 16% 10%, rgba(255,255,255,0.72), transparent 24%), linear-gradient(135deg, #fff2df 0%, #ffd1ca 42%, #f7a9bd 72%, #d8c5ff 100%)',
  morning:   'radial-gradient(circle at 12% 8%, rgba(255,255,255,0.72), transparent 28%), linear-gradient(135deg, #fffaf6 0%, #f8e9ea 42%, #dcecf8 100%)',
  noon:      'radial-gradient(circle at 15% 10%, rgba(255,255,255,0.68), transparent 26%), linear-gradient(135deg, #f7fffb 0%, #dff7f3 45%, #f6d8e8 100%)',
  afternoon: 'radial-gradient(circle at 16% 9%, rgba(255,255,255,0.72), transparent 24%), linear-gradient(135deg, #fff8df 0%, #ffe1c2 42%, #ffc0c8 72%, #e6d6ff 100%)',
  sunset:    'radial-gradient(circle at 15% 10%, rgba(255,255,255,0.62), transparent 25%), linear-gradient(135deg, #ffe3d3 0%, #ffb4bd 44%, #deb8ff 100%)',
  evening:   'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.20), transparent 28%), linear-gradient(135deg, #231728 0%, #51304f 46%, #c87991 100%)',
  night:     'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.12), transparent 26%), linear-gradient(135deg, #0f0b1e 0%, #2c234a 52%, #533656 100%)',
  midnight:  'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.10), transparent 26%), linear-gradient(135deg, #090815 0%, #1b1430 52%, #2c1836 100%)',
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
          background:rgba(255,255,255,0.18);backdrop-filter:blur(14px);
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