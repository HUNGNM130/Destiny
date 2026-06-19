import React, { useEffect, useState, useRef } from 'react';
import { BASE_URL, VIDEO_API_URL } from '../App';
import { toast } from './SweetAlert';

interface GiftConfig {
  appTitle: string;
  passcode: string;
  passcodeTitle: string;
  passcodeSubtitle: string;
  enablePasscode: string;
  enableMorphEffect: string;
  enableSphere: string;
  enableSphereFlyingImages: string;
  enableLetter: string;
  morphTexts: string;
  particleImage: string;
  sphereImages: string;
  letterText: string;
  letterImage: string;
  letterCaption: string;
  bgMusic: string;
  bgVolume: string;
  giftEnabled: string;
  giftStartDate: string;
  giftEndDate: string;
}

const defaultConfig: GiftConfig = {
  appTitle: 'Món Quà Nhỏ',
  passcode: '0308',
  passcodeTitle: 'Nhập mật khẩu',
  passcodeSubtitle: 'Mở món quà đặc biệt',
  enablePasscode: 'true',
  enableMorphEffect: 'true',
  enableSphere: 'true',
  enableSphereFlyingImages: 'true',
  enableLetter: 'true',
  morphTexts: JSON.stringify(['happy', "women's day", 'em iu']),
  particleImage: '',
  sphereImages: JSON.stringify([]),
  letterText: "Happy Women's Day!\n\nEm iu, chúc em luôn xinh đẹp\nvà hạnh phúc mỗi ngày! 💕",
  letterImage: '',
  letterCaption: '♥',
  bgMusic: 'assets/music/bgmusic.mp3',
  bgVolume: '0.55',
  giftEnabled: 'true',
  giftStartDate: '',
  giftEndDate: '',
};

type Section = 'general' | 'effects' | 'letter' | 'media' | 'library' | 'schedule';

interface MediaAuditItem {
  id: number;
  title: string;
  date?: string;
  image?: string | null;
  status: 'ok' | 'broken' | 'missing' | 'embedded' | 'unchecked';
  reason?: string;
}

interface AdminVideoItem {
  id: number;
  title: string;
  date?: string;
  description?: string;
  filename?: string | null;
  url?: string | null;
}


