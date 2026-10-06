import React, { useState } from 'react';
import { BASE_URL } from '../types';
import { setLoveToken } from '../utils/loveAuth';

interface Props { onUnlocked: () => void; }

// Màn hình "mật khẩu tình yêu" — server kiểm tra, đúng mới trả token để vào app.
export function LoveGate({ onUnlocked }: Props) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const fail = (msg: string) => {
    setShake(true);
    setError(msg);
    setTimeout(() => { setShake(false); setPin(''); }, 600);
  };

  const verify = async (value: string) => {
    setChecking(true);
    try {
      const res = await fetch(`${BASE_URL}/api/love-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (data.ok && data.token) {
        setLoveToken(data.token);
        onUnlocked();
        return;
      }
      fail(data.message || 'Sai mật khẩu tình yêu rồi 🙈');
    } catch {
      fail('Lỗi kết nối');
    }
    setChecking(false);
  };

  const handleInput = (digit: string) => {
    if (checking || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) verify(next);
  };

  return (
    <div className="admin-overlay" style={{ zIndex: 10000 }}>
      <div className={`admin-modal ${shake ? 'admin-shake' : ''}`}>
        <div className="admin-modal-icon">💕</div>
        <div className="admin-modal-title">Mật khẩu tình yêu</div>
        <div className="admin-modal-subtitle">
          {error ? <span style={{ color: '#e07' }}>{error}</span> : 'Nhập mật khẩu để vào nhé'}
        </div>

        <div className="admin-dots">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`admin-dot ${pin.length > i ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="admin-keypad">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <button
              key={i}
              className={`admin-key ${d === '' ? 'admin-key-empty' : ''}`}
              disabled={checking || d === ''}
              onClick={() => {
                if (d === '⌫') { setPin(p => p.slice(0, -1)); setError(''); }
                else if (d) handleInput(d);
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
