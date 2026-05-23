import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BASE_URL } from '../App';

interface Props {
  active: boolean;
  onSaved: () => void;
}

type CameraState = 'live' | 'preview' | 'caption';
type FilterKey = 'none' | 'warm' | 'cool' | 'rosy' | 'vintage' | 'bw' | 'dreamy';

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: 'none',    label: 'Normal',  emoji: '🌿' },
  { key: 'warm',    label: 'Warm',    emoji: '🌅' },
  { key: 'cool',    label: 'Cool',    emoji: '❄️' },
  { key: 'rosy',    label: 'Rosy',    emoji: '🌸' },
  { key: 'vintage', label: 'Vintage', emoji: '📜' },
  { key: 'bw',      label: 'B&W',     emoji: '🖤' },
  { key: 'dreamy',  label: 'Dreamy',  emoji: '✨' },
];

const CSS_FILTERS: Record<FilterKey, string> = {
  none: 'none',
  warm: 'saturate(1.3) sepia(0.25) brightness(1.05)',
  cool: 'saturate(0.9) hue-rotate(20deg) brightness(1.02)',
  rosy: 'saturate(1.4) hue-rotate(-15deg) brightness(1.05)',
  vintage: 'sepia(0.5) contrast(0.9) brightness(0.95) saturate(0.8)',
  bw: 'grayscale(1) contrast(1.1)',
  dreamy: 'brightness(1.1) saturate(1.2) contrast(0.9)',
};

export function CameraTab({ active, onSaved }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [camState, setCamState] = useState<CameraState>('live');
  const [filter, setFilter] = useState<FilterKey>('none');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [timerMode, setTimerMode] = useState(0);
  const [timerCount, setTimerCount] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capTitle, setCapTitle] = useState('');
  const [capDate, setCapDate] = useState(new Date().toISOString().split('T')[0]);
  const [capDesc, setCapDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [noCam, setNoCam] = useState(false);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    setNoCam(false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamState('live');
    } catch {
      setNoCam(true);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (active) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [active, startCamera]);

  const snap = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setFlashing(true);
    setTimeout(() => setFlashing(false), 300);

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2, sy = (vh - side) / 2;
    canvas.width = side; canvas.height = side;
    const ctx = canvas.getContext('2d')!;
    ctx.filter = CSS_FILTERS[filter];
    if (facingMode === 'user') { ctx.translate(side, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
    if (facingMode === 'user') ctx.setTransform(1,0,0,1,0,0);

    canvas.toBlob(blob => {
      if (!blob) return;
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setCamState('preview');
    }, 'image/jpeg', 0.92);
  }, [filter, facingMode]);

  const handleShutter = () => {
    if (!streamRef.current) return;
    if (timerMode > 0) {
      let n = timerMode;
      setTimerCount(n);
      const iv = setInterval(() => {
        n--;
        if (n <= 0) { clearInterval(iv); setTimerCount(null); snap(); }
        else setTimerCount(n);
      }, 1000);
    } else {
      snap();
    }
  };

  const handleFlip = async () => {
    stopCamera();
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    streamRef.current = null;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setNoCam(true); }
  };

  const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCamState('preview');
    e.target.value = '';
  };

  const handleConfirmSave = async () => {
    if (!capturedBlob || !capDate) return;
    setSaving(true);
    const [yyyy, mm, dd] = capDate.split('-');
    const fd = new FormData();
    fd.append('title', capTitle || 'Khoảnh khắc của chúng mình ♥');
    fd.append('date', `${yyyy}-${mm}-${dd}`);
    fd.append('description', capDesc);
    fd.append('image', capturedBlob, 'camera.jpg');
    try {
      const resp = await fetch(`${BASE_URL}/memories`, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error();
      setCapTitle(''); setCapDesc(''); setPreviewUrl(''); setCapturedBlob(null);
      setCamState('live');
      onSaved();
    } catch { alert('Lỗi khi lưu ảnh!'); }
    finally { setSaving(false); }
  };

  const filterStyle = (f: FilterKey): React.CSSProperties => ({
    filter: CSS_FILTERS[f],
  });

  return (
    <div id="pageCamera">
      <div id="locShell">
        {/* Viewfinder */}
        <div id="locViewfinder">
          {noCam ? (
            <div className="loc-no-camera">
              <p>Không thể truy cập camera 😢</p>
              <small>Kiểm tra quyền camera trong trình duyệt nhé</small>
            </div>
          ) : (
            <>
              <video
                ref={videoRef} autoPlay muted playsInline
                style={{ display: camState === 'live' ? 'block' : 'none', filter: CSS_FILTERS[filter] }}
                className={facingMode === 'user' ? 'mirrored' : ''}
              />
              {camState !== 'live' && previewUrl && (
                <div id="locPreviewOverlay">
                  <img id="locPreviewImg" src={previewUrl} alt="preview" style={filterStyle(filter)} />
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {flashing && <div id="locFlash" className="firing" />}
          {timerCount !== null && (
            <div id="locTimerBadge">{timerCount}</div>
          )}
          <button id="locFlipBtn" onClick={handleFlip} aria-label="Lật camera">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.44"/>
            </svg>
          </button>
        </div>

        {/* Filter strip */}
        <div id="locFilterStrip" style={{ display: camState !== 'caption' ? 'flex' : 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`loc-filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        {camState === 'live' && (
          <div id="locControls">
            <button className={`loc-side-btn ${timerMode > 0 ? 'active-timer' : ''}`} onClick={() => {
              const cycle = [0,3,10];
              setTimerMode(cycle[(cycle.indexOf(timerMode)+1)%cycle.length]);
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 3"/><path d="M9 3h6M12 3v2"/>
              </svg>
              <span>{timerMode === 0 ? 'Tắt' : timerMode + 's'}</span>
            </button>

            <button id="locShutter" onClick={handleShutter} aria-label="Chụp ảnh">
              <div id="locShutterRing" />
            </button>

            <button className="loc-side-btn" onClick={() => galleryInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>Thư viện</span>
            </button>
            <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryFile} />
          </div>
        )}

        {/* Preview controls */}
        {camState === 'preview' && (
          <div id="locPreviewControls">
            <button className="loc-pv-btn" onClick={() => { URL.revokeObjectURL(previewUrl); setCamState('live'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.44"/>
              </svg>
              Chụp lại
            </button>
            <button className="loc-pv-btn primary" onClick={() => setCamState('caption')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Dùng ảnh này
            </button>
          </div>
        )}

        {/* Caption sheet */}
        {camState === 'caption' && (
          <div id="locCaptionSheet">
            <div id="locCaptionThumb">
              <img src={previewUrl} alt="" style={filterStyle(filter)} />
            </div>
            <div id="locCaptionFields">
              <input type="text" value={capTitle} onChange={e => setCapTitle(e.target.value)}
                placeholder="Khoảnh khắc này... ♥" maxLength={80} />
              <input type="date" value={capDate} onChange={e => setCapDate(e.target.value)} />
              <textarea value={capDesc} onChange={e => setCapDesc(e.target.value)}
                rows={2} placeholder="Viết gì đó thật dễ thương nhé..." />
            </div>
            <div id="locCaptionActions">
              <button onClick={() => setCamState('preview')}>← Quay lại</button>
              <button onClick={handleConfirmSave} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu vào Kỷ niệm ♥'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}