'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { url: string; reloadKey: number };

export function StorybookPane({ url, reloadKey }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReachable(null);
    (async () => {
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        if (!cancelled) setReachable(true);
      } catch {
        if (!cancelled) setReachable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  const reload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Storybook</span>
          <span className="font-mono">{url}</span>
          {reachable === false && (
            <span className="text-amber-600 dark:text-amber-400">
              · not running — start it with <code className="font-mono">npm run storybook</code>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Reload
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Open
          </a>
        </div>
      </div>
      {reachable === false ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <div className="max-w-md">
            <p className="mb-2 font-medium text-zinc-800 dark:text-zinc-200">
              Storybook isn&apos;t reachable at {url}
            </p>
            <p>
              Run <code className="font-mono">npm run storybook</code> in another terminal,
              or use <code className="font-mono">npm run dev:all</code> to start both servers
              together.
            </p>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={url}
          className="flex-1 w-full bg-white"
          title="Storybook"
          key={reloadKey}
        />
      )}
    </div>
  );
}
