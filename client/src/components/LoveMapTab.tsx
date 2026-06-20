import React, { useMemo, useState } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }

function clusterKey(location: string) {
  const clean = location.trim().replace(/\s+/g, ' ');
  const primary = clean.split(/[,·\-–—]/)[0]?.trim() || clean;
  return primary.toLocaleLowerCase('vi-VN');
}

export function LoveMapTab({ memories, onOpenMemory }: Props) {
  const clusters = useMemo(() => {
    const map = new Map<string, { label: string; items: Memory[]; locations: Set<string> }>();
    memories.forEach(m => {
      const loc = (m.location || '').trim();
      if (!loc) return;
      const key = clusterKey(loc);
      const current = map.get(key) || { label: loc.split(/[,·\-–—]/)[0]?.trim() || loc, items: [], locations: new Set<string>() };
      current.items.push(m);
      current.locations.add(loc);
      map.set(key, current);
    });
    return Array.from(map.entries())
      .map(([key, value], index) => ({ key, ...value, index }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [memories]);

  const [selected, setSelected] = useState<string>(() => 'all');
  const selectedCluster = selected === 'all' ? null : clusters.find(c => c.key === selected) || null;
  const visibleClusters = selectedCluster ? [selectedCluster] : clusters;

  return (
    <div className="lovemap-page">
      <section className="feature-hero map-hero">
        <span className="eyebrow">Love map</span>
        <h2>Bản đồ nơi mình từng đi</h2>
        <p>Các địa điểm gần/giống nhau được gom thành cluster. Bấm vào cụm để mở danh sách kỷ niệm bên trong.</p>
      </section>

      <div className="map-filter-row">
        <button className={selected === 'all' ? 'active' : ''} onClick={() => setSelected('all')}>Tất cả cluster</button>
        {clusters.map(cluster => (
          <button key={cluster.key} className={selected === cluster.key ? 'active' : ''} onClick={() => setSelected(cluster.key)}>
            📍 {cluster.label} <span>{cluster.items.length}</span>
          </button>
        ))}
      </div>

      {clusters.length === 0 ? (
        <div className="empty-state"><span className="big-heart">🗺️</span><h2>Chưa có địa điểm</h2><p>Thêm location khi tạo/sửa kỷ niệm để Love Map hiện lên nhé.</p></div>
      ) : (
        <section className="love-map-cluster-shell">
          <div className="cluster-map-canvas">
            {clusters.map((cluster, idx) => {
              const left = 12 + (idx * 29) % 76;
              const top = 16 + (idx * 37) % 62;
              return (
                <button key={cluster.key} className={`cluster-marker ${selected === cluster.key ? 'active' : ''}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => setSelected(cluster.key)}>
                  <span>{cluster.items.length}</span>
                  <small>{cluster.label}</small>
                </button>
              );
            })}
          </div>

          <div className="love-map-board cluster-list-board">
            {visibleClusters.map(cluster => (
              <section className="place-card cluster-card" key={cluster.key} style={{ ['--pin' as string]: `${20 + (cluster.index * 23) % 70}%` }}>
                <div className="place-pin">📍</div>
                <div className="place-head">
                  <h3>{cluster.label}</h3>
                  <span>{cluster.items.length} khoảnh khắc · {cluster.locations.size} địa điểm con</span>
                </div>
                <div className="cluster-location-tags">
                  {Array.from(cluster.locations).slice(0, 5).map(loc => <span key={loc}>{loc}</span>)}
                </div>
                <div className="place-gallery-mini">
                  {cluster.items.slice(0, 4).map(m => (
                    <button key={m.id} onClick={() => onOpenMemory?.(m)}>
                      {m.image ? <img src={m.image} alt={m.title} /> : <span>♥</span>}
                    </button>
                  ))}
                </div>
                <div className="place-memories">
                  {cluster.items.map(m => <button key={m.id} onClick={() => onOpenMemory?.(m)}>{m.title}<small>{new Date(m.date).toLocaleDateString('vi-VN')}{m.location ? ` · ${m.location}` : ''}</small></button>)}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
