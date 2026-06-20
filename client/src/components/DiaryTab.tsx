import React, { useEffect, useMemo, useState } from 'react';
import { BASE_URL } from '../types';
import { toast } from './SweetAlert';

interface DiaryEntry { id: number; entry_date: string; mood?: string | null; content: string; updated_at?: string; }

function todayKey() { return new Date().toISOString().slice(0, 10); }
function dayKey(date: Date) { return date.toISOString().slice(0, 10); }

export function DiaryTab() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [entryDate, setEntryDate] = useState(todayKey());
  const [mood, setMood] = useState('🥰');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch(`${BASE_URL}/api/diary-entries`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load().catch(() => {}); }, []);
  useEffect(() => {
    const existing = entries.find(e => e.entry_date?.slice(0, 10) === entryDate);
    if (existing) { setMood(existing.mood || '🥰'); setContent(existing.content || ''); }
    else { setMood('🥰'); setContent(''); }
  }, [entryDate, entries]);

  const streak = useMemo(() => {
    const set = new Set(entries.map(e => e.entry_date.slice(0, 10)));
    let count = 0;
    const cursor = new Date();
    for (;;) {
      const key = dayKey(cursor);
      if (!set.has(key)) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [entries]);

  const save = async () => {
    if (!content.trim()) return toast('Viết vài dòng đã nha 💭', 'error');
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/diary-entries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_date: entryDate, mood, content }),
      });
      if (!res.ok) throw new Error('save failed');
      toast('Đã lưu nhật ký hôm nay ✍️', 'success');
      await load();
    } catch { toast('Không lưu được nhật ký', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Xóa nhật ký này?')) return;
    await fetch(`${BASE_URL}/api/diary-entries/${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="diary-page">
      <section className="feature-hero diary-hero">
        <span className="eyebrow">Daily diary</span>
        <h2>Nhật ký hàng ngày</h2>
        <p>Viết vài dòng mỗi ngày, giữ streak như Duolingo để biến việc ghi lại cảm xúc thành thói quen.</p>
      </section>

      <section className="diary-shell">
        <div className="diary-composer glass-panel">
          <div className="diary-streak"><b>{streak}</b><span>ngày streak liên tiếp 🔥</span></div>
          <label>Ngày</label>
          <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          <label>Mood</label>
          <select value={mood} onChange={e => setMood(e.target.value)}>
            {['🥰','😊','😌','🥺','😴','✨','🌧️','☀️'].map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <label>Viết ngắn thôi cũng được</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Hôm nay mình muốn nhớ điều gì?" rows={8} />
          <button className="btn-add" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : '💭 Lưu nhật ký'}</button>
        </div>

        <div className="diary-list">
          {entries.map(entry => (
            <article className="diary-card" key={entry.id}>
              <span className="eyebrow">{new Date(entry.entry_date).toLocaleDateString('vi-VN')}</span>
              <h3>{entry.mood || '💭'} Nhật ký</h3>
              <p>{entry.content}</p>
              <button className="btn-search danger" onClick={() => remove(entry.id)}>Xóa</button>
            </article>
          ))}
          {entries.length === 0 && <div className="empty-state"><span className="big-heart">💭</span><h2>Chưa có nhật ký</h2><p>Viết dòng đầu tiên để bắt đầu streak nha.</p></div>}
        </div>
      </section>
    </div>
  );
}
