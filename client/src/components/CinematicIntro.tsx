import React, { useEffect, useRef, useState } from 'react';

interface Props { onDone: () => void; }

export function CinematicIntro({ onDone }: Props) {
  const [pct, setPct] = useState(0);
  const [fading, setFading] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = () => {
    setFading(true);
    setTimeout(onDone, 900);
  };

  useEffect(() => {
    let p = 0;
    tickRef.current = setInterval(() => {
      p += Math.random() * 18;
      if (p > 100) p = 100;
      setPct(p);
      if (p >= 100) {
        clearInterval(tickRef.current!);
        setTimeout(dismiss, 400);
      }
    }, 120);
    return () => clearInterval(tickRef.current!);
  }, []);

  const symbols = ['♥','✦','✿','★','♡','✧','❋'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    sym: symbols[Math.floor(Math.random() * symbols.length)],
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 0.6 + Math.random() * 1.4,
    delay: Math.random() * 2,
    dur: 2 + Math.random() * 6,
    opacity: 0.1 + Math.random() * 0.5,
    color: ['#f0c4c4','#c8707a','#fde68a','#e9d5ff'][Math.floor(Math.random()*4)],
  }));

  return (
    <div
      className={`cinematic-intro ${fading ? 'cinematic-out' : ''}`}
      onClick={() => { clearInterval(tickRef.current!); setPct(100); setTimeout(dismiss, 200); }}
    >
      <div className="cinematic-bg" />
      <div className="cinematic-content">
        <div className="cinematic-logo">
          <span className="cinematic-heart">♥</span>
          <h1 className="cinematic-title">Our Love Diary</h1>
          <p className="cinematic-sub">Mỗi khoảnh khắc là mãi mãi ✦</p>
        </div>
        <div className="cinematic-loading">
          <div className="cinematic-bar">
            <div className="cinematic-progress" style={{ width: `${pct}%` }} />
          </div>
          <p className="cinematic-hint">Đang tải những kỷ niệm...</p>
        </div>
      </div>
      <div className="cinematic-particles">
        {particles.map(p => (
          <div key={p.id} className="cp-particle" style={{
            left: `${p.left}%`, top: `${p.top}%`,
            fontSize: `${p.size}rem`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            opacity: p.opacity,
            color: p.color,
          }}>{p.sym}</div>
        ))}
      </div>
    </div>
  );
}
