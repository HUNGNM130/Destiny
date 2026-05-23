import React, { useEffect, useRef, useState } from 'react';
import type { Memory } from '../types';
import { MOODS } from '../types';
import { API_URL, BASE_URL } from '../App';

interface Props {
  memories: Memory[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (m: Memory) => void;
  onDelete: (id: number) => void;
  onRefresh: (filters?: Record<string, string>) => void;
}

const TAPE_COLORS = ['rgba(255,230,140,0.8)','rgba(200,200,255,0.7)','rgba(255,200,200,0.8)','rgba(180,255,200,0.7)'];
const STICKERS: Record<string, string> = { happy:'🌸', sad:'🌧️', miss:'🌙', anniversary:'💌' };

function getInitialPos(item: Memory, index: number, cols: number, containerWidth: number) {
  if (item.pos_x != null) return { x: item.pos_x!, y: item.pos_y!, rotate: item.pos_rotate! };
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
  const dragStateRef = useRef<{
    card: HTMLElement; id: string; startX: number; startY: number;
    origX: number; origY: number; moved: boolean;
  } | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'day' | 'range'>('day');
  const [searchDate, setSearchDate] = useState('');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const cols = Math.max(1, Math.floor((containerWidth - 40) / 240));

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

  const applySearch = () => {
    const filters: Record<string, string> = {};
    if (filterMode === 'day' && searchDate) filters.date = searchDate;
    if (filterMode === 'range') {
      if (searchFrom) filters.date_from = searchFrom;
      if (searchTo) filters.date_to = searchTo;
    }
    onRefresh(filters);
    setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchDate(''); setSearchFrom(''); setSearchTo('');
    onRefresh({});
  };

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;

    container.innerHTML = '';
    positionsRef.current = {};

    if (memories.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="big-heart">💌</span><h2>Chưa có kỷ niệm nào</h2><p>Hãy thêm khoảnh khắc đầu tiên của hai đứa nhé ♥</p></div>`;
      return;
    }

    const rows = Math.ceil(memories.length / cols);
    container.style.minHeight = (rows * 360 + 100) + 'px';

    memories.forEach((memory, index) => {
      const mood = memory.mood || 'happy';
      const moodCfg = MOODS[mood] || MOODS.happy;
      const pos = getInitialPos(memory, index, cols, containerWidth);
      positionsRef.current[String(memory.id)] = pos;

      const tapeColor = TAPE_COLORS[memory.id % TAPE_COLORS.length];
      const tapeAngle = -8 + (memory.id % 5) * 4;
      const sticker = STICKERS[mood] || '✨';

      const d = new Date(memory.date);
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const card = document.createElement('div');
      card.className = 'memory-card scrapbook-card';
      card.dataset.id = String(memory.id);
      card.style.cssText = `left:${pos.x}px;top:${pos.y}px;transform:rotate(${pos.rotate}deg);z-index:1;
        background:linear-gradient(135deg,#fff 60%,${moodCfg.color});
        border-top:3px solid ${moodCfg.accent};`;

      card.innerHTML = `
        <div class="tape-strip" style="background:${tapeColor};transform:rotate(${tapeAngle}deg) translateX(-50%);"></div>
        <div class="corner-sticker">${sticker}</div>
        ${memory.image
          ? `<div class="polaroid-frame"><img src="${memory.image}?t=${Date.now()}" alt="${memory.title}" loading="lazy"/><div class="polaroid-caption">${memory.title}</div></div>`
          : `<div class="no-photo-placeholder"><div style="font-size:3rem;">♥</div></div>`
        }
        <div class="card-body">
          <div class="card-title handwritten">${memory.title}</div>
          <div class="card-date">📅 ${dateStr}</div>
          ${memory.location ? `<div class="card-meta">📍 ${memory.location}</div>` : ''}
          ${memory.music    ? `<div class="card-meta">🎵 ${memory.music}</div>` : ''}
          ${memory.description ? `<div class="card-desc">${memory.description}</div>` : ''}
          <div class="card-actions">
            <button class="move-btn">📌 Di chuyển</button>
            <button class="edit-btn">✏️ Sửa</button>
            <button class="delete-btn">🗑 Xoá</button>
          </div>
        </div>`;

      const moveBtn   = card.querySelector('.move-btn')   as HTMLButtonElement;
      const editBtn   = card.querySelector('.edit-btn')   as HTMLButtonElement;
      const deleteBtn = card.querySelector('.delete-btn') as HTMLButtonElement;

      moveBtn.onclick   = () => enableMove(String(memory.id));
      editBtn.onclick   = () => onEdit(memory);
      deleteBtn.onclick = () => onDelete(memory.id);

      makeDraggable(card, String(memory.id));

      card.style.opacity = '0';
      card.style.transform = `rotate(${pos.rotate}deg) scale(0.7)`;
      container.appendChild(card);

      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        card.style.opacity = '1';
        card.style.transform = `rotate(${pos.rotate}deg) scale(1)`;
        setTimeout(() => {
          card.style.transition = '';
          card.style.transform  = `rotate(${pos.rotate}deg)`;
          card.style.zIndex = '1';
        }, 450);
      });
    });
  }, [memories, loading, cols]);

  return (
    <div id="pagePhotos">
      <div className="page-toolbar">
        <button className="btn-add" onClick={onAdd}>＋ Thêm khoảnh khắc</button>
        <button className="btn-search" onClick={() => setSearchOpen(v => !v)}>🔍 Tìm kiếm</button>
      </div>

      {searchOpen && (
        <div className="search-panel open">
          <div className="filter-mode-tabs">
            <button className={`mode-btn ${filterMode==='day'?'active':''}`} onClick={() => setFilterMode('day')}>Theo ngày</button>
            <button className={`mode-btn ${filterMode==='range'?'active':''}`} onClick={() => setFilterMode('range')}>Khoảng ngày</button>
          </div>
          {filterMode === 'day' && (
            <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="search-input" />
          )}
          {filterMode === 'range' && (
            <div className="range-row">
              <input type="date" value={searchFrom} onChange={e => setSearchFrom(e.target.value)} className="search-input" placeholder="Từ ngày" />
              <span>→</span>
              <input type="date" value={searchTo} onChange={e => setSearchTo(e.target.value)} className="search-input" placeholder="Đến ngày" />
            </div>
          )}
          <div className="search-actions">
            <button className="btn-apply" onClick={applySearch}>Tìm</button>
            <button className="btn-clear" onClick={clearSearch}>Xoá lọc</button>
          </div>
        </div>
      )}

      {loading && <div className="loading">đang tải những kỷ niệm... ♥</div>}
      <div id="memoryContainer" ref={containerRef} />
    </div>
  );
}