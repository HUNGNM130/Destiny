import React, { useState } from 'react';
import type { Memory } from '../types';
import { isCapsuleLocked } from '../utils/memoryFeatures';

export function RandomMemoryFlip({ memories, onOpenMemory }: { memories: Memory[]; onOpenMemory: (m: Memory) => void }) {
  const [picked, setPicked] = useState<Memory | null>(null);
  const [flipping, setFlipping] = useState(false);
  const pick = () => {
    const pool = memories.filter(m => !isCapsuleLocked(m));
    if (!pool.length) return;
    setFlipping(true);
    const next = pool[Math.floor(Math.random() * pool.length)];
    window.setTimeout(() => { setPicked(next); setFlipping(false); }, 280);
  };
  if (!memories.length) return null;
  return (
    <section className="random-memory-flip">
      <button className={`random-card ${flipping ? 'flipping' : ''}`} onClick={picked ? () => onOpenMemory(picked) : pick}>
        {picked?.image ? <img src={picked.image} alt={picked.title} /> : <span>🎴</span>}
        <b>{picked ? picked.title : 'Bấm để nhớ lại'}</b>
        <small>{picked ? new Date(picked.date).toLocaleDateString('vi-VN') : 'Random memory kiểu lật bài'}</small>
      </button>
      <button className="btn-add" onClick={pick}>🎲 Lắc random</button>
    </section>
  );
}
