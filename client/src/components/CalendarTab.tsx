import React, { useEffect, useMemo, useState } from 'react';
import type { Memory } from '../types';
import { BASE_URL } from '../types';
import { toast } from './SweetAlert';
import { requestReminderPermission } from '../hooks/useReminderNotifications';

interface Props { memories: Memory[]; onOpenMemory?: (m: Memory) => void; }
interface AnniversaryEvent { id: number; title: string; event_date: string; description?: string | null; memory_id?: number | null; remind?: boolean; }

function dateKey(value: string) { return value.split('T')[0]; }
function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function localDayKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

export function CalendarTab({ memories, onOpenMemory }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => localDayKey(new Date()));
  const [events, setEvents] = useState<AnniversaryEvent[]>([]);
  const [form, setForm] = useState({ title: '', event_date: localDayKey(new Date()), description: '', memory_id: '', remind: true });
  const [showForm, setShowForm] = useState(false);

  const loadEvents = async () => {
    const res = await fetch(`${BASE_URL}/api/anniversary-events`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
  };
  useEffect(() => { loadEvents().catch(() => {}); }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, { memories: Memory[]; events: AnniversaryEvent[] }>();
    const ensure = (key: string) => {
      const current = map.get(key) || { memories: [], events: [] };
      map.set(key, current);
      return current;
    };
    memories.forEach(m => ensure(dateKey(m.date)).memories.push(m));
    events.forEach(e => ensure(dateKey(e.event_date)).events.push(e));
    return map;
  }, [memories, events]);

  const days = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const blanks = (first.getDay() + 6) % 7;
    const total = new Date(y, m + 1, 0).getDate();
    return [...Array.from({ length: blanks }, () => null), ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1))];
  }, [cursor]);

  const selected = byDay.get(selectedDay) || { memories: [], events: [] };
  const changeMonth = (delta: number) => setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const currentMonth = monthKey(cursor);

  const saveEvent = async () => {
    if (!form.title || !form.event_date) return toast('Nhập tên lịch và ngày đã nha 📅', 'error');
    const res = await fetch(`${BASE_URL}/api/anniversary-events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, memory_id: form.memory_id ? Number(form.memory_id) : null }),
    });
    if (res.ok) {
      toast('Đã thêm lịch kỷ niệm 🔔', 'success');
      setForm({ title: '', event_date: selectedDay, description: '', memory_id: '', remind: true });
      setShowForm(false);
      loadEvents();
    }
  };

  const removeEvent = async (id: number) => {
    if (!window.confirm('Xóa lịch kỷ niệm này?')) return;
    await fetch(`${BASE_URL}/api/anniversary-events/${id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const addSelectedDate = () => { setForm(f => ({ ...f, event_date: selectedDay })); setShowForm(true); };

  return (
    <div className="calendar-page">
      <section className="feature-hero calendar-hero">
        <span className="eyebrow">Calendar & reminders</span>
        <h2>Lịch kỷ niệm</h2>
        <p>Xem kỷ niệm theo tháng, thêm lịch riêng cho sinh nhật/ngày hẹn/ngày mở capsule và bật nhắc nhở web.</p>
        <div className="story-actions"><button className="btn-add" onClick={addSelectedDate}>＋ Add lịch kỷ niệm</button><button className="btn-search" onClick={async () => toast(await requestReminderPermission() === 'granted' ? 'Đã bật browser notification 🔔' : 'Chưa bật được notification', 'success')}>🔔 Bật nhắc nhở web</button></div>
      </section>

      {showForm && (
        <section className="calendar-event-form glass-panel">
          <input placeholder="Tên lịch: Sinh nhật em, Anniversary..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
          <select value={form.memory_id} onChange={e => setForm(f => ({ ...f, memory_id: e.target.value }))}>
            <option value="">Không gắn memory</option>
            {memories.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <label className="inline-check"><input type="checkbox" checked={form.remind} onChange={e => setForm(f => ({ ...f, remind: e.target.checked }))} /> Nhắc bằng browser notification</label>
          <textarea placeholder="Ghi chú cho ngày này..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="story-actions"><button className="btn-add" onClick={saveEvent}>💾 Lưu lịch</button><button className="btn-search" onClick={() => setShowForm(false)}>Đóng</button></div>
        </section>
      )}

      <section className="calendar-shell">
        <div className="calendar-panel">
          <div className="calendar-head"><button onClick={() => changeMonth(-1)}>‹</button><h3>{cursor.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h3><button onClick={() => changeMonth(1)}>›</button></div>
          <div className="calendar-weekdays">{['T2','T3','T4','T5','T6','T7','CN'].map(d => <span key={d}>{d}</span>)}</div>
          <div className="calendar-grid">
            {days.map((day, index) => {
              if (!day) return <span className="calendar-empty" key={`blank-${index}`} />;
              const key = localDayKey(day);
              const cell = byDay.get(key) || { memories: [], events: [] };
              const total = cell.memories.length + cell.events.length;
              const isSelected = selectedDay === key;
              const isOutsideView = !key.startsWith(currentMonth);
              return (
                <button key={key} className={`calendar-day ${total ? 'has-memory' : ''} ${cell.events.length ? 'has-event' : ''} ${isSelected ? 'selected' : ''} ${isOutsideView ? 'muted' : ''}`} onClick={() => setSelectedDay(key)}>
                  <b>{day.getDate()}</b>
                  {total > 0 && <span className="calendar-dots">{cell.memories.slice(0, 2).map(m => <i key={`m-${m.id}`} />)}{cell.events.slice(0, 2).map(e => <i className="event-dot" key={`e-${e.id}`} />)}{total > 4 && <em>+{total - 4}</em>}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="calendar-side">
          <span className="eyebrow">{new Date(`${selectedDay}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          <h3>{selected.memories.length + selected.events.length ? `${selected.memories.length} memory · ${selected.events.length} lịch` : 'Chưa có gì trong ngày này'}</h3>
          <button className="btn-add" onClick={addSelectedDate}>＋ Tạo lịch cho ngày này</button>
          <div className="calendar-memory-list">
            {selected.events.map(e => {
              const linked = e.memory_id ? memories.find(m => m.id === e.memory_id) : null;
              return <div key={e.id} className="calendar-event-item"><b>🔔 {e.title}</b>{e.description && <small>{e.description}</small>}{linked && <button onClick={() => onOpenMemory?.(linked)}>Mở memory: {linked.title}</button>}<button className="btn-search danger" onClick={() => removeEvent(e.id)}>Xóa lịch</button></div>;
            })}
            {selected.memories.map(m => (
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
