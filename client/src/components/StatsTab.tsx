import React, { useEffect, useMemo, useState } from 'react';
import type { Memory, Video } from '../types';
import { getMoodScore, loadMoodEntries, type MoodEntry } from '../utils/moodStore';

interface Props { memories: Memory[]; videos: Video[]; onOpenMemory?: (m: Memory) => void; }

function monthLabel(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function StatsTab({ memories, videos, onOpenMemory }: Props) {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(() => loadMoodEntries());

  useEffect(() => {
    const update = () => setMoodEntries(loadMoodEntries());
    window.addEventListener('storage', update);
    window.addEventListener('love-diary:moods-updated', update as EventListener);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('love-diary:moods-updated', update as EventListener);
    };
  }, []);

  const stats = useMemo(() => {
    const byMonth = new Map<string, number>();
    const byLocation = new Map<string, number>();
    memories.forEach(m => {
      const d = new Date(m.date);
      const month = monthLabel(d);
      byMonth.set(month, (byMonth.get(month) || 0) + 1);
      if (m.location) byLocation.set(m.location, (byLocation.get(m.location) || 0) + 1);
    });
    const bestMonth = Array.from(byMonth.entries()).sort((a, b) => b[1] - a[1])[0];
    const bestPlace = Array.from(byLocation.entries()).sort((a, b) => b[1] - a[1])[0];
    const first = [...memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const withImage = memories.filter(m => m.image).length;
    const weatherMemories = memories.filter(m => m.weather_summary);
    const sunny = weatherMemories.filter(m => /quang|mây|nắng|ít mây/i.test(m.weather_summary || '')).length;
    const sunnyPct = weatherMemories.length ? Math.round((sunny / weatherMemories.length) * 100) : 0;
    const byWeather = new Map<string, number>();
    weatherMemories.forEach(m => byWeather.set(`${m.weather_icon || '🌦️'} ${m.weather_summary}`, (byWeather.get(`${m.weather_icon || '🌦️'} ${m.weather_summary}`) || 0) + 1));
    const topWeather = Array.from(byWeather.entries()).sort((a, b) => b[1] - a[1])[0];
    return { bestMonth, bestPlace, first, withImage, weatherMemories, sunnyPct, topWeather };
  }, [memories]);

  const monthlyBars = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(monthLabel(d), 0);
    }
    memories.forEach(memory => {
      const label = monthLabel(new Date(memory.date));
      if (map.has(label)) map.set(label, (map.get(label) || 0) + 1);
    });
    const values = Array.from(map.entries()).map(([label, count]) => ({ label, count }));
    const max = Math.max(1, ...values.map(v => v.count));
    return values.map(v => ({ ...v, pct: Math.max(6, (v.count / max) * 100) }));
  }, [memories]);

  const moodBars = useMemo(() => {
    const recent = [...moodEntries].slice(0, 14).reverse();
    const max = 5;
    return recent.map(entry => ({ ...entry, score: getMoodScore(entry.mood), pct: (getMoodScore(entry.mood) / max) * 100 }));
  }, [moodEntries]);

  const recent = [...memories].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()).slice(0, 6);

  return (
    <div className="stats-page">
      <section className="feature-hero stats-hero">
        <span className="eyebrow">Love analytics</span>
        <h2>Thống kê tình yêu</h2>
        <p>Mấy con số vui để app có cảm giác sống động hơn, kèm biểu đồ kỷ niệm theo tháng và mood tracker.</p>
      </section>
      <div className="stats-big-grid">
        <div className="stat-tile"><b>{memories.length}</b><span>kỷ niệm</span></div>
        <div className="stat-tile"><b>{stats.withImage}</b><span>ảnh đang hiển thị</span></div>
        <div className="stat-tile"><b>{videos.length}</b><span>video</span></div>
        <div className="stat-tile"><b>{stats.sunnyPct}%</b><span>kỷ niệm khi trời đẹp</span></div>
        <div className="stat-tile"><b>{stats.bestMonth?.[0] || '—'}</b><span>tháng nhiều kỷ niệm nhất</span></div>
        <div className="stat-tile wide"><b>{stats.bestPlace?.[0] || 'Chưa có'}</b><span>địa điểm xuất hiện nhiều nhất</span></div>
        <div className="stat-tile wide"><b>{stats.first ? new Date(stats.first.date).toLocaleDateString('vi-VN') : '—'}</b><span>kỷ niệm đầu tiên</span></div>
        <div className="stat-tile wide"><b>{stats.topWeather?.[0] || 'Chưa có'}</b><span>thời tiết hay gặp nhất</span></div>
      </div>

      <section className="stats-chart-panel">
        <div className="stats-chart-head"><span className="eyebrow">Memory chart</span><h3>Số kỷ niệm theo 12 tháng gần đây</h3></div>
        <div className="month-bar-chart">
          {monthlyBars.map(bar => (
            <div className="month-bar-item" key={bar.label}>
              <b>{bar.count}</b>
              <span style={{ height: `${bar.pct}%` }} />
              <small>{bar.label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-chart-panel mood-mini-panel">
        <div className="stats-chart-head"><span className="eyebrow">Mood tracker</span><h3>14 mood gần đây</h3></div>
        {moodBars.length === 0 ? <p className="muted-text">Chưa có dữ liệu mood. Mở tab Mood để ghi mood đầu tiên.</p> : (
          <div className="mood-mini-chart">
            {moodBars.map(entry => (
              <div key={entry.date} title={entry.note || entry.date}>
                <span style={{ height: `${entry.pct}%` }} />
                <b>{entry.mood}</b>
                <small>{new Date(`${entry.date}T00:00:00`).getDate()}</small>
              </div>
            ))}
          </div>
        )}
      </section>

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
