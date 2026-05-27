'use client';

import { useEffect, useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { StorybookPane } from './StorybookPane';

type Props = {
  authReady: boolean;
  credentialsPath: string;
  storybookUrl: string;
};

const MIN_LEFT_PX = 320;
const MIN_RIGHT_PX = 320;

export function ClientShell({ authReady, credentialsPath, storybookUrl }: Props) {
  const [leftWidth, setLeftWidth] = useState<number>(480);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem('split:leftWidth');
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n)) setLeftWidth(n);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('split:leftWidth', String(leftWidth));
  }, [leftWidth]);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const onMove = (ev: MouseEvent) => {
      const next = startWidth + (ev.clientX - startX);
      const max = window.innerWidth - MIN_RIGHT_PX;
      const clamped = Math.max(MIN_LEFT_PX, Math.min(max, next));
      setLeftWidth(clamped);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <div
        className="flex h-full flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"
        style={{ width: leftWidth }}
      >
        <ChatPanel
          authReady={authReady}
          credentialsPath={credentialsPath}
          onComponentsWritten={() => setReloadKey((k) => k + 1)}
        />
      </div>
      <div
        onMouseDown={onDragStart}
        className="w-1 cursor-col-resize bg-zinc-200 hover:bg-blue-400 dark:bg-zinc-800 dark:hover:bg-blue-500 transition-colors"
        aria-label="Drag to resize panels"
        role="separator"
      />
      <div className="flex-1 h-full">
        <StorybookPane url={storybookUrl} reloadKey={reloadKey} />
      </div>
    </div>
  );
}