export function DashboardTab() {
  const [cfg, setCfg] = useState<GiftConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>('general');
  const [serverImages, setServerImages] = useState<string[]>([]);
  const [auditItems, setAuditItems] = useState<MediaAuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [adminVideos, setAdminVideos] = useState<AdminVideoItem[]>([]);
  const [videoQuery, setVideoQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [morphTextsArr, setMorphTextsArr] = useState<string[]>(['happy', "women's day", 'em iu']);
  const [sphereImagesArr, setSphereImagesArr] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/api/gift-config`).then(r => r.json()),
      fetch(`${BASE_URL}/api/gift-images`).then(r => r.json()),
    ]).then(([config, images]) => {
      setCfg({ ...defaultConfig, ...config });
      try { setMorphTextsArr(JSON.parse(config.morphTexts || '[]')); } catch {}
      try { setSphereImagesArr(JSON.parse(config.sphereImages || '[]')); } catch {}
      setServerImages(images || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...cfg,
        morphTexts: JSON.stringify(morphTextsArr),
        sphereImages: JSON.stringify(sphereImagesArr),
      };
      const res = await fetch(`${BASE_URL}/api/gift-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast('Đã lưu cấu hình 💕', 'success');
      } else {
        toast('Lỗi khi lưu!', 'error');
      }
    } catch {
      toast('Lỗi kết nối!', 'error');
    }
    setSaving(false);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(`${BASE_URL}/api/gift-upload-image`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        const fullUrl = `${BASE_URL}${data.url}`;
        setServerImages(prev => [...prev, fullUrl]);
        toast('Tải ảnh lên thành công! 🖼️', 'success');
      }
    } catch {
      toast('Lỗi tải ảnh!', 'error');
    }
    setUploading(false);
  };

  const deleteServerImage = async (url: string) => {
    const filename = url.split('/').pop();
    if (!filename) return;
    await fetch(`${BASE_URL}/api/gift-images/${filename}`, { method: 'DELETE' });
    setServerImages(prev => prev.filter(u => u !== url));
    setSphereImagesArr(prev => prev.filter(u => u !== url));
    if (cfg.particleImage === url) setCfg(c => ({ ...c, particleImage: '' }));
    if (cfg.letterImage === url) setCfg(c => ({ ...c, letterImage: '' }));
  };


  const loadMediaAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/media-audit`);
      const data = await res.json();
      setAuditItems(data.items || []);
    } catch {
      toast('Không tải được danh sách ảnh DB', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  const loadAdminVideos = async () => {
    try {
      const res = await fetch(VIDEO_API_URL);
      const data = await res.json();
      setAdminVideos(Array.isArray(data) ? data : []);
    } catch {
      toast('Không tải được video', 'error');
    }
  };

  const clearMemoryImage = async (id: number) => {
    const ok = window.confirm('Xóa link ảnh khỏi kỷ niệm này? Nội dung kỷ niệm vẫn được giữ.');
    if (!ok) return;
    const res = await fetch(`${BASE_URL}/api/admin/memories/${id}/image`, { method: 'DELETE' });
    if (res.ok) {
      toast('Đã xóa link ảnh lỗi khỏi DB', 'success');
      loadMediaAudit();
    } else {
      toast('Xóa link ảnh thất bại', 'error');
    }
  };

  const deleteVideoAdmin = async (id: number) => {
    const ok = window.confirm('Xóa video này khỏi app?');
    if (!ok) return;
    const res = await fetch(`${VIDEO_API_URL}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAdminVideos(prev => prev.filter(v => v.id !== id));
      toast('Đã xóa video', 'success');
    }
  };

  useEffect(() => {
    if (section === 'library') {
      loadMediaAudit();
      loadAdminVideos();
    }
  }, [section]);

  const field = (key: keyof GiftConfig, value: string) =>
    setCfg(c => ({ ...c, [key]: value }));

  const toggleBool = (key: keyof GiftConfig) =>
    setCfg(c => ({ ...c, [key]: c[key] === 'true' ? 'false' : 'true' }));

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'50vh', color:'var(--plum-soft)', fontFamily:'var(--font-hand)', fontSize:'1.3rem' }}>
      Đang tải Dashboard... ⚙️
    </div>
  );

  const sections: { id: Section; emoji: string; label: string }[] = [
    { id: 'general',  emoji: '⚙️',  label: 'Chung' },
    { id: 'effects',  emoji: '✨',  label: 'Hiệu ứng' },
    { id: 'letter',   emoji: '💌',  label: 'Lá thư' },
    { id: 'media',    emoji: '🖼️',  label: 'Ảnh & Nhạc' },
    { id: 'library',  emoji: '🗂️',  label: 'Quản lý media' },
    { id: 'schedule', emoji: '📅',  label: 'Lịch hiển thị' },
  ];

  return (
    <div className="dashboard-root">
      {/* Header */}
      <div className="db-header">
        <div>
          <div className="db-title">🎁 Dashboard Quà Tặng</div>
          <div className="db-subtitle">Chỉnh sửa trang Món Quà Nhỏ</div>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <a
            href={`${BASE_URL}/mon-qua-nho/`}
            target="_blank"
            rel="noopener noreferrer"
            className="db-btn-outline"
          >
            🔗 Xem trang
          </a>
          <button className="db-btn-save" onClick={save} disabled={saving}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="db-section-tabs">
        {sections.map(s => (
          <button
            key={s.id}
            className={`db-section-tab ${section === s.id ? 'active' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="db-body">

        {/* ── GENERAL ── */}
        {section === 'general' && (
          <div className="db-section">
            <div className="db-card">
              <div className="db-card-title">Thông tin chung</div>
              <label className="db-label">Tiêu đề trang</label>
              <input className="db-input" value={cfg.appTitle} onChange={e => field('appTitle', e.target.value)} placeholder="Món Quà Nhỏ" />

              <label className="db-label">Trạng thái trang quà</label>
              <div className="db-toggle-row">
                <span className="db-toggle-label">{cfg.giftEnabled === 'true' ? '🟢 Đang bật' : '🔴 Đang tắt'}</span>
                <div className={`db-toggle ${cfg.giftEnabled === 'true' ? 'on' : ''}`} onClick={() => toggleBool('giftEnabled')}>
                  <div className="db-toggle-knob" />
                </div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-title">🔐 Mật khẩu</div>
              <div className="db-toggle-row" style={{ marginBottom:'14px' }}>
                <span className="db-toggle-label">Bật màn hình nhập mã</span>
                <div className={`db-toggle ${cfg.enablePasscode === 'true' ? 'on' : ''}`} onClick={() => toggleBool('enablePasscode')}>
                  <div className="db-toggle-knob" />
                </div>
              </div>
              {cfg.enablePasscode === 'true' && (
                <>
                  <label className="db-label">Mã (4 chữ số)</label>
                  <input className="db-input" value={cfg.passcode} onChange={e => field('passcode', e.target.value)} maxLength={4} placeholder="0308" />
                  <label className="db-label">Tiêu đề màn hình mã</label>
                  <input className="db-input" value={cfg.passcodeTitle} onChange={e => field('passcodeTitle', e.target.value)} />
                  <label className="db-label">Phụ đề</label>
                  <input className="db-input" value={cfg.passcodeSubtitle} onChange={e => field('passcodeSubtitle', e.target.value)} />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── EFFECTS ── */}
        {section === 'effects' && (
          <div className="db-section">
            <div className="db-card">
              <div className="db-card-title">Bật / Tắt hiệu ứng</div>
              {([
                ['enableMorphEffect',        '✨ Hiệu ứng hạt morph chữ'],
                ['enableSphere',             '🌐 Quả cầu ảnh 3D'],
                ['enableSphereFlyingImages', '🚀 Ảnh bay sau nổ cầu'],
                ['enableLetter',             '💌 Lá thư gõ chữ'],
              ] as [keyof GiftConfig, string][]).map(([k, label]) => (
                <div className="db-toggle-row" key={k}>
                  <span className="db-toggle-label">{label}</span>
                  <div className={`db-toggle ${cfg[k] === 'true' ? 'on' : ''}`} onClick={() => toggleBool(k)}>
                    <div className="db-toggle-knob" />
                  </div>
                </div>
              ))}
            </div>

            <div className="db-card">
              <div className="db-card-title">Chữ Morph Hạt</div>
              <div className="db-label" style={{ marginBottom:'8px' }}>Danh sách chữ (theo thứ tự)</div>
              {morphTextsArr.map((t, i) => (
                <div key={i} style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                  <input
                    className="db-input"
                    style={{ margin:0, flex:1 }}
                    value={t}
                    onChange={e => {
                      const arr = [...morphTextsArr]; arr[i] = e.target.value; setMorphTextsArr(arr);
                    }}
                  />
                  <button className="db-btn-icon" onClick={() => setMorphTextsArr(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button className="db-btn-add" onClick={() => setMorphTextsArr(prev => [...prev, ''])}>+ Thêm chữ</button>
            </div>
          </div>
        )}

        {/* ── LETTER ── */}
        {section === 'letter' && (
          <div className="db-section">
            <div className="db-card">
              <div className="db-card-title">💌 Nội dung lá thư</div>
              <label className="db-label">Nội dung thư (dùng Enter xuống dòng)</label>
              <textarea
                className="db-textarea"
                value={cfg.letterText}
                onChange={e => field('letterText', e.target.value)}
                rows={6}
                placeholder="Nhập nội dung lá thư..."
              />
              <label className="db-label">Caption cuối thư</label>
              <input className="db-input" value={cfg.letterCaption} onChange={e => field('letterCaption', e.target.value)} placeholder="♥" />

              <label className="db-label">Ảnh trong thư (chọn từ server)</label>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <input className="db-input" style={{ flex:1 }} value={cfg.letterImage} onChange={e => field('letterImage', e.target.value)} placeholder="URL ảnh hoặc chọn bên dưới" />
                {cfg.letterImage && <button className="db-btn-icon" onClick={() => field('letterImage', '')}>✕</button>}
              </div>
              {cfg.letterImage && (
                <img src={cfg.letterImage.startsWith('http') ? cfg.letterImage : `${BASE_URL}/${cfg.letterImage}`}
                  alt="" style={{ width:'100%', maxWidth:'200px', borderRadius:'10px', marginTop:'8px' }} />
              )}
              <div className="db-label" style={{ marginTop:'14px' }}>Chọn từ ảnh đã upload:</div>
              <ImagePicker images={serverImages} selected={cfg.letterImage} onSelect={url => field('letterImage', url)} />
            </div>
          </div>
        )}

        {/* ── MEDIA ── */}
        {section === 'media' && (
          <div className="db-section">
            <div className="db-card">
              <div className="db-card-title">📤 Upload ảnh lên server</div>
              <div
                className="db-dropzone"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadImage(f); }}
              >
                {uploading ? '⏳ Đang tải lên...' : '🖼️ Click hoặc kéo ảnh vào đây'}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />

              {serverImages.length > 0 && (
                <>
                  <div className="db-label" style={{ marginTop:'14px' }}>Ảnh trên server ({serverImages.length})</div>
                  <div className="db-image-grid">
                    {serverImages.map(url => (
                      <div key={url} className="db-image-item">
                        <img src={url} alt="" />
                        <button className="db-image-delete" onClick={() => deleteServerImage(url)}>✕</button>
                        <div className="db-image-actions">
                          <button title="Dùng cho Particle" onClick={() => field('particleImage', url)}>🔮</button>
                          <button title="Thêm vào Cầu" onClick={() => {
                            if (!sphereImagesArr.includes(url)) setSphereImagesArr(prev => [...prev, url]);
                          }}>🌐</button>
                          <button title="Dùng cho Thư" onClick={() => field('letterImage', url)}>💌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="db-card">
              <div className="db-card-title">🌐 Ảnh trên quả cầu</div>
              {sphereImagesArr.length === 0
                ? <div style={{ color:'var(--plum-soft)', fontFamily:'var(--font-hand)', opacity:0.6 }}>Chưa có ảnh nào. Chọn từ server bên trên 🌐</div>
                : sphereImagesArr.map((url, i) => (
                    <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px' }}>
                      <img src={url} alt="" style={{ width:'48px', height:'48px', objectFit:'cover', borderRadius:'8px' }} />
                      <span style={{ flex:1, fontSize:'0.8rem', color:'var(--plum-soft)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</span>
                      <button className="db-btn-icon" onClick={() => setSphereImagesArr(prev => prev.filter((_,j) => j !== i))}>✕</button>
                    </div>
                  ))}
              <div className="db-label" style={{ marginTop:'10px' }}>Ảnh Particle (morph hạt)</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <input className="db-input" style={{ flex:1 }} value={cfg.particleImage} onChange={e => field('particleImage', e.target.value)} placeholder="URL ảnh particle" />
                {cfg.particleImage && <button className="db-btn-icon" onClick={() => field('particleImage', '')}>✕</button>}
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-title">🎵 Nhạc nền</div>
              <label className="db-label">Đường dẫn nhạc (MP3)</label>
              <input className="db-input" value={cfg.bgMusic} onChange={e => field('bgMusic', e.target.value)} placeholder="assets/music/bgmusic.mp3" />
              <label className="db-label">Âm lượng (0.0 – 1.0)</label>
              <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                <input type="range" min="0" max="1" step="0.05"
                  value={parseFloat(cfg.bgVolume || '0.55')}
                  onChange={e => field('bgVolume', e.target.value)}
                  style={{ flex:1, accentColor:'var(--rose)' }}
                />
                <span style={{ fontFamily:'var(--font-hand)', color:'var(--plum)', minWidth:'36px' }}>
                  {parseFloat(cfg.bgVolume || '0.55').toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}


        {/* ── LIBRARY ── */}
        {section === 'library' && (
          <div className="db-section">
            <div className="db-card db-card-wide">
              <div className="db-card-title">🧯 Kiểm tra ảnh kỷ niệm trong database</div>
              <p className="db-help">Chỗ này giúp tìm ảnh vẫn còn lưu link trong DB nhưng không hiện trên app. Ảnh lỗi có thể xóa link để kỷ niệm không còn bị card trắng.</p>
              <div className="db-admin-summary">
                <div><b>{auditItems.length}</b><span>Tổng record</span></div>
                <div><b>{auditItems.filter(x => x.status === 'ok' || x.status === 'embedded').length}</b><span>Ảnh OK</span></div>
                <div><b>{auditItems.filter(x => x.status === 'broken').length}</b><span>Ảnh lỗi</span></div>
                <div><b>{auditItems.filter(x => x.status === 'missing').length}</b><span>Thiếu ảnh</span></div>
              </div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', margin:'12px 0' }}>
                <button className="db-btn-outline" onClick={loadMediaAudit}>{auditLoading ? '⏳ Đang quét...' : '🔍 Quét lại ảnh'}</button>
                <button className="db-btn-outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(auditItems.filter(x => x.status === 'broken'), null, 2))}>📋 Copy ảnh lỗi</button>
              </div>
              <div className="db-media-table">
                {auditItems.map(item => (
                  <div className={`db-media-row ${item.status}`} key={item.id}>
                    <div className="db-media-thumb">
                      {item.image ? <img src={item.image} alt="" onError={e => { (e.currentTarget.parentElement?.parentElement)?.classList.add('broken'); }} /> : <span>—</span>}
                    </div>
                    <div className="db-media-info">
                      <strong>#{item.id} · {item.title}</strong>
                      <small>{item.image || 'Không có ảnh'}</small>
                      <em>{item.reason || item.status}</em>
                    </div>
                    <div className="db-media-actions">
                      {item.image && <button onClick={() => window.open(item.image || '', '_blank')}>Mở</button>}
                      {item.image && <button onClick={() => navigator.clipboard.writeText(item.image || '')}>Copy</button>}
                      {item.image && <button className="danger" onClick={() => clearMemoryImage(item.id)}>Xóa link ảnh</button>}
                    </div>
                  </div>
                ))}
                {!auditItems.length && <div className="empty-state"><span className="big-heart">🖼️</span><h2>Chưa có dữ liệu</h2><p>Bấm “Quét lại ảnh” để kiểm tra.</p></div>}
              </div>
            </div>

            <div className="db-card db-card-wide">
              <div className="db-card-title">🎬 Quản lý video</div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'12px' }}>
                <input className="db-input" style={{ flex:1, margin:0 }} value={videoQuery} onChange={e => setVideoQuery(e.target.value)} placeholder="Tìm video theo tên hoặc mô tả..." />
                <button className="db-btn-outline" onClick={loadAdminVideos}>↻ Làm mới</button>
              </div>
              <div className="db-video-grid">
                {adminVideos
                  .filter(v => !videoQuery.trim() || [v.title, v.description].some(x => (x || '').toLowerCase().includes(videoQuery.toLowerCase())))
                  .map(v => {
                    const src = v.url || (v.filename ? `${BASE_URL}/videos-file/${v.filename}` : '');
                    return (
                      <div className="db-video-item" key={v.id}>
                        {src ? <video src={src} controls preload="metadata" /> : <div className="db-video-missing">Không có file</div>}
                        <strong>{v.title}</strong>
                        <small>{v.description || 'Không có mô tả'}</small>
                        <div className="db-media-actions">
                          {src && <button onClick={() => window.open(src, '_blank')}>Mở tab</button>}
                          <button className="danger" onClick={() => deleteVideoAdmin(v.id)}>Xóa</button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {section === 'schedule' && (
          <div className="db-section">
            <div className="db-card">
              <div className="db-card-title">📅 Lịch hiển thị trang quà</div>
              <p style={{ fontFamily:'var(--font-hand)', color:'var(--plum-soft)', fontSize:'1rem', marginBottom:'16px' }}>
                Để trống ngày bắt đầu / kết thúc nếu muốn hiển thị tự do.
              </p>

              <div className="db-toggle-row" style={{ marginBottom:'20px' }}>
                <span className="db-toggle-label" style={{ fontSize:'1.05rem' }}>
                  {cfg.giftEnabled === 'true' ? '🟢 Trang quà đang BẬT' : '🔴 Trang quà đang TẮT'}
                </span>
                <div className={`db-toggle ${cfg.giftEnabled === 'true' ? 'on' : ''}`} onClick={() => toggleBool('giftEnabled')}>
                  <div className="db-toggle-knob" />
                </div>
              </div>

              <label className="db-label">📅 Ngày bắt đầu hiển thị</label>
              <input type="date" className="db-input" value={cfg.giftStartDate}
                onChange={e => field('giftStartDate', e.target.value)} />

              <label className="db-label">📅 Ngày kết thúc hiển thị</label>
              <input type="date" className="db-input" value={cfg.giftEndDate}
                onChange={e => field('giftEndDate', e.target.value)} />

              {cfg.giftStartDate && cfg.giftEndDate && (
                <div style={{ marginTop:'16px', padding:'14px', background:'rgba(201,123,138,0.08)', borderRadius:'12px', fontFamily:'var(--font-hand)', color:'var(--plum)', fontSize:'1rem' }}>
                  📅 Trang sẽ hiển thị từ <strong>{cfg.giftStartDate}</strong> đến <strong>{cfg.giftEndDate}</strong>
                </div>
              )}
            </div>

            <div className="db-card">
              <div className="db-card-title">🔗 Link trang quà</div>
              <div style={{ fontFamily:'var(--font-hand)', color:'var(--plum-soft)', marginBottom:'10px' }}>
                Chia sẻ link này cho người nhận:
              </div>
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <input
                  className="db-input"
                  style={{ flex:1, margin:0 }}
                  value={`${BASE_URL}/mon-qua-nho/`}
                  readOnly
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button className="db-btn-outline" onClick={() => {
                  navigator.clipboard.writeText(`${BASE_URL}/mon-qua-nho/`);
                  toast('Đã copy link! 🔗', 'success');
                }}>
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating save */}
      <div className="db-floating-save">
        <button className="db-btn-save" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu tất cả'}
        </button>
      </div>
    </div>
  );
}

function ImagePicker({ images, selected, onSelect }: { images: string[]; selected: string; onSelect: (url: string) => void }) {
  if (!images.length) return <div style={{ color:'var(--plum-soft)', fontFamily:'var(--font-hand)', opacity:0.6, marginTop:'8px' }}>Chưa có ảnh nào trên server</div>;
  return (
    <div className="db-image-grid" style={{ marginTop:'8px' }}>
      {images.map(url => (
        <div
          key={url}
          className={`db-image-item ${selected === url ? 'selected' : ''}`}
          onClick={() => onSelect(selected === url ? '' : url)}
        >
          <img src={url} alt="" />
          {selected === url && <div className="db-image-check">✓</div>}
        </div>
      ))}
    </div>
  );
}
