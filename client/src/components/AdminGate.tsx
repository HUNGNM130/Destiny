import React, { useState, useRef, useEffect } from 'react';
import { BASE_URL } from '../App';

interface Props {
  onUnlocked: () => void;
}

export function AdminGate({ onUnlocked }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin]             = useState('');
  const [shake, setShake]         = useState(false);
  const [checking, setChecking]   = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!showModal) { setPin(''); setError(''); }
  }, [showModal]);

  const verify = async (value: string) => {
    if (value.length < 4) return;
    setChecking(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/admin-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        onUnlocked();
      } else {
        setShake(true);
        setPin('');
        setError(data.message || 'Sai mã rồi 🙈');
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setShake(true);
      setPin('');
      setError('Lỗi kết nối');
      setTimeout(() => setShake(false), 600);
    }
    setChecking(false);
  };

  const handleInput = (digit: string) => {
    if (checking) return;
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    setError('');
    if (next.length === 4) verify(next);
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  return (
    <>
      {/* Admin button — góc trái, nhỏ gọn, hài hoà */}
      <button
        className="admin-entry-btn"
        onClick={() => setShowModal(true)}
        title="Admin"
      >
        ⚙️
      </button>

      {/* PIN Modal */}
      {showModal && (
        <div className="admin-overlay" onClick={() => setShowModal(false)}>
          <div
            className={`admin-modal ${shake ? 'admin-shake' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-modal-icon">🔐</div>
            <div className="admin-modal-title">Admin</div>
            <div className="admin-modal-subtitle">
              {error ? <span style={{ color: '#e07' }}>{error}</span> : 'Nhập mã để tiếp tục'}
            </div>

            <div className="admin-dots">
              {[0,1,2,3].map(i => (
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
                    if (d === '⌫') handleBackspace();
                    else if (d) handleInput(d);
                  }}
                >
                  {checking && pin.length === 4 ? (d === '5' ? '···' : '') : d}
                </button>
              ))}
            </div>

            <button className="admin-cancel" onClick={() => setShowModal(false)}>Huỷ</button>
          </div>
        </div>
      )}
    </>
  );
}
