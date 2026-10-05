import React, { useMemo, useRef, useState } from 'react';
import type { Memory } from '../types';
import { toast } from './SweetAlert';

interface Props { memories: Memory[]; }

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function CollageTab({ memories }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageMemories = useMemo(() => memories.filter(m => m.image), [memories]);
  const [selected, setSelected] = useState<number[]>([]);
  const [caption, setCaption] = useState('Our Love Diary');
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 9 ? prev : [...prev, id]);
  };

  const makeCollage = async () => {
    const chosen = imageMemories.filter(m => selected.includes(m.id)).slice(0, 9);
    if (chosen.length < 4) return toast('Chọn ít nhất 4 ảnh nha 🖼️', 'error');
    setBusy(true);
    try {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const size = 1200;
      const gap = 18;
      canvas.width = size;
      canvas.height = size;
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#fff5ee');
      grad.addColorStop(1, '#ffd6de');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const cols = chosen.length <= 4 ? 2 : 3;
      const rows = Math.ceil(chosen.length / cols);
      const topPad = 90;
      const bottomPad = 120;
      const cellW = (size - gap * (cols + 1)) / cols;
      const cellH = (size - topPad - bottomPad - gap * (rows + 1)) / rows;
      const imgs = await Promise.all(chosen.map(m => loadImage(m.image!)));
      imgs.forEach((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = gap + col * (cellW + gap);
        const y = topPad + gap + row * (cellH + gap);
        ctx.save();
        ctx.beginPath();
        const r = 28;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + cellW, y, x + cellW, y + cellH, r);
        ctx.arcTo(x + cellW, y + cellH, x, y + cellH, r);
        ctx.arcTo(x, y + cellH, x, y, r);
        ctx.arcTo(x, y, x + cellW, y, r);
        ctx.clip();
        const scale = Math.max(cellW / img.width, cellH / img.height);
        const sw = cellW / scale;
        const sh = cellH / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
        ctx.restore();
      });
      ctx.fillStyle = '#3d1a26';
      ctx.textAlign = 'center';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText(caption || 'Our Love Diary', size / 2, 64);
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillText(`${chosen.length} khoảnh khắc yêu thương`, size / 2, size - 54);
      toast('Đã tạo ảnh ghép, bấm tải xuống để lưu nha', 'success');
    } catch {
      toast('Có ảnh không cho vẽ canvas. Thử ảnh khác hoặc ảnh Cloudinary nhé.', 'error');
    } finally { setBusy(false); }
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `our-love-collage-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  return (
    <div className="collage-page">
      <section className="feature-hero collage-hero">
        <span className="eyebrow">Canvas collage</span>
        <h2>Tạo ảnh ghép kỷ niệm</h2>
        <p>Chọn 4–9 ảnh, app ghép tự động bằng Canvas API để lưu về máy hoặc in ra.</p>
      </section>
      <div className="page-toolbar upgraded-toolbar">
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption trên ảnh ghép" />
        <button className="btn-add" onClick={makeCollage} disabled={busy}>{busy ? 'Đang ghép...' : '🖼️ Tạo collage'}</button>
        <button className="btn-search" onClick={download}>⬇️ Tải PNG</button>
        <span className="toolbar-count">{selected.length}/9 ảnh</span>
      </div>
      <section className="collage-shell">
        <div className="collage-picker">
          {imageMemories.map(m => (
            <button key={m.id} className={selected.includes(m.id) ? 'selected' : ''} onClick={() => toggle(m.id)}>
              <img src={m.image!} alt={m.title} />
              <span>{m.title}</span>
            </button>
          ))}
        </div>
        <div className="collage-preview glass-panel">
          <canvas ref={canvasRef} width={1200} height={1200} />
        </div>
      </section>
    </div>
  );
}
