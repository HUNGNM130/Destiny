import React, { useMemo, useState } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; onOpenMemory: (m: Memory) => void; }

function sameMonthDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
}

export function OnThisDayBanner({ memories, onOpenMemory }: Props) {
  const today = new Date();
  const dismissKey = `love-diary-on-this-day-dismissed-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === '1');
  const matches = useMemo(() => memories
    .filter(m => {
      const d = new Date(m.date);
      return d.getFullYear() < today.getFullYear() && sameMonthDay(d, today);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [memories]);

  if (dismissed || matches.length === 0) return null;
  const close = () => {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  return (
    <section className="on-this-day-banner">
      <button className="on-this-day-close" onClick={close}>✕</button>
      <div>
        <span className="eyebrow">Kỷ niệm ngày hôm nay</span>
        <h3>Hôm nay năm xưa có {matches.length} khoảnh khắc đáng mở lại 💫</h3>
      </div>
      <div className="on-this-day-list">
        {matches.slice(0, 4).map(memory => (
          <button key={memory.id} onClick={() => onOpenMemory(memory)}>
            {memory.image ? <img src={memory.image} alt={memory.title} /> : <span>💌</span>}
            <b>{memory.title}</b>
            <small>{new Date(memory.date).toLocaleDateString('vi-VN')}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
