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

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', color:'var(--plum-soft)', fontFamily:'var(--font-hand)', fontSize:'1.3rem' }}>
      Đang tải... 💕
    </div>
  );

  if (!enabled) return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'60vh', gap:'16px', color:'var(--plum-soft)', textAlign:'center', padding:'24px'
    }}>
      <div style={{ fontSize:'3rem' }}>🎁</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', color:'var(--plum)' }}>
        Trang quà chưa mở
      </div>
      <div style={{ fontFamily:'var(--font-hand)', fontSize:'1.1rem', opacity:0.7 }}>
        Quà đang được chuẩn bị, chờ một chút nhé 💕
      </div>
    </div>
  );

  return (
    <div style={{ width:'100%', height:'calc(100vh - 140px)', position:'relative', borderRadius:'16px', overflow:'hidden' }}>
      <iframe
        src={`${BASE_URL}/mon-qua-nho/`}
        style={{ width:'100%', height:'100%', border:'none', borderRadius:'16px' }}
        title="Món Quà Nhỏ"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
