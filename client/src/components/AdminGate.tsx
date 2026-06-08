import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BASE_URL } from '../App';

interface Props {
  onUnlocked: () => void;
}

/** Invisible tap zone + PIN modal để mở Dashboard */
export function AdminGate({ onUnlocked }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin]             = useState('');
  const [shake, setShake]         = useState(false);
  const [checking, setChecking]   = useState(false);
  const tapCount  = useRef(0);
  const tapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // 5 taps trong 3s → mở PIN modal
  const handleTap = useCallback(() => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 3000);

    if (tapCount.current >= 5) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      setShowModal(true);
      setPin('');
    }
  }, []);

  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 100);
  }, [showModal]);

  const verify = async (value: string) => {
    if (value.length < 4) return;
    setChecking(true);
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
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 600);
    }
    setChecking(false);
  };

  const handleInput = (digit: string) => {
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) verify(next);
  };

  return (
    <>
      {/* Invisible tap zone — góc dưới phải */}
      <div
        onClick={handleTap}
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 64,
          height: 64,
          zIndex: 9999,
          cursor: 'default',
          // hoàn toàn trong suốt, không ai biết
        }}
      />

      {/* PIN Modal */}
      {showModal && (
        <div className="admin-overlay" onClick={() => setShowModal(false)}>
          <div
            className={`admin-modal ${shake ? 'admin-shake' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-modal-icon">🔐</div>
            <div className="admin-modal-title">Admin</div>
            <div className="admin-modal-subtitle">Nhập mã để tiếp tục</div>

            {/* PIN dots */}
            <div className="admin-dots">
              {[0,1,2,3].map(i => (
                <div key={i} className={`admin-dot ${pin.length > i ? 'filled' : ''}`} />
              ))}
            </div>

            {/* Keypad */}
            <div className="admin-keypad">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                <button
                  key={i}
                  className={`admin-key ${d === '' ? 'admin-key-empty' : ''}`}
                  disabled={checking || d === ''}
                  onClick={() => {
                    if (d === '⌫') setPin(p => p.slice(0,-1));
                    else if (d) handleInput(d);
                  }}
                >
                  {checking && d === '0' ? '...' : d}
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
