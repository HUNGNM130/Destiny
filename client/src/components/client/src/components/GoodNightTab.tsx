import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../types';
import { toast } from './SweetAlert';

interface GoodNightMessage { id: number; message: string; sent_at: string; }

const suggestions = [
  'Ngủ ngon nha em, mai mình lại thương nhau thêm một chút 🌙',
  'Chúc em có một giấc mơ thật mềm, có anh ở đó càng tốt ✨',
  'Hôm nay vất vả rồi, để đêm nay ôm em bằng lời chúc này nha 💗',
];

export function GoodNightTab() {
  const [messages, setMessages] = useState<GoodNightMessage[]>([]);
  const [message, setMessage] = useState('');
  const load = async () => {
    const res = await fetch(`${BASE_URL}/api/goodnight-messages`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load().catch(() => {}); }, []);
  const save = async () => {
    if (!message.trim()) return toast('Nhập lời chúc ngủ ngon đã nha 🌙', 'error');
    const res = await fetch(`${BASE_URL}/api/goodnight-messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
    });
    if (res.ok) { setMessage(''); toast('Đã lưu lời chúc ngủ ngon', 'success'); load(); }
  };
  const remove = async (id: number) => {
    await fetch(`${BASE_URL}/api/goodnight-messages/${id}`, { method: 'DELETE' });
    setMessages(prev => prev.filter(x => x.id !== id));
  };
  return (
    <div className="night-page">
      <section className="feature-hero night-hero">
        <span className="eyebrow">Good night archive</span>
        <h2>Những lời chúc ngủ ngon</h2>
        <p>Mỗi tối gửi một dòng nhỏ, sau này đọc lại như một cuốn sách dịu dàng.</p>
      </section>
      <section className="night-shell">
        <div className="night-composer glass-panel">
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Viết lời chúc tối nay..." rows={5} />
          <div className="quick-suggestions">
            {suggestions.map(s => <button key={s} onClick={() => setMessage(s)}>{s}</button>)}
          </div>
          <button className="btn-add" onClick={save}>🌙 Lưu lời chúc</button>
        </div>
        <div className="night-book">
          {messages.map((m, index) => (
            <article key={m.id} className="night-note" style={{ ['--delay' as string]: `${index % 5}` }}>
              <span>{new Date(m.sent_at).toLocaleString('vi-VN')}</span>
              <p>{m.message}</p>
              <button className="btn-search danger" onClick={() => remove(m.id)}>Xóa</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
