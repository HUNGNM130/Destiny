import React, { useMemo } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }

function sameMonthDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
}

export function TimelineTab({ memories, onOpenMemory }: Props) {
  const today = new Date();
  const groupedByYear = useMemo(() => {
    const yearMap = new Map<string, Memory[]>();
    memories.forEach(m => {
      const year = String(new Date(m.date).getFullYear());
      yearMap.set(year, [...(yearMap.get(year) || []), m]);
    });
    return Array.from(yearMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, items]) => {
        const monthMap = new Map<string, Memory[]>();
        items.forEach(m => {
          const d = new Date(m.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap.set(key, [...(monthMap.get(key) || []), m]);
        });
        return {
          year,
          count: items.length,
          months: Array.from(monthMap.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, monthItems]) => ({ key, items: monthItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) })),
        };
      });
  }, [memories]);

  const todayMemories = useMemo(() => {
    const exact = memories.filter(m => sameMonthDay(new Date(m.date), today));
    if (exact.length) return exact;
    return [...memories]
      .sort((a, b) => Math.abs(new Date(a.date).getTime() - today.getTime()) - Math.abs(new Date(b.date).getTime() - today.getTime()))
      .slice(0, 3);
  }, [memories]);

  return (
    <div className="timeline-page">
      <section className="feature-hero timeline-hero">
        <span className="eyebrow">Timeline</span>
        <h2>Dòng thời gian tình yêu</h2>
        <p>Mỗi năm là một chương lớn, bên trong là các tháng và những khoảnh khắc đáng nhớ.</p>
      </section>

      <section className="today-memory-card">
        <div>
          <span className="eyebrow">Hôm nay năm xưa</span>
          <h3>{todayMemories.length ? 'Có kỷ niệm đáng mở lại nè' : 'Chưa có kỷ niệm gần hôm nay'}</h3>
        </div>
        <div className="today-memory-list">
          {todayMemories.map(m => (
            <button key={m.id} className="today-memory-item" onClick={() => onOpenMemory?.(m)}>
              {m.image ? <img src={m.image} alt={m.title} /> : <span>💌</span>}
              <b>{m.title}</b>
              <small>{new Date(m.date).toLocaleDateString('vi-VN')}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="timeline-stream year-mode">
        {groupedByYear.map(yearGroup => (
          <section className="timeline-year" key={yearGroup.year}>
            <div className="timeline-year-label">
              <strong>{yearGroup.year}</strong>
              <span>{yearGroup.count} kỷ niệm</span>
            </div>
            <div className="timeline-year-content">
              {yearGroup.months.map(group => {
                const date = new Date(`${group.key}-01`);
                return (
                  <section className="timeline-month" key={group.key}>
                    <div className="timeline-month-label">
                      <strong>{date.toLocaleDateString('vi-VN', { month: 'long' })}</strong>
                      <span>{group.items.length} kỷ niệm</span>
                    </div>
                    <div className="timeline-items">
                      {group.items.map(m => (
                        <button className="timeline-item" key={m.id} onClick={() => onOpenMemory?.(m)}>
                          {m.image && <img src={m.image} alt={m.title} />}
                          <div>
                            <small>{new Date(m.date).toLocaleDateString('vi-VN')}</small>
                            <h4>{m.title}</h4>
                            {m.description && <p>{m.description}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
