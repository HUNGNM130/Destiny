import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Memory } from '../types';
import { API_URL } from '../App';

interface Props {
  memories: Memory[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (m: Memory) => void;
  onDelete: (id: number) => void;
  onRefresh: (filters?: Record<string, string>) => void;
}

type SortMode = 'newest' | 'oldest' | 'title';
type ViewMode = 'scrapbook' | 'grid';

const TAPE_COLORS = ['rgba(255,230,140,0.8)','rgba(200,200,255,0.7)','rgba(255,200,200,0.8)','rgba(180,255,200,0.7)'];
const STICKERS = ['🌸', '💌', '✨', '🌙', '🫶', '🎀'];
const STORAGE_KEY = 'love-diary-favorites-v2';

function escapeHTML(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[ch] || ch));
}

function getInitialPos(item: Memory, index: number, cols: number, containerWidth: number) {
  if (item.pos_x != null && item.pos_y != null) {
    return { x: item.pos_x!, y: item.pos_y!, rotate: item.pos_rotate ?? 0 };
  }
  const colWidth = Math.floor((containerWidth - 40) / cols);
  const c = index % cols, r = Math.floor(index / cols);
  const seed = (item.id || index) % 7;
  const offsetX = [-8,4,-5,9,-3,6,-7][seed];
  const offsetY = [5,-6,8,-4,7,-9,3][seed];
  const rotates = [-3.5,2.1,-1.8,4.2,-2.7,1.5,-4.0];
  return { x: 20 + c * colWidth + offsetX, y: 20 + r * 340 + offsetY, rotate: rotates[seed] };
}

