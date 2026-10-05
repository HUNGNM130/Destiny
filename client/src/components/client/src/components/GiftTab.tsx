import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../App';

export function GiftTab() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/gift-config`)
      .then(r => r.json())
      .then(cfg => {
        setEnabled(cfg.giftEnabled !== 'false');
        setLoading(false);
      })
      .catch(() => { setEnabled(true); setLoading(false); });
  }, []);

  const giftUrl = `${BASE_URL}/mon-qua-nho/`;

  if (loading) return (
    <div className="gift-tab-center">
      <div className="gift-tab-spinner">💕</div>
    </div>
  );

  if (!enabled) return (
    <div className="gift-tab-center">
      <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎁</div>
      <div className="gift-tab-title">Quà đang được chuẩn bị</div>
      <div className="gift-tab-sub">Chờ một chút nhé, có điều bất ngờ sắp đến 💕</div>
    </div>
  );

  return (
    <div className="gift-tab-center">
      <div style={{ fontSize: '4rem', marginBottom: '20px', filter: 'drop-shadow(0 4px 16px rgba(201,123,138,0.4))' }}>
        🎁
      </div>
      <div className="gift-tab-title">Có một món quà nhỏ dành cho em</div>
      <div className="gift-tab-sub">Nhấn vào để mở nhé 💕</div>
      <a
        href={giftUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="gift-tab-btn"
      >
        ✨ Mở quà
      </a>
      <div className="gift-tab-hint">Sẽ mở trong trang mới</div>
    </div>
  );
}
