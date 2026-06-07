export type Tab = 'photos' | 'videos' | 'camera' | 'gallery' | 'gift' | 'dashboard';

export interface Memory {
  id: number;
  title: string;
  date: string;
  description?: string;
  image?: string | null;
  mood?: string | null;
  location?: string | null;
  music?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  pos_rotate?: number | null;
  created_at?: string;
}

export interface Video {
  id: number;
  title: string;
  date: string;
  description?: string;
  filename?: string | null;
  url?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  pos_rotate?: number | null;
}

export const MOODS: Record<string, { emoji: string; label: string; color: string; accent: string }> = {
  happy:       { emoji: '😊', label: 'Vui vẻ',    color: '#fde68a', accent: '#f59e0b' },
  sad:         { emoji: '😢', label: 'Buồn',       color: '#bfdbfe', accent: '#3b82f6' },
  miss:        { emoji: '💭', label: 'Nhớ nhau',   color: '#e9d5ff', accent: '#8b5cf6' },
  anniversary: { emoji: '❤️', label: 'Kỷ niệm',   color: '#fecdd3', accent: '#e11d48' },
};

export const BASE_URL = 'https://destiny-s88d.onrender.com';