import React, { useRef, useEffect, useState } from 'react';

interface Props {
  src: string;
  title?: string;
  onClose: () => void;
}

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}

export function VideoPlayerModal({ src, title, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekTrackRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]     = useState(false);
  const [volume, setVolume]   = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed]     = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.src = src;
    v.play().catch(() => {});
    return () => { v.pause(); v.src = ''; };
  }, [src]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const revealControls = () => {
    setShowControls(true);
    clearTimeout(hideTimeout.current);
    if (playing) hideTimeout.current = setTimeout(() => setShowControls(false), 2500);
  };

  const handleSeek = (e: React.MouseEvent) => {
    const rect = seekTrackRef.current!.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = videoRef.current!;
    v.currentTime = pct * (v.duration || 0);
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div id="joly-player-overlay" className="open" onMouseMove={revealControls} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="joly-player-wrap">
        <video
          ref={videoRef}
          id="joly-video"
          onClick={() => { const v = videoRef.current!; v.paused ? v.play() : v.pause(); }}
          onPlay={() => { setPlaying(true); hideTimeout.current = setTimeout(() => setShowControls(false), 2500); }}
          onPause={() => { setPlaying(false); setShowControls(true); clearTimeout(hideTimeout.current); }}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        />

        <div id="joly-gradient-top" />
        <div id="joly-gradient-bot" />

        <div id="joly-controls" className={showControls ? 'visible' : ''}>
          <div id="joly-seek-wrap">
            <div id="joly-seek-track" ref={seekTrackRef} onClick={handleSeek}>
              <div id="joly-seek-fill" style={{ width: duration ? `${currentTime/duration*100}%` : '0%' }} />
              <div id="joly-seek-thumb" style={{ left: duration ? `${currentTime/duration*100}%` : '0%' }} />
            </div>
          </div>

          <div id="joly-ctrl-row">
            <div id="joly-ctrl-left">
              <button className="joly-btn" id="joly-play-btn" onClick={() => { const v = videoRef.current!; v.paused ? v.play() : v.pause(); }}>
                {playing
                  ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>}
              </button>
              <button className="joly-btn" onClick={() => { videoRef.current!.currentTime = Math.max(0, currentTime - 10); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2.5 12a9.5 9.5 0 1 1 1.07 4.43"/><path d="M2.5 7v5h5"/>
                </svg>
              </button>
              <button className="joly-btn" onClick={() => { videoRef.current!.currentTime = Math.min(duration, currentTime + 10); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.5 12a9.5 9.5 0 1 0-1.07 4.43"/><path d="M21.5 7v5h-5"/>
                </svg>
              </button>
              <button className="joly-btn" onClick={() => { const v = videoRef.current!; v.muted = !v.muted; setMuted(v.muted); }}>
                {muted
                  ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
              </button>
              <input type="range" min="0" max="1" step="0.02" value={volume} onChange={e => {
                const v = parseFloat(e.target.value);
                setVolume(v); videoRef.current!.volume = v; setMuted(v === 0);
              }} style={{ width: 70 }} />
              <div id="joly-time-display">{fmtTime(currentTime)} / {fmtTime(duration)}</div>
            </div>

            <div id="joly-ctrl-right">
              <div id="joly-speed-wrap" style={{ position: 'relative' }}>
                <button className="joly-btn joly-text-btn" onClick={() => setSpeedOpen(v => !v)}>{speed}×</button>
                {speedOpen && (
                  <div id="joly-speed-menu" className="open">
                    {speeds.map(s => (
                      <button key={s} className={`joly-speed-opt ${speed === s ? 'active' : ''}`} onClick={() => {
                        videoRef.current!.playbackRate = s; setSpeed(s); setSpeedOpen(false);
                      }}>{s}×</button>
                    ))}
                  </div>
                )}
              </div>
              <button className="joly-btn" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}