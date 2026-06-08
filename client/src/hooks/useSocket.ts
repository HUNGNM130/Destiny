import { useEffect, useRef } from 'react';
import { BASE_URL } from '../types';
import type { Memory, Video } from '../types';

interface SocketCallbacks {
  onMemoryAdded?: (m: Memory) => void;
  onMemoryUpdated?: (data: Partial<Memory> & { id: number }) => void;
  onMemoryDeleted?: (data: { id: number }) => void;
  onVideoAdded?: (v: Video) => void;
  onVideoDeleted?: (data: { id: number }) => void;
  onMemoryMoved?: (data: { id: number; x: number; y: number; rotate: number }) => void;
  onVideoMoved?: (data: { id: number; x: number; y: number; rotate: number }) => void;
}

export function useSocket(callbacks: SocketCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    // Dynamically load socket.io
    const existingScript = document.getElementById('socket-io-script');
    const init = () => {
      const io = (window as unknown as { io?: (url: string) => unknown }).io;
      if (!io) return;
      const socket = io(BASE_URL) as {
        on: (event: string, cb: (data: unknown) => void) => void;
        off: (event: string) => void;
        disconnect: () => void;
      };
      socket.on('memoryAdded',   (d) => cbRef.current.onMemoryAdded?.(d as Memory));
      socket.on('memoryUpdated', (d) => cbRef.current.onMemoryUpdated?.(d as Partial<Memory> & { id: number }));
      socket.on('memoryDeleted', (d) => cbRef.current.onMemoryDeleted?.(d as { id: number }));
      socket.on('videoAdded',    (d) => cbRef.current.onVideoAdded?.(d as Video));
      socket.on('videoDeleted',  (d) => cbRef.current.onVideoDeleted?.(d as { id: number }));
      socket.on('memoryMoved',   (d) => cbRef.current.onMemoryMoved?.(d as { id: number; x: number; y: number; rotate: number }));
      socket.on('videoMoved',    (d) => cbRef.current.onVideoMoved?.(d as { id: number; x: number; y: number; rotate: number }));
      return socket;
    };

    let socket: ReturnType<typeof init>;

    if (existingScript) {
      socket = init();
    } else {
      const script = document.createElement('script');
      script.id = 'socket-io-script';
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = () => { socket = init(); };
      document.head.appendChild(script);
    }

    return () => { socket?.disconnect(); };
  }, []);
}