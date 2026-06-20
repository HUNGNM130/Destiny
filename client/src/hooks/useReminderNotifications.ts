import { useEffect } from 'react';
import { BASE_URL } from '../types';

const STORAGE_KEY = 'love-diary-notified-today-v1';

export function useReminderNotifications() {
  useEffect(() => {
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/love-diary-sw.js').catch(() => {}); }
    let cancelled = false;
    const run = async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'default') return;
      if (Notification.permission !== 'granted') return;
      const today = new Date().toISOString().slice(0, 10);
      const sentKey = `${STORAGE_KEY}-${today}`;
      if (localStorage.getItem(sentKey)) return;
      try {
        const res = await fetch(`${BASE_URL}/api/reminders/today`);
        const items = await res.json();
        if (cancelled || !Array.isArray(items) || !items.length) return;
        const title = items.length === 1 ? 'Hôm nay có một kỷ niệm 💌' : `Hôm nay có ${items.length} lời nhắc 💌`;
        const body = items.slice(0, 3).map((x: { title: string }) => x.title).join(' · ');
        new Notification(title, { body, icon: '/mon-qua-nho/assets/images/couple.svg' });
        localStorage.setItem(sentKey, '1');
      } catch { /* ignore */ }
    };
    run();
    const timer = window.setInterval(run, 60 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
}

export async function requestReminderPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}
