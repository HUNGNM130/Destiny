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
  | 'calendar'
  | 'diary'
  | 'bucket'
  | 'night'
  | 'collage';

export interface Memory {
  id: number;
  title: string;
  date: string;
  description?: string;
  image?: string | null;
  mood?: string | null;
  location?: string | null;
  music?: string | null;
  music_url?: string | null;
  music_kind?: string | null;
  music_file_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  place_name?: string | null;
  is_capsule?: boolean | null;
  capsule_unlock_at?: string | null;
  weather_summary?: string | null;
  weather_icon?: string | null;
  weather_temp?: number | null;
  share_token?: string | null;
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
