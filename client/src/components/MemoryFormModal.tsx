import React, { useRef, useState, useEffect } from 'react';
import type { Memory } from '../types';
import { API_URL } from '../App';
import { sweetAlert, toast } from './SweetAlert';

interface Props {
  editing?: Memory;
  onClose: () => void;
  onSaved: () => void;
}

export function MemoryFormModal({ editing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(editing?.title || '');
  const [date, setDate]   = useState(editing?.date ? editing.date.split('T')[0] : '');
  const [desc, setDesc]   = useState(editing?.description || '');
  const [location, setLocation] = useState(editing?.location || '');
  const [music, setMusic] = useState(editing?.music || '');
  const [mood, setMood] = useState(editing?.mood || '🥰');
  const [saving, setSaving] = useState(false);
  const [cropperActive, setCropperActive] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(editing?.image || '');
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const cropperRef    = useRef<unknown | null>(null);
  const cropImgRef    = useRef<HTMLImageElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const rotateRef     = useRef(0);
  const sheetRef      = useRef<HTMLDivElement>(null);
  const dragRef       = useRef({ startY: 0, currentY: 0, active: false });

  useEffect(() => {
    // Load cropperjs dynamically
    const existing = document.getElementById('cropperjs-css');
    if (!existing) {
      const link = document.createElement('link');
      link.id = 'cropperjs-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
      document.head.appendChild(link);
    }
    const existingScript = document.getElementById('cropperjs-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cropperjs-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
      document.head.appendChild(script);
    }
  }, []);

  const handleSheetPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = { startY: e.clientY, currentY: 0, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active || !sheetRef.current) return;
    const delta = Math.max(0, e.clientY - dragRef.current.startY);
    dragRef.current.currentY = delta;
    sheetRef.current.style.transform = `translateY(${delta}px)`;
  };

  const handleSheetPointerUp = () => {
    if (!sheetRef.current) return;
    const shouldClose = dragRef.current.currentY > 90;
    dragRef.current.active = false;
    sheetRef.current.style.transform = '';
    if (shouldClose) onClose();
  };

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCroppedBlob(null);
    setPreviewSrc('');
    setCropperActive(false);
    if (cropperRef.current) { (cropperRef.current as unknown as { destroy: () => void }).destroy(); cropperRef.current = null; }

    const reader = new FileReader();
    reader.onload = (ev) => {
  const src = ev.target?.result as string;

  setCropperActive(true);

  setTimeout(() => {
    const img = cropImgRef.current;
    if (!img) return;

    img.src = src;

    img.onload = () => {
      const Cropper = (window as unknown as {
        Cropper?: new (el: HTMLElement, opts: object) => object
      }).Cropper;

      if (!Cropper) return;

      cropperRef.current = new Cropper(img, {
        viewMode: 1,
        autoCropArea: 0.85,
        movable: true,
        zoomable: true,
        rotatable: false,
        scalable: false,
        background: false,
        responsive: true,
      });
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
      setCroppedBlob(blob);
      setPreviewSrc(URL.createObjectURL(blob));
      setCropperActive(false);
      (cropperRef.current as unknown as { destroy: () => void })?.destroy();
      cropperRef.current = null;
    }, 'image/jpeg', 0.9);
  };

  const onRotate = (val: number) => {
    rotateRef.current = val;
    (cropperRef.current as unknown as { rotateTo: (deg: number) => void } | null)?.rotateTo(val);
  };

  const handleSave = async () => {
    if (!title || !date) {
      sweetAlert({ icon: '🌸', title: 'Thiếu thông tin rồi!', text: 'Vui lòng nhập tiêu đề và ngày nhé ♥', type: 'warning', confirmText: 'OK nha ♥' });
      return;
    }
    setSaving(true);
    const [yyyy, mm, dd] = date.split('-');
    const fd = new FormData();
    fd.append('title', title);
    fd.append('date', `${yyyy}-${mm}-${dd}`);
    fd.append('description', desc);
    fd.append('location', location);
    fd.append('music', music);
    fd.append('mood', mood);

    if (croppedBlob) fd.append('image', croppedBlob, 'cropped.jpg');
    else if (fileInputRef.current?.files?.[0]) fd.append('image', fileInputRef.current.files[0]);

    try {
      if (editing) {
        await fetch(`${API_URL}/${editing.id}`, { method: 'PUT', body: fd });
      } else {
        await fetch(API_URL, { method: 'POST', body: fd });
      }
      toast('Đã lưu kỷ niệm! 🌸', 'success');
      onSaved();
    } catch {
      sweetAlert({ icon: '💔', title: 'Ôi không!', text: 'Không thể lưu. Kiểm tra kết nối server nhé.', type: 'error', confirmText: 'Okiee' });
    }
    finally { setSaving(false); }
  };

  return (
    <div id="memoryFormOverlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={sheetRef} className="form-card bottom-sheet-card">
        <button type="button" className="bottom-sheet-handle" aria-label="Kéo xuống để đóng" onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={handleSheetPointerUp} onPointerCancel={handleSheetPointerUp}><span /></button>
        <h2>{editing ? 'Sửa khoảnh khắc ✦' : 'Thêm khoảnh khắc'}</h2>

        <div className="form-group">
          <label>Tiêu đề ✦</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Hôm nay chúng mình..." />
        </div>
        <div className="form-group">
          <label>Ngày tháng ♥</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Ghi chú ✍</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Viết gì đó thật dễ thương..." />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Địa điểm 📍</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Đà Lạt, rạp phim, quán quen..." />
          </div>
          <div className="form-group">
            <label>Mood hôm đó</label>
            <select value={mood} onChange={e => setMood(e.target.value)}>
              <option value="🥰">🥰 Hạnh phúc</option>
              <option value="😊">😊 Dịu dàng</option>
              <option value="😌">😌 Bình yên</option>
              <option value="🥺">🥺 Nhớ</option>
              <option value="✨">✨ Đặc biệt</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Nhạc gắn với kỷ niệm 🎵</label>
          <input type="text" value={music} onChange={e => setMusic(e.target.value)} placeholder="Tên bài hát hoặc link Spotify/YouTube" />
        </div>
        <div className="form-group">
          <label>Hình ảnh 📷</label>
          <label className="upload-area" style={{ display: 'block', cursor: 'pointer', position: 'relative' }}>
            <input ref={fileInputRef} type="file" accept="image/*,image/heic,image/heif"
              onChange={onImageSelected}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            <p>Nhấn để chọn ảnh ♥</p>
          </label>

          {cropperActive && (
            <div id="cropperWrapper">
              <div className="cropper-container-box">
                <img ref={cropImgRef} style={{ maxWidth: '100%' }} />
              </div>
              <div className="rotate-row">
                <span className="rotate-label">↺ Xoay</span>
                <input type="range" min="0" max="360" defaultValue="0" onChange={e => onRotate(Number(e.target.value))} />
                <button type="button" className="btn-rotate-reset" onClick={() => onRotate(0)}>Reset</button>
              </div>
              <button type="button" className="btn-crop" onClick={doCrop}>✂️ Cắt ảnh này</button>
            </div>
          )}

          {previewSrc && !cropperActive && (
            <img src={previewSrc} alt="preview" style={{ width: '100%', marginTop: 10, borderRadius: 10 }} />
          )}
        </div>

        <div className="form-buttons">
          <button className="btn-cancel" onClick={onClose}>Huỷ</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu lại ♥'}
          </button>
        </div>
      </div>
    </div>
  );
}
