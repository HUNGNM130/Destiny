/**
 * SweetAlert — romantic themed alerts, confirms & toasts
 * No dependencies. Drop-in replacement for alert() / confirm().
 *
 * Usage:
 *   await sweetAlert({ icon:'❤️', title:'Lưu thành công!', text:'...' })
 *   const yes = await sweetConfirm({ title:'Xoá kỷ niệm?', text:'Không khôi phục được đâu nha 💔' })
 *   toast('Đã lưu ảnh! 📸')
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

/* ─── Types ─── */
interface AlertOptions {
  icon?: string;
  title: string;
  text?: string;
  confirmText?: string;
  /** 'success' | 'error' | 'warning' | 'info' */
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
}

/* ─── Alert Component ─── */
function AlertModal({
  icon, title, text, confirmText = 'Okiee ♥', type = 'info',
  onClose,
}: AlertOptions & { onClose: () => void }) {
  const [out, setOut] = useState(false);

  const close = useCallback(() => {
    setOut(true);
    setTimeout(onClose, 320);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  const icons: Record<string, string> = {
    success: icon ?? '🌸',
    error:   icon ?? '💔',
    warning: icon ?? '🌙',
    info:    icon ?? '💌',
  };
  const displayIcon = icon ?? icons[type];

  const accents: Record<string, string> = {
    success: 'linear-gradient(135deg,#c8707a,#e88fa0)',
    error:   'linear-gradient(135deg,#c05060,#e07080)',
    warning: 'linear-gradient(135deg,#c8906a,#e8b08a)',
    info:    'linear-gradient(135deg,#8a70c8,#a890e8)',
  };

  return (
    <div
      className="sa-overlay"
      style={{ opacity: out ? 0 : 1, transition: 'opacity 0.3s ease' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className={`sa-card ${out ? 'sa-out' : 'sa-in'}`}>
        <div className="sa-icon-wrap">
          <span className="sa-icon">{displayIcon}</span>
          <div className="sa-icon-ring" style={{ background: accents[type] }} />
        </div>
        <h2 className="sa-title">{title}</h2>
        {text && <p className="sa-text">{text}</p>}
        <button
          className="sa-btn sa-btn-confirm"
          style={{ background: accents[type] }}
          onClick={close}
          autoFocus
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

/* ─── Confirm Component ─── */
function ConfirmModal({
  icon, title, text, confirmText = 'Xoá luôn 💔', cancelText = 'Thôi để vậy',
  type = 'warning', onResult,
}: ConfirmOptions & { onResult: (r: boolean) => void }) {
  const [out, setOut] = useState(false);

  const resolve = useCallback((r: boolean) => {
    setOut(true);
    setTimeout(() => onResult(r), 320);
  }, [onResult]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') resolve(true);
      if (e.key === 'Escape') resolve(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [resolve]);

  const displayIcon = icon ?? (type === 'error' ? '💔' : '🌙');

  return (
    <div
      className="sa-overlay"
      style={{ opacity: out ? 0 : 1, transition: 'opacity 0.3s ease' }}
      onClick={(e) => { if (e.target === e.currentTarget) resolve(false); }}
    >
      <div className={`sa-card ${out ? 'sa-out' : 'sa-in'}`}>
        <div className="sa-icon-wrap">
          <span className="sa-icon">{displayIcon}</span>
          <div className="sa-icon-ring" style={{ background: 'linear-gradient(135deg,#c05060,#e07080)' }} />
        </div>
        <h2 className="sa-title">{title}</h2>
        {text && <p className="sa-text">{text}</p>}
        <div className="sa-btn-row">
          <button className="sa-btn sa-btn-cancel" onClick={() => resolve(false)}>
            {cancelText}
          </button>
          <button
            className="sa-btn sa-btn-danger"
            onClick={() => resolve(true)}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast Component ─── */
let toastRoot: ReturnType<typeof createRoot> | null = null;
let toastContainer: HTMLElement | null = null;
const toastQueue: Array<{ id: number; msg: string; type: string }> = [];
let toastIdCounter = 0;

function ToastList({ items }: { items: Array<{ id: number; msg: string; type: string }> }) {
  return (
    <div className="sa-toast-stack">
      {items.map(t => (
        <div key={t.id} className={`sa-toast sa-toast-${t.type}`}>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function renderToasts() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'sa-toast-mount';
    document.body.appendChild(toastContainer);
    toastRoot = createRoot(toastContainer);
  }
  toastRoot!.render(<ToastList items={[...toastQueue]} />);
}

/* ─── Public API ─── */

/** Show a beautiful alert. Resolves when dismissed. */
export function sweetAlert(opts: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);

    const onClose = () => {
      root.unmount();
      el.remove();
      resolve();
    };

    root.render(<AlertModal {...opts} onClose={onClose} />);
  });
}

/** Show a beautiful confirm dialog. Resolves with true/false. */
export function sweetConfirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);

    const onResult = (r: boolean) => {
      root.unmount();
      el.remove();
      resolve(r);
    };

    root.render(<ConfirmModal {...opts} onResult={onResult} />);
  });
}

/** Show a toast notification (auto-dismisses). */
export function toast(
  msg: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'success',
  duration = 3000,
) {
  const id = ++toastIdCounter;
  toastQueue.push({ id, msg, type });
  renderToasts();

  setTimeout(() => {
    const idx = toastQueue.findIndex(t => t.id === id);
    if (idx !== -1) toastQueue.splice(idx, 1);
    renderToasts();
  }, duration);
}
