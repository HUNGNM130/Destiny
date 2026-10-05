import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../types';
import { toast } from './SweetAlert';

interface BucketItem { id: number; title: string; notes?: string | null; done: boolean; done_at?: string | null; image?: string | null; memory_id?: number | null; }

export function BucketListTab({ onRefreshMemories }: { onRefreshMemories?: () => void }) {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    const res = await fetch(`${BASE_URL}/api/bucket-items`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const add = async () => {
    if (!title.trim()) return toast('Nhập điều muốn làm đã bro 🎯', 'error');
    const res = await fetch(`${BASE_URL}/api/bucket-items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes }),
    });
    if (res.ok) { setTitle(''); setNotes(''); toast('Đã thêm vào bucket list', 'success'); load(); }
  };

  const toggle = async (item: BucketItem) => {
    const image = !item.done ? window.prompt('Link ảnh khi hoàn thành (có thể bỏ trống):', item.image || '') || '' : item.image || '';
    const res = await fetch(`${BASE_URL}/api/bucket-items/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !item.done, image, create_memory: !item.done }),
    });
    if (res.ok) {
      toast(!item.done ? 'Hoàn thành rồi! App đã tạo memory mới 🎉' : 'Đã chuyển về chưa xong', 'success');
      await load();
      onRefreshMemories?.();
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Xóa mục này?')) return;
    await fetch(`${BASE_URL}/api/bucket-items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(x => x.id !== id));
  };

  return (
    <div className="bucket-page">
      <section className="feature-hero bucket-hero">
        <span className="eyebrow">Couple bucket list</span>
        <h2>Những điều muốn làm cùng nhau</h2>
        <p>Thêm điều ước, tick hoàn thành, gắn ảnh — app tự tạo kỷ niệm khi đã làm xong.</p>
      </section>
      <section className="bucket-shell">
        <div className="bucket-composer glass-panel">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Đi Đà Lạt ngắm mưa" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú nhỏ..." rows={4} />
          <button className="btn-add" onClick={add}>＋ Thêm bucket item</button>
        </div>
        <div className="bucket-grid">
          {items.map(item => (
            <article key={item.id} className={`bucket-card ${item.done ? 'done' : ''}`}>
              {item.image && <img src={item.image} alt={item.title} />}
              <div className="bucket-check">{item.done ? '✅' : '🎯'}</div>
              <h3>{item.title}</h3>
              {item.notes && <p>{item.notes}</p>}
              {item.done_at && <small>Hoàn thành: {new Date(item.done_at).toLocaleDateString('vi-VN')}</small>}
              {item.memory_id && <small>Đã tạo memory #{item.memory_id}</small>}
              <div className="story-actions">
                <button className="btn-add" onClick={() => toggle(item)}>{item.done ? '↩ Chưa xong' : '✅ Tick done'}</button>
                <button className="btn-search danger" onClick={() => remove(item.id)}>Xóa</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
