import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Video } from '../types';
import { BASE_URL, VIDEO_API_URL } from '../App';

interface Props {
  videos: Video[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (v: Video) => void;
  onDelete: (id: number) => void;
  onPlay: (src: string, title?: string) => void;
}

function getInitialPos(item: Video, index: number, cols: number, containerWidth: number) {
  if (item.pos_x != null) return { x: item.pos_x!, y: item.pos_y!, rotate: item.pos_rotate! };
  const colWidth = Math.floor((containerWidth - 40) / cols);
  const c = index % cols, r = Math.floor(index / cols);
  const seed = (item.id || index) % 7;
  const offsetX = [-8,4,-5,9,-3,6,-7][seed];
  const offsetY = [5,-6,8,-4,7,-9,3][seed];
  const rotates = [-3.5,2.1,-1.8,4.2,-2.7,1.5,-4.0];
  return { x: 20 + c * colWidth + offsetX, y: 20 + r * 340 + offsetY, rotate: rotates[seed] };
}

export function VideosTab({ videos, loading, onAdd, onEdit, onDelete, onPlay }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Record<string, { x: number; y: number; rotate: number }>>({});
  const draggableRef = useRef<Set<string>>(new Set());
  const dragStateRef = useRef<{ card: HTMLElement; id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const cols = Math.max(1, Math.floor((containerWidth - 40) / 260));
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('love-diary-video-favorites') || '[]'); } catch { return []; }
  });
  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter(v => !q || [v.title, v.description].some(x => (x || '').toLowerCase().includes(q)));
  }, [videos, query]);

  useEffect(() => { localStorage.setItem('love-diary-video-favorites', JSON.stringify(favorites)); }, [favorites]);

  const toggleFavorite = (id: number) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const playRandom = () => {
    const pool = filteredVideos.length ? filteredVideos : videos;
    if (!pool.length) return;
    const video = pool[Math.floor(Math.random() * pool.length)];
    const src = video.url || (video.filename ? `${BASE_URL}/videos-file/${video.filename}` : '');
    if (src) onPlay(src, video.title);
  };

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const savePosition = async (id: string) => {
    const p = positionsRef.current[id];
    if (!p) return;
    try {
      await fetch(`${VIDEO_API_URL}/${id}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: p.x, y: p.y, rotate: p.rotate }),
      });
    } catch { /* noop */ }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX, dy = e.clientY - ds.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ds.moved = true;
      positionsRef.current[ds.id].x = ds.origX + dx;
      positionsRef.current[ds.id].y = ds.origY + dy;
      ds.card.style.left = positionsRef.current[ds.id].x + 'px';
      ds.card.style.top  = positionsRef.current[ds.id].y + 'px';
    };
    const onMouseUp = () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      ds.card.classList.remove('dragging');
      const p = positionsRef.current[ds.id];
      ds.card.style.transform = `rotate(${p.rotate}deg)`;
      if (ds.moved) savePosition(ds.id);
      dragStateRef.current = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const enableMove = (id: string) => {
    draggableRef.current.add(id);
    const card = containerRef.current?.querySelector(`.video-card[data-id="${id}"]`) as HTMLElement;
    if (!card) return;
    card.classList.add('move-mode');
    const btn = card.querySelector('.move-btn') as HTMLButtonElement;
    if (btn) { btn.textContent = '✅ Xong'; btn.onclick = () => disableMove(id); }
  };

  const disableMove = (id: string) => {
    draggableRef.current.delete(id);
    const card = containerRef.current?.querySelector(`.video-card[data-id="${id}"]`) as HTMLElement;
    if (!card) return;
    card.classList.remove('move-mode');
    card.style.zIndex = '1';
    const btn = card.querySelector('.move-btn') as HTMLButtonElement;
    if (btn) { btn.textContent = '📌 Di chuyển'; btn.onclick = () => enableMove(id); }
    savePosition(id);
  };

  const makeDraggable = (card: HTMLElement, id: string) => {
    card.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      if (!draggableRef.current.has(id)) return;
      e.preventDefault();
      containerRef.current?.querySelectorAll('.video-card').forEach(c => (c as HTMLElement).style.zIndex = '1');
      card.style.zIndex = '100';
      card.classList.add('dragging');
      const p = positionsRef.current[id];
      dragStateRef.current = { card, id, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y, moved: false };
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;
    container.innerHTML = '';
    positionsRef.current = {};

    if (filteredVideos.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="big-heart">🎬</span><h2>Chưa có video nào</h2><p>Hãy thêm video đầu tiên của hai đứa nhé ♥</p></div>`;
      return;
    }

    container.style.minHeight = (Math.ceil(filteredVideos.length / cols) * 360 + 100) + 'px';

    filteredVideos.forEach((video, index) => {
      const pos = getInitialPos(video, index, cols, containerWidth);
      positionsRef.current[String(video.id)] = pos;

      const videoSrc = video.url || (video.filename ? `${BASE_URL}/videos-file/${video.filename}` : '');
      const d = new Date(video.date);
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const card = document.createElement('div');
      card.className = 'video-card';
      card.dataset.id = String(video.id);
      card.style.cssText = `left:${pos.x}px;top:${pos.y}px;transform:rotate(${pos.rotate}deg);z-index:1;`;

      card.innerHTML = `
        <button class="fav-btn ${favorites.includes(video.id) ? 'active' : ''}" title="Yêu thích video">${favorites.includes(video.id) ? '♥' : '♡'}</button>
        <div class="video-thumb">
          <video src="${videoSrc}" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>
          <div class="video-play-icon">▶️</div>
        </div>
        <div class="card-body">
          <div class="card-title">${video.title}</div>
          <div class="card-date">📅 ${dateStr}</div>
          ${video.description ? `<div class="card-desc">${video.description}</div>` : ''}
          <div class="card-actions">
            <button class="play-btn">▶ Xem</button>
            <button class="move-btn">📌 Di chuyển</button>
            <button class="edit-btn">✏️</button>
            <button class="delete-btn">🗑</button>
          </div>
        </div>`;

      (card.querySelector('.fav-btn') as HTMLButtonElement).onclick = () => toggleFavorite(video.id);
      (card.querySelector('.play-btn') as HTMLButtonElement).onclick = () => onPlay(videoSrc, video.title);
      (card.querySelector('.move-btn') as HTMLButtonElement).onclick = () => enableMove(String(video.id));
      (card.querySelector('.edit-btn') as HTMLButtonElement).onclick = () => onEdit(video);
      (card.querySelector('.delete-btn') as HTMLButtonElement).onclick = () => onDelete(video.id);

      makeDraggable(card, String(video.id));

      card.style.opacity = '0';
      container.appendChild(card);
      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.4s ease';
        card.style.opacity = '1';
        setTimeout(() => card.style.transition = '', 450);
      });
    });
  }, [filteredVideos, loading, cols, favorites, containerWidth]);

  return (
    <div id="pageVideos">
      <section className="feature-hero cinema-hero">
        <span className="eyebrow">Cinema room</span>
        <h2>Rạp chiếu kỷ niệm</h2>
        <p>Tìm video, mở ngẫu nhiên một clip và đánh dấu video yêu thích.</p>
      </section>
      <div className="page-toolbar upgraded-toolbar">
        <button className="btn-add" onClick={onAdd}>＋ Thêm video</button>
        <button className="btn-search" onClick={playRandom}>🎲 Xem random</button>
        <label className="toolbar-search-wrap"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm video..." /></label>
        <span className="toolbar-count">{filteredVideos.length}/{videos.length} video</span>
      </div>
      {loading ? (
        <div className="skeleton-grid" aria-label="Đang tải video">
          {Array.from({ length: 4 }).map((_, i) => <div className="skeleton-card" key={i}><span /><b /><p /><p /></div>)}
        </div>
      ) : <div id="videoContainer" ref={containerRef} />}
    </div>
  );
}
