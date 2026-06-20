import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Memory, Tab, Video } from '../types';
import { BASE_URL } from '../App';

interface Props {
  memories: Memory[];
  videos: Video[];
  onOpenMemory: (m: Memory) => void;
  onOpenVideo: (src: string, title?: string) => void;
  onTabChange: (tab: Tab) => void;
}

type Result =
  | { type: 'memory'; key: string; title: string; subtitle: string; image?: string | null; memory: Memory }
  | { type: 'video'; key: string; title: string; subtitle: string; video: Video }
  | { type: 'tab'; key: string; title: string; subtitle: string; tab: Tab; emoji: string };

const searchableTabs: { tab: Tab; title: string; emoji: string; keywords: string }[] = [
  { tab: 'photos', title: 'Kỷ niệm', emoji: '📷', keywords: 'ảnh photos memories scrapbook story' },
  { tab: 'calendar', title: 'Calendar view', emoji: '📅', keywords: 'lịch tháng ngày' },
  { tab: 'mood', title: 'Mood tracker', emoji: '💬', keywords: 'mood cảm xúc hàng ngày' },
  { tab: 'music', title: 'Playlist kỷ niệm', emoji: '🎵', keywords: 'music nhạc spotify youtube' },
  { tab: 'timeline', title: 'Timeline', emoji: '🕰️', keywords: 'năm tháng dòng thời gian' },
  { tab: 'map', title: 'Love Map', emoji: '🗺️', keywords: 'map địa điểm location' },
  { tab: 'stats', title: 'Stats', emoji: '📊', keywords: 'thống kê chart' },
];

export function GlobalSearch({ memories, videos, onOpenMemory, onOpenVideo, onTabChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const tabResults = searchableTabs
      .filter(t => !q || `${t.title} ${t.keywords}`.toLowerCase().includes(q))
      .map(t => ({ type: 'tab' as const, key: `tab-${t.tab}`, title: `${t.emoji} ${t.title}`, subtitle: 'Mở tab', tab: t.tab, emoji: t.emoji }));
    if (!q) return tabResults.slice(0, 6);
    const memoryResults = memories
      .filter(m => [m.title, m.description, m.location, m.music, m.mood].some(v => (v || '').toLowerCase().includes(q)))
      .slice(0, 8)
      .map(m => ({ type: 'memory' as const, key: `memory-${m.id}`, title: m.title, subtitle: `Kỷ niệm · ${new Date(m.date).toLocaleDateString('vi-VN')}${m.location ? ` · ${m.location}` : ''}`, image: m.image, memory: m }));
    const videoResults = videos
      .filter(v => [v.title, v.description].some(x => (x || '').toLowerCase().includes(q)))
      .slice(0, 5)
      .map(v => ({ type: 'video' as const, key: `video-${v.id}`, title: v.title, subtitle: `Video · ${new Date(v.date).toLocaleDateString('vi-VN')}`, video: v }));
    return [...memoryResults, ...videoResults, ...tabResults].slice(0, 14);
  }, [query, memories, videos]);

  const selectResult = (result: Result) => {
    setOpen(false);
    setQuery('');
    if (result.type === 'memory') onOpenMemory(result.memory);
    if (result.type === 'video') {
      const src = result.video.url || (result.video.filename ? `${BASE_URL}/videos-file/${result.video.filename}` : '');
      if (src) onOpenVideo(src, result.video.title);
    }
    if (result.type === 'tab') onTabChange(result.tab);
  };

  return (
    <>
      <button className="global-search-trigger" onClick={() => setOpen(true)} title="Tìm nhanh Ctrl/Cmd+K">⌘K</button>
      {open && (
        <div className="global-search-overlay" onClick={() => setOpen(false)}>
          <div className="global-search-box" onClick={e => e.stopPropagation()}>
            <div className="global-search-input-row">
              <span>🔍</span>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm kỷ niệm, địa điểm, mô tả, nhạc..." />
              <kbd>Esc</kbd>
            </div>
            <div className="global-search-results">
              {results.length === 0 ? <div className="global-search-empty">Không tìm thấy kết quả phù hợp.</div> : results.map(result => (
                <button key={result.key} onClick={() => selectResult(result)}>
                  <span className="global-search-thumb">
                    {result.type === 'memory' && result.image ? <img src={result.image} alt={result.title} /> : result.type === 'video' ? '🎬' : result.type === 'tab' ? result.emoji : '💌'}
                  </span>
                  <span><b>{result.title}</b><small>{result.subtitle}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
