export type Tab =
  | 'photos'
  | 'videos'
  | 'timeline'
  | 'map'
  | 'letters'
  | 'stats'
  | 'camera'
  | 'gallery'
  | 'gift'
  | 'dashboard'
  | 'mood'
  | 'music'
  | 'calendar';

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

const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const BASE_URL = typeof window !== 'undefined' && !isLocalhost ? window.location.origin : 'http://localhost:3000';
