import React, { useMemo, useState } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }

const urlRegex = /^https?:\/\//i;

function makeSearchUrl(kind: 'spotify' | 'youtube', query: string) {
  const q = encodeURIComponent(query);
  return kind === 'spotify' ? `https://open.spotify.com/search/${q}` : `https://www.youtube.com/results?search_query=${q}`;
}

export function MusicTab({ memories, onOpenMemory }: Props) {
  const [query, setQuery] = useState('');
  const tracks = useMemo(() => memories
    .filter(m => (m.music || '').trim())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [memories]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter(m => !q || [m.music, m.title, m.description, m.location].some(v => (v || '').toLowerCase().includes(q)));
  }, [tracks, query]);

  return (
    <div className="music-page">
      <section className="feature-hero music-hero">
        <span className="eyebrow">Memory playlist</span>
        <h2>Playlist kỷ niệm</h2>
        <p>Những bài hát đã gắn vào từng kỷ niệm được gom lại thành một góc nghe nhạc riêng.</p>
      </section>
      <div className="page-toolbar upgraded-toolbar">
        <label className="toolbar-search-wrap"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm bài hát, kỷ niệm, địa điểm..." /></label>
        <span className="toolbar-count">{filtered.length}/{tracks.length} bài hát</span>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state"><span className="big-heart">🎵</span><h2>Chưa có bài hát</h2><p>Thêm trường music khi tạo/sửa kỷ niệm để playlist hiện lên nhé.</p></div>
      ) : (
        <div className="music-grid">
          {filtered.map(memory => {
            const music = (memory.music || '').trim();
            const isUrl = urlRegex.test(music);
            return (
              <article key={memory.id} className="music-card">
                <button className="music-cover" onClick={() => onOpenMemory?.(memory)}>
                  {memory.image ? <img src={memory.image} alt={memory.title} /> : <span>♪</span>}
                </button>
                <div className="music-info">
                  <span className="eyebrow">{new Date(memory.date).toLocaleDateString('vi-VN')}</span>
                  <h3>{music}</h3>
                  <p>{memory.title}</p>
                  <div className="music-actions">
                    {isUrl ? <a className="btn-search" href={music} target="_blank" rel="noreferrer">↗ Mở link</a> : (
                      <>
                        <a className="btn-search" href={makeSearchUrl('spotify', music)} target="_blank" rel="noreferrer">Spotify</a>
                        <a className="btn-search" href={makeSearchUrl('youtube', music)} target="_blank" rel="noreferrer">YouTube</a>
                      </>
                    )}
                    <button className="btn-add" onClick={() => onOpenMemory?.(memory)}>Xem kỷ niệm</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
