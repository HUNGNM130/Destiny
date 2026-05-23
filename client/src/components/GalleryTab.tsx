import React, { useEffect, useRef, useState } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; }

interface SpherePos { theta: number; phi: number; radius: number; }
interface WorldPos { x: number; y: number; z: number; scale: number; zIndex: number; isVisible: boolean; fadeOpacity: number; idx: number; }

const CFG = {
  containerSize: 420, sphereRadius: 175, dragSensitivity: 0.5,
  momentumDecay: 0.95, maxRotSpeed: 5, baseImageScale: 0.13,
  hoverScale: 1.25, perspective: 1000, autoRotate: true, autoRotateSpeed: 0.02,
};

function generatePositions(n: number): SpherePos[] {
  const golden = (1 + Math.sqrt(5)) / 2;
  const inc = 2 * Math.PI / golden;
  const pts: SpherePos[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let phi = Math.acos(1 - 2*t) * 180 / Math.PI;
    let theta = ((inc * i) * 180 / Math.PI) % 360;
    const poleBoost = (Math.abs(phi - 90) / 90) ** 0.6 * 35;
    phi = phi < 90 ? Math.max(5, phi - poleBoost) : Math.min(175, phi + poleBoost);
    phi = 15 + (phi / 180) * 150;
    theta = (theta + (Math.random() - 0.5) * 20 + 360) % 360;
    phi = Math.max(0, Math.min(180, phi + (Math.random() - 0.5) * 10));
    pts.push({ theta, phi, radius: CFG.sphereRadius });
  }
  return pts;
}

function toRad(d: number) { return d * Math.PI / 180; }
function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }

