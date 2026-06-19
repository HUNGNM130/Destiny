import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CinematicIntro } from './components/CinematicIntro';
import { Header } from './components/Header';
import { TabDock } from './components/TabDock';
import { ToastProviderWithGlobal } from './components/SweetAlert';
import { PhotosTab } from './components/PhotosTab';
import { VideosTab } from './components/VideosTab';
import { CameraTab } from './components/CameraTab';
import { GalleryTab } from './components/GalleryTab';
import { GiftTab } from './components/GiftTab';
import { DashboardTab } from './components/DashboardTab';
import { TimelineTab } from './components/TimelineTab';
import { LoveMapTab } from './components/LoveMapTab';
import { LettersTab } from './components/LettersTab';
import { StatsTab } from './components/StatsTab';
import { AdminGate } from './components/AdminGate';
import { MemoryFormModal } from './components/MemoryFormModal';
import { VideoFormModal } from './components/VideoFormModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { useSocket } from './hooks/useSocket';
import { useDynamicBackground } from './hooks/useDynamicBackground';
import type { Memory, Video, Tab } from './types';
import { sweetConfirm } from './components/SweetAlert';
import './styles/global.css';

const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const BASE_URL = typeof window !== 'undefined' && !isLocalhost ? window.location.origin : 'http://localhost:3000';
export const API_URL = `${BASE_URL}/memories`;
export const VIDEO_API_URL = `${BASE_URL}/videos`;

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const [tab, setTab] = useState<Tab>('photos');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Modals
  const [memoryModal, setMemoryModal] = useState<{ open: boolean; editing?: Memory }>({ open: false });
  const [videoModal, setVideoModal] = useState<{ open: boolean; editing?: Video }>({ open: false });
  const [playerModal, setPlayerModal] = useState<{ open: boolean; src: string; title?: string }>({ open: false, src: '' });
  const [memoryViewer, setMemoryViewer] = useState<Memory | null>(null);

  useDynamicBackground();

  const loadMemories = useCallback(async (filters: Record<string, string> = {}) => {
    setLoadingMemories(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await fetch(`${API_URL}?${params}`);
      const data = await res.json();
      setMemories(data);
    } catch { /* noop */ }
    finally { setLoadingMemories(false); }
  }, []);

  const loadVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch(VIDEO_API_URL);
      const data = await res.json();
      setVideos(data);
    } catch { /* noop */ }
    finally { setLoadingVideos(false); }
  }, []);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  useEffect(() => {
    if (tab === 'videos' || tab === 'stats') loadVideos();
  }, [tab, loadVideos]);

  useSocket({
    onMemoryAdded: (m) => setMemories(prev => {
      if (prev.find(x => x.id === m.id)) return prev;
      return [m, ...prev];
    }),
    onMemoryUpdated: (data) => setMemories(prev =>
      prev.map(m => m.id === data.id ? { ...m, ...data } : m)
    ),
    onMemoryDeleted: (data) => setMemories(prev => prev.filter(m => m.id !== data.id)),
    onVideoAdded: (v) => setVideos(prev => {
      if (prev.find(x => x.id === v.id)) return prev;
      return [v, ...prev];
    }),
    onVideoDeleted: (data) => setVideos(prev => prev.filter(v => v.id !== data.id)),
    onMemoryMoved: (data) => setMemories(prev =>
      prev.map(m => m.id === Number(data.id)
        ? { ...m, pos_x: data.x, pos_y: data.y, pos_rotate: data.rotate }
        : m
      )
    ),
    onVideoMoved: (data) => setVideos(prev =>
      prev.map(v => v.id === Number(data.id)
        ? { ...v, pos_x: data.x, pos_y: data.y, pos_rotate: data.rotate }
        : v
      )
    ),
  });

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
  };

  return (
    <ToastProviderWithGlobal>
    <>
      {!introDone && <CinematicIntro onDone={() => setIntroDone(true)} />}
      <div className={`app-root ${introDone ? 'app-visible' : 'app-hidden'}`}>
        <Header memoryCount={memories.length} videoCount={videos.length} />
        <TabDock tab={tab} onTabChange={handleTabChange} />

        {tab === 'photos' && (
          <PhotosTab
            memories={memories}
            loading={loadingMemories}
            onAdd={() => setMemoryModal({ open: true })}
            onEdit={(m) => setMemoryModal({ open: true, editing: m })}
            onDelete={async (id) => {
              const yes = await sweetConfirm({
                title: 'Xoá kỷ niệm này?',
                text: 'Kỷ niệm sẽ mất mãi mãi, không khôi phục được đâu nha 💔',
                confirmText: 'Xoá luôn 💔',
                cancelText: 'Thôi để vậy',
                type: 'error',
              });
              if (!yes) return;
              await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
              setMemories(prev => prev.filter(m => m.id !== id));
            }}
            onRefresh={loadMemories}
          />
        )}

        {tab === 'videos' && (
          <VideosTab
            videos={videos}
            loading={loadingVideos}
            onAdd={() => setVideoModal({ open: true })}
            onEdit={(v) => setVideoModal({ open: true, editing: v })}
            onDelete={async (id) => {
              const yes = await sweetConfirm({
                title: 'Xoá video này?',
                text: 'Video sẽ biến mất vĩnh viễn nha 🎬💔',
                confirmText: 'Xoá luôn 💔',
                cancelText: 'Thôi để vậy',
                type: 'error',
              });
              if (!yes) return;
              await fetch(`${VIDEO_API_URL}/${id}`, { method: 'DELETE' });
              setVideos(prev => prev.filter(v => v.id !== id));
            }}
            onPlay={(src, title) => setPlayerModal({ open: true, src, title })}
          />
        )}

        {tab === 'timeline' && (
          <TimelineTab memories={memories} onOpenMemory={setMemoryViewer} />
        )}

        {tab === 'map' && (
          <LoveMapTab memories={memories} onOpenMemory={setMemoryViewer} />
        )}

        {tab === 'letters' && <LettersTab />}

        {tab === 'stats' && (
          <StatsTab memories={memories} videos={videos} onOpenMemory={setMemoryViewer} />
        )}

        {tab === 'camera' && (
          <CameraTab
            active={tab === 'camera'}
            onSaved={() => { setTab('photos'); loadMemories(); }}
          />
        )}

        {tab === 'gallery' && (
          <GalleryTab memories={memories} />
        )}

        {tab === 'gift' && <GiftTab />}

        {tab === 'dashboard' && adminUnlocked && <DashboardTab />}

        {/* Admin gate — icon nhỏ góc trái */}
        <AdminGate onUnlocked={() => { setAdminUnlocked(true); setTab('dashboard'); }} />

        {memoryViewer && (
          <div className="memory-lightbox" onClick={() => setMemoryViewer(null)}>
            <div className="memory-lightbox-card" onClick={e => e.stopPropagation()}>
              <button className="memory-lightbox-close" onClick={() => setMemoryViewer(null)}>✕</button>
              {memoryViewer.image && <img src={memoryViewer.image} alt={memoryViewer.title} />}
              <div className="memory-lightbox-body">
                <span className="eyebrow">{new Date(memoryViewer.date).toLocaleDateString('vi-VN')}</span>
                <h3>{memoryViewer.title}</h3>
                {memoryViewer.location && <p>📍 {memoryViewer.location}</p>}
                {memoryViewer.description && <p>{memoryViewer.description}</p>}
                <button className="btn-add" onClick={() => { setMemoryViewer(null); setMemoryModal({ open: true, editing: memoryViewer }); }}>✏️ Chỉnh sửa</button>
              </div>
            </div>
          </div>
        )}

        {memoryModal.open && (
          <MemoryFormModal
            editing={memoryModal.editing}
            onClose={() => setMemoryModal({ open: false })}
            onSaved={() => { setMemoryModal({ open: false }); loadMemories(); }}
          />
        )}

        {videoModal.open && (
          <VideoFormModal
            editing={videoModal.editing}
            onClose={() => setVideoModal({ open: false })}
            onSaved={() => { setVideoModal({ open: false }); loadVideos(); }}
          />
        )}

        {playerModal.open && (
          <VideoPlayerModal
            src={playerModal.src}
            title={playerModal.title}
            onClose={() => setPlayerModal({ open: false, src: '' })}
          />
        )}
      </div>
    </>
    </ToastProviderWithGlobal>
  );
}