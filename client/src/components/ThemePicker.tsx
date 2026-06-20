import React, { useEffect, useState } from 'react';

const THEMES = [
  { id: 'romantic', label: 'Romantic', icon: '🌹' },
  { id: 'valentine', label: 'Valentine', icon: '💘' },
  { id: 'sakura', label: 'Sakura', icon: '🌸' },
  { id: 'autumn', label: 'Autumn', icon: '🍂' },
  { id: 'ocean', label: 'Ocean', icon: '🌊' },
  { id: 'noel', label: 'Noel', icon: '🎄' },
  { id: 'rain', label: 'Mưa buồn', icon: '🌧️' },
  { id: 'pastel', label: 'Pastel', icon: '🫧' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
];

export function ThemePicker() {
  const [theme, setTheme] = useState(() => localStorage.getItem('love-diary-theme') || 'romantic');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('love-diary-theme', theme);
  }, [theme]);
  return (
    <div className="theme-picker">
      {THEMES.map(t => <button key={t.id} className={theme === t.id ? 'active' : ''} title={t.label} onClick={() => setTheme(t.id)}>{t.icon}</button>)}
    </div>
  );
}
