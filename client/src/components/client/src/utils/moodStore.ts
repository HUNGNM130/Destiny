export interface MoodEntry {
  date: string;
  mood: string;
  note: string;
  createdAt: string;
}

export const MOODS = [
  { emoji: '🥰', label: 'Hạnh phúc', score: 5 },
  { emoji: '😊', label: 'Dịu dàng', score: 4 },
  { emoji: '😌', label: 'Bình yên', score: 4 },
  { emoji: '🥺', label: 'Nhớ', score: 3 },
  { emoji: '😴', label: 'Mệt', score: 2 },
  { emoji: '😢', label: 'Buồn', score: 1 },
];

export const MOOD_STORAGE_KEY = 'love-diary-daily-moods-v1';

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadMoodEntries(): MoodEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(MOOD_STORAGE_KEY) || '[]') as MoodEntry[];
    return Array.isArray(data) ? data.sort((a, b) => b.date.localeCompare(a.date)) : [];
  } catch {
    return [];
  }
}

export function saveMoodEntry(entry: MoodEntry) {
  const entries = loadMoodEntries();
  const next = [entry, ...entries.filter(x => x.date !== entry.date)].sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('love-diary:moods-updated'));
  return next;
}

export function getMoodScore(emoji: string) {
  return MOODS.find(m => m.emoji === emoji)?.score ?? 3;
}
