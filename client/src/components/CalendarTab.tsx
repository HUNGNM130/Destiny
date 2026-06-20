import React, { useMemo, useState } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }

function dateKey(value: string) {
  return value.split('T')[0];
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function CalendarTab({ memories, onOpenMemory }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => localDayKey(new Date()));
  const byDay = useMemo(() => {
    const map = new Map<string, Memory[]>();
    memories.forEach(m => {
      const key = dateKey(m.date);
      map.set(key, [...(map.get(key) || []), m]);
    });
    return map;
  }, [memories]);

  const days = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const blanks = (first.getDay() + 6) % 7;
    const total = new Date(y, m + 1, 0).getDate();
    return [
      ...Array.from({ length: blanks }, () => null),
      ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1)),
    ];
  }, [cursor]);

  const selectedMemories = byDay.get(selectedDay) || [];
  const changeMonth = (delta: number) => setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const currentMonth = monthKey(cursor);

  return (
    <div className="calendar-page">
      <section className="feature-hero calendar-hero">
        <span className="eyebrow">Calendar view</span>
        <h2>Lịch kỷ niệm</h2>
        <p>Xem kỷ niệm theo tháng, ngày nào có khoảnh khắc sẽ được đánh dấu bằng chấm màu.</p>
      </section>

      <section className="calendar-shell">
        <div className="calendar-panel">
          <div className="calendar-head">
            <button onClick={() => changeMonth(-1)}>‹</button>
            <h3>{cursor.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => changeMonth(1)}>›</button>
          </div>
          <div className="calendar-weekdays">{['T2','T3','T4','T5','T6','T7','CN'].map(d => <span key={d}>{d}</span>)}</div>
          <div className="calendar-grid">
            {days.map((day, index) => {
              if (!day) return <span className="calendar-empty" key={`blank-${index}`} />;
              const key = localDayKey(day);
              const items = byDay.get(key) || [];
              const isSelected = selectedDay === key;
              const isOutsideView = !key.startsWith(currentMonth);
              return (
                <button key={key} className={`calendar-day ${items.length ? 'has-memory' : ''} ${isSelected ? 'selected' : ''} ${isOutsideView ? 'muted' : ''}`} onClick={() => setSelectedDay(key)}>
                  <b>{day.getDate()}</b>
                  {items.length > 0 && <span className="calendar-dots">{items.slice(0, 4).map(m => <i key={m.id} />)}{items.length > 4 && <em>+{items.length - 4}</em>}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="calendar-side">
          <span className="eyebrow">{new Date(`${selectedDay}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          <h3>{selectedMemories.length ? `${selectedMemories.length} kỷ niệm` : 'Chưa có kỷ niệm'}</h3>
          <div className="calendar-memory-list">
            {selectedMemories.map(m => (
              <button key={m.id} onClick={() => onOpenMemory?.(m)}>
                {m.image ? <img src={m.image} alt={m.title} /> : <span>💌</span>}
                <div><b>{m.title}</b>{m.location && <small>📍 {m.location}</small>}</div>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
