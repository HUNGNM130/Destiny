import React, { useMemo, useState } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }

export function LoveMapTab({ memories, onOpenMemory }: Props) {
  const [selected, setSelected] = useState<string>('all');
  const locations = useMemo(() => {
    const map = new Map<string, Memory[]>();
    memories.forEach(m => {
      const loc = (m.location || '').trim();
      if (!loc) return;
      map.set(loc, [...(map.get(loc) || []), m]);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [memories]);
  const visible = selected === 'all' ? locations : locations.filter(([loc]) => loc === selected);

  return (
    <div className="lovemap-page">
      <section className="feature-hero map-hero">
        <span className="eyebrow">Love map</span>
        <h2>Bản đồ nơi mình từng đi</h2>
        <p>Không cần map nặng: app gom các địa điểm từ kỷ niệm và biến thành bản đồ cảm xúc nhẹ, đẹp, hợp Railway.</p>
      </section>
      <div className="map-filter-row">
        <button className={selected === 'all' ? 'active' : ''} onClick={() => setSelected('all')}>Tất cả</button>
        {locations.map(([loc, items]) => (
          <button key={loc} className={selected === loc ? 'active' : ''} onClick={() => setSelected(loc)}>
            📍 {loc} <span>{items.length}</span>
          </button>
        ))}
      </div>
      {locations.length === 0 ? (
        <div className="empty-state"><span className="big-heart">🗺️</span><h2>Chưa có địa điểm</h2><p>Thêm location khi tạo/sửa kỷ niệm để Love Map hiện lên nhé.</p></div>
      ) : (
        <div className="love-map-board">
          {visible.map(([loc, items], idx) => (
            <section className="place-card" key={loc} style={{ ['--pin' as string]: `${20 + (idx * 23) % 70}%` }}>
              <div className="place-pin">📍</div>
              <div className="place-head">
                <h3>{loc}</h3>
                <span>{items.length} khoảnh khắc</span>
              </div>
              <div className="place-gallery-mini">
                {items.slice(0, 4).map(m => (
                  <button key={m.id} onClick={() => onOpenMemory?.(m)}>
                    {m.image ? <img src={m.image} alt={m.title} /> : <span>♥</span>}
                  </button>
                ))}
              </div>
              <div className="place-memories">
                {items.map(m => <button key={m.id} onClick={() => onOpenMemory?.(m)}>{m.title}<small>{new Date(m.date).toLocaleDateString('vi-VN')}</small></button>)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
