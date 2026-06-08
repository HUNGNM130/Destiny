import React, { useCallback, useRef, useEffect } from 'react';
import type { Tab } from '../types';

interface Props { tab: Tab; onTabChange: (t: Tab) => void; }

const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: 'photos',    emoji: '📷', label: 'Kỷ niệm' },
  { id: 'videos',    emoji: '🎬', label: 'Video'   },
  { id: 'camera',    emoji: '📸', label: 'Camera'  },
  { id: 'gallery',   emoji: '✨', label: 'Tập chính' },
  { id: 'gift',      emoji: '🎁', label: 'Quà tặng' },
];

const BASE_SIZE   = 52;   // px — resting item size
const MAX_SCALE   = 1.65; // magnification peak
const DISTANCE    = 130;  // px — influence radius

export function TabDock({ tab, onTabChange }: Props) {
  const dockRef  = useRef<HTMLDivElement>(null);
  const mouseX   = useRef<number>(Infinity);
  const rafRef   = useRef<number | null>(null);

  // Smooth spring for each item
  const springs  = useRef<{ current: number; target: number; vel: number }[]>(
    TABS.map(() => ({ current: BASE_SIZE, target: BASE_SIZE, vel: 0 }))
  );

  const getTargetSize = (itemMidX: number) => {
    const dx = mouseX.current - itemMidX;
    const dist = Math.abs(dx);
    if (dist >= DISTANCE) return BASE_SIZE;
    const t = 1 - dist / DISTANCE;
    return BASE_SIZE + (BASE_SIZE * MAX_SCALE - BASE_SIZE) * t * t;
  };

  const tick = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const items = dock.querySelectorAll<HTMLElement>('.jd-item');
    let changed = false;

    items.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const target = getTargetSize(midX);

      const sp = springs.current[i];
      sp.target = target;

      // Simple spring: stiffness=180, damping=18
      const force = (sp.target - sp.current) * 0.28;
      sp.vel = (sp.vel + force) * 0.72;
      sp.current += sp.vel;

      if (Math.abs(sp.current - sp.target) > 0.05 || Math.abs(sp.vel) > 0.05) changed = true;

      el.style.width  = sp.current + 'px';
      el.style.height = sp.current + 'px';

      // Label fades in when item is enlarged
      const label = el.querySelector<HTMLElement>('.jd-label');
      if (label) {
        const pct = (sp.current - BASE_SIZE) / (BASE_SIZE * MAX_SCALE - BASE_SIZE);
        label.style.opacity = String(Math.max(0, pct * 2 - 0.6));
        label.style.transform = `translateX(-50%) translateY(${(1-pct)*4}px)`;
      }
    });

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [tick]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.current = e.clientX;
  };

  const handleMouseLeave = () => {
    mouseX.current = Infinity;
  };

  return (
    <div className="jd-wrap">
      <div
        className="jd-dock"
        ref={dockRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`jd-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => onTabChange(t.id)}
            title={t.label}
          >
            <span className="jd-emoji">{t.emoji}</span>
            {tab === t.id && <span className="jd-dot" />}
            <span className="jd-label">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
