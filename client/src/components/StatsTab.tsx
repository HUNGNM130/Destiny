import React, { useMemo } from 'react';
import type { Memory, Video } from '../types';

interface Props { memories: Memory[]; videos: Video[]; onOpenMemory?: (m: Memory) => void; }

export function StatsTab({ memories, videos, onOpenMemory }: Props) {
  const stats = useMemo(() => {
    const byMonth = new Map<string, number>();
    const byLocation = new Map<string, number>();
    memories.forEach(m => {
      const d = new Date(m.date);
      const month = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      byMonth.set(month, (byMonth.get(month) || 0) + 1);
      if (m.location) byLocation.set(m.location, (byLocation.get(m.location) || 0) + 1);
    });
    const bestMonth = Array.from(byMonth.entries()).sort((a, b) => b[1] - a[1])[0];
    const bestPlace = Array.from(byLocation.entries()).sort((a, b) => b[1] - a[1])[0];
    const first = [...memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const withImage = memories.filter(m => m.image).length;
    return { bestMonth, bestPlace, first, withImage };
  }, [memories]);

  const recent = [...memories].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()).slice(0, 6);

  return (
    <div className="stats-page">
      <section className="feature-hero stats-hero">
        <span className="eyebrow">Love analytics</span>
        <h2>Thống kê tình yêu</h2>
        <p>Mấy con số vui để app có cảm giác sống động hơn.</p>
      </section>
      <div className="stats-big-grid">
        <div className="stat-tile"><b>{memories.length}</b><span>kỷ niệm</span></div>
        <div className="stat-tile"><b>{stats.withImage}</b><span>ảnh đang hiển thị</span></div>
        <div className="stat-tile"><b>{videos.length}</b><span>video</span></div>
        <div className="stat-tile"><b>{stats.bestMonth?.[0] || '—'}</b><span>tháng nhiều kỷ niệm nhất</span></div>
        <div className="stat-tile wide"><b>{stats.bestPlace?.[0] || 'Chưa có'}</b><span>địa điểm xuất hiện nhiều nhất</span></div>
        <div className="stat-tile wide"><b>{stats.first ? new Date(stats.first.date).toLocaleDateString('vi-VN') : '—'}</b><span>kỷ niệm đầu tiên</span></div>
      </div>
      <section className="recent-memory-panel">
        <h3>Vừa thêm gần đây</h3>
        <div className="recent-memory-grid">
          {recent.map(m => (
            <button key={m.id} onClick={() => onOpenMemory?.(m)}>
              {m.image ? <img src={m.image} alt={m.title} /> : <span>💌</span>}
              <b>{m.title}</b>
              <small>{new Date(m.date).toLocaleDateString('vi-VN')}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
