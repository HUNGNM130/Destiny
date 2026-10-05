import React, { useRef, useState } from 'react';

const GAME_URL = '/games/mushies/index.html';

// Game ~47MB nên chỉ tải khi bấm "Chơi", không tải ngầm khi mở tab.
export function GameTab() {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const goFullscreen = () => {
    const el = frameRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  if (!playing) {
    return (
      <div className="gift-tab-center">
        <div style={{ fontSize: '3.2rem', marginBottom: 12 }}>🧸</div>
        <h2 className="gift-tab-title">Mushies</h2>
        <p className="gift-tab-sub">Thả plushie, ghép những bé giống nhau và xây đống ôm lớn nhất trước khi bàn chơi đầy.</p>
        <button className="gift-tab-btn" onClick={() => setPlaying(true)}>🎮 Chơi ngay</button>
        <p className="gift-tab-hint">Lần đầu có thể mất vài giây để tải game</p>
      </div>
    );
  }

  return (
    <div className="game-tab">
      <div className="game-tab-bar">
        <button className="game-tab-mini" onClick={goFullscreen}>⛶ Toàn màn hình</button>
        <button className="game-tab-mini" onClick={() => setPlaying(false)}>✕ Thoát</button>
      </div>
      <iframe
        ref={frameRef}
        className="game-tab-frame"
        src={GAME_URL}
        title="Mushies"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
