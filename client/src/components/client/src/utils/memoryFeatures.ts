import type { Memory } from '../types';
import { BASE_URL } from '../types';

export function isCapsuleLocked(memory?: Memory | null) {
  if (!memory?.is_capsule || !memory.capsule_unlock_at) return false;
  const target = new Date(memory.capsule_unlock_at);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
}

export function countdownTo(value?: string | null) {
  if (!value) return '';
  const target = new Date(value);
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'Đã mở khóa';
  const totalMinutes = Math.ceil(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
  if (hours > 0) return `Còn ${hours} giờ ${minutes} phút`;
  return `Còn ${minutes} phút`;
}

export function resolveAppUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export function youtubeEmbed(url: string) {
  const text = String(url || '');
  const match = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return match ? `https://www.youtube.com/embed/${match[1]}` : '';
}
