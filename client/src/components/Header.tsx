import React, { useEffect, useRef, useState } from 'react';

const LOVE_START_DATE = new Date('2025-09-20');

function getDaysInLove() {
  return Math.floor((Date.now() - LOVE_START_DATE.getTime()) / 86400000);
}

export function Header() {
  const [showCursor, setShowCursor] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [curPos, setCurPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number>();

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const animate = () => {
      setCurPos(prev => ({
        x: prev.x + (pos.x - prev.x) * 0.12,
        y: prev.y + (pos.y - prev.y) * 0.12,
      }));
      rafRef.current = requestAnimationFrame(animate);
    };
    if (showCursor) rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [showCursor, pos]);

  const days = getDaysInLove();

  return (
    <header>
      <div className="header-badge">
        ♥ &nbsp;{days} ngày bên nhau
      </div>
      <div className="header-hearts">· · ·</div>
      <h1
        style={{ cursor: showCursor ? 'none' : undefined }}
        onMouseEnter={() => setShowCursor(true)}
        onMouseLeave={() => setShowCursor(false)}
      >
        Our Love Diary
      </h1>
      <p>Mỗi khoảnh khắc là mãi mãi ✦</p>

      {showCursor && (
        <div
          className="mc-outer-ring mc-visible"
          style={{ transform: `translate(${curPos.x}px, ${curPos.y}px) translate(-50%, -50%)` }}
        >
          <div className="mc-inner-circle" style={{ transform: `translate(-50%, -50%) rotate(${(curPos.x - pos.x) * -0.08}deg)` }}>
            <div className="mc-days-num">{days}</div>
            <div className="mc-days-label">ngày ♥</div>
          </div>
        </div>
      )}
    </header>
  );
}
