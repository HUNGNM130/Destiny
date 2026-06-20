import React, { useEffect, useState, useRef } from 'react';
import { API_URL, BASE_URL, VIDEO_API_URL } from '../App';
import { exportMemoriesToPDF } from '../utils/exportMemoriesPdf';
import { toast } from './SweetAlert';
import { applySiteStyleConfig, FONT_OPTIONS, SITE_STYLE_DEFAULTS } from '../utils/siteStyle';
import type { Memory } from '../types';

interface GiftConfig {
  appTitle: string;
  appIcon: string;
  siteHeroEyebrow: string;
  siteHeroTitle: string;
  siteHeroSubtitle: string;
  siteGlobalNotice: string;
  loveStartDate: string;
  siteMotionIntensity: string;
  enableSiteAurora: string;
  enableCardSpotlight: string;
  adminWelcomeText: string;
  sitePrimaryColor: string;
  siteAccentColor: string;
  siteBackgroundStart: string;
  siteBackgroundMid: string;
  siteBackgroundEnd: string;
  siteTextColor: string;
  siteFontBody: string;
  siteFontDisplay: string;
  siteFontHand: string;
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
  appIcon: 'assets/images/couple.svg',
  siteHeroEyebrow: 'Private memory system',
  siteHeroTitle: 'Our Love Diary',
  siteHeroSubtitle: 'Mỗi khoảnh khắc là mãi mãi ✦',
  siteGlobalNotice: '',
  loveStartDate: '2025-09-20',
  siteMotionIntensity: '1',
  enableSiteAurora: 'true',
  enableCardSpotlight: 'true',
  adminWelcomeText: 'Điều khiển giao diện, nội dung và trang quà từ một nơi.',
  sitePrimaryColor: SITE_STYLE_DEFAULTS.sitePrimaryColor,
  siteAccentColor: SITE_STYLE_DEFAULTS.siteAccentColor,
  siteBackgroundStart: SITE_STYLE_DEFAULTS.siteBackgroundStart,
  siteBackgroundMid: SITE_STYLE_DEFAULTS.siteBackgroundMid,
  siteBackgroundEnd: SITE_STYLE_DEFAULTS.siteBackgroundEnd,
  siteTextColor: SITE_STYLE_DEFAULTS.siteTextColor,
  siteFontBody: SITE_STYLE_DEFAULTS.siteFontBody,
  siteFontDisplay: SITE_STYLE_DEFAULTS.siteFontDisplay,
  siteFontHand: SITE_STYLE_DEFAULTS.siteFontHand,
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

type Section = 'general' | 'content' | 'site' | 'effects' | 'letter' | 'media' | 'library' | 'schedule';
type AdminRecordTab = 'memories' | 'videos' | 'letters' | 'diary' | 'bucket' | 'goodnight';

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
interface AdminLetterItem {
  id: number;
  title: string;
  unlock_at: string;
  message?: string | null;
  preview?: string;
  cover_image?: string | null;
}

interface AdminDiaryItem {
  id: number;
  entry_date: string;
  mood?: string | null;
  content: string;
}

interface AdminBucketItem {
  id: number;
  title: string;
  notes?: string | null;
  done?: boolean;
  done_at?: string | null;
  image?: string | null;
}

interface AdminGoodnightItem {
  id: number;
  message: string;
  sent_at?: string;
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

const GIFT_ICON_ASSETS = [
  { label: 'Couple', path: 'assets/images/couple.svg', usage: 'Icon mặc định, ảnh cặp đôi ở màn nhập mã' },
  { label: 'Bear wait', path: 'assets/images/bearwait.svg', usage: 'Gấu bên trái ở màn nhập mã' },
  { label: 'Bear flower', path: 'assets/images/bearflower.svg', usage: 'Gấu bên phải ở màn nhập mã' },
  { label: 'Letter image', path: 'assets/images/letterimage.svg', usage: 'Ảnh minh hoạ lá thư' },
  { label: 'Cupid letter', path: 'assets/images/cupidletter.svg', usage: 'Cupid / thư tình' },
  { label: 'Butterfly left', path: 'assets/images/buomtrai.svg', usage: 'Bướm trang trí bên trái' },
  { label: 'Butterfly right', path: 'assets/images/buomphai.svg', usage: 'Bướm trang trí bên phải' },
];

function resolveAssetUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  if (url.startsWith('assets/')) return `${BASE_URL}/mon-qua-nho/${url}`;
  return `${BASE_URL}/${url}`;
}

function imageDeleteUrl(url: string) {
  const match = url.match(/\/api\/gift-images\/(\d+)\/data/);
  if (match) return `${BASE_URL}/api/gift-images/${match[1]}`;
  const filename = url.split('/').pop();
  return filename ? `${BASE_URL}/api/gift-images/${filename}` : '';
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
  const [adminMemories, setAdminMemories] = useState<Memory[]>([]);
  const [adminLetters, setAdminLetters] = useState<AdminLetterItem[]>([]);
  const [adminDiary, setAdminDiary] = useState<AdminDiaryItem[]>([]);
  const [adminBucket, setAdminBucket] = useState<AdminBucketItem[]>([]);
  const [adminGoodnight, setAdminGoodnight] = useState<AdminGoodnightItem[]>([]);
  const [recordsTab, setRecordsTab] = useState<AdminRecordTab>('memories');
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordQuery, setRecordQuery] = useState('');
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


