import React, { useEffect, useMemo, useState } from 'react';
import { BASE_URL } from '../App';
import { toast } from './SweetAlert';

interface Letter {
  id: number;
  title: string;
  unlock_at: string;
  message: string | null;
  preview?: string;
  cover_image?: string | null;
  unlocked: boolean;
  created_at?: string;
}

const emptyForm = { title: '', unlock_at: '', message: '', cover_image: '' };

function countdownText(unlockAt: string, now: Date) {
  const target = new Date(unlockAt);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Đã mở khóa';
  const totalHours = Math.ceil(diff / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
  return `Còn ${hours} giờ`;
}

export function LettersTab() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState<Letter | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [aiKeywords, setAiKeywords] = useState('mưa, nhớ em, cà phê sáng');
  const [aiTone, setAiTone] = useState('ngọt ngào');
  const [aiName, setAiName] = useState('em');
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`${BASE_URL}/api/letters`);
    setLetters(await res.json());
  };

  useEffect(() => { load().catch(() => {}); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const nextLetter = useMemo(() => letters.filter(l => !l.unlocked).sort((a, b) => new Date(a.unlock_at).getTime() - new Date(b.unlock_at).getTime())[0], [letters]);

  const generateAiLetter = async () => {
    if (!aiKeywords.trim()) return toast('Nhập vài từ khóa cho AI đã nha 🤖', 'error');
    setAiLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/ai-love-letter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: aiKeywords, tone: aiTone, name: aiName }),
      });
      const data = await res.json();
      if (!res.ok || !data.letter) throw new Error(data.error || 'AI error');
      setForm(f => ({ ...f, title: f.title || `Thư gửi ${aiName || 'em'}`, message: data.letter }));
      setShowForm(true);
      toast(data.fallback ? 'Chưa có ANTHROPIC_API_KEY nên dùng bản fallback lãng mạn' : 'AI đã viết xong thư tình 💌', 'success');
    } catch {
      toast('AI chưa viết được thư. Kiểm tra ANTHROPIC_API_KEY nha.', 'error');
    } finally { setAiLoading(false); }
  };

  const save = async () => {
    if (!form.title || !form.unlock_at || !form.message) return toast('Nhập đủ tiêu đề, ngày mở và nội dung nha', 'error');
    const res = await fetch(`${BASE_URL}/api/letters`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    });
    if (res.ok) {
      toast('Đã gửi thư vào tương lai 💌', 'success');
      setForm(emptyForm); setShowForm(false); load();
    } else toast('Không lưu được thư', 'error');
  };

  const remove = async (id: number) => {
    if (!window.confirm('Xóa bức thư này?')) return;
    await fetch(`${BASE_URL}/api/letters/${id}`, { method: 'DELETE' });
    setLetters(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="letters-page">
      <section className="feature-hero letters-hero">
        <span className="eyebrow">Future letters</span>
        <h2>Hộp thư tương lai</h2>
        <p>Viết một bức thư, đặt ngày mở khóa, rồi để app giữ bí mật tới đúng ngày.</p>
        <button className="btn-add" onClick={() => setShowForm(v => !v)}>{showForm ? 'Đóng form' : '＋ Viết thư mới'}</button>
      </section>

      <section className="ai-letter-lab glass-panel">
        <div>
          <span className="eyebrow">AI love letter</span>
          <h3>🤖 AI viết thư tình hộ</h3>
          <p>Nhập vài từ khóa, app gọi Anthropic API để biến thành một bức thư hoàn chỉnh.</p>
        </div>
        <div className="ai-letter-grid">
          <input value={aiKeywords} onChange={e => setAiKeywords(e.target.value)} placeholder="mưa, nhớ em, cà phê sáng..." />
          <input value={aiName} onChange={e => setAiName(e.target.value)} placeholder="Tên người nhận" />
          <select value={aiTone} onChange={e => setAiTone(e.target.value)}>
            <option value="ngọt ngào">Ngọt ngào</option>
            <option value="trưởng thành, sâu lắng">Trưởng thành, sâu lắng</option>
            <option value="vui vẻ, đáng yêu">Vui vẻ, đáng yêu</option>
            <option value="thơ mộng như phim">Thơ mộng như phim</option>
          </select>
          <button className="btn-add" onClick={generateAiLetter} disabled={aiLoading}>{aiLoading ? 'AI đang viết...' : '✨ Viết thư bằng AI'}</button>
        </div>
      </section>

      {showForm && (
        <section className="letter-composer">
          <input placeholder="Tiêu đề thư" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input type="date" value={form.unlock_at} onChange={e => setForm(f => ({ ...f, unlock_at: e.target.value }))} />
          <input placeholder="Link ảnh bìa nếu muốn" value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} />
          <textarea placeholder="Nội dung muốn gửi cho tương lai..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          <button className="btn-add" onClick={save}>💌 Lưu thư</button>
        </section>
      )}

      {nextLetter && (
        <section className="next-letter-countdown">
          <span>🔒 Thư tiếp theo</span>
          <b>{nextLetter.title}</b>
          <strong>{countdownText(nextLetter.unlock_at, now)}</strong>
        </section>
      )}

      <div className="letters-grid">
        {letters.map(letter => (
          <article key={letter.id} className={`letter-card ${letter.unlocked ? 'unlocked' : 'locked'}`}>
            {letter.cover_image && <img src={letter.cover_image} alt={letter.title} />}
            <div className="letter-seal">{letter.unlocked ? '💌' : '🔒'}</div>
            <h3>{letter.title}</h3>
            <p>{letter.preview}</p>
            <small>Mở khóa: {new Date(letter.unlock_at).toLocaleDateString('vi-VN')}</small>
            {!letter.unlocked && <div className="letter-countdown">⏳ {countdownText(letter.unlock_at, now)}</div>}
            <div className="letter-actions">
              <button className="btn-search" disabled={!letter.unlocked} onClick={() => setOpen(letter)}>{letter.unlocked ? 'Đọc thư' : 'Chưa tới ngày'}</button>
              <button className="btn-search danger" onClick={() => remove(letter.id)}>Xóa</button>
            </div>
          </article>
        ))}
      </div>
      {letters.length === 0 && <div className="empty-state"><span className="big-heart">💌</span><h2>Chưa có thư</h2><p>Viết bức thư đầu tiên cho ngày đặc biệt đi bro.</p></div>}

      {open && (
        <div className="memory-lightbox" onClick={() => setOpen(null)}>
          <div className="letter-reader" onClick={e => e.stopPropagation()}>
            <button className="memory-lightbox-close" onClick={() => setOpen(null)}>✕</button>
            <span className="eyebrow">Mở ngày {new Date(open.unlock_at).toLocaleDateString('vi-VN')}</span>
            <h2>{open.title}</h2>
            {open.cover_image && <img src={open.cover_image} alt={open.title} />}
            <p>{open.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
