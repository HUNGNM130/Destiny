import React, { useMemo, useState } from 'react';
import type { Memory } from '../types';
import { resolveAppUrl, youtubeEmbed } from '../utils/memoryFeatures';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }

const urlRegex = /^https?:\/\//i;
function makeSearchUrl(kind: 'spotify' | 'youtube', query: string) {
  const q = encodeURIComponent(query);
  return kind === 'spotify' ? `https://open.spotify.com/search/${q}` : `https://www.youtube.com/results?search_query=${q}`;
}

export function MusicTab({ memories, onOpenMemory }: Props) {
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState<Memory | null>(null);
  const tracks = useMemo(() => memories.filter(m => (m.music || m.music_url || '').trim()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [memories]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter(m => !q || [m.music, m.music_url, m.title, m.description, m.location, m.place_name].some(v => (v || '').toLowerCase().includes(q)));
  }, [tracks, query]);

  const renderPlayer = (memory: Memory) => {
    const url = memory.music_url || memory.music || '';
    const embed = youtubeEmbed(url);
    if (memory.music_kind === 'mp3' || url.includes('/api/music-files/')) return <audio controls src={resolveAppUrl(url)} />;
    if (embed) return <iframe title="YouTube player" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
    if (urlRegex.test(url)) return <a className="btn-add" href={url} target="_blank" rel="noreferrer">↗ Mở bài hát</a>;
    return <div className="music-search-links"><a className="btn-search" href={makeSearchUrl('spotify', url)} target="_blank" rel="noreferrer">Spotify</a><a className="btn-search" href={makeSearchUrl('youtube', url)} target="_blank" rel="noreferrer">YouTube</a></div>;
  };

  return (
    <div className="music-page">
      <section className="feature-hero music-hero">
        <span className="eyebrow">Memory playlist</span>
        <h2>Playlist kỷ niệm</h2>
        <p>Nhạc có thể là link YouTube/Spotify hoặc file MP3 lưu trong PostgreSQL, không mất khi redeploy.</p>
      </section>
      <div className="page-toolbar upgraded-toolbar">
        <label className="toolbar-search-wrap"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm bài hát, kỷ niệm, địa điểm..." /></label>
        <span className="toolbar-count">{filtered.length}/{tracks.length} bài hát</span>
      </div>

      {tracks.length === 0 ? <div className="empty-state"><span className="big-heart">🎵</span><h2>Chưa có bài hát</h2><p>Thêm link YouTube hoặc upload MP3 khi tạo/sửa kỷ niệm để playlist hiện lên nhé.</p></div> : (
        <div className="music-grid">
          {filtered.map(memory => {
            const title = (memory.music || memory.music_url || '').trim();
            const isMp3 = memory.music_kind === 'mp3' || (memory.music_url || '').includes('/api/music-files/');
            const isYoutube = youtubeEmbed(memory.music_url || memory.music || '') !== '';
            return (
              <article key={memory.id} className="music-card">
                <button className="music-cover" onClick={() => onOpenMemory?.(memory)}>{memory.image ? <img src={memory.image} alt={memory.title} /> : <span>{isMp3 ? '🎧' : '♪'}</span>}</button>
                <div className="music-info">
                  <span className="eyebrow">{new Date(memory.date).toLocaleDateString('vi-VN')} · {isMp3 ? 'MP3 trong DB' : isYoutube ? 'YouTube' : 'Link/Search'}</span>
                  <h3>{title}</h3>
                  <p>{memory.title}</p>
                  <div className="music-actions">
                    <button className="btn-add" onClick={() => setPlaying(memory)}>▶ Nghe</button>
                    <button className="btn-search" onClick={() => onOpenMemory?.(memory)}>Xem kỷ niệm</button>
                  </div>
                  {playing?.id === memory.id && <div className="inline-music-player">{renderPlayer(memory)}</div>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
