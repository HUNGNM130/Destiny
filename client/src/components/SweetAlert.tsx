import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';
type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration: number;
  icon?: string;
}

interface ToastCtx {
  add: (t: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

/* ─────────────────────────────────────────────────────────
   TOAST CONTEXT (provider mounted once in App)
───────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastCtx | null>(null);

const POSITION: ToastPosition = 'bottom-center';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastItem & { exiting?: boolean })[]>([]);

  const remove = useCallback((id: string) => {
    // mark exiting first for exit animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 340);
  }, []);

  const add = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev.slice(-4), { ...t, id }]); // max 5
    if (t.duration > 0) setTimeout(() => remove(id), t.duration);
  }, [remove]);

  const posStyle: React.CSSProperties = {
    position: 'fixed', zIndex: 99995,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    pointerEvents: 'none',
    bottom: 28, left: '50%', transform: 'translateX(-50%)',
  };

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      {createPortal(
        <div style={posStyle} id="joly-toast-mount">
          {toasts.map(t => (
            <JolyToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────
   SINGLE TOAST ITEM — Joly UI animated-toast style
───────────────────────────────────────────────────────── */
const TYPE_META: Record<ToastType, { icon: string; accent: string; bg: string }> = {
  success: { icon: '✓', accent: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  error:   { icon: '✕', accent: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  warning: { icon: '!', accent: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  info:    { icon: 'i', accent: '#2563eb', bg: 'rgba(37,99,235,0.10)' },
  default: { icon: '♥', accent: '#c97b8a', bg: 'rgba(201,123,138,0.10)' },
};

function JolyToastItem({ toast, onRemove }: { toast: ToastItem & { exiting?: boolean }; onRemove: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = TYPE_META[toast.type];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0) scale(1)'; });
  }, []);

  useEffect(() => {
    if (toast.exiting && ref.current) {
      ref.current.style.opacity = '0';
      ref.current.style.transform = 'translateY(14px) scale(0.92)';
    }
  }, [toast.exiting]);

  return (
    <div
      ref={ref}
      style={{
        pointerEvents: 'all',
        minWidth: 280, maxWidth: 380,
        background: 'rgba(253,250,248,0.97)',
        backdropFilter: 'blur(16px)',
        borderRadius: 16,
        border: `1px solid rgba(0,0,0,0.07)`,
        borderLeft: `4px solid ${meta.accent}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.7) inset',
        padding: '14px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        opacity: 0, transform: 'translateY(18px) scale(0.92)',
        transition: 'opacity 0.32s cubic-bezier(0.34,1.4,0.64,1), transform 0.32s cubic-bezier(0.34,1.4,0.64,1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Icon badge */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: meta.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: meta.accent, fontWeight: 700, fontSize: '0.9rem',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}>
        {meta.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <p style={{
            margin: 0, fontFamily: 'DM Sans, system-ui, sans-serif',
            fontWeight: 600, fontSize: '0.9rem', color: '#3d1a26',
          }}>{toast.title}</p>
        )}
        <p style={{
          margin: toast.title ? '3px 0 0' : 0,
          fontFamily: 'Caveat, cursive', fontSize: '1rem', color: '#6b3046',
          lineHeight: 1.4,
        }}>{toast.message}</p>
      </div>

      {/* Close */}
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9b9b9b', padding: '2px 4px', borderRadius: 6,
          fontSize: '1rem', lineHeight: 1, flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#3d1a26')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9b9b9b')}
      >✕</button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <ProgressBar duration={toast.duration} color={meta.accent} />
      )}
    </div>
  );
}

function ProgressBar({ duration, color }: { duration: number; color: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transition = `width ${duration}ms linear`;
    requestAnimationFrame(() => { bar.style.width = '0%'; });
  }, [duration]);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
      background: `${color}22`, borderRadius: '0 0 16px 16px',
    }}>
      <div ref={barRef} style={{
        width: '100%', height: '100%',
        background: `${color}66`,
        borderRadius: '0 0 16px 16px',
        transformOrigin: 'left',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   HOOK
───────────────────────────────────────────────────────── */
function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}

/* ─────────────────────────────────────────────────────────
   PUBLIC API — matches old SweetAlert API shape
───────────────────────────────────────────────────────── */

// Simple toast
export function toast(message: string, type: ToastType = 'success') {
  _globalAdd({ message, type, duration: 3500 });
}

// Legacy sweetAlert → now uses animated toast
export function sweetAlert({
  icon, title, text, type = 'info', confirmText = 'OK',
}: {
  icon?: string; title: string; text?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
}) {
  return _showModal({ type: type === 'info' ? 'info' : type, title, text });
}

// Legacy sweetConfirm → returns Promise<boolean>
export function sweetConfirm({
  title, text, confirmText = 'Xác nhận', cancelText = 'Huỷ',
  type = 'warning',
}: {
  title: string; text?: string;
  confirmText?: string; cancelText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}): Promise<boolean> {
  return _showConfirmModal({ type, title, text, confirmText, cancelText });
}

/* ─────────────────────────────────────────────────────────
   MODAL (for alert / confirm) — same aesthetic
───────────────────────────────────────────────────────── */
let _modalRoot: HTMLElement | null = null;

function getModalRoot() {
  if (!_modalRoot) {
    _modalRoot = document.createElement('div');
    _modalRoot.id = 'joly-modal-root';
    document.body.appendChild(_modalRoot);
  }
  return _modalRoot;
}

function _showModal({ type, title, text }: { type: ToastType; title: string; text?: string }): Promise<void> {
  return new Promise(resolve => {
    const root = getModalRoot();
    const el = document.createElement('div');
    root.appendChild(el);

    const cleanup = () => {
      el.querySelector<HTMLDivElement>('.jm-card')!.style.transform = 'scale(0.92) translateY(10px)';
      el.querySelector<HTMLDivElement>('.jm-card')!.style.opacity = '0';
      setTimeout(() => { root.removeChild(el); resolve(); }, 280);
    };

    const meta = TYPE_META[type];
    el.innerHTML = `
      <div class="jm-overlay">
        <div class="jm-card">
          <div class="jm-icon-wrap" style="background:${meta.bg}">
            <span class="jm-icon" style="color:${meta.accent}">${meta.icon}</span>
          </div>
          <h2 class="jm-title">${title}</h2>
          ${text ? `<p class="jm-text">${text}</p>` : ''}
          <button class="jm-btn jm-btn-confirm" style="background:linear-gradient(135deg,${meta.accent},${meta.accent}cc)">OK</button>
        </div>
      </div>`;

    el.querySelector('.jm-overlay')!.addEventListener('click', e => {
      if (e.target === e.currentTarget) cleanup();
    });
    el.querySelector('.jm-btn-confirm')!.addEventListener('click', cleanup);

    requestAnimationFrame(() => {
      const card = el.querySelector<HTMLDivElement>('.jm-card')!;
      card.style.transform = 'scale(1) translateY(0)';
      card.style.opacity = '1';
    });
  });
}

function _showConfirmModal({ type, title, text, confirmText, cancelText }: {
  type: ToastType; title: string; text?: string;
  confirmText: string; cancelText: string;
}): Promise<boolean> {
  return new Promise(resolve => {
    const root = getModalRoot();
    const el = document.createElement('div');
    root.appendChild(el);

    const cleanup = (result: boolean) => {
      const card = el.querySelector<HTMLDivElement>('.jm-card');
      if (card) { card.style.transform = 'scale(0.92) translateY(10px)'; card.style.opacity = '0'; }
      setTimeout(() => { root.removeChild(el); resolve(result); }, 280);
    };

    const meta = TYPE_META[type];
    el.innerHTML = `
      <div class="jm-overlay">
        <div class="jm-card">
          <div class="jm-icon-wrap" style="background:${meta.bg}">
            <span class="jm-icon" style="color:${meta.accent}">${meta.icon}</span>
          </div>
          <h2 class="jm-title">${title}</h2>
          ${text ? `<p class="jm-text">${text}</p>` : ''}
          <div class="jm-btn-row">
            <button class="jm-btn jm-btn-cancel">${cancelText}</button>
            <button class="jm-btn jm-btn-ok" style="background:linear-gradient(135deg,${meta.accent},${meta.accent}cc)">${confirmText}</button>
          </div>
        </div>
      </div>`;

    el.querySelector('.jm-overlay')!.addEventListener('click', e => {
      if (e.target === e.currentTarget) cleanup(false);
    });
    el.querySelector('.jm-btn-cancel')!.addEventListener('click', () => cleanup(false));
    el.querySelector('.jm-btn-ok')!.addEventListener('click', () => cleanup(true));

    requestAnimationFrame(() => {
      const card = el.querySelector<HTMLDivElement>('.jm-card')!;
      card.style.transform = 'scale(1) translateY(0)';
      card.style.opacity = '1';
    });
  });
}

// Global add function — set by ToastProvider
let _globalAdd: (t: Omit<ToastItem, 'id'>) => void = () => {};

export function _setGlobalAdd(fn: typeof _globalAdd) { _globalAdd = fn; }

// Wrapper component that wires the global add
export function ToastProviderWithGlobal({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ToastGlobalBridge />
      {children}
    </ToastProvider>
  );
}

function ToastGlobalBridge() {
  const { add } = useToast();
  useEffect(() => { _setGlobalAdd(add); }, [add]);
  return null;
}
