import type { Memory } from '../types';

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[ch] || ch));
}

export function exportMemoriesToPDF(memories: Memory[]) {
  const sorted = [...memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Our Love Diary PDF</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#fff7f7;color:#442132;font-family:Georgia,'Times New Roman',serif;}
  .cover{min-height:100vh;padding:72px 54px;display:grid;place-items:center;text-align:center;background:radial-gradient(circle at top,#ffe2ed,#fff9f6 58%,#fff)}
  h1{font-size:56px;font-style:italic;margin:0 0 14px;color:#a85468}.cover p{font-size:20px;color:#795469}.meta{margin-top:28px;color:#9b6d7d}
  .memory{page-break-inside:avoid;margin:0 auto 28px;padding:34px;width:88%;background:#fff;border:1px solid #f0d3dc;border-radius:24px;box-shadow:0 12px 32px rgba(100,40,65,.08)}
  .memory img{width:100%;max-height:520px;object-fit:cover;border-radius:18px;margin:14px 0 18px}.date{text-transform:uppercase;letter-spacing:1px;font-size:12px;color:#b15d79;font-weight:bold} h2{font-size:30px;margin:8px 0 10px;color:#4b2435}.desc{white-space:pre-wrap;line-height:1.7;color:#5f4050}.tags{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.tag{border:1px solid #f1c8d5;border-radius:999px;padding:7px 12px;color:#8a4b62;background:#fff7fa;font-size:13px}
  @media print{body{background:#fff}.cover{page-break-after:always}.memory{box-shadow:none;width:100%;border-radius:12px}button{display:none}}
</style>
</head><body>
<section class="cover"><div><h1>Our Love Diary</h1><p>${sorted.length} kỷ niệm được lưu lại để in thành một cuốn nhật ký nhỏ.</p><div class="meta">Xuất ngày ${new Date().toLocaleDateString('vi-VN')}</div></div></section>
${sorted.map(m => `<article class="memory">
  <div class="date">${esc(new Date(m.date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }))}</div>
  <h2>${esc(m.title)}</h2>
  ${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.title)}" />` : ''}
  ${m.description ? `<div class="desc">${esc(m.description)}</div>` : ''}
  <div class="tags">${m.location ? `<span class="tag">📍 ${esc(m.location)}</span>` : ''}${m.music ? `<span class="tag">🎵 ${esc(m.music)}</span>` : ''}${m.mood ? `<span class="tag">${esc(m.mood)}</span>` : ''}</div>
</article>`).join('')}
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script>
</body></html>`;
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `our-love-diary-print-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