  const exportPdf = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      exportMemoriesToPDF(Array.isArray(data) ? data : []);
      toast('Đã mở bản in PDF. Chọn Save as PDF trong hộp thoại in nhé 💌', 'success');
    } catch {
      toast('Không xuất được PDF lúc này', 'error');
    }
  };

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
        applySiteStyleConfig(payload);
        window.dispatchEvent(new CustomEvent('loveDiaryStyleUpdated', { detail: payload }));
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
        const url = data.url as string;
        setServerImages(prev => [url, ...prev]);
        toast('Tải ảnh lên thành công! 🖼️', 'success');
      }
    } catch {
      toast('Lỗi tải ảnh!', 'error');
    }
    setUploading(false);
  };

  const deleteServerImage = async (url: string) => {
    const endpoint = imageDeleteUrl(url);
    if (!endpoint) return;
    await fetch(endpoint, { method: 'DELETE' });
    setServerImages(prev => prev.filter(u => u !== url));
    setSphereImagesArr(prev => prev.filter(u => u !== url));
    if (cfg.particleImage === url) setCfg(c => ({ ...c, particleImage: '' }));
    if (cfg.letterImage === url) setCfg(c => ({ ...c, letterImage: '' }));
    if (cfg.appIcon === url) setCfg(c => ({ ...c, appIcon: 'assets/images/couple.svg' }));
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

  const loadAdminMemories = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    setAdminMemories(Array.isArray(data) ? data : []);
  };

  const loadAdminLetters = async () => {
    const res = await fetch(`${BASE_URL}/api/admin/letters`);
    const data = await res.json();
    setAdminLetters(Array.isArray(data) ? data : []);
  };

  const loadAdminDiary = async () => {
    const res = await fetch(`${BASE_URL}/api/diary-entries`);
    const data = await res.json();
    setAdminDiary(Array.isArray(data) ? data : []);
  };

  const loadAdminBucket = async () => {
    const res = await fetch(`${BASE_URL}/api/bucket-items`);
    const data = await res.json();
    setAdminBucket(Array.isArray(data) ? data : []);
  };

  const loadAdminGoodnight = async () => {
    const res = await fetch(`${BASE_URL}/api/goodnight-messages`);
    const data = await res.json();
    setAdminGoodnight(Array.isArray(data) ? data : []);
  };

  const loadAdminRecords = async () => {
    setRecordsLoading(true);
    try {
      if (recordsTab === 'memories') await loadAdminMemories();
      if (recordsTab === 'videos') await loadAdminVideos();
      if (recordsTab === 'letters') await loadAdminLetters();
      if (recordsTab === 'diary') await loadAdminDiary();
      if (recordsTab === 'bucket') await loadAdminBucket();
      if (recordsTab === 'goodnight') await loadAdminGoodnight();
    } catch {
      toast('Không tải được dữ liệu quản trị', 'error');
    } finally {
      setRecordsLoading(false);
    }
  };

  const saveMemoryQuick = async (m: Memory) => {
    const fd = new FormData();
    fd.append('title', m.title || 'Kỷ niệm');
    fd.append('date', toDateInput(m.date) || new Date().toISOString().slice(0, 10));
    fd.append('description', m.description || '');
    fd.append('mood', m.mood || 'happy');
    fd.append('location', m.location || '');
    fd.append('music', m.music || '');
    fd.append('music_url', m.music_url || '');
    fd.append('music_kind', m.music_kind || '');
    fd.append('music_file_id', m.music_file_id ? String(m.music_file_id) : '');
    fd.append('latitude', m.latitude != null ? String(m.latitude) : '');
    fd.append('longitude', m.longitude != null ? String(m.longitude) : '');
    fd.append('place_name', m.place_name || '');
    fd.append('is_capsule', m.is_capsule ? 'true' : 'false');
    fd.append('capsule_unlock_at', m.capsule_unlock_at || '');
    const res = await fetch(`${API_URL}/${m.id}`, { method: 'PUT', body: fd });
    if (res.ok) { toast('Đã lưu kỷ niệm', 'success'); loadAdminMemories(); }
    else toast('Không lưu được kỷ niệm', 'error');
  };

  const saveVideoQuick = async (v: AdminVideoItem) => {
    const fd = new FormData();
    fd.append('title', v.title || 'Video');
    fd.append('date', toDateInput(v.date) || new Date().toISOString().slice(0, 10));
    fd.append('description', v.description || '');
    const res = await fetch(`${VIDEO_API_URL}/${v.id}`, { method: 'PUT', body: fd });
    if (res.ok) { toast('Đã lưu video', 'success'); loadAdminVideos(); }
    else toast('Không lưu được video', 'error');
  };

  const saveLetterQuick = async (letter: AdminLetterItem) => {
    const res = await fetch(`${BASE_URL}/api/letters/${letter.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: letter.title,
        unlock_at: toDateInput(letter.unlock_at),
        message: letter.message || letter.preview || '',
        cover_image: letter.cover_image || null,
      }),
    });
    if (res.ok) { toast('Đã lưu thư', 'success'); loadAdminLetters(); }
    else toast('Không lưu được thư', 'error');
  };

  const saveDiaryQuick = async (entry: AdminDiaryItem) => {
    const res = await fetch(`${BASE_URL}/api/diary-entries/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_date: toDateInput(entry.entry_date), mood: entry.mood || null, content: entry.content }),
    });
    if (res.ok) { toast('Đã lưu nhật ký', 'success'); loadAdminDiary(); }
    else toast('Không lưu được nhật ký', 'error');
  };

  const saveBucketQuick = async (item: AdminBucketItem) => {
    const res = await fetch(`${BASE_URL}/api/bucket-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, notes: item.notes || '', done: !!item.done, done_at: item.done_at || null, image: item.image || null }),
    });
    if (res.ok) { toast('Đã lưu bucket item', 'success'); loadAdminBucket(); }
    else toast('Không lưu được bucket item', 'error');
  };

  const saveGoodnightQuick = async (item: AdminGoodnightItem) => {
    const res = await fetch(`${BASE_URL}/api/goodnight-messages/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: item.message }),
    });
    if (res.ok) { toast('Đã lưu lời chúc', 'success'); loadAdminGoodnight(); }
    else toast('Không lưu được lời chúc', 'error');
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

  useEffect(() => {
    if (section === 'content') loadAdminRecords();
  }, [section, recordsTab]);

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
    { id: 'content',  emoji: '🧩',  label: 'Nội dung web' },
    { id: 'site',     emoji: '🎨',  label: 'Màu & font web' },
    { id: 'effects',  emoji: '✨',  label: 'Hiệu ứng' },
    { id: 'letter',   emoji: '💌',  label: 'Lá thư' },
    { id: 'media',    emoji: '🖼️',  label: 'Ảnh & Nhạc' },
    { id: 'library',  emoji: '🗂️',  label: 'Quản lý media' },
    { id: 'schedule', emoji: '📅',  label: 'Lịch hiển thị' },
  ];

  const recordTabs: { id: AdminRecordTab; emoji: string; label: string; count: number }[] = [
    { id: 'memories',  emoji: '📷', label: 'Kỷ niệm', count: adminMemories.length },
    { id: 'videos',    emoji: '🎬', label: 'Video', count: adminVideos.length },
    { id: 'letters',   emoji: '💌', label: 'Thư', count: adminLetters.length },
    { id: 'diary',     emoji: '📓', label: 'Nhật ký', count: adminDiary.length },
    { id: 'bucket',    emoji: '🎯', label: 'Bucket', count: adminBucket.length },
    { id: 'goodnight', emoji: '🌙', label: 'Good night', count: adminGoodnight.length },
  ];

  const q = recordQuery.trim().toLowerCase();

  return (
    <div className="dashboard-root">
      {/* Header */}
      <div className="db-header">
        <div>
          <div className="db-kicker">React Bits inspired</div>
          <div className="db-title">⚡ Admin Command Center</div>
          <div className="db-subtitle">{cfg.adminWelcomeText || 'Chỉnh sửa toàn bộ website trong một dashboard'}</div>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <button className="db-btn-outline" onClick={exportPdf}>📤 Xuất PDF</button>
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

            <div className="db-card db-card-wide db-reactbits-card">
              <div className="db-card-title">🪄 Hero website chính</div>
              <p className="db-help">Các trường này đổi trực tiếp phần đầu trang của app chính — tiêu đề, subtitle, badge và thông báo nổi.</p>
              <label className="db-label">Badge / Eyebrow</label>
              <input className="db-input" value={cfg.siteHeroEyebrow} onChange={e => field('siteHeroEyebrow', e.target.value)} placeholder="Private memory system" />
              <label className="db-label">Tiêu đề lớn</label>
              <input className="db-input" value={cfg.siteHeroTitle} onChange={e => field('siteHeroTitle', e.target.value)} placeholder="Our Love Diary" />
              <label className="db-label">Subtitle</label>
              <input className="db-input" value={cfg.siteHeroSubtitle} onChange={e => field('siteHeroSubtitle', e.target.value)} placeholder="Mỗi khoảnh khắc là mãi mãi ✦" />
              <label className="db-label">Ngày bắt đầu yêu</label>
              <input type="date" className="db-input" value={cfg.loveStartDate} onChange={e => field('loveStartDate', e.target.value)} />
              <label className="db-label">Thông báo nổi trên trang chủ</label>
              <textarea className="db-textarea" rows={3} value={cfg.siteGlobalNotice} onChange={e => field('siteGlobalNotice', e.target.value)} placeholder="Ví dụ: Có một kỷ niệm mới vừa được thêm vào..." />
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
 

        {/* ── CONTENT MANAGER ── */}
        {section === 'content' && (
          <div className="db-section">
            <div className="db-card db-card-wide db-command-panel">
              <div>
                <div className="db-kicker">Full-site editor</div>
                <div className="db-card-title">🧩 Quản trị nội dung toàn website</div>
                <p className="db-help">Sửa nhanh tiêu đề, ngày, mô tả và trạng thái của các phần chính mà không cần rời dashboard.</p>
              </div>
              <div className="db-command-actions">
                <input className="db-input" value={recordQuery} onChange={e => setRecordQuery(e.target.value)} placeholder="Tìm nhanh theo tiêu đề / nội dung..." />
                <button className="db-btn-outline" onClick={loadAdminRecords}>{recordsLoading ? '⏳ Đang tải...' : '↻ Làm mới'}</button>
              </div>
            </div>

            <div className="db-record-tabs">
              {recordTabs.map(t => (
                <button key={t.id} className={`db-record-tab ${recordsTab === t.id ? 'active' : ''}`} onClick={() => setRecordsTab(t.id)}>
                  <span>{t.emoji}</span><b>{t.label}</b><em>{t.count}</em>
                </button>
              ))}
            </div>

            {recordsTab === 'memories' && (
              <div className="db-record-grid">
                {adminMemories
                  .filter(m => !q || [m.title, m.description, m.location, m.music].some(x => (x || '').toLowerCase().includes(q)))
                  .slice(0, 24)
                  .map(m => (
                  <article className="db-record-card" key={m.id}>
                    <div className="db-record-head"><span>#{m.id}</span><strong>Kỷ niệm</strong></div>
                    <label className="db-label">Tiêu đề</label>
                    <input className="db-input" value={m.title} onChange={e => setAdminMemories(prev => prev.map(x => x.id === m.id ? { ...x, title: e.target.value } : x))} />
                    <label className="db-label">Ngày</label>
                    <input type="date" className="db-input" value={toDateInput(m.date)} onChange={e => setAdminMemories(prev => prev.map(x => x.id === m.id ? { ...x, date: e.target.value } : x))} />
                    <label className="db-label">Mô tả</label>
                    <textarea className="db-textarea" rows={3} value={m.description || ''} onChange={e => setAdminMemories(prev => prev.map(x => x.id === m.id ? { ...x, description: e.target.value } : x))} />
                    <div className="db-two-cols">
                      <div><label className="db-label">Mood</label><input className="db-input" value={m.mood || ''} onChange={e => setAdminMemories(prev => prev.map(x => x.id === m.id ? { ...x, mood: e.target.value } : x))} /></div>
                      <div><label className="db-label">Địa điểm</label><input className="db-input" value={m.location || ''} onChange={e => setAdminMemories(prev => prev.map(x => x.id === m.id ? { ...x, location: e.target.value } : x))} /></div>
                    </div>
                    <div className="db-record-actions">
                      <button className="db-btn-save" onClick={() => saveMemoryQuick(m)}>💾 Lưu</button>
                      <button className="db-btn-outline" onClick={() => window.open(m.image || '', '_blank')} disabled={!m.image}>Mở ảnh</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {recordsTab === 'videos' && (
              <div className="db-record-grid">
                {adminVideos
                  .filter(v => !q || [v.title, v.description].some(x => (x || '').toLowerCase().includes(q)))
                  .slice(0, 24)
                  .map(v => (
                  <article className="db-record-card" key={v.id}>
                    <div className="db-record-head"><span>#{v.id}</span><strong>Video</strong></div>
                    <label className="db-label">Tiêu đề</label>
                    <input className="db-input" value={v.title} onChange={e => setAdminVideos(prev => prev.map(x => x.id === v.id ? { ...x, title: e.target.value } : x))} />
                    <label className="db-label">Ngày</label>
                    <input type="date" className="db-input" value={toDateInput(v.date)} onChange={e => setAdminVideos(prev => prev.map(x => x.id === v.id ? { ...x, date: e.target.value } : x))} />
                    <label className="db-label">Mô tả</label>
                    <textarea className="db-textarea" rows={3} value={v.description || ''} onChange={e => setAdminVideos(prev => prev.map(x => x.id === v.id ? { ...x, description: e.target.value } : x))} />
                    <div className="db-record-actions"><button className="db-btn-save" onClick={() => saveVideoQuick(v)}>💾 Lưu</button></div>
                  </article>
                ))}
              </div>
            )}

            {recordsTab === 'letters' && (
              <div className="db-record-grid">
                {adminLetters
                  .filter(l => !q || [l.title, l.message, l.preview].some(x => (x || '').toLowerCase().includes(q)))
                  .slice(0, 24)
                  .map(l => (
                  <article className="db-record-card" key={l.id}>
                    <div className="db-record-head"><span>#{l.id}</span><strong>Thư khóa hẹn</strong></div>
                    <label className="db-label">Tiêu đề</label>
                    <input className="db-input" value={l.title} onChange={e => setAdminLetters(prev => prev.map(x => x.id === l.id ? { ...x, title: e.target.value } : x))} />
                    <label className="db-label">Ngày mở khóa</label>
                    <input type="date" className="db-input" value={toDateInput(l.unlock_at)} onChange={e => setAdminLetters(prev => prev.map(x => x.id === l.id ? { ...x, unlock_at: e.target.value } : x))} />
                    <label className="db-label">Nội dung</label>
                    <textarea className="db-textarea" rows={4} value={l.message || l.preview || ''} onChange={e => setAdminLetters(prev => prev.map(x => x.id === l.id ? { ...x, message: e.target.value } : x))} />
                    <label className="db-label">Ảnh bìa</label>
                    <input className="db-input" value={l.cover_image || ''} onChange={e => setAdminLetters(prev => prev.map(x => x.id === l.id ? { ...x, cover_image: e.target.value } : x))} />
                    <div className="db-record-actions"><button className="db-btn-save" onClick={() => saveLetterQuick(l)}>💾 Lưu</button></div>
                  </article>
                ))}
              </div>
            )}

            {recordsTab === 'diary' && (
              <div className="db-record-grid">
                {adminDiary
                  .filter(d => !q || [d.content, d.mood].some(x => (x || '').toLowerCase().includes(q)))
                  .slice(0, 24)
                  .map(d => (
                  <article className="db-record-card" key={d.id}>
                    <div className="db-record-head"><span>#{d.id}</span><strong>Nhật ký</strong></div>
                    <label className="db-label">Ngày</label>
                    <input type="date" className="db-input" value={toDateInput(d.entry_date)} onChange={e => setAdminDiary(prev => prev.map(x => x.id === d.id ? { ...x, entry_date: e.target.value } : x))} />
                    <label className="db-label">Mood</label>
                    <input className="db-input" value={d.mood || ''} onChange={e => setAdminDiary(prev => prev.map(x => x.id === d.id ? { ...x, mood: e.target.value } : x))} />
                    <label className="db-label">Nội dung</label>
                    <textarea className="db-textarea" rows={5} value={d.content || ''} onChange={e => setAdminDiary(prev => prev.map(x => x.id === d.id ? { ...x, content: e.target.value } : x))} />
                    <div className="db-record-actions"><button className="db-btn-save" onClick={() => saveDiaryQuick(d)}>💾 Lưu</button></div>
                  </article>
                ))}
              </div>
            )}

            {recordsTab === 'bucket' && (
              <div className="db-record-grid">
                {adminBucket
                  .filter(b => !q || [b.title, b.notes].some(x => (x || '').toLowerCase().includes(q)))
                  .slice(0, 24)
                  .map(b => (
                  <article className="db-record-card" key={b.id}>
                    <div className="db-record-head"><span>#{b.id}</span><strong>Bucket item</strong></div>
                    <label className="db-label">Tiêu đề</label>
                    <input className="db-input" value={b.title} onChange={e => setAdminBucket(prev => prev.map(x => x.id === b.id ? { ...x, title: e.target.value } : x))} />
                    <label className="db-label">Ghi chú</label>
                    <textarea className="db-textarea" rows={3} value={b.notes || ''} onChange={e => setAdminBucket(prev => prev.map(x => x.id === b.id ? { ...x, notes: e.target.value } : x))} />
                    <div className="db-toggle-row"><span className="db-toggle-label">Hoàn thành</span><div className={`db-toggle ${b.done ? 'on' : ''}`} onClick={() => setAdminBucket(prev => prev.map(x => x.id === b.id ? { ...x, done: !x.done } : x))}><div className="db-toggle-knob" /></div></div>
                    <label className="db-label">Ngày hoàn thành</label>
                    <input type="date" className="db-input" value={toDateInput(b.done_at)} onChange={e => setAdminBucket(prev => prev.map(x => x.id === b.id ? { ...x, done_at: e.target.value } : x))} />
                    <div className="db-record-actions"><button className="db-btn-save" onClick={() => saveBucketQuick(b)}>💾 Lưu</button></div>
                  </article>
                ))}
              </div>
            )}

            {recordsTab === 'goodnight' && (
              <div className="db-record-grid">
                {adminGoodnight
                  .filter(g => !q || (g.message || '').toLowerCase().includes(q))
                  .slice(0, 24)
                  .map(g => (
                  <article className="db-record-card" key={g.id}>
                    <div className="db-record-head"><span>#{g.id}</span><strong>Lời chúc ngủ ngon</strong></div>
                    <label className="db-label">Tin nhắn</label>
                    <textarea className="db-textarea" rows={4} value={g.message || ''} onChange={e => setAdminGoodnight(prev => prev.map(x => x.id === g.id ? { ...x, message: e.target.value } : x))} />
                    <div className="db-record-actions"><button className="db-btn-save" onClick={() => saveGoodnightQuick(g)}>💾 Lưu</button></div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}


        {/* ── SITE STYLE ── */}
        {section === 'site' && (
          <div className="db-section">
            <div className="db-card db-card-wide">
              <div className="db-card-title">🎨 Màu toàn bộ website</div>
              <p className="db-help">Các màu này được lưu vào database và áp dụng cho app chính lẫn trang quà khi mở lại.</p>
              <div className="db-style-grid">
                {([
                  ['sitePrimaryColor', 'Màu chính'],
                  ['siteAccentColor', 'Màu phụ'],
                  ['siteBackgroundStart', 'Nền đầu'],
                  ['siteBackgroundMid', 'Nền giữa'],
                  ['siteBackgroundEnd', 'Nền cuối'],
                  ['siteTextColor', 'Màu chữ'],
                ] as [keyof GiftConfig, string][]).map(([key, label]) => (
                  <label className="db-color-field" key={key}>
                    <span>{label}</span>
                    <input type="color" value={cfg[key]} onChange={e => field(key, e.target.value)} />
                    <input className="db-input" value={cfg[key]} onChange={e => field(key, e.target.value)} />
                  </label>
                ))}
              </div>
              <div className="db-style-preview" style={{
                background: `linear-gradient(135deg, ${cfg.siteBackgroundStart}, ${cfg.siteBackgroundMid}, ${cfg.siteBackgroundEnd})`,
                color: cfg.siteTextColor,
                borderColor: cfg.siteAccentColor,
              }}>
                <span style={{ background: cfg.sitePrimaryColor }}>♥</span>
                <div>
                  <b style={{ fontFamily: cfg.siteFontDisplay }}>Preview giao diện</b>
                  <small style={{ fontFamily: cfg.siteFontBody }}>Màu và font sẽ đổi ngay sau khi bấm Lưu.</small>
                </div>
              </div>

              <div className="db-effects-matrix">
                <div className="db-toggle-row"><span className="db-toggle-label">🌌 Aurora background React Bits style</span><div className={`db-toggle ${cfg.enableSiteAurora === 'true' ? 'on' : ''}`} onClick={() => toggleBool('enableSiteAurora')}><div className="db-toggle-knob" /></div></div>
                <div className="db-toggle-row"><span className="db-toggle-label">🪩 Card spotlight / glass hover</span><div className={`db-toggle ${cfg.enableCardSpotlight === 'true' ? 'on' : ''}`} onClick={() => toggleBool('enableCardSpotlight')}><div className="db-toggle-knob" /></div></div>
                <label className="db-label">Cường độ motion ({Number(cfg.siteMotionIntensity || 1).toFixed(1)}x)</label>
                <input type="range" min="0" max="2" step="0.1" value={cfg.siteMotionIntensity} onChange={e => field('siteMotionIntensity', e.target.value)} style={{ width:'100%', accentColor:'var(--rose)' }} />
              </div>
            </div>

            <div className="db-card db-card-wide">
              <div className="db-card-title">🔤 Phông chữ toàn bộ website</div>
              <label className="db-label">Font nội dung</label>
              <select className="db-input" value={cfg.siteFontBody} onChange={e => field('siteFontBody', e.target.value)}>
                {FONT_OPTIONS.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
              <label className="db-label">Font tiêu đề</label>
              <select className="db-input" value={cfg.siteFontDisplay} onChange={e => field('siteFontDisplay', e.target.value)}>
                {FONT_OPTIONS.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
              <label className="db-label">Font chữ viết tay / note</label>
              <select className="db-input" value={cfg.siteFontHand} onChange={e => field('siteFontHand', e.target.value)}>
                {FONT_OPTIONS.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
              <button className="db-btn-outline" onClick={() => setCfg(c => ({ ...c, ...SITE_STYLE_DEFAULTS }))}>↩️ Về mặc định</button>
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
                <img src={resolveAssetUrl(cfg.letterImage)}
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
                        <img src={resolveAssetUrl(url)} alt="" />
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


            <div className="db-card db-card-wide">
              <div className="db-card-title">🧸 Icon / hình đang dùng trong Món Quà Nhỏ</div>
              <p className="db-help">Đây là các file icon có sẵn trong thư mục <code>public/mon-qua-nho/assets/images</code>. Bạn có thể chọn dùng làm icon trang, ảnh particle, ảnh thư hoặc thêm vào quả cầu.</p>
              <div className="db-icon-library">
                {GIFT_ICON_ASSETS.map(icon => {
                  const url = `mon-qua-nho/${icon.path}`;
                  return (
                    <div className="db-icon-item" key={icon.path}>
                      <img src={resolveAssetUrl(url)} alt={icon.label} />
                      <div>
                        <strong>{icon.label}</strong>
                        <small>{icon.path}</small>
                        <em>{icon.usage}</em>
                      </div>
                      <div className="db-image-actions">
                        <button title="Dùng làm icon trang quà" onClick={() => field('appIcon', icon.path)}>🏷️</button>
                        <button title="Dùng làm particle" onClick={() => field('particleImage', icon.path)}>🔮</button>
                        <button title="Thêm vào quả cầu" onClick={() => {
                          if (!sphereImagesArr.includes(icon.path)) setSphereImagesArr(prev => [...prev, icon.path]);
                        }}>🌐</button>
                        <button title="Dùng cho thư" onClick={() => field('letterImage', icon.path)}>💌</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <label className="db-label" style={{ marginTop:'14px' }}>Icon trang quà hiện tại</label>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <input className="db-input" style={{ flex:1, margin:0 }} value={cfg.appIcon} onChange={e => field('appIcon', e.target.value)} />
                {cfg.appIcon && <img src={resolveAssetUrl(cfg.appIcon)} alt="" style={{ width:42, height:42, objectFit:'contain' }} />}
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-title">🌐 Ảnh trên quả cầu</div>
              {sphereImagesArr.length === 0
                ? <div style={{ color:'var(--plum-soft)', fontFamily:'var(--font-hand)', opacity:0.6 }}>Chưa có ảnh nào. Chọn từ server bên trên 🌐</div>
                : sphereImagesArr.map((url, i) => (
                    <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'8px' }}>
                      <img src={resolveAssetUrl(url)} alt="" style={{ width:'48px', height:'48px', objectFit:'cover', borderRadius:'8px' }} />
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
          <img src={resolveAssetUrl(url)} alt="" />
          {selected === url && <div className="db-image-check">✓</div>}
        </div>
      ))}
    </div>
  );
}
