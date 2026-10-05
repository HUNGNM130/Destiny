import React, { useMemo, useState } from 'react';
import type { Memory } from '../types';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }

function clusterKey(memory: Memory) {
  if (memory.latitude != null && memory.longitude != null) {
    return `${Number(memory.latitude).toFixed(2)},${Number(memory.longitude).toFixed(2)}`;
  }
  const loc = (memory.place_name || memory.location || '').trim();
  const primary = loc.split(/[,·\-–—]/)[0]?.trim() || loc;
  return primary.toLocaleLowerCase('vi-VN');
}

function osmEmbed(lat: number, lon: number) {
  const delta = 0.025;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;
}

function openMapUrl(memory: Memory) {
  if (memory.latitude != null && memory.longitude != null) return `https://www.openstreetmap.org/?mlat=${memory.latitude}&mlon=${memory.longitude}#map=16/${memory.latitude}/${memory.longitude}`;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(memory.place_name || memory.location || '')}`;
}

export function LoveMapTab({ memories, onOpenMemory }: Props) {
  const clusters = useMemo(() => {
    const map = new Map<string, { label: string; items: Memory[]; locations: Set<string>; lat?: number; lon?: number }>();
    memories.forEach(m => {
      const loc = (m.place_name || m.location || '').trim();
      if (!loc && (m.latitude == null || m.longitude == null)) return;
      const key = clusterKey(m);
      const label = loc || `${Number(m.latitude).toFixed(4)}, ${Number(m.longitude).toFixed(4)}`;
      const current = map.get(key) || { label: label.split(/[,·\-–—]/)[0]?.trim() || label, items: [], locations: new Set<string>(), lat: m.latitude ?? undefined, lon: m.longitude ?? undefined };
      current.items.push(m);
      current.locations.add(label);
      if (current.lat == null && m.latitude != null) current.lat = m.latitude;
      if (current.lon == null && m.longitude != null) current.lon = m.longitude;
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([key, value], index) => ({ key, ...value, index })).sort((a, b) => b.items.length - a.items.length);
  }, [memories]);

  const [selected, setSelected] = useState<string>(() => 'all');
  const selectedCluster = selected === 'all' ? null : clusters.find(c => c.key === selected) || null;
  const visibleClusters = selectedCluster ? [selectedCluster] : clusters;
  const mapFocus = selectedCluster || clusters.find(c => c.lat != null && c.lon != null);

  return (
    <div className="lovemap-page">
      <section className="feature-hero map-hero">
        <span className="eyebrow">Detailed love map</span>
        <h2>Bản đồ những nơi đã đi</h2>
        <p>Memory có tọa độ sẽ hiện trên bản đồ chi tiết. Khi thêm/sửa memory, dùng tìm địa điểm để set lat/lng cho từng nơi.</p>
      </section>

      <div className="map-filter-row">
        <button className={selected === 'all' ? 'active' : ''} onClick={() => setSelected('all')}>Tất cả</button>
        {clusters.map(cluster => <button key={cluster.key} className={selected === cluster.key ? 'active' : ''} onClick={() => setSelected(cluster.key)}>📍 {cluster.label} <span>{cluster.items.length}</span></button>)}
      </div>

      {clusters.length === 0 ? <div className="empty-state"><span className="big-heart">🗺️</span><h2>Chưa có địa điểm</h2><p>Thêm location hoặc chọn tọa độ khi tạo/sửa kỷ niệm để bản đồ hiện lên nhé.</p></div> : (
        <section className="detailed-map-layout">
          <div className="map-iframe-card glass-panel">
            {mapFocus?.lat != null && mapFocus?.lon != null ? (
              <iframe title="Love map" src={osmEmbed(mapFocus.lat, mapFocus.lon)} loading="lazy" />
            ) : (
              <div className="map-placeholder"><b>🗺️</b><p>Các địa điểm hiện chỉ có tên, chưa có tọa độ. Sửa memory để set tọa độ nha.</p></div>
            )}
            <div className="map-pin-list">
              {clusters.filter(c => c.lat != null && c.lon != null).map(c => (
                <button key={c.key} onClick={() => setSelected(c.key)} className={selected === c.key ? 'active' : ''}>📍 {c.label} <small>{c.items.length} memory</small></button>
              ))}
            </div>
          </div>

          <div className="love-map-board cluster-list-board">
            {visibleClusters.map(cluster => (
              <section className="place-card cluster-card" key={cluster.key}>
                <div className="place-pin">📍</div>
                <div className="place-head"><h3>{cluster.label}</h3><span>{cluster.items.length} khoảnh khắc · {cluster.locations.size} địa điểm con</span></div>
                <div className="cluster-location-tags">{Array.from(cluster.locations).slice(0, 6).map(loc => <span key={loc}>{loc}</span>)}</div>
                <div className="place-gallery-mini">{cluster.items.slice(0, 4).map(m => <button key={m.id} onClick={() => onOpenMemory?.(m)}>{m.image ? <img src={m.image} alt={m.title} /> : <span>♥</span>}</button>)}</div>
                <div className="place-memories">
                  {cluster.items.map(m => <button key={m.id} onClick={() => onOpenMemory?.(m)}>{m.title}<small>{new Date(m.date).toLocaleDateString('vi-VN')}{m.place_name || m.location ? ` · ${m.place_name || m.location}` : ''}</small></button>)}
                </div>
                <a className="btn-search" href={openMapUrl(cluster.items[0])} target="_blank" rel="noreferrer">↗ Mở bản đồ chi tiết</a>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
