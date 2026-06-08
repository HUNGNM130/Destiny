import React, { useEffect, useRef } from 'react';
import type { Tab } from '../types';

interface Props { tab: Tab; onTabChange: (t: Tab) => void; }

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'photos',  icon: '📷', label: 'Kỷ niệm' },
  { id: 'videos',  icon: '🎬', label: 'Video' },
  { id: 'camera',  icon: '📸', label: 'Camera' },
  { id: 'gallery', icon: '✨', label: 'Tập chính' },
];

export function TabDock({ tab, onTabChange }: Props) {
  const dockRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  const moveIndicator = (idx: number, animate: boolean) => {
    const dock = dockRef.current;
    const indicator = indicatorRef.current;
    if (!dock || !indicator) return;
    const items = dock.querySelectorAll('.dock-item');
    const item = items[idx] as HTMLElement;
    if (!item) return;
    const dockRect = dock.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    indicator.style.transition = animate
      ? 'left 0.3s cubic-bezier(0.65,0,0.35,1), width 0.3s cubic-bezier(0.65,0,0.35,1)'
      : 'none';
    indicator.style.left  = (itemRect.left - dockRect.left) + 'px';
    indicator.style.width = itemRect.width + 'px';
  };

  useEffect(() => {
    const idx = TABS.findIndex(t => t.id === tab);
    requestAnimationFrame(() => moveIndicator(idx, true));
  }, [tab]);

  useEffect(() => {
    const handleResize = () => {
      const idx = TABS.findIndex(t => t.id === tab);
      moveIndicator(idx, false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tab]);

  const showGhost = (idx: number) => {
    const dock = dockRef.current;
    const ghost = ghostRef.current;
    if (!dock || !ghost) return;
    const items = dock.querySelectorAll('.dock-item');
    const item = items[idx] as HTMLElement;
    if (!item) return;
    const dockRect = dock.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    ghost.style.opacity = '1';
    ghost.style.left    = (itemRect.left - dockRect.left) + 'px';
    ghost.style.width   = itemRect.width + 'px';
  };

  return (
    <div className="dock-wrap">
      <div className="dock" id="mainDock" ref={dockRef}>
        {TABS.map((t, idx) => (
          <div
            key={t.id}
            className={`dock-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => onTabChange(t.id)}
            onMouseEnter={() => showGhost(idx)}
            onMouseLeave={() => { if (ghostRef.current) ghostRef.current.style.opacity = '0'; }}
          >
            <div className="dock-icon-box">{t.icon}</div>
            <div className="dock-label">{t.label}</div>
          </div>
        ))}
        <div className="vercel-indicator" ref={indicatorRef} />
        <div className="vercel-hover-ghost" ref={ghostRef} />
      </div>
    </div>
  );
}