export function GalleryTab({ memories }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState<{ img: string; title: string; desc: string } | null>(null);

  const rotation   = useRef({ x: 15, y: 15 });
  const velocity   = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse  = useRef({ x: 0, y: 0 });
  const rafId      = useRef<number>();
  const positionsRef = useRef<SpherePos[]>([]);
  const nodesRef   = useRef<HTMLElement[]>([]);

  const imagesData = memories.filter(m => m.image).map(m => ({
    id: m.id, src: m.image!, alt: m.title, title: m.title, description: m.description || '',
  }));

  function calcWorldPositions(): WorldPos[] {
    const R = CFG.sphereRadius;
    const rotXRad = toRad(rotation.current.x);
    const rotYRad = toRad(rotation.current.y);
    const fadeStart = -10, fadeEnd = -30;

    return positionsRef.current.map((pos, idx) => {
      const tRad = toRad(pos.theta), pRad = toRad(pos.phi);
      let x = R * Math.sin(pRad) * Math.cos(tRad);
      let y = R * Math.cos(pRad);
      let z = R * Math.sin(pRad) * Math.sin(tRad);

      const x1 =  x * Math.cos(rotYRad) + z * Math.sin(rotYRad);
      const z1 = -x * Math.sin(rotYRad) + z * Math.cos(rotYRad);
      x = x1; z = z1;
      const y2 = y * Math.cos(rotXRad) - z * Math.sin(rotXRad);
      const z2 = y * Math.sin(rotXRad) + z * Math.cos(rotXRad);
      y = y2; z = z2;

      const fadeOpacity = z <= fadeStart ? Math.max(0, (z - fadeEnd) / (fadeStart - fadeEnd)) : 1;
      const distXY = Math.sqrt(x*x + y*y) / R;
      const isPole = pos.phi < 30 || pos.phi > 150;
      const centerScale = Math.max(0.3, 1 - distXY * (isPole ? 0.4 : 0.7));
      const depthScale = (z + R) / (2 * R);
      const scale = centerScale * Math.max(0.5, 0.8 + depthScale * 0.3);

      return { x, y, z, scale, zIndex: Math.round(1000 + z), isVisible: z > fadeEnd, fadeOpacity, idx };
    });
  }

  function renderFrame() {
    if (!isDragging.current && CFG.autoRotate) {
      rotation.current.y += CFG.autoRotateSpeed;
    }
    if (!isDragging.current) {
      rotation.current.x += velocity.current.x;
      rotation.current.y += velocity.current.y;
      velocity.current.x *= CFG.momentumDecay;
      velocity.current.y *= CFG.momentumDecay;
    }

    const baseSize = CFG.containerSize * CFG.baseImageScale;
    const worldPositions = calcWorldPositions();
    const nodes = nodesRef.current;

    worldPositions.forEach(wp => {
      const node = nodes[wp.idx];
      if (!node) return;
      if (!wp.isVisible) { node.style.opacity = '0'; return; }
      const size = baseSize * wp.scale;
      node.style.width  = size + 'px';
      node.style.height = size + 'px';
      node.style.left   = (CFG.containerSize/2 + wp.x - size/2) + 'px';
      node.style.top    = (CFG.containerSize/2 + wp.y - size/2) + 'px';
      node.style.zIndex = String(wp.zIndex);
      node.style.opacity = String(wp.fadeOpacity);
    });

    rafId.current = requestAnimationFrame(renderFrame);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || imagesData.length === 0) return;

    positionsRef.current = generatePositions(imagesData.length);
    container.innerHTML = '';
    nodesRef.current = [];

    const baseSize = CFG.containerSize * CFG.baseImageScale;

    imagesData.forEach((img, idx) => {
      const node = document.createElement('div');
      node.className = 'sphere-img-node';
      node.style.cssText = `position:absolute;width:${baseSize}px;height:${baseSize}px;border-radius:8px;overflow:hidden;cursor:pointer;transition:transform 0.2s;box-shadow:0 4px 15px rgba(0,0,0,0.2);`;

      const imgEl = document.createElement('img');
      imgEl.src = img.src; imgEl.alt = img.alt;
      imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;pointer-events:none;';
      node.appendChild(imgEl);

      node.addEventListener('mouseenter', () => { node.style.transform = `scale(${CFG.hoverScale})`; node.style.zIndex = '2000'; });
      node.addEventListener('mouseleave', () => { node.style.transform = ''; });
      node.addEventListener('click', () => setModal({ img: img.src, title: img.title, desc: img.description }));

      container.appendChild(node);
      nodesRef.current[idx] = node;
    });

    const onMouseDown = (e: MouseEvent) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; velocity.current = { x: 0, y: 0 }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      velocity.current = { x: clamp(-dy * CFG.dragSensitivity * 0.1, -CFG.maxRotSpeed, CFG.maxRotSpeed), y: clamp(dx * CFG.dragSensitivity * 0.1, -CFG.maxRotSpeed, CFG.maxRotSpeed) };
      rotation.current.x -= dy * CFG.dragSensitivity * 0.1;
      rotation.current.y += dx * CFG.dragSensitivity * 0.1;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging.current = false; };

    container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    rafId.current = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId.current!);
      container.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [imagesData.length]);

  return (
    <div id="pageGallery">
      <div className="gallery-hero">
        <h2 className="gallery-title">✨ Tập chính của chúng mình</h2>
        <p className="gallery-sub">Kéo để xoay • Click để xem ♥</p>
      </div>
      <div className="sphere-outer">
        <div
          ref={containerRef}
          className="sphere-container"
          style={{ width: CFG.containerSize, height: CFG.containerSize, perspective: CFG.perspective }}
        />
      </div>

      {modal && (
        <div className="sphere-modal-overlay" onClick={() => setModal(null)}>
          <div className="sphere-modal-card" onClick={e => e.stopPropagation()}>
            <button className="sphere-modal-close" onClick={() => setModal(null)}>✕</button>
            <img src={modal.img} alt={modal.title} />
            <div className="sphere-modal-body">
              <div className="sphere-modal-title">{modal.title}</div>
              <div className="sphere-modal-desc">{modal.desc}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}