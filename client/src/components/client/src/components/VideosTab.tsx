import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Video } from '../types';
import { BASE_URL } from '../App';

interface Props {
  videos: Video[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (v: Video) => void;
  onDelete: (id: number) => void;
  onPlay: (src: string, title?: string) => void;
}

type SortMode = 'newest' | 'oldest' | 'title';
type ViewMode = 'story' | 'grid';

const STORAGE_KEY = 'love-diary-video-favorites-v2';

function videoSrc(video: Video) {
  return video.url || (video.filename ? `${BASE_URL}/videos-file/${video.filename}` : '');
}

export function VideosTab({ videos, loading, onAdd, onEdit, onDelete, onPlay }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('story');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos
      .filter(v => !onlyFavorites || favorites.includes(v.id))
      .filter(v => !q || [v.title, v.description].some(x => (x || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sortMode === 'title') return a.title.localeCompare(b.title, 'vi');
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortMode === 'newest' ? db - da : da - db;
      });
  }, [videos, query, sortMode, onlyFavorites, favorites]);

  const visibleVideos = useMemo(() => filteredVideos.slice(0, visibleCount), [filteredVideos, visibleCount]);
  const hasMoreVideos = visibleCount < filteredVideos.length;

  useEffect(() => {
    setVisibleCount(20);
  }, [query, sortMode, onlyFavorites, viewMode]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleCount(count => Math.min(count + 20, filteredVideos.length));
      }
    }, { rootMargin: '500px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredVideos.length]);

  const stats = useMemo(() => {
    const fav = videos.filter(v => favorites.includes(v.id)).length;
    const latest = videos[0]?.date ? new Date(videos[0].date).toLocaleDateString('vi-VN') : '—';
    return { total: videos.length, fav, latest, showing: filteredVideos.length };
  }, [videos, filteredVideos.length, favorites]);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const playVideo = (video: Video) => {
    const src = videoSrc(video);
    if (src) onPlay(src, video.title);
  };

  const playRandom = () => {
    const pool = filteredVideos.length ? filteredVideos : videos;
    if (!pool.length) return;
    playVideo(pool[Math.floor(Math.random() * pool.length)]);
  };

  const dateLabel = (date: string) => new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <div id="pageVideos">
      <section className="memory-command-center video-command-center">
        <div className="memory-command-copy">
          <span className="eyebrow">Video story studio</span>
          <h2>Thước phim của hai đứa</h2>
          <p>Tab video giờ cuộn kiểu story giống tab ảnh, có nút Xem rõ ràng trên từng video.</p>
        </div>
        <div className="memory-stats-grid">
          <div className="memory-stat"><b>{stats.total}</b><span>video</span></div>
          <div className="memory-stat"><b>{stats.showing}</b><span>đang hiện</span></div>
          <div className="memory-stat"><b>{stats.fav}</b><span>yêu thích</span></div>
          <div className="memory-stat"><b>{stats.latest}</b><span>mới nhất</span></div>
        </div>
      </section>

      <div className="page-toolbar upgraded-toolbar">
        <button className="btn-add" onClick={onAdd}>＋ Thêm video</button>
        <button className="btn-search" onClick={playRandom}>🎲 Xem random</button>
        <label className="toolbar-search-wrap">
          <span>⌕</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc mô tả..." />
        </label>
        <select className="toolbar-select" value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="title">Theo tên</option>
        </select>
        <button className={`chip-toggle ${onlyFavorites ? 'active' : ''}`} onClick={() => setOnlyFavorites(v => !v)}>♥ Yêu thích</button>
        <button className={`chip-toggle ${viewMode === 'story' ? 'active' : ''}`} onClick={() => setViewMode('story')}>🌊 Story</button>
        <button className={`chip-toggle ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Lưới gọn</button>
      </div>

      {loading ? (
        <div className="skeleton-grid" aria-label="Đang tải video">
          {Array.from({ length: 6 }).map((_, i) => <div className="skeleton-card" key={i}><span /><b /><p /><p /></div>)}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="empty-state"><span className="big-heart">🎬</span><h2>Chưa có video phù hợp</h2><p>Thử đổi bộ lọc hoặc thêm video mới nhé ♥</p></div>
      ) : (
        <>
          {viewMode === 'story' ? (
            <div className="story-feed video-story-feed">
              {visibleVideos.map((video, index) => {
                const src = videoSrc(video);
                const isFav = favorites.includes(video.id);
                return (
                  <article key={video.id} className={`story-memory-card story-video-card ${index % 2 ? 'reverse' : ''}`} style={{ ['--story-depth' as string]: `${(index % 5) - 2}` }}>
                    <button className="story-photo-panel story-video-panel" onClick={() => playVideo(video)} disabled={!src}>
                      {src ? <video src={src} muted preload="metadata" playsInline /> : <span className="story-no-photo">🎬</span>}
                      <span className="story-video-play">▶ Xem</span>
                    </button>
                    <div className="story-copy-panel">
                      <span className="eyebrow">Tập {index + 1} · {dateLabel(video.date)}</span>
                      <h3>{video.title}</h3>
                      {video.description && <p>{video.description}</p>}
                      <div className="story-actions">
                        <button className="btn-add" onClick={() => playVideo(video)} disabled={!src}>▶ Xem video</button>
                        <button className="btn-search" onClick={() => toggleFavorite(video.id)}>{isFav ? '♥ Đã yêu thích' : '♡ Yêu thích'}</button>
                        <button className="btn-search" onClick={() => onEdit(video)}>✏️ Sửa</button>
                        <button className="btn-search danger" onClick={() => onDelete(video.id)}>🗑 Xoá</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="video-album-grid">
              {visibleVideos.map(video => {
                const src = videoSrc(video);
                const isFav = favorites.includes(video.id);
                return (
                  <article key={video.id} className={`video-album-card ${isFav ? 'is-favorite' : ''}`}>
                    <button className="fav-btn active-safe" onClick={() => toggleFavorite(video.id)} title="Yêu thích video">{isFav ? '♥' : '♡'}</button>
                    <button className="video-album-thumb" onClick={() => playVideo(video)} disabled={!src}>
                      {src ? <video src={src} muted preload="metadata" playsInline /> : <span>🎬</span>}
                      <em>▶ Xem</em>
                    </button>
                    <div className="card-body">
                      <div className="card-title">{video.title}</div>
                      <div className="card-date">📅 {dateLabel(video.date)}</div>
                      {video.description && <div className="card-desc">{video.description}</div>}
                      <div className="card-actions">
                        <button className="play-btn" onClick={() => playVideo(video)} disabled={!src}>▶ Xem</button>
                        <button className="edit-btn" onClick={() => onEdit(video)}>✏️</button>
                        <button className="delete-btn" onClick={() => onDelete(video.id)}>🗑</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <div ref={sentinelRef} className="infinite-sentinel">
            {hasMoreVideos ? 'Đang mở thêm video...' : 'Đã xem hết video rồi ♥'}
          </div>
        </>
      )}
    </div>
  );
}
