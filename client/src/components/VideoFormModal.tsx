import React, { useRef, useState } from 'react';
import type { Video } from '../types';
import { VIDEO_API_URL } from '../App';
import { sweetAlert, toast } from './SweetAlert';

interface Props {
  editing?: Video;
  onClose: () => void;
  onSaved: () => void;
}

export function VideoFormModal({ editing, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(editing?.title || '');
  const [date, setDate]   = useState(editing?.date ? editing.date.split('T')[0] : '');
  const [desc, setDesc]   = useState(editing?.description || '');
  const [saving, setSaving] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreviewSrc(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!title || !date) {
      sweetAlert({ icon: '🌸', title: 'Thiếu thông tin!', text: 'Vui lòng nhập tiêu đề và ngày nhé ♥', type: 'warning', confirmText: 'OK nha ♥' });
      return;
    }
    if (!editing && !file) {
      sweetAlert({ icon: '🎬', title: 'Chưa có video!', text: 'Vui lòng chọn file video nhé ♥', type: 'warning', confirmText: 'OK nha ♥' });
      return;
    }

    setSaving(true);
    const [yyyy, mm, dd] = date.split('-');
    const fd = new FormData();
    fd.append('title', title);
    fd.append('date', `${yyyy}-${mm}-${dd}`);
    fd.append('description', desc);
    if (file) fd.append('video', file);

    try {
      if (editing) {
        await fetch(`${VIDEO_API_URL}/${editing.id}`, { method: 'PUT', body: fd });
      } else {
        await fetch(VIDEO_API_URL, { method: 'POST', body: fd });
      }
      toast('Đã lưu video! 🎬', 'success');
      onSaved();
    } catch {
      sweetAlert({ icon: '💔', title: 'Ôi không!', text: 'Không thể lưu video. Kiểm tra kết nối server nhé.', type: 'error', confirmText: 'Okiee' });
    }
    finally { setSaving(false); }
  };

  return (
    <div id="videoFormOverlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="form-card">
        <h2>{editing ? 'Sửa video ✦' : 'Thêm video'}</h2>

        <div className="form-group">
          <label>Tiêu đề ✦</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Khoảnh khắc này..." />
        </div>
        <div className="form-group">
          <label>Ngày tháng ♥</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Ghi chú ✍</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Viết gì đó thật dễ thương..." />
        </div>
        <div className="form-group">
          <label>Video 🎬</label>
          <div className="upload-area">
            <input ref={fileInputRef} type="file" accept="video/*" onChange={previewVideo} />
            <p>Nhấn để chọn video ♥</p>
          </div>
          {previewSrc && (
            <video src={previewSrc} controls style={{ width: '100%', marginTop: 10, borderRadius: 6 }} />
          )}
        </div>

        <div className="form-buttons">
          <button className="btn-cancel" onClick={onClose}>Huỷ</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
          </button>
        </div>
      </div>
    </div>
  );
}
