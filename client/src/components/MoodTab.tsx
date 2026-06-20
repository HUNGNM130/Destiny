import React, { useMemo, useState } from 'react';
import { getMoodScore, loadMoodEntries, MOODS, saveMoodEntry, todayKey, type MoodEntry } from '../utils/moodStore';

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function buildRange(period: 'week' | 'month') {
  const total = period === 'week' ? 7 : 30;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (total - 1 - i));
    return todayKey(d);
  });
}

export function MoodTab() {
  const [entries, setEntries] = useState<MoodEntry[]>(() => loadMoodEntries());
  const [date, setDate] = useState(todayKey());
  const existing = entries.find(e => e.date === date);
  const [mood, setMood] = useState(existing?.mood || MOODS[0].emoji);
  const [note, setNote] = useState(existing?.note || '');
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const range = useMemo(() => buildRange(period), [period, entries]);
  const byDate = useMemo(() => new Map(entries.map(e => [e.date, e])), [entries]);
  const avg = useMemo(() => {
    const scored = range.map(d => byDate.get(d)).filter(Boolean) as MoodEntry[];
    if (!scored.length) return 0;
    return scored.reduce((sum, e) => sum + getMoodScore(e.mood), 0) / scored.length;
  }, [range, byDate]);

  const save = () => {
    const next = saveMoodEntry({ date, mood, note: note.trim(), createdAt: new Date().toISOString() });
    setEntries(next);
  };

  const pickDate = (nextDate: string) => {
    const found = entries.find(e => e.date === nextDate);
    setDate(nextDate);
    setMood(found?.mood || MOODS[0].emoji);
    setNote(found?.note || '');
  };

  return (
    <div className="mood-page">
      <section className="feature-hero mood-hero">
        <span className="eyebrow">Daily mood</span>
        <h2>Mood tracker hàng ngày</h2>
        <p>Mỗi ngày chọn một mood và viết một dòng nhỏ. App sẽ vẽ lại nhịp cảm xúc theo tuần hoặc tháng.</p>
      </section>

      <section className="mood-dashboard-grid">
        <div className="mood-card mood-input-card">
          <div className="mood-card-head">
            <div>
              <span className="eyebrow">Hôm nay mình thấy</span>
              <h3>Ghi mood trong 10 giây</h3>
            </div>
            <input type="date" value={date} onChange={e => pickDate(e.target.value)} />
          </div>
          <div className="mood-picker-row">
            {MOODS.map(item => (
              <button key={item.emoji} className={mood === item.emoji ? 'active' : ''} onClick={() => setMood(item.emoji)} title={item.label}>
                <span>{item.emoji}</span><small>{item.label}</small>
              </button>
            ))}
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Một câu ghi chú: hôm nay vui vì..." />
          <button className="btn-add" onClick={save}>💾 Lưu mood</button>
        </div>

        <div className="mood-card mood-chart-card">
          <div className="mood-card-head">
            <div>
              <span className="eyebrow">Mood chart</span>
              <h3>{period === 'week' ? '7 ngày gần đây' : '30 ngày gần đây'}</h3>
            </div>
            <div className="segmented-control">
              <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Tuần</button>
              <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Tháng</button>
            </div>
          </div>
          <div className="mood-average"><b>{avg ? avg.toFixed(1) : '—'}</b><span>điểm mood trung bình</span></div>
          <div className={`mood-chart ${period}`}>
            {range.map(day => {
              const entry = byDate.get(day);
              const score = entry ? getMoodScore(entry.mood) : 0;
              return (
                <button key={day} className="mood-bar-wrap" onClick={() => pickDate(day)} title={`${formatDate(day)} ${entry?.note || ''}`}>
                  <span className="mood-bar" style={{ height: `${Math.max(8, score * 18)}%` }} />
                  <span className="mood-dot">{entry?.mood || '·'}</span>
                  <small>{period === 'week' ? formatDate(day) : new Date(`${day}T00:00:00`).getDate()}</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mood-history mood-card">
        <h3>Nhật ký mood gần đây</h3>
        {entries.length === 0 ? <p className="muted-text">Chưa có mood nào. Lưu mood hôm nay để bắt đầu nha.</p> : (
          <div className="mood-history-list">
            {entries.slice(0, 12).map(entry => (
              <button key={entry.date} onClick={() => pickDate(entry.date)}>
                <span>{entry.mood}</span>
                <b>{new Date(`${entry.date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
                <small>{entry.note || 'Không có ghi chú'}</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