export function PhotosTab({ memories, loading, onAdd, onEdit, onDelete, onRefresh }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Record<string, { x: number; y: number; rotate: number }>>({});
  const draggableRef = useRef<Set<string>>(new Set());
  const dragStateRef = useRef<{ card: HTMLElement; id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean; } | null>(null);

  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('scrapbook');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [viewer, setViewer] = useState<Memory | null>(null);
  const [slideshow, setSlideshow] = useState(false);

  const cols = Math.max(1, Math.floor((containerWidth - 40) / (viewMode === 'grid' ? 250 : 240)));
  const colsRef = useRef(cols);
  colsRef.current = cols;

  const filteredMemories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memories
      .filter(m => !onlyFavorites || favorites.includes(m.id))
      .filter(m => !q || [m.title, m.description, m.location, m.music].some(v => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sortMode === 'title') return a.title.localeCompare(b.title, 'vi');
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortMode === 'newest' ? db - da : da - db;
      });
  }, [memories, query, sortMode, onlyFavorites, favorites]);

  const stats = useMemo(() => {
    const withImage = memories.filter(m => m.image).length;
    const fav = memories.filter(m => favorites.includes(m.id)).length;
    const latest = memories[0]?.date ? new Date(memories[0].date).toLocaleDateString('vi-VN') : '—';
    return { total: memories.length, withImage, fav, latest };
  }, [memories, favorites]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)); }, [favorites]);

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
      await fetch(`${API_URL}/${id}/position`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
    const card = containerRef.current?.querySelector(`.memory-card[data-id="${id}"]`) as HTMLElement;
    if (!card) return;
    card.classList.add('move-mode');
    const btn = card.querySelector('.move-btn') as HTMLButtonElement;
    if (btn) { btn.textContent = '✅ Xong'; btn.onclick = () => disableMove(id); }
  };

  const disableMove = (id: string) => {
    draggableRef.current.delete(id);
    const card = containerRef.current?.querySelector(`.memory-card[data-id="${id}"]`) as HTMLElement;
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
      containerRef.current?.querySelectorAll('.memory-card').forEach(c => (c as HTMLElement).style.zIndex = '1');
      card.style.zIndex = '100';
      card.classList.add('dragging');
      const p = positionsRef.current[id];
      dragStateRef.current = { card, id, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y, moved: false };
    });
  };

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const surpriseMe = () => {
    if (!filteredMemories.length) return;
    const random = filteredMemories[Math.floor(Math.random() * filteredMemories.length)];
    setSlideshow(false);
    setViewer(random);
  };

  const startSlideshow = () => {
    const withImage = filteredMemories.filter(m => m.image);
    if (!withImage.length) return;
    setViewer(withImage[0]);
    setSlideshow(true);
  };

  const goViewer = (step: number) => {
    if (!viewer) return;
    const withImage = filteredMemories.filter(m => m.image);
    const idx = Math.max(0, withImage.findIndex(m => m.id === viewer.id));
    const next = withImage[(idx + step + withImage.length) % withImage.length];
    if (next) setViewer(next);
  };

  useEffect(() => {
    if (!slideshow || !viewer) return;
    const timer = window.setInterval(() => goViewer(1), 3500);
    return () => window.clearInterval(timer);
  }, [slideshow, viewer, filteredMemories]);

  const shareMemory = async (memory: Memory) => {
    const url = `${window.location.origin}${window.location.pathname}?memory=${memory.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Đã copy link kỷ niệm 💌');
    } catch {
      window.prompt('Copy link kỷ niệm:', url);
    }
  };

  const exportMemories = () => {
    const blob = new Blob([JSON.stringify(memories, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `love-diary-memories-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('memory'));
    if (!id || !memories.length || viewer) return;
    const found = memories.find(m => m.id === id);
    if (found) setViewer(found);
  }, [memories, viewer]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;

    container.innerHTML = '';
    positionsRef.current = {};
    container.classList.toggle('grid-view', viewMode === 'grid');
    container.classList.toggle('scrapbook-view', viewMode === 'scrapbook');

    if (filteredMemories.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="big-heart">💌</span><h2>Không tìm thấy kỷ niệm</h2><p>Thử đổi bộ lọc hoặc thêm khoảnh khắc mới nhé ♥</p></div>`;
      return;
    }

    const rows = Math.ceil(filteredMemories.length / cols);
    container.style.minHeight = viewMode === 'grid' ? 'auto' : (rows * 380 + 100) + 'px';

    filteredMemories.forEach((memory, index) => {
      const pos = getInitialPos(memory, index, colsRef.current, containerWidth);
      positionsRef.current[String(memory.id)] = pos;

      const tapeColor = TAPE_COLORS[memory.id % TAPE_COLORS.length];
      const tapeAngle = -8 + (memory.id % 5) * 4;
      const sticker = STICKERS[memory.id % STICKERS.length] || '✨';
      const isFav = favorites.includes(memory.id);
      const d = new Date(memory.date);
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const card = document.createElement('div');
      card.className = `memory-card scrapbook-card ${isFav ? 'is-favorite' : ''}`;
      card.dataset.id = String(memory.id);
      if (viewMode === 'scrapbook') {
        card.style.cssText = `left:${pos.x}px;top:${pos.y}px;transform:rotate(${pos.rotate}deg);z-index:1;`;
      } else {
        card.style.cssText = '';
      }

      card.innerHTML = `
        <button class="fav-btn ${isFav ? 'active' : ''}" title="Yêu thích">${isFav ? '♥' : '♡'}</button>
        <div class="tape-strip" style="background:${tapeColor};transform:rotate(${tapeAngle}deg) translateX(-50%);"></div>
        <div class="corner-sticker">${sticker}</div>
        ${memory.image
          ? `<button class="open-photo-btn" title="Xem lớn"><div class="polaroid-frame"><img src="${escapeHTML(memory.image)}?t=${Date.now()}" alt="${escapeHTML(memory.title)}" loading="lazy"/><div class="polaroid-caption">${escapeHTML(memory.title)}</div></div></button>`
          : `<div class="no-photo-placeholder"><div style="font-size:3rem;">♥</div></div>`
        }
        <div class="card-body">
          <div class="card-title handwritten">${escapeHTML(memory.title)}</div>
          <div class="card-date">📅 ${dateStr}</div>
          ${memory.location ? `<div class="card-meta">📍 ${escapeHTML(memory.location)}</div>` : ''}
          ${memory.music    ? `<div class="card-meta">🎵 ${escapeHTML(memory.music)}</div>` : ''}
          ${memory.description ? `<div class="card-desc">${escapeHTML(memory.description)}</div>` : ''}
          <div class="card-actions">
            <button class="move-btn">📌 Di chuyển</button>
            <button class="edit-btn">✏️ Sửa</button>
            <button class="delete-btn">🗑 Xoá</button>
          </div>
        </div>`;

      (card.querySelector('.fav-btn') as HTMLButtonElement).onclick = () => toggleFavorite(memory.id);
      const openBtn = card.querySelector('.open-photo-btn') as HTMLButtonElement | null;
      if (openBtn) openBtn.onclick = () => setViewer(memory);
      (card.querySelector('.move-btn') as HTMLButtonElement).onclick = () => enableMove(String(memory.id));
      (card.querySelector('.edit-btn') as HTMLButtonElement).onclick = () => onEdit(memory);
      (card.querySelector('.delete-btn') as HTMLButtonElement).onclick = () => onDelete(memory.id);

      makeDraggable(card, String(memory.id));

      card.style.opacity = '0';
      if (viewMode === 'scrapbook') card.style.transform = `rotate(${pos.rotate}deg) scale(0.7)`;
      container.appendChild(card);

      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.45s ease, transform 0.48s cubic-bezier(0.34,1.56,0.64,1)';
        card.style.opacity = '1';
        if (viewMode === 'scrapbook') card.style.transform = `rotate(${pos.rotate}deg) scale(1)`;
        setTimeout(() => {
          card.style.transition = '';
          if (viewMode === 'scrapbook') card.style.transform  = `rotate(${pos.rotate}deg)`;
          card.style.zIndex = '1';
        }, 500);
      });
    });
  }, [filteredMemories, loading, viewMode, favorites, containerWidth]);

  return (
    <div id="pagePhotos">
      <section className="memory-command-center">
        <div className="memory-command-copy">
          <span className="eyebrow">Memory studio</span>
          <h2>Kỷ niệm của hai đứa</h2>
          <p>Tìm nhanh, đánh dấu yêu thích, trình chiếu ảnh và mở ảnh lớn như một album nhỏ.</p>
        </div>
        <div className="memory-stats-grid">
          <div className="memory-stat"><b>{stats.total}</b><span>kỷ niệm</span></div>
          <div className="memory-stat"><b>{stats.withImage}</b><span>có ảnh</span></div>
          <div className="memory-stat"><b>{stats.fav}</b><span>yêu thích</span></div>
          <div className="memory-stat"><b>{stats.latest}</b><span>mới nhất</span></div>
        </div>
      </section>

      <div className="page-toolbar upgraded-toolbar">
        <button className="btn-add" onClick={onAdd}>＋ Thêm khoảnh khắc</button>
        <button className="btn-search" onClick={() => onRefresh()}>↻ Làm mới</button>
        <button className="btn-search" onClick={surpriseMe}>🎲 Bất ngờ</button>
        <button className="btn-search" onClick={startSlideshow}>🎞️ Trình chiếu</button>
        <button className="btn-search" onClick={exportMemories}>⬇️ Xuất JSON</button>
        <label className="toolbar-search-wrap">
          <span>⌕</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên, nơi chốn, lời nhắn..." />
        </label>
        <select className="toolbar-select" value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="title">Theo tên</option>
        </select>
        <button className={`chip-toggle ${onlyFavorites ? 'active' : ''}`} onClick={() => setOnlyFavorites(v => !v)}>♥ Yêu thích</button>
        <button className={`chip-toggle ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode(v => v === 'scrapbook' ? 'grid' : 'scrapbook')}>{viewMode === 'grid' ? 'Lưới gọn' : 'Scrapbook'}</button>
      </div>

      {loading && <div className="loading">đang tải những kỷ niệm... ♥</div>}
      <div id="memoryContainer" ref={containerRef} />

      {viewer && (
        <div className="memory-lightbox" onClick={() => { setViewer(null); setSlideshow(false); }}>
          <div className="memory-lightbox-card" onClick={e => e.stopPropagation()}>
            <button className="memory-lightbox-close" onClick={() => { setViewer(null); setSlideshow(false); }}>✕</button>
            <button className="memory-lightbox-nav prev" onClick={() => { setSlideshow(false); goViewer(-1); }}>‹</button>
            <button className="memory-lightbox-nav next" onClick={() => { setSlideshow(false); goViewer(1); }}>›</button>
            {viewer.image && <img src={viewer.image} alt={viewer.title} />}
            <div className="memory-lightbox-body">
              <span className="eyebrow">{new Date(viewer.date).toLocaleDateString('vi-VN')}</span>
              <h3>{viewer.title}</h3>
              {viewer.description && <p>{viewer.description}</p>}
              <div className="lightbox-actions">
                <button className="btn-search" onClick={() => setSlideshow(v => !v)}>{slideshow ? '⏸ Dừng trình chiếu' : '▶ Trình chiếu'}</button>
                <button className="btn-search" onClick={() => toggleFavorite(viewer.id)}>{favorites.includes(viewer.id) ? '♥ Bỏ yêu thích' : '♡ Lưu yêu thích'}</button>
                <button className="btn-search" onClick={() => shareMemory(viewer)}>🔗 Copy link</button>
                <button className="btn-add" onClick={() => { setViewer(null); onEdit(viewer); }}>✏️ Chỉnh sửa</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
