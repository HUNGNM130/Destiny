import React, { useRef, useState, useEffect } from 'react';
import type { Memory } from '../types';
import { BASE_URL } from '../types';
import { API_URL } from '../App';
import { sweetAlert, toast } from './SweetAlert';

interface Props { editing?: Memory; onClose: () => void; onSaved: () => void; }
interface GeoResult { label: string; lat: number; lon: number; type?: string; }

export function MemoryFormModal({ editing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(editing?.title || '');
  const [date, setDate]   = useState(editing?.date ? editing.date.split('T')[0] : '');
  const [desc, setDesc]   = useState(editing?.description || '');
  const [location, setLocation] = useState(editing?.location || editing?.place_name || '');
  const [placeName, setPlaceName] = useState(editing?.place_name || editing?.location || '');
  const [latitude, setLatitude] = useState(editing?.latitude != null ? String(editing.latitude) : '');
  const [longitude, setLongitude] = useState(editing?.longitude != null ? String(editing.longitude) : '');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [music, setMusic] = useState(editing?.music || '');
  const [musicUrl, setMusicUrl] = useState(editing?.music_url || '');
  const [musicKind, setMusicKind] = useState(editing?.music_kind || (editing?.music_url?.includes('youtu') ? 'youtube' : editing?.music_url ? 'link' : 'text'));
  const [musicFileId, setMusicFileId] = useState(editing?.music_file_id ? String(editing.music_file_id) : '');
  const [mood, setMood] = useState(editing?.mood || '🥰');
  const [isCapsule, setIsCapsule] = useState(Boolean(editing?.is_capsule));
  const [capsuleUnlockAt, setCapsuleUnlockAt] = useState(editing?.capsule_unlock_at ? editing.capsule_unlock_at.split('T')[0] : '');
  const [saving, setSaving] = useState(false);
  const [cropperActive, setCropperActive] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(editing?.image || '');
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const cropperRef    = useRef<unknown | null>(null);
  const cropImgRef    = useRef<HTMLImageElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const musicFileRef  = useRef<HTMLInputElement>(null);
  const rotateRef     = useRef(0);
  const sheetRef      = useRef<HTMLDivElement>(null);
  const dragRef       = useRef({ startY: 0, currentY: 0, active: false });

  useEffect(() => {
    const existing = document.getElementById('cropperjs-css');
    if (!existing) {
      const link = document.createElement('link');
      link.id = 'cropperjs-css'; link.rel = 'stylesheet'; link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
      document.head.appendChild(link);
    }
    const existingScript = document.getElementById('cropperjs-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cropperjs-script'; script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
      document.head.appendChild(script);
    }
  }, []);

  const handleSheetPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => { dragRef.current = { startY: e.clientY, currentY: 0, active: true }; e.currentTarget.setPointerCapture(e.pointerId); };
  const handleSheetPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => { if (!dragRef.current.active || !sheetRef.current) return; const delta = Math.max(0, e.clientY - dragRef.current.startY); dragRef.current.currentY = delta; sheetRef.current.style.transform = `translateY(${delta}px)`; };
  const handleSheetPointerUp = () => { if (!sheetRef.current) return; const shouldClose = dragRef.current.currentY > 90; dragRef.current.active = false; sheetRef.current.style.transform = ''; if (shouldClose) onClose(); };

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCroppedBlob(null); setPreviewSrc(''); setCropperActive(false);
    if (cropperRef.current) { (cropperRef.current as unknown as { destroy: () => void }).destroy(); cropperRef.current = null; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setCropperActive(true);
      setTimeout(() => {
        const img = cropImgRef.current; if (!img) return;
        img.src = src;
        img.onload = () => {
          const Cropper = (window as unknown as { Cropper?: new (el: HTMLElement, opts: object) => object }).Cropper;
          if (!Cropper) return;
          cropperRef.current = new Cropper(img, { viewMode: 1, autoCropArea: 0.85, movable: true, zoomable: true, rotatable: false, scalable: false, background: false, responsive: true });
        };
      }, 50);
    };
    reader.readAsDataURL(file);
  };

  const doCrop = () => {
    if (!cropperRef.current) return;
    const c = cropperRef.current as unknown as { getCroppedCanvas: (opts: object) => HTMLCanvasElement };
    c.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200 }).toBlob(blob => {
      if (!blob) return;
      setCroppedBlob(blob); setPreviewSrc(URL.createObjectURL(blob)); setCropperActive(false);
      (cropperRef.current as unknown as { destroy: () => void })?.destroy(); cropperRef.current = null;
    }, 'image/jpeg', 0.9);
  };

  const onRotate = (val: number) => { rotateRef.current = val; (cropperRef.current as unknown as { rotateTo: (deg: number) => void } | null)?.rotateTo(val); };

  const searchPlace = async () => {
    const q = (placeName || location).trim();
    if (!q) return toast('Nhập tên địa điểm để tìm nha 🗺️', 'error');
    setGeoLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGeoResults(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) toast('Không tìm thấy địa điểm, thử tên khác nha', 'error');
    } catch { toast('Không tìm được địa điểm lúc này', 'error'); }
    finally { setGeoLoading(false); }
  };

  const choosePlace = (item: GeoResult) => {
    setPlaceName(item.label); setLocation(item.label); setLatitude(String(item.lat)); setLongitude(String(item.lon)); setGeoResults([]);
  };

  const uploadMusicIfNeeded = async () => {
    const file = musicFileRef.current?.files?.[0];
    if (!file) return { url: musicUrl, kind: musicKind, fileId: musicFileId, title: music };
    const fd = new FormData(); fd.append('music', file);
    const res = await fetch(`${BASE_URL}/api/music-upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'upload music failed');
    return { url: data.url as string, kind: 'mp3', fileId: String(data.id || ''), title: music || data.filename || file.name };
  };

  const handleSave = async () => {
    if (!title || !date) { sweetAlert({ icon: '🌸', title: 'Thiếu thông tin rồi!', text: 'Vui lòng nhập tiêu đề và ngày nhé ♥', type: 'warning', confirmText: 'OK nha ♥' }); return; }
    if (isCapsule && !capsuleUnlockAt) { sweetAlert({ icon: '🔒', title: 'Chưa có ngày mở capsule', text: 'Chọn ngày mở khóa time capsule nha.', type: 'warning', confirmText: 'OK nha' }); return; }
    setSaving(true);
    try {
      const uploadedMusic = await uploadMusicIfNeeded();
      const [yyyy, mm, dd] = date.split('-');
      const fd = new FormData();
      fd.append('title', title); fd.append('date', `${yyyy}-${mm}-${dd}`); fd.append('description', desc); fd.append('location', location); fd.append('place_name', placeName || location); fd.append('music', uploadedMusic.title || music); fd.append('music_url', uploadedMusic.url || ''); fd.append('music_kind', uploadedMusic.kind || ''); fd.append('music_file_id', uploadedMusic.fileId || ''); fd.append('mood', mood); fd.append('latitude', latitude); fd.append('longitude', longitude); fd.append('is_capsule', String(isCapsule)); fd.append('capsule_unlock_at', isCapsule ? capsuleUnlockAt : '');
      if (croppedBlob) fd.append('image', croppedBlob, 'cropped.jpg'); else if (fileInputRef.current?.files?.[0]) fd.append('image', fileInputRef.current.files[0]);
      const url = editing ? `${API_URL}/${editing.id}` : API_URL;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) throw new Error('save failed');
      toast('Đã lưu kỷ niệm! 🌸', 'success'); onSaved();
    } catch {
      sweetAlert({ icon: '💔', title: 'Ôi không!', text: 'Không thể lưu. Kiểm tra kết nối server hoặc file nhạc nhé.', type: 'error', confirmText: 'Okiee' });
    } finally { setSaving(false); }
  };

  const mapSrc = latitude && longitude ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(longitude)-0.02}%2C${Number(latitude)-0.02}%2C${Number(longitude)+0.02}%2C${Number(latitude)+0.02}&layer=mapnik&marker=${latitude}%2C${longitude}` : '';

  return (
    <div id="memoryFormOverlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={sheetRef} className="form-card bottom-sheet-card wide-memory-form">
        <button type="button" className="bottom-sheet-handle" aria-label="Kéo xuống để đóng" onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={handleSheetPointerUp} onPointerCancel={handleSheetPointerUp}><span /></button>
        <h2>{editing ? 'Sửa khoảnh khắc ✦' : 'Thêm khoảnh khắc'}</h2>
        <div className="form-grid-2"><div className="form-group"><label>Tiêu đề ✦</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Hôm nay chúng mình..." /></div><div className="form-group"><label>Ngày tháng ♥</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div></div>
        <div className="form-group"><label>Ghi chú ✍</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Viết gì đó thật dễ thương..." /></div>
        <div className="form-grid-2"><div className="form-group"><label>Địa điểm 📍</label><input type="text" value={location} onChange={e => { setLocation(e.target.value); setPlaceName(e.target.value); }} placeholder="Đà Lạt, rạp phim, quán quen..." /></div><div className="form-group"><label>Mood hôm đó</label><select value={mood} onChange={e => setMood(e.target.value)}><option value="🥰">🥰 Hạnh phúc</option><option value="😊">😊 Dịu dàng</option><option value="😌">😌 Bình yên</option><option value="🥺">🥺 Nhớ</option><option value="✨">✨ Đặc biệt</option><option value="🎯">🎯 Hoàn thành mục tiêu</option></select></div></div>

        <div className="form-group location-picker-box"><label>Bản đồ chi tiết 🗺️</label><div className="location-search-row"><input value={placeName} onChange={e => setPlaceName(e.target.value)} placeholder="Tìm địa điểm trên bản đồ..." /><button type="button" className="btn-search" onClick={searchPlace}>{geoLoading ? 'Đang tìm...' : 'Tìm'}</button></div>{geoResults.length > 0 && <div className="geo-results">{geoResults.map(r => <button key={`${r.lat}-${r.lon}`} type="button" onClick={() => choosePlace(r)}><b>{r.label}</b><small>{r.lat.toFixed(5)}, {r.lon.toFixed(5)}</small></button>)}</div>}<div className="form-grid-2"><input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" /><input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" /></div>{mapSrc && <iframe className="form-map-preview" title="Map preview" src={mapSrc} loading="lazy" />}</div>

        <div className="form-group music-uploader"><label>Nhạc gắn với kỷ niệm 🎵</label><div className="form-grid-2"><select value={musicKind} onChange={e => setMusicKind(e.target.value)}><option value="text">Tên bài để search</option><option value="youtube">Link YouTube</option><option value="link">Link Spotify/khác</option><option value="mp3">Upload MP3 lưu DB</option></select><input type="text" value={music} onChange={e => setMusic(e.target.value)} placeholder="Tên bài hát / caption" /></div>{musicKind !== 'mp3' && <input type="text" value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="Dán link YouTube/Spotify nếu có" />}{musicKind === 'mp3' && <input ref={musicFileRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,.mp3,.wav,.ogg,.m4a" />}{musicUrl && <small>Đang lưu: {musicUrl}</small>}</div>

        <div className="form-group capsule-box"><label className="inline-check"><input type="checkbox" checked={isCapsule} onChange={e => setIsCapsule(e.target.checked)} /> 🔒 Biến thành time capsule</label>{isCapsule && <input type="date" value={capsuleUnlockAt} onChange={e => setCapsuleUnlockAt(e.target.value)} />}</div>

        <div className="form-group"><label>Hình ảnh 📷</label><label className="upload-area" style={{ display: 'block', cursor: 'pointer', position: 'relative' }}><input ref={fileInputRef} type="file" accept="image/*,image/heic,image/heif" onChange={onImageSelected} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} /><p>Nhấn để chọn ảnh ♥</p></label>{cropperActive && <div id="cropperWrapper"><div className="cropper-container-box"><img ref={cropImgRef} style={{ maxWidth: '100%' }} /></div><div className="rotate-row"><span className="rotate-label">↺ Xoay</span><input type="range" min="0" max="360" defaultValue="0" onChange={e => onRotate(Number(e.target.value))} /><button type="button" className="btn-rotate-reset" onClick={() => onRotate(0)}>Reset</button></div><button type="button" className="btn-crop" onClick={doCrop}>✂️ Cắt ảnh này</button></div>}{previewSrc && !cropperActive && <img src={previewSrc} alt="preview" style={{ width: '100%', marginTop: 10, borderRadius: 10 }} />}</div>
        <div className="form-buttons"><button className="btn-cancel" onClick={onClose}>Huỷ</button><button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu lại ♥'}</button></div>
      </div>
    </div>
  );
}
