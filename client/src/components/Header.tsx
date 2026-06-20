import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ThemePicker } from './ThemePicker';

export interface SiteCopyConfig {
  siteHeroEyebrow?: string;
  siteHeroTitle?: string;
  siteHeroSubtitle?: string;
  siteGlobalNotice?: string;
  loveStartDate?: string;
}

const FALLBACK_LOVE_START_DATE = '2025-09-20';
function getDaysInLove(startDate = FALLBACK_LOVE_START_DATE) {
  const start = new Date(startDate || FALLBACK_LOVE_START_DATE);
  const safeStart = Number.isNaN(start.getTime()) ? new Date(FALLBACK_LOVE_START_DATE) : start;
  return Math.max(0, Math.floor((Date.now() - safeStart.getTime()) / 86400000));
}

export function Header({ memoryCount = 0, videoCount = 0, siteCopy = {} }: { memoryCount?: number; videoCount?: number; siteCopy?: SiteCopyConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef    = useRef<HTMLDivElement>(null);
  const innerTextRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered]   = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const mousePos   = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const rafRef     = useRef<number>();

  const days = getDaysInLove(siteCopy.loveStartDate);
  const heroEyebrow = siteCopy.siteHeroEyebrow || 'Private memory system';
  const heroTitle = siteCopy.siteHeroTitle || 'Our Love Diary';
  const heroSubtitle = siteCopy.siteHeroSubtitle || 'Mỗi khoảnh khắc là mãi mãi ✦';
  const globalNotice = (siteCopy.siteGlobalNotice || '').trim();

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const animate = () => {
      currentPos.current.x = lerp(currentPos.current.x, mousePos.current.x, 0.15);
      currentPos.current.y = lerp(currentPos.current.y, mousePos.current.y, 0.15);

      if (circleRef.current) {
        circleRef.current.style.transform =
          `translate(${currentPos.current.x}px, ${currentPos.current.y}px) translate(-50%, -50%)`;
      }
      if (innerTextRef.current) {
        innerTextRef.current.style.transform =
          `translate(${-currentPos.current.x}px, ${-currentPos.current.y}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePos.current = { x, y };
    currentPos.current = { x, y };
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const circleSize = isHovered ? 160 : 0;

  return (
    <header>
      <div className="header-orb orb-one" />
      <div className="header-orb orb-two" />
      <div className="header-top-row"><div className="header-badge">♥ &nbsp;{heroEyebrow} · {days} ngày</div><ThemePicker /></div>
      <div className="header-hearts">· · ·</div>

      {/* MagneticText — title */}
      <div
        ref={containerRef}
        className="mc-container"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Base text */}
        <h1 className="mc-base-text">{heroTitle}</h1>

        {/* Morphing circle with hover text */}
        <div
          ref={circleRef}
          className="mc-circle"
          style={{
            width:  circleSize,
            height: circleSize,
            transition: 'width 0.5s cubic-bezier(0.33,1,0.68,1), height 0.5s cubic-bezier(0.33,1,0.68,1)',
          }}
        >
          <div
            ref={innerTextRef}
            className="mc-inner"
            style={{ width: containerSize.w, height: containerSize.h }}
          >
            <div className="mc-hover-content">
              <span className="mc-days-big">{days}</span>
              <span className="mc-days-label">ngày ♥</span>
            </div>
          </div>
        </div>
      </div>

      <p>{heroSubtitle}</p>

      {globalNotice && (
        <div className="hero-notice">
          <span>✦</span>
          <strong>{globalNotice}</strong>
        </div>
      )}

      <div className="hero-mini-dashboard">
        <div><strong>{memoryCount}</strong><span>ảnh kỷ niệm</span></div>
        <div><strong>{videoCount}</strong><span>video</span></div>
        <div><strong>{days}</strong><span>ngày yêu</span></div>
      </div>

      <div className="bits-feature-strip" aria-label="React Bits inspired visual highlights">
        <span>Animated glass</span>
        <span>Magnetic title</span>
        <span>Live admin theme</span>
      </div>
    </header>
  );
}
